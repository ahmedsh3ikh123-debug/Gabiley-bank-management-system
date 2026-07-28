const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/upload', authenticateToken, (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Items array is required' });
    const results = [];
    for (const item of items) {
      try {
        const { operation, entity, entity_id, data, client_id } = item;
        if (client_id) {
          const existing = queryOne('SELECT id FROM transactions WHERE client_id = ?', [client_id]);
          if (existing) { results.push({ client_id, status: 'duplicate' }); continue; }
        }
        if (entity === 'transaction' && operation === 'create') {
          run('INSERT INTO transactions (from_account_id, to_account_id, type, amount, fee, description, client_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [data.from_account_id, data.to_account_id, data.type, data.amount, data.fee || 0, data.description || '', client_id || null, 'synced']);
          if (data.type === 'deposit' && data.to_account_id) run('UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE id = ?', [data.amount, data.to_account_id]);
          else if (data.type === 'withdrawal' && data.from_account_id) run('UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE id = ?', [data.amount, data.from_account_id]);
          else if (data.type === 'transfer') { run('UPDATE accounts SET balance = balance - ?, version = version + 1 WHERE id = ?', [data.amount + (data.fee || 0), data.from_account_id]); run('UPDATE accounts SET balance = balance + ?, version = version + 1 WHERE id = ?', [data.amount, data.to_account_id]); }
          results.push({ client_id, status: 'synced' });
        } else if (entity === 'user' && operation === 'create') {
          if (req.user.role !== 'super_admin' && req.user.role !== 'branch_manager') {
            results.push({ client_id, status: 'skipped', error: 'Not authorized' });
          } else {
            run('INSERT INTO users (username, email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)', [data.username, data.email, data.password, data.full_name, data.phone || '', data.role || 'customer']);
            results.push({ client_id, status: 'synced' });
          }
        } else { results.push({ client_id, status: 'skipped' }); }
      } catch (err) { results.push({ client_id: item.client_id, status: 'failed', error: err.message }); }
    }
    res.json({ results, synced: results.filter(r => r.status === 'synced').length, failed: results.filter(r => r.status === 'failed').length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/download', authenticateToken, (req, res) => {
  try {
    const { lastSync } = req.body;
    const since = lastSync || '1970-01-01';
    const users = queryAll('SELECT id, username, email, full_name, phone, role, status, created_at, updated_at FROM users WHERE updated_at >= ?', [since]).slice(0, 500);
    const accounts = queryAll('SELECT * FROM accounts WHERE updated_at >= ?', [since]).slice(0, 500);
    const transactions = queryAll('SELECT * FROM transactions WHERE updated_at >= ?', [since]).slice(0, 500);
    res.json({ users, accounts, transactions, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
