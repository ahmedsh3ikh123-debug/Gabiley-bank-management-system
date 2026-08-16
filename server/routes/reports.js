const express = require('express');
const { queryOne, queryAll } = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/daily', authenticateToken, authorize('super_admin', 'branch_manager', 'manager', 'accountant'), (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const deposits = queryOne('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = \'deposit\' AND date(created_at) = ?', [targetDate]);
    const withdrawals = queryOne('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = \'withdrawal\' AND date(created_at) = ?', [targetDate]);
    const transfers = queryOne('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = \'transfer\' AND date(created_at) = ?', [targetDate]);
    const fees = queryOne('SELECT COALESCE(SUM(fee), 0) as total FROM transactions WHERE date(created_at) = ?', [targetDate]);
    const newAccounts = queryOne('SELECT COUNT(*) as count FROM accounts WHERE date(created_at) = ?', [targetDate]);

    res.json({
      date: targetDate,
      total_deposits: deposits.total,
      total_withdrawals: withdrawals.total,
      total_transfers: transfers.total,
      total_fees: fees.total,
      transaction_count: deposits.count + withdrawals.count + transfers.count,
      new_accounts: newAccounts.count,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/monthly', authenticateToken, authorize('super_admin', 'branch_manager', 'manager', 'accountant'), (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const deposits = queryOne('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = \'deposit\' AND strftime(\'%Y-%m\', created_at) = ?', [targetMonth]);
    const withdrawals = queryOne('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = \'withdrawal\' AND strftime(\'%Y-%m\', created_at) = ?', [targetMonth]);
    const transfers = queryOne('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = \'transfer\' AND strftime(\'%Y-%m\', created_at) = ?', [targetMonth]);
    const fees = queryOne('SELECT COALESCE(SUM(fee), 0) as total FROM transactions WHERE strftime(\'%Y-%m\', created_at) = ?', [targetMonth]);
    const newAccounts = queryOne('SELECT COUNT(*) as count FROM accounts WHERE strftime(\'%Y-%m\', created_at) = ?', [targetMonth]);
    const loanDisbursements = queryOne('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM loan_requests WHERE status = \'approved\' AND strftime(\'%Y-%m\', created_at) = ?', [targetMonth]);
    const loanRepayments = queryOne('SELECT COUNT(*) as count FROM loan_requests WHERE status = \'paid\' AND strftime(\'%Y-%m\', updated_at) = ?', [targetMonth]);

    res.json({
      month: targetMonth,
      total_deposits: deposits.total,
      total_withdrawals: withdrawals.total,
      total_transfers: transfers.total,
      total_fees: fees.total,
      transaction_count: deposits.count + withdrawals.count + transfers.count,
      new_accounts: newAccounts.count,
      loan_disbursements: loanDisbursements.count,
      loan_repayments: loanRepayments.count,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/analytics', authenticateToken, authorize('super_admin', 'branch_manager', 'manager', 'accountant'), (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const trends = queryAll(`
      SELECT date(created_at) as date,
        SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as withdrawals,
        SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END) as transfers,
        COUNT(*) as count
      FROM transactions WHERE created_at >= ? GROUP BY date(created_at) ORDER BY date
    `, [thirtyDaysAgo]);

    const topAccounts = queryAll('SELECT a.*, u.full_name FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.balance DESC LIMIT 10');

    const loanSummary = queryAll('SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM loan_requests GROUP BY status');
    const loanObj = { total_pending: 0, total_approved: 0, total_rejected: 0, total_amount: 0 };
    loanSummary.forEach(l => {
      if (l.status === 'pending') loanObj.total_pending = l.count;
      if (l.status === 'approved') loanObj.total_approved = l.count;
      if (l.status === 'rejected') loanObj.total_rejected = l.count;
      loanObj.total_amount += l.total;
    });

    const userGrowth = queryAll('SELECT strftime(\'%Y-%m-%d\', created_at) as month, COUNT(*) as count FROM users WHERE created_at >= ? GROUP BY month ORDER BY month', [thirtyDaysAgo]);
    const accountGrowth = queryAll('SELECT strftime(\'%Y-%m-%d\', created_at) as month, COUNT(*) as count FROM accounts WHERE created_at >= ? GROUP BY month ORDER BY month', [thirtyDaysAgo]);

    res.json({ trends, top_accounts: topAccounts, loan_summary: loanObj, growth: { users: userGrowth, accounts: accountGrowth } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/:type', authenticateToken, authorize('super_admin', 'branch_manager', 'manager', 'accountant'), (req, res) => {
  try {
    const { type } = req.params;
    let data, filename;
    switch (type) {
      case 'transactions': data = queryAll('SELECT t.*, fa.account_number as from_acct, ta.account_number as to_acct FROM transactions t LEFT JOIN accounts fa ON t.from_account_id = fa.id LEFT JOIN accounts ta ON t.to_account_id = ta.id ORDER BY t.created_at DESC LIMIT 10000'); filename = 'transactions.csv'; break;
      case 'accounts': data = queryAll('SELECT a.*, u.full_name, u.email FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC'); filename = 'accounts.csv'; break;
      case 'users': data = queryAll('SELECT id, username, email, full_name, phone, role, status, created_at FROM users ORDER BY created_at DESC'); filename = 'users.csv'; break;
      default: return res.status(400).json({ error: 'Invalid export type' });
    }
    if (data.length === 0) return res.status(404).json({ error: 'No data to export' });
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
