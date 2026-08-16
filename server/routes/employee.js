const express = require('express');
const { queryOne, queryAll, run, logAudit, createNotification } = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.put('/users/:id/activate', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'ict_staff'), (req, res) => {
  try {
    const existing = queryOne('SELECT id, full_name, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET status = 'active', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    createNotification(existing.id, 'Account Activated', 'Your account has been approved and activated. You can now log in.', 'success');
    logAudit(req.user.id, 'user_activate', 'user_management', `Activated user ${req.params.id} (${existing.full_name})`, req.ip);
    res.json({ message: 'User activated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/loans', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff'), (req, res) => {
  try {
    const sql = `SELECT l.id, l.user_id, l.amount, l.term_months, l.purpose, l.loan_type, l.monthly_income, l.status, l.reviewed_by, l.review_notes, l.created_at, l.updated_at, l.disbursed_at, l.total_paid, l.interest_rate,
                 COALESCE(NULLIF(l.account_number, ''), ac.account_number) as account_number, ac.balance as account_balance,
                 u.full_name, u.email, u.phone
                 FROM loan_requests l LEFT JOIN users u ON l.user_id = u.id LEFT JOIN accounts ac ON ac.user_id = l.user_id
                 ORDER BY l.created_at DESC`;
    res.json(queryAll(sql));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id/approve', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'ict_staff'), (req, res) => {
  try {
    const existing = queryOne('SELECT id, user_id, amount FROM loan_requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    // Find customer account
    const account = queryOne('SELECT id, account_number FROM accounts WHERE user_id = ? AND status = ?', [existing.user_id, 'active']);
    if (!account) return res.status(400).json({ error: 'Customer has no active account for disbursement' });

    const { review_notes } = req.body;

    // Approve + disbursed at same time
    run("UPDATE loan_requests SET status = 'disbursed', reviewed_by = ?, review_notes = ?, disbursed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [req.user.id, review_notes || '', req.params.id]);

    // Credit account
    run("UPDATE accounts SET balance = balance + ?, version = version + 1, updated_at = datetime('now') WHERE id = ?",
      [existing.amount, account.id]);

    // Create disbursement transaction
    const txId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    run("INSERT INTO transactions (transaction_id, to_account_id, type, amount, description, status, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [txId, account.id, 'loan_disbursement', existing.amount, `Loan #${req.params.id} disbursed to ${account.account_number}`, 'completed', req.user.id]);

    createNotification(existing.user_id, 'Loan Disbursed', `Your loan of $${existing.amount} has been approved and disbursed to your account ${account.account_number}.`, 'success');
    logAudit(req.user.id, 'loan_approve', 'loan_management', `Approved and disbursed loan ${req.params.id} for user ${existing.user_id} ($${existing.amount}) to account ${account.account_number}`, req.ip);
    res.json({ message: 'Loan approved and disbursed', account_number: account.account_number, amount: existing.amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id/reject', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'ict_staff'), (req, res) => {
  try {
    const existing = queryOne('SELECT id, user_id, amount FROM loan_requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    const { review_notes } = req.body;
    run("UPDATE loan_requests SET status = 'rejected', reviewed_by = ?, review_notes = ?, updated_at = datetime('now') WHERE id = ?",
      [req.user.id, review_notes || '', req.params.id]);

    createNotification(existing.user_id, 'Loan Rejected', `Your loan of $${existing.amount} has been rejected.`, 'error');
    logAudit(req.user.id, 'loan_reject', 'loan_management', `Rejected loan ${req.params.id} for user ${existing.user_id} ($${existing.amount})`, req.ip);
    res.json({ message: 'Loan rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/credentials', authorize('super_admin', 'branch_manager', 'ict_staff'), (req, res) => {
  try {
    const user = queryOne('SELECT id, username, full_name, password_plain, pin_plain, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    logAudit(req.user.id, 'view_credentials', 'user_management', `Viewed credentials for user ${user.username}`, req.ip);
    res.json({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      password: user.password_plain || '',
      pin: user.pin_plain || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/credentials', authorize('super_admin', 'branch_manager', 'ict_staff'), async (req, res) => {
  try {
    const { password, pin } = req.body;
    const user = queryOne('SELECT id, username, full_name, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ error: 'Cannot modify super admin credentials' });

    const updates = [];
    const params = [];

    if (password && password.trim()) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password.trim(), 12);
      updates.push('password = ?', 'password_plain = ?');
      params.push(hashedPassword, password.trim());
    }

    if (pin && pin.trim()) {
      const bcrypt = require('bcryptjs');
      const hashedPin = await bcrypt.hash(pin.trim(), 10);
      updates.push('pin = ?', 'pin_plain = ?');
      params.push(hashedPin, pin.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Password or PIN is required' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    logAudit(req.user.id, 'credentials_update', 'user_management', `Updated credentials for user ${user.username}`, req.ip);
    createNotification(user.id, 'Credentials Updated', 'Your login credentials have been updated by an administrator.', 'security');
    res.json({ message: 'Credentials updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff'), (req, res) => {
  try {
    const { search, role, status } = req.query;
    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.address, u.dob, u.gender,
             u.national_id, u.profile_picture, u.role, u.status, u.branch, u.failed_login_attempts,
             u.last_login, u.created_at,
             e.employee_id, e.department, e.position, e.salary, e.hire_date,
             a.account_number, a.account_type, a.balance
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN accounts a ON a.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR e.employee_id LIKE ? OR a.account_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) { sql += ' AND u.role = ?'; params.push(role); }
    if (status) { sql += ' AND u.status = ?'; params.push(status); }
    sql += ' ORDER BY u.created_at DESC';
    const users = queryAll(sql, params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/details', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff'), (req, res) => {
  try {
    const user = queryOne(`SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, branch, mother_name, id_card_image, failed_login_attempts, last_login, created_at, updated_at FROM users WHERE id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const accounts = queryAll('SELECT * FROM accounts WHERE user_id = ?', [user.id]);
    const accountIds = accounts.map(a => a.id);

    let transactions = [];
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => '?').join(',');
      transactions = queryAll(`SELECT t.id, t.transaction_id, t.from_account_id, t.to_account_id, t.type, t.amount, t.fee, t.description, t.status, t.created_at, fa.account_number as from_account_number, ta.account_number as to_account_number FROM transactions t LEFT JOIN accounts fa ON t.from_account_id = fa.id LEFT JOIN accounts ta ON t.to_account_id = ta.id WHERE t.from_account_id IN (${placeholders}) OR t.to_account_id IN (${placeholders}) ORDER BY t.created_at DESC LIMIT 50`, [...accountIds, ...accountIds]);
    }

    const loans = queryAll('SELECT * FROM loan_requests WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
    const login_history = queryAll('SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [user.id]);
    const documents = queryAll('SELECT * FROM customer_documents WHERE user_id = ? ORDER BY created_at DESC', [user.id]);

    res.json({ user, accounts, transactions, loans, login_history, documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/accounts', authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'ict_staff'), (req, res) => {
  try {
    const accounts = queryAll('SELECT id, user_id, account_number, balance, account_type, status, created_at FROM accounts WHERE user_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
