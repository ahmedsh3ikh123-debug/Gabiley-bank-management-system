const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, run, createNotification, logAudit } = require('../db');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

router.get('/customers', authenticateToken, requireStaff, (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT a.id as account_id, a.account_number, a.balance, a.account_type, a.status as account_status,
             u.id as user_id, u.full_name, u.email, u.phone
      FROM accounts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE u.role = 'customer' AND u.status = 'active' AND a.status = 'active'
    `;
    const params = [];
    if (search) {
      sql += " AND (a.account_number LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY u.full_name';
    const accounts = queryAll(sql, params);
    res.json(accounts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticateToken, (req, res) => {
  try {
      const loans = queryAll('SELECT l.id, l.user_id, l.amount, l.term_months, l.purpose, l.loan_type, l.monthly_income, l.status, l.reviewed_by, l.review_notes, l.created_at, l.updated_at, l.disbursed_at, l.total_paid, l.interest_rate, COALESCE(NULLIF(l.account_number, \'\'), a.account_number) as account_number, a.balance as account_balance, u.full_name, u.email, u.phone FROM loan_requests l LEFT JOIN users u ON l.user_id = u.id LEFT JOIN accounts a ON a.user_id = l.user_id WHERE l.user_id = ? ORDER BY l.created_at DESC', [req.user.id]);
    res.json(loans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount, term_months, purpose, customer_id, pin, account_number } = req.body;
    if (!amount || !term_months) return res.status(400).json({ error: 'Amount and term are required' });
    if (!account_number) return res.status(400).json({ error: 'Account is required. Please select an account for this loan.' });

    const STAFF_ROLES = ['super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff'];
    const isStaff = STAFF_ROLES.includes(req.user.role);
    const targetUserId = (customer_id && isStaff) ? parseInt(customer_id) : req.user.id;

    if (customer_id && !isStaff) {
      return res.status(403).json({ error: 'Only staff can create loans on behalf of customers' });
    }

    const user = queryOne('SELECT id, pin, role FROM users WHERE id = ?', [targetUserId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!pin) return res.status(400).json({ error: 'PIN is required to authorize this loan' });

    const pinValid = await bcrypt.compare(pin, user.pin);
    if (!pinValid) return res.status(400).json({ error: 'Invalid PIN' });

    const acc = queryOne('SELECT account_number FROM accounts WHERE user_id = ? AND account_number = ? AND status = ?', [targetUserId, account_number, 'active']);
    if (!acc) return res.status(400).json({ error: 'Account not found or inactive' });
    const accountNumber = acc.account_number;

    run('INSERT INTO loan_requests (user_id, amount, term_months, purpose, account_number) VALUES (?, ?, ?, ?, ?)',
      [targetUserId, amount, term_months, purpose || '', accountNumber]);
    const loan = queryOne('SELECT * FROM loan_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [targetUserId]);
    createNotification(targetUserId, 'Loan Application Submitted', `Your loan application for $${amount} has been submitted and is under review.`, 'info');
    res.json(loan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/calculator', authenticateToken, (req, res) => {
  try {
    const { amount, term_months, interest_rate } = req.query;
    const principal = parseFloat(amount) || 0;
    const months = parseInt(term_months) || 1;
    const annualRate = parseFloat(interest_rate) || 10;
    const monthlyRate = annualRate / 100 / 12;
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    }
    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - principal;
    res.json({
      principal,
      term_months: months,
      interest_rate: annualRate,
      monthly_payment: Math.round(monthlyPayment * 100) / 100,
      total_payment: Math.round(totalPayment * 100) / 100,
      total_interest: Math.round(totalInterest * 100) / 100,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
