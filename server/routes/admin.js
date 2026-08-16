const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { queryOne, queryAll, run, logAudit, logLoginHistory, getSetting, saveDatabase, getDb, initDatabase, createNotification } = require('../db');
const { authenticateToken, authorize, requireAdmin, requireCSOrAdmin, requireICT, requireAdminOrICT, requireSuperAdmin } = require('../middleware/auth');
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

// ICT Staff routes - password and PIN reset
const ictRouter = express.Router();
ictRouter.use(authenticateToken);
ictRouter.use(requireICT);

ictRouter.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'super_admin') return res.status(403).json({ error: 'Cannot reset super admin password' });

    const newPass = password || 'password123';
    const hashed = await bcrypt.hash(newPass, 12);
    run("UPDATE users SET password = ?, password_plain = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?", [hashed, newPass, req.params.id]);

    run("UPDATE password_requests SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE user_id = ? AND request_type = 'password' AND status = 'pending'", [req.user.id, req.params.id]);

    createNotification(req.params.id, 'Password Reset', 'Your password has been reset by ICT support. Please login with your new password.', 'security');

    logAudit(req.user.id, 'password_reset', 'user_management', `ICT reset password for user ${req.params.id}`, req.ip);
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.put('/users/:id/reset-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'super_admin') return res.status(403).json({ error: 'Cannot reset super admin PIN' });

    const newPin = pin || '1234';
    const hashed = await bcrypt.hash(newPin, 10);
    run("UPDATE users SET pin = ?, pin_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashed, newPin, req.params.id]);

    run("UPDATE password_requests SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE user_id = ? AND request_type = 'pin' AND status = 'pending'", [req.user.id, req.params.id]);

    createNotification(req.params.id, 'PIN Reset', 'Your PIN has been reset by ICT support.', 'security');

    logAudit(req.user.id, 'pin_reset', 'user_management', `ICT reset PIN for user ${req.params.id}`, req.ip);
    res.json({ message: 'PIN reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.put('/users/:id/change-username', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });

    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'super_admin') return res.status(403).json({ error: 'Cannot change super admin username' });

    const duplicate = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), req.params.id]);
    if (duplicate) return res.status(400).json({ error: 'Username already taken' });

    run("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?", [username.trim(), req.params.id]);

    createNotification(req.params.id, 'Username Changed', 'Your username has been changed by ICT support.', 'security');

    logAudit(req.user.id, 'username_change', 'user_management', `ICT changed username for user ${req.params.id} to ${username.trim()}`, req.ip);
    res.json({ message: 'Username changed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.get('/users/:id/credentials', async (req, res) => {
  try {
    const user = queryOne('SELECT id, username, full_name, password_plain, pin_plain, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ error: 'Cannot view super admin credentials' });

    logAudit(req.user.id, 'view_credentials', 'user_management', `ICT viewed credentials for user ${user.username} (${user.full_name})`, req.ip);
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

ictRouter.put('/users/:id/credentials', async (req, res) => {
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
    logAudit(req.user.id, 'credentials_update', 'user_management', `ICT updated credentials for user ${user.username}`, req.ip);
    createNotification(user.id, 'Credentials Updated', 'Your login credentials have been updated by ICT staff.', 'security');
    res.json({ message: 'Credentials updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.put('/users/:id/block', async (req, res) => {
  try {
    const existing = queryOne('SELECT id, role, full_name FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'super_admin') return res.status(403).json({ error: 'Cannot block super admin' });

    run("UPDATE users SET status = 'blocked', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    run('DELETE FROM online_users WHERE user_id = ?', [req.params.id]);

    const accounts = queryAll("SELECT id, account_number FROM accounts WHERE user_id = ? AND status != 'blocked'", [req.params.id]);
    for (const acc of accounts) {
      run("UPDATE accounts SET status = 'blocked', updated_at = datetime('now') WHERE id = ?", [acc.id]);
    }

    createNotification(req.params.id, 'Account Blocked', 'Your account has been blocked by ICT support. Please contact the bank for assistance.', 'security');

    logAudit(req.user.id, 'user_block', 'user_management', `ICT blocked user ${existing.full_name} (${req.params.id}) and ${accounts.length} accounts`, req.ip);
    res.json({ message: 'User and accounts blocked', accounts_blocked: accounts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.put('/users/:id/unblock', async (req, res) => {
  try {
    const existing = queryOne('SELECT id, role, full_name FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET status = 'active', failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?", [req.params.id]);

    const accounts = queryAll("SELECT id, account_number FROM accounts WHERE user_id = ? AND status = 'blocked'", [req.params.id]);
    for (const acc of accounts) {
      run("UPDATE accounts SET status = 'active', updated_at = datetime('now') WHERE id = ?", [acc.id]);
    }

    createNotification(req.params.id, 'Account Unblocked', 'Your account has been unblocked by ICT support. You can now log in.', 'success');

    logAudit(req.user.id, 'user_unblock', 'user_management', `ICT unblocked user ${existing.full_name} (${req.params.id}) and ${accounts.length} accounts`, req.ip);
    res.json({ message: 'User and accounts unblocked', accounts_unblocked: accounts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.get('/messages', async (req, res) => {
  try {
    const messages = queryAll(`
      SELECT m.*, u.full_name as sender_name, r.full_name as recipient_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE m.sender_id = ?
      ORDER BY m.created_at DESC
    `, [req.user.id]);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.post('/messages', async (req, res) => {
  try {
    const { recipient_id, subject, message, message_type } = req.body;
    if (!recipient_id || !subject || !message) {
      return res.status(400).json({ error: 'recipient_id, subject, and message are required' });
    }

    const recipient = queryOne('SELECT id, full_name FROM users WHERE id = ?', [recipient_id]);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    run('INSERT INTO messages (sender_id, recipient_id, subject, message, message_type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, recipient_id, subject, message, message_type || 'general']);

    createNotification(recipient_id, subject, message, 'info');

    logAudit(req.user.id, 'message_send', 'user_management', `ICT sent message to ${recipient.full_name} (${recipient_id}): ${subject}`, req.ip);
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.delete('/messages/:id', async (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM messages WHERE id = ? AND sender_id = ?', [req.params.id, req.user.id]);
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    run('DELETE FROM messages WHERE id = ?', [req.params.id]);
    logAudit(req.user.id, 'message_delete', 'user_management', `ICT deleted message ${req.params.id}`, req.ip);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.get('/credentials', async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT id, username, full_name, email, phone, password_plain, pin_plain, role, status, profile_picture, created_at FROM users WHERE role = 'customer'`;
    const params = [];
    if (search) {
      sql += ' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const users = queryAll(sql, params);

    logAudit(req.user.id, 'view_all_credentials', 'user_management', `ICT viewed credentials list (${users.length} users)`, req.ip);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.get('/stats', async (req, res) => {
  try {
    const totalUsers = queryOne('SELECT COUNT(*) as count FROM users').count;
    const totalCustomers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").count;
    const totalStaff = queryOne("SELECT COUNT(*) as count FROM users WHERE role IN ('teller', 'customer_service', 'accountant', 'ict_staff')").count;
    const pendingUsers = queryOne("SELECT COUNT(*) as count FROM users WHERE status = 'pending'").count;
    const blockedUsers = queryOne("SELECT COUNT(*) as count FROM users WHERE status = 'blocked'").count;
    const activeUsers = queryOne("SELECT COUNT(*) as count FROM users WHERE status = 'active'").count;
    const onlineUsers = queryOne('SELECT COUNT(*) as count FROM online_users').count;
    const totalAccounts = queryOne('SELECT COUNT(*) as count FROM accounts').count;
    const blockedAccounts = queryOne("SELECT COUNT(*) as count FROM accounts WHERE status = 'blocked'").count;
    const totalTransactions = queryOne('SELECT COUNT(*) as count FROM transactions').count;
    const pendingPasswordRequests = queryOne("SELECT COUNT(*) as count FROM password_requests WHERE status = 'pending'").count;
    const totalMessages = queryOne('SELECT COUNT(*) as count FROM messages WHERE sender_id = ?', [req.user.id]).count;
    const unreadMessages = queryOne('SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND read = 0', [req.user.id]).count;

    const recentAuditLogs = queryAll(`
      SELECT al.*, u.full_name as user_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.action IN ('password_reset', 'pin_reset', 'username_change', 'user_block', 'user_unblock', 'view_credentials')
      ORDER BY al.created_at DESC LIMIT 10
    `);

    const recentPasswordRequests = queryAll(`
      SELECT pr.*, u.full_name, u.username, u.email
      FROM password_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at DESC LIMIT 5
    `);

    const recentCustomers = queryAll("SELECT id, username, full_name, profile_picture, status, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 5");

    res.json({
      totalUsers, totalCustomers, totalStaff, pendingUsers, blockedUsers, activeUsers,
      onlineUsers, totalAccounts, blockedAccounts, totalTransactions,
      pendingPasswordRequests, totalMessages, unreadMessages,
      recentAuditLogs, recentPasswordRequests, recentCustomers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', requireCSOrAdmin, (req, res) => {
  try {
    const totalUsers = queryOne('SELECT COUNT(*) as count FROM users').count;
    const totalCustomers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").count;
    const totalAdmins = queryOne("SELECT COUNT(*) as count FROM users WHERE role IN ('super_admin', 'branch_manager', 'manager')").count;
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

router.get('/users', requireCSOrAdmin, (req, res) => {
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

router.get('/users/export', requireAdmin, (req, res) => {
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

router.get('/users/:id/details', requireCSOrAdmin, (req, res) => {
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

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, full_name, phone, address, dob, gender, national_id, role, pin } = req.body;

    if (!full_name || full_name.trim().length < 3) return res.status(400).json({ error: 'Full name must be at least 3 characters' });
    if (!email || !validateEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!phone || phone.trim().length < 6) return res.status(400).json({ error: 'Valid phone number is required' });
    if (!pin || !/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4-6 digits' });

    const validRoles = ['customer', 'teller', 'customer_service', 'accountant', 'ict_staff', 'branch_manager', 'manager', 'super_admin'];
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

    run('INSERT INTO users (username, email, password, full_name, phone, address, dob, gender, national_id, pin, role, password_plain, pin_plain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usernameVal, email, hashedPassword, sanitizeInput(full_name.trim()), phone.trim(), sanitizeInput(address || ''), dob || '', gender || '', national_id || '', hashedPin, userRole, password, pin]);

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
      const departments = { teller: 'Operations', customer_service: 'Customer Service', accountant: 'Finance', ict_staff: 'IT', branch_manager: 'Operations', manager: 'Operations' };
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

router.put('/users/:id', requireAdmin, (req, res) => {
  try {
    const { full_name, phone, address, dob, email, gender, national_id, branch, mother_name, id_card_image, purpose } = req.body;
    const existing = queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    run("UPDATE users SET full_name = ?, phone = ?, address = ?, dob = ?, email = ?, gender = ?, national_id = ?, branch = ?, mother_name = ?, id_card_image = ?, updated_at = datetime('now') WHERE id = ?",
      [full_name, phone || '', address || '', dob || '', email, gender || '', national_id || '', branch || '', mother_name || '', id_card_image || '', req.params.id]);

    if (purpose) {
      run("UPDATE accounts SET purpose = ? WHERE user_id = ?", [purpose, req.params.id]);
    }

    logAudit(req.user.id, 'user_update', 'user_management', `Updated user ${req.params.id}`, req.ip);
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/profile-picture', requireAdmin, (req, res) => {
  try {
    const allowedRoles = ['super_admin', 'branch_manager', 'manager', 'ict_staff'];
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Not authorized to change profile pictures' });
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

router.put('/users/:id/role', requireAdmin, (req, res) => {
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

router.put('/users/:id/block', requireAdmin, (req, res) => {
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

router.put('/users/:id/unblock', requireAdmin, (req, res) => {
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

router.put('/users/:id/activate', requireCSOrAdmin, (req, res) => {
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

router.put('/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'super_admin') return res.status(403).json({ error: 'Cannot reset super admin password' });

    const newPass = password || 'password123';
    const hashed = await bcrypt.hash(newPass, 12);
    run("UPDATE users SET password = ?, password_plain = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?", [hashed, newPass, req.params.id]);

    run("UPDATE password_requests SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE user_id = ? AND request_type = 'password' AND status = 'pending'", [req.user.id, req.params.id]);

    const user = queryOne('SELECT full_name FROM users WHERE id = ?', [req.params.id]);
    createNotification(req.params.id, 'Password Reset', 'Your password has been reset by an administrator. Please login with your new password.', 'security');

    logAudit(req.user.id, 'password_reset', 'user_management', `Admin reset password for user ${req.params.id}`, req.ip);
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reset-pin', requireAdmin, async (req, res) => {
  try {
    const { pin } = req.body;
    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'super_admin') return res.status(403).json({ error: 'Cannot reset super admin PIN' });

    const newPin = pin || '1234';
    const hashed = await bcrypt.hash(newPin, 10);
    run("UPDATE users SET pin = ?, pin_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashed, newPin, req.params.id]);

    run("UPDATE password_requests SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now') WHERE user_id = ? AND request_type = 'pin' AND status = 'pending'", [req.user.id, req.params.id]);

    const user = queryOne('SELECT full_name FROM users WHERE id = ?', [req.params.id]);
    createNotification(req.params.id, 'PIN Reset', 'Your PIN has been reset by an administrator.', 'security');

    logAudit(req.user.id, 'pin_reset', 'user_management', `Admin reset PIN for user ${req.params.id}`, req.ip);
    res.json({ message: 'PIN reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reject', requireCSOrAdmin, (req, res) => {
  try {
    const existing = queryOne('SELECT id, role, status, full_name, username FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role !== 'customer') return res.status(400).json({ error: 'Only customers can be rejected' });

    run("UPDATE users SET status = 'rejected', updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    createNotification(req.params.id, 'Registration Rejected', 'Your registration has been rejected. Please contact support for more information.', 'error');

    logAudit(req.user.id, 'user_reject', 'user_management', `Rejected customer ${existing.username} (${existing.full_name})`, req.ip);
    res.json({ message: 'Customer rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/credentials', requireAdminOrICT, (req, res) => {
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

router.put('/users/:id/credentials', requireAdminOrICT, async (req, res) => {
  try {
    const { password, pin } = req.body;
    const user = queryOne('SELECT id, username, full_name, password_plain, pin_plain, role FROM users WHERE id = ?', [req.params.id]);
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

router.put('/users/bulk-set-credentials', requireAdmin, async (req, res) => {
  try {
    const { password, pin, role } = req.body;
    const targetRole = role || 'customer';
    const bcrypt = require('bcryptjs');

    const users = queryAll('SELECT id, username FROM users WHERE role = ? AND (password_plain IS NULL OR password_plain = ?)', [targetRole, '']);

    if (users.length === 0) {
      return res.json({ message: 'No users need credential updates', updated: 0 });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    let updated = 0;
    for (const u of users) {
      const updates = [];
      const params = [];
      if (hashedPassword) {
        updates.push('password = ?', 'password_plain = ?');
        params.push(hashedPassword, password);
      }
      if (hashedPin) {
        updates.push('pin = ?', 'pin_plain = ?');
        params.push(hashedPin, pin);
      }
      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(u.id);
        run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        updated++;
      }
    }

    logAudit(req.user.id, 'bulk_credentials_update', 'user_management', `Bulk updated credentials for ${updated} ${targetRole} users`, req.ip);
    res.json({ message: `Updated ${updated} users`, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/password-requests', requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT pr.*, u.full_name, u.username, u.email, u.phone
                 FROM password_requests pr
                 JOIN users u ON pr.user_id = u.id`;
    const params = [];

    if (status) {
      query += ' WHERE pr.status = ?';
      params.push(status);
    }
    query += ' ORDER BY pr.created_at DESC';

    const requests = queryAll(query, params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password-requests/:id/respond', requireAdmin, async (req, res) => {
  try {
    const { response_message, action } = req.body;
    const requestId = req.params.id;

    if (!response_message || response_message.trim().length === 0) {
      return res.status(400).json({ error: 'Response message is required' });
    }

    const validActions = ['pending', 'in_progress', 'resolved', 'rejected'];
    const status = validActions.includes(action) ? action : 'in_progress';

    const request = queryOne(
      `SELECT pr.*, u.full_name, u.username, u.email 
       FROM password_requests pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.id = ?`,
      [requestId]
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });

    run(
      `UPDATE password_requests SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`,
      [status, response_message.trim(), req.user.id, requestId]
    );

    const messageSubject = status === 'resolved' ? 'Password Reset - Request Resolved' 
      : status === 'rejected' ? 'Password Reset - Request Rejected'
      : 'Password Reset - Update on Your Request';

    run(
      'INSERT INTO messages (sender_id, recipient_id, subject, message, message_type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, request.user_id, messageSubject, response_message.trim(), 'security']
    );

    createNotification(
      request.user_id,
      messageSubject,
      response_message.trim(),
      status === 'resolved' ? 'success' : status === 'rejected' ? 'error' : 'info'
    );

    logAudit(req.user.id, 'password_request_respond', 'user_management', 
      `Admin responded to password request #${requestId} for ${request.full_name} (${request.username}): ${status}`, req.ip);

    res.json({ message: 'Response sent successfully', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/freeze-account', requireAdmin, (req, res) => {
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

router.put('/users/:id/unfreeze-account', requireAdmin, (req, res) => {
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

router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const existing = queryOne('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    // Prevent deleting super_admin
    if (existing.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin user' });
    }

    // Prevent deleting yourself
    if (existing.id === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

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

router.get('/users/:id/login-history', requireAdmin, (req, res) => {
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

router.get('/users/:id/timeline', requireCSOrAdmin, (req, res) => {
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

router.get('/employees', requireAdmin, (req, res) => {
  try {
    const { search, department, status } = req.query;
    let sql = 'SELECT e.*, u.profile_picture, u.email as user_email, u.username as user_username FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE 1=1';
    const params = [];
    if (search) {
      sql += ' AND (e.full_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department) { sql += ' AND e.department = ?'; params.push(department); }
    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    sql += ' ORDER BY e.created_at DESC';
    res.json(queryAll(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employees/:id', requireAdmin, (req, res) => {
  try {
    const emp = queryOne('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const user = emp.user_id ? queryOne(
      'SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, branch, last_login, created_at, updated_at FROM users WHERE id = ?',
      [emp.user_id]
    ) : null;

    const loginHistory = emp.user_id ? queryAll(
      'SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [emp.user_id]
    ) : [];

    const recentAudits = emp.user_id ? queryAll(
      'SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [emp.user_id]
    ) : [];

    const today = new Date().toISOString().split('T')[0];
    const transactionsToday = emp.user_id
      ? queryOne("SELECT COUNT(*) as count FROM transactions WHERE processed_by = ? AND date(created_at) = ?", [emp.user_id, today]).count
      : 0;
    const totalTransactions = emp.user_id
      ? queryOne("SELECT COUNT(*) as count FROM transactions WHERE processed_by = ?", [emp.user_id]).count
      : 0;
    const totalAmountProcessed = emp.user_id
      ? queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE processed_by = ?", [emp.user_id]).total
      : 0;

    res.json({
      ...emp,
      user,
      loginHistory,
      recentAudits,
      stats: {
        transactionsToday,
        totalTransactions,
        totalAmountProcessed,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/employees', requireAdmin, async (req, res) => {
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

    run('INSERT INTO users (username, email, password, full_name, phone, role, branch, password_plain, pin_plain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usernameVal, email, hashedPassword, full_name, phone || '', userRole, branch || '', password || '', pin || '']);

    const user = queryOne('SELECT id FROM users WHERE username = ?', [usernameVal]);

    // Hash PIN if provided
    if (pin && /^\d{4,6}$/.test(pin)) {
      const hashedPin = await bcrypt.hash(pin, 10);
      run('UPDATE users SET pin = ?, pin_plain = ? WHERE id = ?', [hashedPin, pin, user.id]);
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

router.put('/employees/:id', requireAdmin, (req, res) => {
  try {
    const { full_name, email, phone, department, position, salary, hire_date, branch, status, profile_picture } = req.body;
    const existing = queryOne('SELECT id, user_id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    run('UPDATE employees SET full_name=?, email=?, phone=?, department=?, position=?, salary=?, hire_date=?, branch=?, status=? WHERE id=?',
      [full_name, email, phone || '', department, position, salary || 0, hire_date, branch || '', status || 'active', req.params.id]);

    if (existing.user_id) {
      const userUpdates = ["full_name=?", "email=?", "phone=?", "branch=?", "updated_at=datetime('now')"];
      const userParams = [full_name, email, phone || '', branch || ''];
      if (profile_picture !== undefined) {
        userUpdates.push("profile_picture=?");
        userParams.push(profile_picture || null);
      }
      userParams.push(existing.user_id);
      run(`UPDATE users SET ${userUpdates.join(', ')} WHERE id=?`, userParams);
    }

    logAudit(req.user.id, 'employee_update', 'employee_management', `Updated employee ${req.params.id}`, req.ip);
    res.json({ message: 'Employee updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    const existing = queryOne('SELECT id, user_id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const empPassword = password || 'employee123';
    const hashed = await bcrypt.hash(empPassword, 12);
    if (existing.user_id) {
      run("UPDATE users SET password = ?, password_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashed, empPassword, existing.user_id]);
    }
    logAudit(req.user.id, 'employee_password_reset', 'employee_management', `Reset password for employee ${req.params.id}`, req.ip);
    res.json({ message: 'Employee password reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/employees/:id', requireAdmin, (req, res) => {
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

router.put('/employees/branch/all', authorize('super_admin', 'branch_manager'), (req, res) => {
  try {
    const { branch } = req.body;
    if (!branch) return res.status(400).json({ error: 'Branch is required' });

    run("UPDATE employees SET branch = ?", [branch]);
    run("UPDATE users SET branch = ?, updated_at = datetime('now') WHERE role != 'customer'", [branch]);

    logAudit(req.user.id, 'bulk_branch_update', 'employee_management', `Updated all employees branch to ${branch}`, req.ip);
    res.json({ message: `All employees branch updated to ${branch}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id/role', authorize('super_admin', 'branch_manager'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['customer', 'teller', 'customer_service', 'accountant', 'ict_staff', 'branch_manager', 'manager', 'super_admin'];
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

router.get('/employees/:id/performance', requireCSOrAdmin, (req, res) => {
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

router.put('/accounts/:id/block', requireAdmin, (req, res) => {
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

router.put('/accounts/:id/unblock', requireAdmin, (req, res) => {
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

router.put('/accounts/:id/freeze', requireAdmin, (req, res) => {
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

router.put('/accounts/:id/unfreeze', requireAdmin, (req, res) => {
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

router.put('/accounts/:id/balance', requireAdmin, (req, res) => {
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

router.get('/loans', requireCSOrAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT l.id, l.user_id, l.amount, l.term_months, l.purpose, l.loan_type, l.monthly_income, l.status, l.reviewed_by, l.review_notes, l.created_at, l.updated_at, l.disbursed_at, l.total_paid, l.interest_rate, COALESCE(NULLIF(l.account_number, ''), ac.account_number) as account_number, ac.balance as account_balance, u.full_name, u.email, u.phone FROM loan_requests l LEFT JOIN users u ON l.user_id = u.id LEFT JOIN accounts ac ON ac.user_id = l.user_id WHERE 1=1";
    const params = [];
    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    sql += ' ORDER BY l.created_at DESC';
    res.json(queryAll(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/loans/:id/approve', requireCSOrAdmin, (req, res) => {
  try {
    const existing = queryOne('SELECT id, user_id, amount FROM loan_requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    const { review_notes } = req.body;

    // Find customer account
    const account = queryOne('SELECT id, account_number FROM accounts WHERE user_id = ? AND status = ?', [existing.user_id, 'active']);
    if (!account) return res.status(400).json({ error: 'Customer has no active account for disbursement' });

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

router.put('/loans/:id/reject', requireCSOrAdmin, (req, res) => {
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

router.get('/announcements', requireCSOrAdmin, (req, res) => {
  try {
    const announcements = queryAll('SELECT a.*, u.full_name as creator_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/announcements', requireAdmin, (req, res) => {
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

router.put('/announcements/:id', requireAdmin, (req, res) => {
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

router.delete('/announcements/:id', requireAdmin, (req, res) => {
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

router.get('/settings', requireAdmin, (req, res) => {
  try {
    const settings = queryAll('SELECT * FROM system_settings ORDER BY setting_key');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', requireAdmin, (req, res) => {
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

router.get('/online', requireAdmin, (req, res) => {
  try {
    const online = queryAll('SELECT o.*, u.full_name, u.username, u.role FROM online_users o LEFT JOIN users u ON o.user_id = u.id');
    res.json(online);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', requireAdminOrICT, (req, res) => {
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

router.get('/login-history', requireAdmin, (req, res) => {
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

router.post('/backup', requireAdmin, (req, res) => {
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

router.post('/restore', requireAdmin, (req, res) => {
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

router.get('/backups', requireAdmin, (req, res) => {
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

router.get('/backup/download', requireAdmin, (req, res) => {
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

router.post('/restore/upload', requireAdmin, upload.single('backupFile'), (req, res) => {
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

router.get('/backup/full', requireAdmin, async (req, res) => {
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

router.post('/restore/full', requireAdmin, fullUpload.single('backupZip'), (req, res) => {
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

ictRouter.get('/password-requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT pr.*, u.full_name, u.username, u.email, u.phone
                 FROM password_requests pr
                 JOIN users u ON pr.user_id = u.id`;
    const params = [];

    if (status) {
      query += ' WHERE pr.status = ?';
      params.push(status);
    }
    query += ' ORDER BY pr.created_at DESC';

    const requests = queryAll(query, params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ictRouter.put('/password-requests/:id/respond', async (req, res) => {
  try {
    const { response_message, action } = req.body;
    const requestId = req.params.id;

    if (!response_message || response_message.trim().length === 0) {
      return res.status(400).json({ error: 'Response message is required' });
    }

    const validActions = ['pending', 'in_progress', 'resolved', 'rejected'];
    const status = validActions.includes(action) ? action : 'in_progress';

    const request = queryOne(
      `SELECT pr.*, u.full_name, u.username, u.email 
       FROM password_requests pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.id = ?`,
      [requestId]
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });

    run(
      `UPDATE password_requests SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`,
      [status, response_message.trim(), req.user.id, requestId]
    );

    const messageSubject = status === 'resolved' ? 'Password Reset - Request Resolved' 
      : status === 'rejected' ? 'Password Reset - Request Rejected'
      : 'Password Reset - Update on Your Request';

    run(
      'INSERT INTO messages (sender_id, recipient_id, subject, message, message_type) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, request.user_id, messageSubject, response_message.trim(), 'security']
    );

    createNotification(
      request.user_id,
      messageSubject,
      response_message.trim(),
      status === 'resolved' ? 'success' : status === 'rejected' ? 'error' : 'info'
    );

    logAudit(req.user.id, 'password_request_respond', 'user_management', 
      `ICT responded to password request #${requestId} for ${request.full_name} (${request.username}): ${status}`, req.ip);

    res.json({ message: 'Response sent successfully', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TOP USERS ENDPOINT ====================

router.get('/top-users', requireAdmin, (req, res) => {
  try {
    // Top 10 most active users by login count
    const topByLogins = queryAll(`
      SELECT u.id, u.full_name, u.username, u.role, u.profile_picture, u.branch,
             COUNT(lh.id) as login_count,
             MAX(lh.created_at) as last_login
      FROM users u
      LEFT JOIN login_history lh ON u.id = lh.user_id AND lh.status = 'success'
      GROUP BY u.id
      HAVING login_count > 0
      ORDER BY login_count DESC
      LIMIT 10
    `);

    // Top 10 users by transaction count (as customers)
    const topByTransactions = queryAll(`
      SELECT u.id, u.full_name, u.username, u.role, u.profile_picture, u.branch,
             COUNT(t.id) as transaction_count,
             COALESCE(SUM(t.amount), 0) as total_amount
      FROM users u
      JOIN accounts a ON u.id = a.user_id
      JOIN transactions t ON (a.id = t.from_account_id OR a.id = t.to_account_id)
      GROUP BY u.id
      ORDER BY transaction_count DESC
      LIMIT 10
    `);

    // Top 10 employees by transactions processed
    const topEmployees = queryAll(`
      SELECT u.id, u.full_name, u.username, u.role, u.profile_picture, u.branch,
             COUNT(t.id) as processed_count,
             COALESCE(SUM(t.amount), 0) as total_amount
      FROM users u
      JOIN transactions t ON u.id = t.processed_by
      WHERE u.role IN ('teller', 'customer_service', 'accountant', 'manager', 'super_admin', 'branch_manager')
      GROUP BY u.id
      ORDER BY processed_count DESC
      LIMIT 10
    `);

    // Activity summary by role
    const activityByRole = queryAll(`
      SELECT role,
             COUNT(*) as total_users,
             SUM(CASE WHEN last_login >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as active_this_week,
             SUM(CASE WHEN last_login >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as active_this_month,
             SUM(CASE WHEN last_login IS NOT NULL THEN 1 ELSE 0 END) as ever_logged_in
      FROM users
      GROUP BY role
      ORDER BY total_users DESC
    `);

    // Overall stats
    const totalActive = queryOne("SELECT COUNT(*) as count FROM users WHERE status = 'active'").count;
    const totalLoginsThisWeek = queryOne("SELECT COUNT(*) as count FROM login_history WHERE created_at >= datetime('now', '-7 days') AND status = 'success'").count;
    const totalLoginsThisMonth = queryOne("SELECT COUNT(*) as count FROM login_history WHERE created_at >= datetime('now', '-30 days') AND status = 'success'").count;
    const onlineNow = queryOne('SELECT COUNT(*) as count FROM online_users').count;

    // Top accounts by balance
    const topAccounts = queryAll(`
      SELECT u.id, u.full_name, u.username, u.role, u.profile_picture,
             a.account_number, a.account_type, a.balance
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.balance DESC
      LIMIT 10
    `);

    res.json({
      topByLogins,
      topByTransactions,
      topEmployees,
      activityByRole,
      topAccounts,
      stats: {
        totalActive,
        totalLoginsThisWeek,
        totalLoginsThisMonth,
        onlineNow,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { adminRouter: router, ictRouter };
