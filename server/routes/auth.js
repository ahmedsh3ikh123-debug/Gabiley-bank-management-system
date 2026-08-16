const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { queryOne, queryAll, run, logAudit, logLoginHistory, createNotification, saveDatabase, getDb, getSetting } = require('../db');
const { generateTokens, verifyRefreshToken, authenticateToken, storeRefreshToken, removeRefreshToken, removeAllRefreshTokens, isValidRefreshToken } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function parseUserAgent(ua) {
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  let device = 'Desktop';
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, device };
}

function validateRegistration(body) {
  const errors = [];
  const { full_name, email, password, confirm_password, phone, pin } = body;

  if (!full_name || full_name.trim().length < 3) errors.push('Full name must be at least 3 characters');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a special character');
  if (confirm_password && password !== confirm_password) errors.push('Passwords do not match');
  if (!phone || phone.trim().length < 6) errors.push('Valid phone number is required');
  if (!pin || !/^\d{4,6}$/.test(pin)) errors.push('PIN must be 4-6 digits');

  return errors;
}

// ─── Public Registration (Customer, Employee, Admin) ───
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirm_password, full_name, phone, address, dob, gender, national_id, pin, role, mother_name, id_card_image, account_type, purpose } = req.body;

    const validationErrors = validateRegistration(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0], errors: validationErrors });
    }

    const validRoles = ['customer', 'employee', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'customer';

    const existingEmail = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    const existingPhone = queryOne('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingPhone) return res.status(400).json({ error: 'Phone number already registered' });

    const usernameVal = username || email.split('@')[0];
    const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [usernameVal]);
    if (existingUsername) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const hashedPin = await bcrypt.hash(pin, 10);

    // Map role values to database role values
    const dbRoleMap = {
      customer: 'customer',
      employee: 'teller',
      admin: 'branch_manager',
      manager: 'manager',
    };
    const dbRole = dbRoleMap[userRole] || 'customer';

    const initialStatus = dbRole === 'customer' ? 'pending' : 'active';

    run(
      `INSERT INTO users (username, email, password, full_name, phone, address, dob, gender, national_id, pin, role, status, password_plain, pin_plain, mother_name, id_card_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usernameVal, email, hashedPassword, full_name.trim(), phone.trim(), address || '', dob || '', gender || '', national_id || '', hashedPin, dbRole, initialStatus, password, pin, mother_name || '', id_card_image || '']
    );

    const user = queryOne('SELECT id FROM users WHERE username = ?', [usernameVal]);

    if (dbRole === 'customer') {
      const admins = queryAll("SELECT id FROM users WHERE role IN ('super_admin', 'branch_manager', 'manager', 'ict_staff') AND status = 'active'");
      for (const admin of admins) {
        createNotification(
          admin.id,
          'New Customer Registration',
          `${full_name} (${usernameVal}) has registered and is pending approval.`,
          'warning'
        );
      }
    }

    // Auto-create account for customers
    if (dbRole === 'customer') {
      const lastAccount = queryOne('SELECT account_number FROM accounts ORDER BY id DESC LIMIT 1');
      let nextNum = 1;
      if (lastAccount) {
        const match = lastAccount.account_number.match(/^ACC-(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const accountNumber = 'ACC-' + String(nextNum).padStart(3, '0');
      const selectedAccountType = account_type || 'savings';
      run('INSERT INTO accounts (user_id, account_number, account_type, balance, purpose) VALUES (?, ?, ?, ?, ?)', [user.id, accountNumber, selectedAccountType, 0, purpose || '']);
    }

    // Auto-create employee record for staff roles
    if (dbRole !== 'customer' && dbRole !== 'super_admin') {
      const employeeId = 'EMP' + String(user.id).padStart(5, '0');
      const departments = { teller: 'Operations', customer_service: 'Customer Service', accountant: 'Finance', ict_staff: 'IT', branch_manager: 'Operations', manager: 'Operations' };
      run('INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, employeeId, full_name.trim(), email, phone.trim(), departments[dbRole] || 'Operations', dbRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), new Date().toISOString().split('T')[0]]);
    }

    logAudit(user.id, 'register', 'auth', `New ${userRole} registered: ${full_name}`, req.ip);
    createNotification(user.id, 'Welcome to Gabiley Bank!', `Welcome ${full_name}. Your ${userRole} account has been created successfully.`, 'success');

    const { accessToken, refreshToken } = generateTokens(user.id);
    storeRefreshToken(user.id, refreshToken, req.get('User-Agent') || '');

    const fullUser = queryOne(
      'SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, mother_name, id_card_image, created_at FROM users WHERE id = ?',
      [user.id]
    );
    res.status(201).json({ token: accessToken, refreshToken, user: fullUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const user = queryOne(
      'SELECT id, username, email, password, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, last_login, failed_login_attempts, locked_until, created_at FROM users WHERE username = ?',
      [username]
    );
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Your account is pending approval. Please wait for an admin to activate your account.' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account is blocked. Contact support.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Your registration has been rejected. Please contact support for more information.' });

    if (user.locked_until) {
      const lockTime = new Date(user.locked_until);
      if (lockTime > new Date()) {
        const minutesLeft = Math.ceil((lockTime - new Date()) / 60000);
        return res.status(403).json({ error: `Account is locked. Try again in ${minutesLeft} minute(s).` });
      }
      run('UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?', [user.id]);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const maxAttempts = parseInt(getSetting('pin_max_attempts') || '5', 10);
      const lockoutMinutes = parseInt(getSetting('pin_lockout_minutes') || '30', 10);

      let lockedUntil = null;
      if (newAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + lockoutMinutes * 60000).toISOString();
      }

      run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [newAttempts, lockedUntil, user.id]);
      logAudit(user.id, 'login_failed', 'auth', `Failed login attempt for ${username} (attempt ${newAttempts}/${maxAttempts})`, req.ip, 'failed');

      if (newAttempts >= maxAttempts) {
        createNotification(user.id, 'Account Locked', `Your account has been locked for ${lockoutMinutes} minutes due to too many failed login attempts.`, 'security');
        return res.status(403).json({ error: `Account locked for ${lockoutMinutes} minutes due to too many failed attempts.` });
      }
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    run('UPDATE users SET last_login = datetime(\'now\'), failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

    const ua = req.get('User-Agent') || '';
    const ip = req.ip || req.connection?.remoteAddress || '';
    const { browser, device } = parseUserAgent(ua);

    logLoginHistory(user.id, ip, ua, browser, device, 'success');
    logAudit(user.id, 'login', 'auth', `User logged in: ${username}`, req.ip);

    run('INSERT INTO online_users (user_id, ip_address, user_agent) VALUES (?, ?, ?)', [user.id, ip, ua]);

    const { accessToken, refreshToken } = generateTokens(user.id);
    storeRefreshToken(user.id, refreshToken, ua);

    const { password: _, ...safeUser } = user;
    res.json({ token: accessToken, refreshToken, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.type !== 'refresh') return res.status(403).json({ error: 'Invalid token type' });

    if (!isValidRefreshToken(refreshToken)) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const user = queryOne('SELECT id FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(403).json({ error: 'User not found' });

    removeRefreshToken(refreshToken);
    const tokens = generateTokens(user.id);
    storeRefreshToken(user.id, tokens.refreshToken, req.get('User-Agent') || '');
    res.json(tokens);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Refresh token expired' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      removeRefreshToken(refreshToken);
    }
    run('DELETE FROM online_users WHERE user_id = ? AND user_agent = ?', [req.user.id, req.get('User-Agent') || '']);
    logAudit(req.user.id, 'logout', 'auth', 'User logged out', req.ip);
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = queryOne(
      'SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, last_login, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, phone, address, dob, email, gender, national_id } = req.body;
    run(
      'UPDATE users SET full_name = ?, phone = ?, address = ?, dob = ?, email = ?, gender = ?, national_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [full_name, phone || '', address || '', dob || '', email, gender || '', national_id || '', req.user.id]
    );
    logAudit(req.user.id, 'profile_update', 'auth', 'Profile updated', req.ip);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Current and new password are required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = queryOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHashed = await bcrypt.hash(new_password, 12);
    run('UPDATE users SET password = ?, password_plain = ? WHERE id = ?', [newHashed, new_password, req.user.id]);
    removeAllRefreshTokens(req.user.id);
    run('DELETE FROM online_users WHERE user_id = ?', [req.user.id]);
    logAudit(req.user.id, 'password_change', 'auth', 'Password changed, all sessions revoked', req.ip);
    createNotification(req.user.id, 'Password Changed', 'Your password has been successfully changed. All other sessions have been revoked.', 'security');
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = queryOne('SELECT id, full_name, email FROM users WHERE email = ?', [email]);
    if (!user) return res.json({ message: 'If the email exists, a reset code has been sent' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    run('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, code, expiresAt]);
    logAudit(user.id, 'forgot_password', 'auth', `Password reset requested for ${email}`, req.ip);
    createNotification(user.id, 'Password Reset Requested', 'A password reset was requested. If you did not request this, contact support immediately.', 'security');

    try {
      const { sendResetCode } = require('../utils/email');
      await sendResetCode(user.email, code, user.full_name);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    res.json({ message: 'If the email exists, a reset code has been sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ error: 'Token and new password are required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const resetRecord = queryOne('SELECT id, user_id, expires_at, used FROM password_resets WHERE token = ?', [token]);
    if (!resetRecord) return res.status(400).json({ error: 'Invalid or expired reset token' });
    if (resetRecord.used) return res.status(400).json({ error: 'Reset token has already been used' });
    if (new Date(resetRecord.expires_at) < new Date()) return res.status(400).json({ error: 'Reset token has expired' });

    const newHashed = await bcrypt.hash(new_password, 12);
    run('UPDATE users SET password = ?, password_plain = ? WHERE id = ?', [newHashed, new_password, resetRecord.user_id]);
    removeAllRefreshTokens(resetRecord.user_id);
    run('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
    run('DELETE FROM online_users WHERE user_id = ?', [resetRecord.user_id]);
    logAudit(resetRecord.user_id, 'password_reset', 'auth', 'Password reset completed, all sessions revoked', req.ip);
    createNotification(resetRecord.user_id, 'Password Reset Complete', 'Your password has been successfully reset. All sessions have been revoked.', 'security');
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/set-pin', authenticateToken, async (req, res) => {
  try {
    const { pin, current_password } = req.body;
    if (!pin || !current_password) return res.status(400).json({ error: 'PIN and current password are required' });
    if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4-6 digits' });

    const user = queryOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashedPin = await bcrypt.hash(pin, 10);
    run('UPDATE users SET pin = ?, pin_plain = ? WHERE id = ?', [hashedPin, pin, req.user.id]);
    logAudit(req.user.id, 'pin_set', 'auth', 'Transaction PIN set', req.ip);
    res.json({ message: 'PIN set successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile-picture', authenticateToken, (req, res) => {
  try {
    const { profile_picture } = req.body;
    run("UPDATE users SET profile_picture = ?, updated_at = datetime('now') WHERE id = ?", [profile_picture || '', req.user.id]);
    logAudit(req.user.id, 'profile_picture', 'auth', 'Profile picture updated', req.ip);
    res.json({ message: 'Profile picture updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request-password-reset', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const user = queryOne('SELECT id, full_name, username, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    run(
      `INSERT INTO password_requests (user_id, request_type, message, status) VALUES (?, 'password', ?, 'pending')`,
      [req.user.id, message || 'Customer requested password reset']
    );

    const admins = queryAll("SELECT id FROM users WHERE role IN ('super_admin', 'branch_manager', 'manager', 'ict_staff') AND status = 'active'");
    for (const admin of admins) {
      createNotification(
        admin.id,
        'Password Reset Request',
        `${user.full_name} (${user.username}) has requested a password reset. Reason: ${message || 'Not specified'}`,
        'warning'
      );
    }

    logAudit(req.user.id, 'password_request', 'auth', `Password reset requested: ${message || 'Not specified'}`, req.ip);
    res.json({ message: 'Your request has been sent to the admin team' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request-pin-reset', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const user = queryOne('SELECT id, full_name, username, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    run(
      `INSERT INTO password_requests (user_id, request_type, message, status) VALUES (?, 'pin', ?, 'pending')`,
      [req.user.id, message || 'Customer requested PIN reset']
    );

    const admins = queryAll("SELECT id FROM users WHERE role IN ('super_admin', 'branch_manager', 'manager', 'ict_staff') AND status = 'active'");
    for (const admin of admins) {
      createNotification(
        admin.id,
        'PIN Reset Request',
        `${user.full_name} (${user.username}) has requested a PIN reset. Reason: ${message || 'Not specified'}`,
        'warning'
      );
    }

    logAudit(req.user.id, 'pin_request', 'auth', `PIN reset requested: ${message || 'Not specified'}`, req.ip);
    res.json({ message: 'Your request has been sent to the admin team' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request-admin-reset', async (req, res) => {
  try {
    const { email, username, reason } = req.body;
    if (!email && !username) return res.status(400).json({ error: 'Email or username is required' });

    const user = queryOne(
      'SELECT id, full_name, username, email FROM users WHERE email = ? OR username = ?',
      [email || '', username || '']
    );
    if (!user) return res.json({ message: 'If the account exists, your request has been sent to the admin team' });

    run(
      `INSERT INTO password_requests (user_id, request_type, message, status) VALUES (?, 'password', ?, 'pending')`,
      [user.id, reason || 'User requested password reset via forgot password page']
    );

    const admins = queryAll("SELECT id, full_name FROM users WHERE role IN ('super_admin', 'branch_manager', 'manager', 'ict_staff') AND status = 'active'");
    for (const admin of admins) {
      createNotification(
        admin.id,
        'Password Reset Request',
        `${user.full_name} (${user.username}) has requested a password reset. Reason: ${reason || 'Not specified'}`,
        'warning'
      );
    }

    logAudit(user.id, 'password_request', 'auth', `Password reset requested via forgot page: ${reason || 'Not specified'}`, req.ip);
    res.json({ message: 'If the account exists, your request has been sent to the admin team' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cleanup expired refresh tokens periodically
setInterval(() => {
  try {
    run("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')");
    run("DELETE FROM online_users WHERE last_active < datetime('now', '-1 day')");
  } catch (e) { /* ignore */ }
}, 60 * 60 * 1000); // Every hour

module.exports = router;
