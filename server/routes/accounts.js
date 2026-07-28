const express = require('express');
const { queryOne, queryAll, run, logAudit, saveDatabase } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/my-accounts', authenticateToken, (req, res) => {
  try {
    const accounts = queryAll('SELECT id, user_id, account_number, account_type, balance, interest_rate, currency, status, frozen, version, created_at FROM accounts WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', authenticateToken, (req, res) => {
  try {
    const accounts = queryAll('SELECT a.id, a.user_id, a.account_number, a.account_type, a.balance, a.interest_rate, a.currency, a.status, a.frozen, a.version, a.created_at, u.full_name FROM accounts a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, (req, res) => {
  try {
    if (req.query.all === 'true') {
      const accounts = queryAll('SELECT id, user_id, account_number, account_type, balance, interest_rate, currency, status, frozen, version, created_at FROM accounts ORDER BY account_number ASC');
      return res.json(accounts);
    }
    const accounts = queryAll('SELECT id, user_id, account_number, account_type, balance, interest_rate, currency, status, frozen, version, created_at FROM accounts WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateUniqueAccountNumber(userId) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const lastAccount = queryOne('SELECT account_number FROM accounts ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (lastAccount) {
      const match = lastAccount.account_number.match(/^ACC-(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1 + i;
    }
    const accountNumber = 'ACC-' + String(nextNum).padStart(3, '0');
    const existing = queryOne('SELECT id FROM accounts WHERE account_number = ?', [accountNumber]);
    if (!existing) return accountNumber;
  }
  return 'GB' + String(Date.now()).slice(-6);
}

router.post('/', authenticateToken, (req, res) => {
  try {
    const { account_type } = req.body;
    const accountNumber = generateUniqueAccountNumber(req.user.id);

    run('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)',
      [req.user.id, accountNumber, account_type || 'savings', 0]);

    const account = queryOne('SELECT id, user_id, account_number, account_type, balance, interest_rate, currency, status, frozen, version, created_at FROM accounts WHERE account_number = ?', [accountNumber]);
    logAudit(req.user.id, 'create_account', 'account', `Created ${account_type || 'savings'} account: ${accountNumber}`, req.ip);
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
