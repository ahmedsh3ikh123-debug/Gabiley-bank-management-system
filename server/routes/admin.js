const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { queryOne, queryAll, run, logAudit, logLoginHistory, getSetting, saveDatabase, getDb, initDatabase, createNotification } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sanitizeInput, validateEmail, validateAmount } = require('../middleware/validation');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  }
});

const PROJECT_ROOT = path.join(__dirname, '..', '..');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', (req, res) => {
  try {
    const totalUsers = queryOne('SELECT COUNT(*) as count FROM users').count;
    const totalCustomers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").count;
    const totalAdmins = queryOne("SELECT COUNT(*) as count FROM users WHERE role IN ('super_admin', 'branch_manager')").count;
    const totalEmployees = queryOne('SELECT COUNT(*) as count FROM employees').count;
    const totalAccounts = queryOne('SELECT COUNT(*) as count FROM accounts').count;
    const activeAccounts = queryOne("SELECT COUNT(*) as count FROM accounts WHERE status = 'active' AND frozen = 0").count;
    const totalBalanceResult = queryOne('SELECT COALESCE(SUM(balance), 0) as total FROM accounts');
    const totalTransactions = queryOne('SELECT COUNT(*) as count FROM transactions').count;
    const onlineUsers = queryOne('SELECT COUNT(*) as count FROM online_users').count;
    const pendingLoans = queryOne("SELECT COUNT(*) as count FROM loan_requests WHERE status = 'pending'").count;
    const approvedLoans = queryOne("SELECT COUNT(*) as count FROM loan_requests WHERE status = 'approved'").count;
    const rejectedLoans = queryOne("SELECT COUNT(*) as count FROM loan_requests WHERE status = 'rejected'").count;

    const today = new Date().toISOString().split('T')[0];
    const todayDeposits = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit' AND date(created_at) = ?", [today]).total;
    const todayWithdrawals = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'withdrawal' AND date(created_at) = ?", [today]).total;
    const todayTransfers = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'transfer' AND date(created_at) = ?", [today]).total;

    const recentTransactions = queryAll(`
      SELECT t.id, t.transaction_id, t.from_account_id, t.to_account_id, t.type, t.amount, t.fee, t.description, t.status, t.created_at,
             fa.account_number as from_account_number, ta.account_number as to_account_number
      FROM transactions t LEFT JOIN accounts fa ON t.from_account_id = fa.id LEFT JOIN accounts ta ON t.to_account_id = ta.id
      ORDER BY t.created_at DESC LIMIT 10
    `);

    const recentCustomers = queryAll("SELECT id, username, email, full_name, profile_picture, status, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 5");

    res.json({
      totalUsers, totalCustomers, totalAdmins, totalEmployees, totalAccounts, activeAccounts,
      totalBalance: totalBalanceResult.total, totalTransactions, onlineUsers,
      pendingLoans, approvedLoans, rejectedLoans,
      todayDeposits, todayWithdrawals, todayTransfers,
      recentTransactions, recentCustomers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', (req, res) => {
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

router.get('/users/export', (req, res) => {
  try {
    const users = queryAll("SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, branch, last_login, created_at FROM users ORDER BY created_at DESC");

    const csvHeader = 'ID,Username,Email,Full Name,Phone,Address,DOB,Gender,National ID,Profile Picture,Role,Status,Branch,Last Login,Created At';
    const csvRows = users.map(u => {
      return [u.id, u.username, u.email, u.full_name, u.phone, u.address, u.dob, u.gender, u.national_id, u.profile_picture, u.role, u.status, u.branch, u.last_login, u.created_at]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    logAudit(req.user.id, 'user_export', 'user_management', `Exported ${users.length} users`, req.ip);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/details', (req, res) => {
  try {
    const user = queryOne(`SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, branch, failed_login_attempts, last_login, created_at, updated_at FROM users WHERE id = ?`, [req.params.id]);
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

router.post('/users', async (req, res) => {
  try {
    const { username, email, password, full_name, phone, address, dob, gender, national_id, role, pin } = req.body;

    if (!full_name || full_name.trim().length < 3) return res.status(400).json({ error: 'Full name must be at least 3 characters' });
    if (!email || !validateEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!phone || phone.trim().length < 6) return res.status(400).json({ error: 'Valid phone number is required' });
    if (!pin || !/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4-6 digits' });

    const validRoles = ['customer', 'teller', 'customer_service', 'accountant', 'ict_staff', 'branch_manager', 'super_admin'];
    const userRole = role || 'customer';
    if (!validRoles.includes(userRole)) return res.status(400).json({ error: 'Invalid role' });

    const existingEmail = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    const existingPhone = queryOne('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingPhone) return res.status(400).json({ error: 'Phone number already registered' });

    const usernameVal = username || email.split('@')[0];
    const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [usernameVal]);
    if (existingUsername) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const hashedPin = await bcrypt.hash(pin, 10);

    run('INSERT INTO users (username, email, password, full_name, phone, address, dob, gender, national_id, pin, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usernameVal, email, hashedPassword, sanitizeInput(full_name.trim()), phone.trim(), sanitizeInput(address || ''), dob || '', gender || '', national_id || '', hashedPin, userRole]);

    const user = queryOne('SELECT id FROM users WHERE username = ?', [usernameVal]);

    // Auto-create account for customers
    if (userRole === 'customer') {
      const lastAccount = queryOne('SELECT account_number FROM accounts ORDER BY id DESC LIMIT 1');
      let nextNum = 1;
      if (lastAccount) {
        const match = lastAccount.account_number.match(/^ACC-(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const accountNumber = 'ACC-' + String(nextNum).padStart(3, '0');
      run('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)', [user.id, accountNumber, 'savings', 0]);
    }

    // Auto-create employee record for staff roles
    if (userRole !== 'customer' && userRole !== 'super_admin') {
      const employeeId = 'EMP' + String(user.id).padStart(5, '0');
      const departments = { teller: 'Operations', customer_service: 'Customer Service', accountant: 'Finance', ict_staff: 'IT', branch_manager: 'Operations' };
      run('INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, hire_date, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, employeeId, full_name.trim(), email, phone.trim(), departments[userRole] || 'Operations', userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), new Date().toISOString().split('T')[0], branch || '']);
    }

    logAudit(req.user.id, 'user_create', 'user_management', `Created ${userRole}: ${full_name} (${usernameVal})`, req.ip);
    createNotification(user.id, 'Account Created', `Your ${userRole} account has been created by an administrator.`, 'success');

    const fullUser = queryOne("SELECT id, username, email, full_name, phone, address, dob, gender, profile_picture, role, status, branch, created_at FROM users WHERE id = ?", [user.id]);
    res.status(201).json(fullUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { full_name, phone, address, dob, email, gender, national_id, branch } = req.body;
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET full_name = ?, phone = ?, address = ?, dob = ?, email = ?, gender = ?, national_id = ?, branch = ?, updated_at = datetime('now') WHERE id = ?",
      [full_name, phone || '', address || '', dob || '', email, gender || '', national_id || '', branch || '', req.params.id]);
    logAudit(req.user.id, 'user_update', 'user_management', `Updated user ${req.params.id}`, req.ip);
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/profile-picture', (req, res) => {
  try {
    const { profile_picture } = req.body;
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET profile_picture = ?, updated_at = datetime('now') WHERE id = ?", [profile_picture || '', req.params.id]);
    logAudit(req.user.id, 'profile_picture', 'user_management', `Updated profile picture for user ${req.params.id}`, req.ip);
    res.json({ message: 'Profile picture updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });

    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const oldRole = existing.role;
    run("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, req.params.id]);
    logAudit(req.user.id, 'role_change', 'user_management', `Changed role from ${oldRole} to ${role} for user ${req.params.id}`, req.ip);
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/block', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET status = 'blocked', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    run('DELETE FROM online_users WHERE user_id = ?', [req.params.id]);
    logAudit(req.user.id, 'user_block', 'user_management', `Blocked user ${req.params.id}`, req.ip);
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/unblock', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET status = 'active', failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    logAudit(req.user.id, 'user_unblock', 'user_management', `Unblocked user ${req.params.id}`, req.ip);
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/activate', (req, res) => {
  try {
    const existing = queryOne('SELECT id, full_name, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET status = 'active', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    createNotification(existing.id, 'Account Activated', 'Your account has been approved and activated by an admin. You can now log in.', 'success');
    logAudit(req.user.id, 'user_activate', 'user_management', `Activated user ${req.params.id} (${existing.full_name})`, req.ip);
    res.json({ message: 'User activated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(password || 'password123', 12);
    run("UPDATE users SET password = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?", [hashed, req.params.id]);
    logAudit(req.user.id, 'password_reset', 'user_management', `Admin reset password for user ${req.params.id}`, req.ip);
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reset-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(pin || '1234', 10);
    run("UPDATE users SET pin = ?, updated_at = datetime('now') WHERE id = ?", [hashed, req.params.id]);
    logAudit(req.user.id, 'pin_reset', 'user_management', `Admin reset PIN for user ${req.params.id}`, req.ip);
    res.json({ message: 'PIN reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/freeze-account', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const account = queryOne("SELECT id, account_number FROM accounts WHERE user_id = ? AND account_type = 'savings' ORDER BY created_at ASC LIMIT 1", [req.params.id]);
    if (!account) return res.status(404).json({ error: 'No primary account found' });

    run("UPDATE accounts SET frozen = 1, updated_at = datetime('now') WHERE id = ?", [account.id]);
    logAudit(req.user.id, 'account_freeze', 'user_management', `Froze account ${account.account_number} for user ${req.params.id}`, req.ip);
    res.json({ message: 'Account frozen' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/unfreeze-account', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const account = queryOne("SELECT id, account_number FROM accounts WHERE user_id = ? AND account_type = 'savings' ORDER BY created_at ASC LIMIT 1", [req.params.id]);
    if (!account) return res.status(404).json({ error: 'No primary account found' });

    run("UPDATE accounts SET frozen = 0, updated_at = datetime('now') WHERE id = ?", [account.id]);
    logAudit(req.user.id, 'account_unfreeze', 'user_management', `Unfroze account ${account.account_number} for user ${req.params.id}`, req.ip);
    res.json({ message: 'Account unfrozen' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const accounts = queryAll('SELECT id FROM accounts WHERE user_id = ?', [req.params.id]);
    const accountIds = accounts.map(a => a.id);

    if (accountIds.length > 0) {
      const ph = accountIds.map(() => '?').join(',');
      run(`DELETE FROM transactions WHERE from_account_id IN (${ph}) OR to_account_id IN (${ph})`, [...accountIds, ...accountIds]);
      run('DELETE FROM accounts WHERE user_id = ?', [req.params.id]);
    }

    run('DELETE FROM loan_requests WHERE user_id = ?', [req.params.id]);
    run('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
    run('DELETE FROM login_history WHERE user_id = ?', [req.params.id]);
    run('DELETE FROM customer_documents WHERE user_id = ?', [req.params.id]);
    run('DELETE FROM online_users WHERE user_id = ?', [req.params.id]);
    run('DELETE FROM users WHERE id = ?', [req.params.id]);

    logAudit(req.user.id, 'user_delete', 'user_management', `Deleted user ${req.params.id}`, req.ip);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/login-history', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const totalResult = queryOne('SELECT COUNT(*) as count FROM login_history WHERE user_id = ?', [req.params.id]);
    const total = totalResult ? totalResult.count : 0;
    const history = queryAll('SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [req.params.id, limit, offset]);
    res.json({ data: history, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/timeline', (req, res) => {
  try {
    const existing = queryOne('SELECT id, username, full_name FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const events = [];

    const user = queryOne('SELECT created_at, updated_at FROM users WHERE id = ?', [req.params.id]);
    if (user) {
      events.push({ type: 'user_created', description: `Account created for ${existing.full_name}`, timestamp: user.created_at });
      if (user.updated_at && user.updated_at !== user.created_at) {
        events.push({ type: 'profile_updated', description: 'Profile information updated', timestamp: user.updated_at });
      }
    }

    const accounts = queryAll('SELECT id, account_number, account_type, created_at FROM accounts WHERE user_id = ?', [req.params.id]);
    for (const acc of accounts) {
      events.push({ type: 'account_created', description: `Opened ${acc.account_type} account (${acc.account_number})`, timestamp: acc.created_at });
    }

    const accountIds = accounts.map(a => a.id);
    if (accountIds.length > 0) {
      const ph = accountIds.map(() => '?').join(',');
      const transactions = queryAll(`SELECT type, amount, status, created_at FROM transactions WHERE (from_account_id IN (${ph}) OR to_account_id IN (${ph})) AND status = 'completed' ORDER BY created_at DESC LIMIT 100`, [...accountIds, ...accountIds]);
      for (const txn of transactions) {
        events.push({ type: `transaction_${txn.type}`, description: `${txn.type.charAt(0).toUpperCase() + txn.type.slice(1)} of $${txn.amount}`, timestamp: txn.created_at });
      }
    }

    const loans = queryAll('SELECT amount, status, created_at FROM loan_requests WHERE user_id = ?', [req.params.id]);
    for (const loan of loans) {
      events.push({ type: `loan_${loan.status}`, description: `Loan request of $${loan.amount} - ${loan.status}`, timestamp: loan.created_at });
    }

    const logins = queryAll('SELECT status, created_at FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);
    for (const login of logins) {
      events.push({ type: 'login', description: `Login attempt - ${login.status}`, timestamp: login.created_at });
    }

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ user: existing, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employees', (req, res) => {
  try {
    const { search, department, status } = req.query;
    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    if (search) {
      sql += ' AND (full_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department) { sql += ' AND department = ?'; params.push(department); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    res.json(queryAll(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { full_name, email, phone, department, position, salary, hire_date, branch, password, pin } = req.body;
    if (!full_name || !email || !position || !hire_date) {
      return res.status(400).json({ error: 'full_name, email, position, and hire_date are required' });
    }

    const existingEmp = queryOne('SELECT id FROM employees WHERE email = ?', [email]);
    if (existingEmp) return res.status(400).json({ error: 'Email already registered for another employee' });

    const existingUser = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ error: 'Email already registered as a user' });

    // Map position to role
    const positionRoleMap = {
      'Teller': 'teller',
      'Customer Service Officer': 'customer_service',
      'Accountant': 'accountant',
      'Loan Officer': 'accountant',
      'ICT Officer': 'ict_staff',
    };
    const userRole = positionRoleMap[position] || 'teller';

    const departmentMap = {
      'Teller': 'Operations',
      'Customer Service Officer': 'Customer Service',
      'Accountant': 'Finance',
      'Loan Officer': 'Loans',
      'ICT Officer': 'IT',
    };
    const dept = department || departmentMap[position] || 'Operations';

    // Create user account for login
    const empPassword = password || 'Employee@123';
    const hashedPassword = await bcrypt.hash(empPassword, 12);
    const username = email.split('@')[0];

    // Ensure unique username
    let usernameVal = username;
    let counter = 1;
    while (queryOne('SELECT id FROM users WHERE username = ?', [usernameVal])) {
      usernameVal = username + counter;
      counter++;
    }

    run('INSERT INTO users (username, email, password, full_name, phone, role, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [usernameVal, email, hashedPassword, full_name, phone || '', userRole, branch || '']);

    const user = queryOne('SELECT id FROM users WHERE username = ?', [usernameVal]);

    // Hash PIN if provided
    if (pin && /^\d{4,6}$/.test(pin)) {
      const hashedPin = await bcrypt.hash(pin, 10);
      run('UPDATE users SET pin = ? WHERE id = ?', [hashedPin, user.id]);
    }

    const employeeId = 'EMP' + String(user.id).padStart(5, '0');

    run('INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, salary, hire_date, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, employeeId, full_name, email, phone || '', dept, position, salary || 0, hire_date, branch || '']);

    const emp = queryOne('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
    logAudit(req.user.id, 'employee_create', 'employee_management', `Created employee ${employeeId} (${full_name}) with user account ${usernameVal}`, req.ip);
    createNotification(user.id, 'Welcome to Gabiley Bank!', `Your employee account has been created. Username: ${usernameVal}`, 'success');

    res.status(201).json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id', (req, res) => {
  try {
    const { full_name, email, phone, department, position, salary, hire_date, branch, status } = req.body;
    const existing = queryOne('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    run('UPDATE employees SET full_name=?, email=?, phone=?, department=?, position=?, salary=?, hire_date=?, branch=?, status=? WHERE id=?',
      [full_name, email, phone || '', department, position, salary || 0, hire_date, branch || '', status || 'active', req.params.id]);
    logAudit(req.user.id, 'employee_update', 'employee_management', `Updated employee ${req.params.id}`, req.ip);
    res.json({ message: 'Employee updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const existing = queryOne('SELECT id, user_id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const hashed = await bcrypt.hash(password || 'employee123', 12);
    if (existing.user_id) {
      run("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hashed, existing.user_id]);
    }
    logAudit(req.user.id, 'employee_password_reset', 'employee_management', `Reset password for employee ${req.params.id}`, req.ip);
    res.json({ message: 'Employee password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/employees/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id, user_id, employee_id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    if (existing.user_id) {
      run('DELETE FROM online_users WHERE user_id = ?', [existing.user_id]);
      run('DELETE FROM login_history WHERE user_id = ?', [existing.user_id]);
      run('DELETE FROM notifications WHERE user_id = ?', [existing.user_id]);
      run('DELETE FROM audit_log WHERE user_id = ?', [existing.user_id]);
      run('DELETE FROM users WHERE id = ?', [existing.user_id]);
    }
    run('DELETE FROM employees WHERE id = ?', [req.params.id]);
    logAudit(req.user.id, 'employee_delete', 'employee_management', `Deleted employee ${existing.employee_id}`, req.ip);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['customer', 'teller', 'customer_service', 'accountant', 'ict_staff', 'branch_manager', 'super_admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const existing = queryOne('SELECT id, user_id, employee_id, full_name FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    if (!existing.user_id) return res.status(400).json({ error: 'Employee has no linked user account' });

    const oldUser = queryOne('SELECT role FROM users WHERE id = ?', [existing.user_id]);
    run("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, existing.user_id]);
    logAudit(req.user.id, 'role_change', 'employee_management', `Changed role from ${oldUser?.role} to ${role} for employee ${existing.employee_id} (${existing.full_name})`, req.ip);

    res.json({ message: `Role changed to ${role}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employees/:id/performance', (req, res) => {
  try {
    const existing = queryOne('SELECT id, user_id, employee_id, full_name FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const today = new Date().toISOString().split('T')[0];
    const transactionsProcessed = existing.user_id
      ? queryOne("SELECT COUNT(*) as count FROM transactions WHERE processed_by = ? AND date(created_at) = ?", [existing.user_id, today]).count
      : 0;
    const customersServedToday = existing.user_id
      ? queryOne("SELECT COUNT(DISTINCT CASE WHEN t.from_account_id IS NOT NULL THEN a.user_id WHEN t.to_account_id IS NOT NULL THEN a2.user_id END) as count FROM transactions t LEFT JOIN accounts a ON t.from_account_id = a.id LEFT JOIN accounts a2 ON t.to_account_id = a2.id WHERE t.processed_by = ? AND date(t.created_at) = ?", [existing.user_id, today]).count
      : 0;

    res.json({
      employee_id: existing.employee_id,
      full_name: existing.full_name,
      transactions_processed_today: transactionsProcessed,
      customers_served_today: customersServedToday,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/accounts/:id/block', (req, res) => {
  try {
    const existing = queryOne('SELECT id, account_number FROM accounts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Account not found' });

    run("UPDATE accounts SET status = 'blocked', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    logAudit(req.user.id, 'account_block', 'account_management', `Blocked account ${existing.account_number}`, req.ip);
    res.json({ message: 'Account blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/accounts/:id/unblock', (req, res) => {
  try {
    const existing = queryOne('SELECT id, account_number FROM accounts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Account not found' });

    run("UPDATE accounts SET status = 'active', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    logAudit(req.user.id, 'account_unblock', 'account_management', `Unblocked account ${existing.account_number}`, req.ip);
    res.json({ message: 'Account unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/accounts/:id/freeze', (req, res) => {
  try {
    const existing = queryOne('SELECT id, account_number FROM accounts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Account not found' });

    run("UPDATE accounts SET frozen = 1, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    logAudit(req.user.id, 'account_freeze', 'account_management', `Froze account ${existing.account_number}`, req.ip);
    res.json({ message: 'Account frozen' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/accounts/:id/unfreeze', (req, res) => {
  try {
    const existing = queryOne('SELECT id, account_number FROM accounts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Account not found' });

    run("UPDATE accounts SET frozen = 0, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    logAudit(req.user.id, 'account_unfreeze', 'account_management', `Unfroze account ${existing.account_number}`, req.ip);
    res.json({ message: 'Account unfrozen' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/accounts/:id/balance', (req, res) => {
  try {
    const { balance } = req.body;
    if (balance === undefined || balance === null) return res.status(400).json({ error: 'Balance is required' });
    if (typeof balance !== 'number' || balance < 0) return res.status(400).json({ error: 'Balance must be a non-negative number' });

    const existing = queryOne('SELECT id, account_number, balance as old_balance FROM accounts WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Account not found' });

    run("UPDATE accounts SET balance = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?", [balance, req.params.id]);
    logAudit(req.user.id, 'balance_adjust', 'account_management', `Adjusted balance for account ${existing.account_number}: ${existing.old_balance} -> ${balance}`, req.ip);
    res.json({ message: 'Balance updated', old_balance: existing.old_balance, new_balance: balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/loans', (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT l.*, u.full_name, u.email FROM loan_requests l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    sql += ' ORDER BY l.created_at DESC';
    res.json(queryAll(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id/approve', (req, res) => {
  try {
    const existing = queryOne('SELECT id, user_id, amount FROM loan_requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    const { review_notes } = req.body;
    run("UPDATE loan_requests SET status = 'approved', reviewed_by = ?, review_notes = ?, updated_at = datetime('now') WHERE id = ?",
      [req.user.id, review_notes || '', req.params.id]);

    createNotification(existing.user_id, 'Loan Approved', `Your loan of $${existing.amount} has been approved.`, 'success');
    logAudit(req.user.id, 'loan_approve', 'loan_management', `Approved loan ${req.params.id} for user ${existing.user_id} ($${existing.amount})`, req.ip);
    res.json({ message: 'Loan approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id/reject', (req, res) => {
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

router.get('/announcements', (req, res) => {
  try {
    const announcements = queryAll('SELECT a.*, u.full_name as creator_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/announcements', (req, res) => {
  try {
    const { title, message, priority, target_role } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

    run('INSERT INTO announcements (title, message, priority, target_role, created_by) VALUES (?, ?, ?, ?, ?)',
      [title, message, priority || 'normal', target_role || 'all', req.user.id]);

    const ann = queryOne('SELECT a.*, u.full_name as creator_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC LIMIT 1');
    logAudit(req.user.id, 'announcement_create', 'announcements', `Created announcement: ${title}`, req.ip);
    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/announcements/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const { title, message, priority, target_role } = req.body;
    run('UPDATE announcements SET title=?, message=?, priority=?, target_role=? WHERE id=?',
      [title, message, priority || 'normal', target_role || 'all', req.params.id]);
    logAudit(req.user.id, 'announcement_update', 'announcements', `Updated announcement ${req.params.id}`, req.ip);
    res.json({ message: 'Announcement updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/announcements/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    logAudit(req.user.id, 'announcement_delete', 'announcements', `Deleted announcement ${req.params.id}`, req.ip);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', (req, res) => {
  try {
    const settings = queryAll('SELECT * FROM system_settings ORDER BY setting_key');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) return res.status(400).json({ error: 'Settings must be an array' });

    for (const s of settings) {
      const existing = queryOne('SELECT id FROM system_settings WHERE setting_key = ?', [s.setting_key]);
      if (existing) {
        run('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [s.setting_value, s.setting_key]);
      } else {
        run('INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
          [s.setting_key, s.setting_value, s.description || '']);
      }
    }
    logAudit(req.user.id, 'settings_update', 'system_settings', `Updated ${settings.length} settings`, req.ip);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/online', (req, res) => {
  try {
    const online = queryAll('SELECT o.*, u.full_name, u.username, u.role FROM online_users o LEFT JOIN users u ON o.user_id = u.id');
    res.json(online);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', (req, res) => {
  try {
    const { action, module, status, page, limit: queryLimit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limit = parseInt(queryLimit) || 50;
    const offset = (pageNum - 1) * limit;

    let countSql = 'SELECT COUNT(*) as count FROM audit_log al WHERE 1=1';
    let sql = 'SELECT al.*, u.full_name as user_name, u.email as user_email FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    const params = [];
    const countParams = [];

    if (action) {
      sql += ' AND al.action LIKE ?';
      countSql += ' AND al.action LIKE ?';
      params.push(`%${action}%`);
      countParams.push(`%${action}%`);
    }
    if (module) {
      sql += ' AND al.module LIKE ?';
      countSql += ' AND al.module LIKE ?';
      params.push(`%${module}%`);
      countParams.push(`%${module}%`);
    }
    if (status) {
      sql += ' AND al.status = ?';
      countSql += ' AND al.status = ?';
      params.push(status);
      countParams.push(status);
    }

    const totalResult = queryOne(countSql, countParams);
    const total = totalResult ? totalResult.count : 0;

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = queryAll(sql, params);
    res.json({ data: logs, pagination: { page: pageNum, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/login-history', (req, res) => {
  try {
    const { user_id, status, page, limit: queryLimit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limit = parseInt(queryLimit) || 50;
    const offset = (pageNum - 1) * limit;

    let countSql = 'SELECT COUNT(*) as count FROM login_history WHERE 1=1';
    let sql = 'SELECT lh.*, u.full_name, u.username FROM login_history lh LEFT JOIN users u ON lh.user_id = u.id WHERE 1=1';
    const params = [];
    const countParams = [];

    if (user_id) {
      sql += ' AND lh.user_id = ?';
      countSql += ' AND lh.user_id = ?';
      params.push(user_id);
      countParams.push(user_id);
    }
    if (status) {
      sql += ' AND lh.status = ?';
      countSql += ' AND lh.status = ?';
      params.push(status);
      countParams.push(status);
    }

    const totalResult = queryOne(countSql, countParams);
    const total = totalResult ? totalResult.count : 0;

    sql += ' ORDER BY lh.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const history = queryAll(sql, params);
    res.json({ data: history, pagination: { page: pageNum, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backup', (req, res) => {
  try {
    const dbPath = path.join(PROJECT_ROOT, 'bank.db');
    const backupDir = path.join(PROJECT_ROOT, 'server', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFile);

    saveDatabase();
    fs.copyFileSync(dbPath, backupPath);
    logAudit(req.user.id, 'backup_create', 'system', `Database backup created: ${backupFile}`, req.ip);
    res.json({ message: 'Backup created successfully', file: backupFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', (req, res) => {
  try {
    const backupDir = path.join(PROJECT_ROOT, 'server', 'backups');
    if (!fs.existsSync(backupDir)) return res.status(404).json({ error: 'No backups found' });

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse();
    if (files.length === 0) return res.status(404).json({ error: 'No backups found' });

    const latestBackup = path.join(backupDir, files[0]);
    const dbPath = path.join(PROJECT_ROOT, 'bank.db');

    saveDatabase();
    fs.copyFileSync(latestBackup, dbPath);
    initDatabase();
    logAudit(req.user.id, 'database_restore', 'system', `Database restored from: ${files[0]}`, req.ip);
    res.json({ message: 'Database restored successfully', restoredFrom: files[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/backups', (req, res) => {
  try {
    const backupDir = path.join(PROJECT_ROOT, 'server', 'backups');
    if (!fs.existsSync(backupDir)) return res.json([]);

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).map(f => {
      const stats = fs.statSync(path.join(backupDir, f));
      return { name: f, size: stats.size, created_at: stats.mtime };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/backup/download', (req, res) => {
  try {
    const dbPath = path.join(PROJECT_ROOT, 'bank.db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bank-backup-${timestamp}.db`;

    saveDatabase();

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    logAudit(req.user.id, 'backup_download', 'system', `Database backup downloaded: ${filename}`, req.ip);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(dbPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore/upload', upload.single('backupFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dbPath = path.join(PROJECT_ROOT, 'bank.db');
    const backupDir = path.join(PROJECT_ROOT, 'server', 'backups');

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-before-restore-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFile);

    saveDatabase();
    fs.copyFileSync(dbPath, backupPath);

    fs.writeFileSync(dbPath, req.file.buffer);
    initDatabase();

    logAudit(req.user.id, 'database_restore_upload', 'system', `Database restored from uploaded file: ${req.file.originalname}. Pre-restore backup: ${backupFile}`, req.ip);
    res.json({ message: 'System restored successfully from uploaded file', restoredFrom: req.file.originalname, preRestoreBackup: backupFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Full Backup: ZIP with database + uploads ---
const fullUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  }
});

function addFolderToZip(archive, folderPath, zipBase) {
  if (!fs.existsSync(folderPath)) return;
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const zipPath = path.join(zipBase, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      addFolderToZip(archive, fullPath, zipPath);
    } else {
      archive.file(fullPath, { name: zipPath });
    }
  }
}

router.get('/backup/full', async (req, res) => {
  try {
    const dbPath = path.join(PROJECT_ROOT, 'bank.db');
    const uploadsDir = path.join(PROJECT_ROOT, 'uploads');

    saveDatabase();

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `gabiley-bank-backup-${timestamp}`;
    const filename = `${folderName}.zip`;

    const zipBuffer = await new Promise((resolve, reject) => {
      const archive = new archiver.ZipArchive({ zlib: { level: 6 } });
      const chunks = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      archive.append(fs.createReadStream(dbPath), { name: `${folderName}/bank.db` });
      addFolderToZip(archive, uploadsDir, `${folderName}/uploads`);

      const metadata = {
        created_at: new Date().toISOString(),
        created_by: req.user.id,
        version: '2.0.0',
        description: 'Gabiley Bank Management System - Full Backup',
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: `${folderName}/backup-info.json` });

      archive.finalize();
    });

    logAudit(req.user.id, 'backup_full_create', 'system', `Full backup created: ${filename}`, req.ip);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(zipBuffer);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.post('/restore/full', fullUpload.single('backupZip'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dbPath = path.join(PROJECT_ROOT, 'bank.db');
    const uploadsDir = path.join(PROJECT_ROOT, 'uploads');
    const backupDir = path.join(PROJECT_ROOT, 'server', 'backups');

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Create pre-restore backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const preBackupFile = `backup-before-restore-${timestamp}.db`;
    const preBackupPath = path.join(backupDir, preBackupFile);
    saveDatabase();
    fs.copyFileSync(dbPath, preBackupPath);

    // Extract ZIP
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    // Find the root folder name inside the zip
    let rootFolder = '';
    for (const entry of zipEntries) {
      const parts = entry.entryName.split('/');
      if (parts.length > 1 && parts[0] && !parts[0].includes('.')) {
        rootFolder = parts[0];
        break;
      }
    }

    if (!rootFolder) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    // Restore database
    const dbEntry = zipEntries.find(e => e.entryName === `${rootFolder}/bank.db`);
    if (dbEntry) {
      fs.writeFileSync(dbPath, dbEntry.getData());
    }

    // Restore uploads
    const uploadsEntries = zipEntries.filter(e => e.entryName.startsWith(`${rootFolder}/uploads/`) && !e.isDirectory);
    for (const entry of uploadsEntries) {
      const relativePath = entry.entryName.slice(`${rootFolder}/uploads/`.length);
      const destPath = path.join(uploadsDir, relativePath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
    }

    initDatabase();

    logAudit(req.user.id, 'database_restore_full', 'system', `Full system restored from uploaded file: ${req.file.originalname}. Pre-restore backup: ${preBackupFile}. Uploads restored: ${uploadsEntries.length}`, req.ip);
    res.json({
      message: 'System restored successfully',
      restoredFrom: req.file.originalname,
      preRestoreBackup: preBackupFile,
      uploadsRestored: uploadsEntries.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
