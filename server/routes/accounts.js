const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, run, logAudit, saveDatabase, createNotification } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/my-accounts', authenticateToken, (req, res) => {
  try {
    const accounts = queryAll('SELECT id, user_id, account_number, account_type, balance, interest_rate, currency, status, frozen, version, created_at FROM accounts WHERE user_id = ? AND status = ? ORDER BY created_at DESC', [req.user.id, 'active']);
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
    const existingAccounts = queryAll('SELECT id FROM accounts WHERE user_id = ?', [req.user.id]);
    if (existingAccounts.length >= 1) {
      return res.status(400).json({ error: 'You can only have one account' });
    }

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

// ─── Staff: Create Account for Existing Customer ───
router.post('/create-for-customer', authenticateToken, async (req, res) => {
  try {
    const { customer_id, account_type, purpose, pin, email, username, password } = req.body;

    // Verify customer exists
    const customer = queryOne('SELECT id, full_name FROM users WHERE id = ? AND role = ?', [customer_id, 'customer']);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Check if customer already has an account (max 1 account per customer)
    const existingAccounts = queryAll('SELECT id FROM accounts WHERE user_id = ?', [customer_id]);
    if (existingAccounts.length >= 1) {
      return res.status(400).json({ error: 'Customer already has an account' });
    }

    // Update email if provided
    if (email && email.trim()) {
      const existingEmail = queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), customer_id]);
      if (existingEmail) return res.status(400).json({ error: 'Email already registered' });
      run("UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?", [email.trim(), customer_id]);
    }

    // Update username if provided
    if (username && username.trim()) {
      const existingUsername = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), customer_id]);
      if (existingUsername) return res.status(400).json({ error: 'Username already exists' });
      run("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?", [username.trim(), customer_id]);
    }

    // Update password if provided
    if (password && password.trim()) {
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      const hashedPassword = await bcrypt.hash(password, 12);
      run("UPDATE users SET password = ?, password_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashedPassword, password, customer_id]);
    }

    // Update PIN if provided
    if (pin && pin.trim()) {
      if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4-6 digits' });
      const hashedPin = await bcrypt.hash(pin, 10);
      run("UPDATE users SET pin = ?, pin_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashedPin, pin, customer_id]);
    }

    const accountNumber = generateUniqueAccountNumber(customer_id);

    run('INSERT INTO accounts (user_id, account_number, account_type, balance, purpose) VALUES (?, ?, ?, ?, ?)',
      [customer_id, accountNumber, account_type || 'savings', 0, purpose || '']);

    const account = queryOne('SELECT id, user_id, account_number, account_type, balance, interest_rate, currency, status, frozen, version, purpose, created_at FROM accounts WHERE account_number = ?', [accountNumber]);
    logAudit(req.user.id, 'create_account_for_customer', 'account', `Created ${account_type || 'savings'} account: ${accountNumber} for customer ${customer.full_name}`, req.ip);
    createNotification(customer.id, 'New Account Created', `A new ${account_type || 'savings'} account (${accountNumber}) has been created for you.`, 'success');
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Staff: Register New Customer with Account ───
router.post('/register-customer', authenticateToken, async (req, res) => {
  try {
    const { username, email, password, confirm_password, full_name, phone, mother_name, id_card_image, account_type, purpose, pin } = req.body;

    // Validate required fields
    if (!full_name || full_name.trim().length < 3) return res.status(400).json({ error: 'Full name must be at least 3 characters' });
    if (!username || username.trim().length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (confirm_password && password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match' });
    if (!phone || phone.trim().length < 6) return res.status(400).json({ error: 'Valid phone number is required' });

    // Check for duplicates
    const existingEmail = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    const existingPhone = queryOne('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingPhone) return res.status(400).json({ error: 'Phone number already registered' });

    const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existingUsername) return res.status(400).json({ error: 'Username already exists' });

    // Hash password and PIN
    const hashedPassword = await bcrypt.hash(password, 12);
    const customerPin = pin && /^\d{4,6}$/.test(pin) ? pin : '0000';
    const hashedPin = await bcrypt.hash(customerPin, 10);

    // Create customer user
    run(
      `INSERT INTO users (username, email, password, full_name, phone, mother_name, id_card_image, pin, role, status, password_plain, pin_plain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
       [username.trim(), email, hashedPassword, full_name.trim(), phone.trim(), mother_name || '', id_card_image || '', hashedPin, 'customer', 'active', password, customerPin]
    );

    const user = queryOne('SELECT id FROM users WHERE username = ?', [username.trim()]);

    // Create account for the new customer
    const accountNumber = generateUniqueAccountNumber(user.id);
    run('INSERT INTO accounts (user_id, account_number, account_type, balance, purpose) VALUES (?, ?, ?, ?, ?)',
      [user.id, accountNumber, account_type || 'savings', 0, purpose || '']);

    logAudit(req.user.id, 'register_customer_with_account', 'auth', `Staff registered new customer: ${full_name} with account: ${accountNumber}`, req.ip);
    createNotification(user.id, 'Welcome to Gabiley Bank!', `Welcome ${full_name}. Your account (${accountNumber}) has been created successfully.`, 'success');

    res.status(201).json({
      message: 'Customer and account created successfully',
      user: { id: user.id, username: user.username, full_name: user.full_name },
      account: { account_number: accountNumber, account_type: account_type || 'savings' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
