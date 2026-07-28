const express = require('express');
const { queryOne, queryAll, run, createNotification, logAudit } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const loans = queryAll('SELECT * FROM loan_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(loans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { amount, term_months, purpose, monthly_income } = req.body;
    if (!amount || !term_months) return res.status(400).json({ error: 'Amount and term are required' });
    run('INSERT INTO loan_requests (user_id, amount, term_months, purpose, monthly_income) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, amount, term_months, purpose || '', monthly_income || 0]);
    const loan = queryOne('SELECT * FROM loan_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    createNotification(req.user.id, 'Loan Application Submitted', `Your loan application for $${amount} has been submitted and is under review.`, 'info');
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
