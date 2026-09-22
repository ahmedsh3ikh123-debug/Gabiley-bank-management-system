const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, run, logAudit, createNotification, saveDatabase } = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get current user's full profile
router.get('/my-profile', (req, res) => {
  try {
    const user = queryOne(`
      SELECT id, username, email, full_name, phone, address, dob, gender, national_id, 
             profile_picture, role, status, branch, mother_name, id_card_image, 
             last_login, created_at, updated_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const employee = queryOne('SELECT * FROM employees WHERE user_id = ?', [req.user.id]);
    const accounts = queryAll('SELECT * FROM accounts WHERE user_id = ?', [req.user.id]);

    res.json({ user, employee, accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own profile (employee self-service)
router.put('/my-profile', (req, res) => {
  try {
    const { full_name, phone, email, address, dob, gender, national_id, mother_name, profile_picture } = req.body;

    const existing = queryOne('SELECT id, username, full_name FROM users WHERE id = ?', [req.user.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone.trim());
    }
    if (email !== undefined) {
      const emailExists = queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), req.user.id]);
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use by another account' });
      }
      updates.push('email = ?');
      params.push(email.trim());
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address.trim());
    }
    if (dob !== undefined) {
      updates.push('dob = ?');
      params.push(dob);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      params.push(gender);
    }
    if (national_id !== undefined) {
      updates.push('national_id = ?');
      params.push(national_id.trim());
    }
    if (mother_name !== undefined) {
      updates.push('mother_name = ?');
      params.push(mother_name.trim());
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      params.push(profile_picture);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);

    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Sync to employees table if employee
    const empUpdates = [];
    const empParams = [];
    if (full_name !== undefined) {
      empUpdates.push('full_name = ?');
      empParams.push(full_name.trim());
    }
    if (phone !== undefined) {
      empUpdates.push('phone = ?');
      empParams.push(phone.trim());
    }
    if (email !== undefined) {
      empUpdates.push('email = ?');
      empParams.push(email.trim());
    }
    if (profile_picture !== undefined) {
      empUpdates.push('profile_picture = ?');
      empParams.push(profile_picture || null);
    }
    if (empUpdates.length > 0) {
      empParams.push(req.user.id);
      run(`UPDATE employees SET ${empUpdates.join(', ')} WHERE user_id = ?`, empParams);
    }

    logAudit(req.user.id, 'profile_update', 'profile', `User updated their own profile`, req.ip);

    const updated = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change own username
router.put('/my-username', (req, res) => {
  try {
    const { username, current_password } = req.body;

    if (req.user.role === 'customer' || req.user.role === 'ict_staff') {
      return res.status(403).json({ error: 'You are not allowed to change your username. Contact admin.' });
    }

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (!current_password) {
      return res.status(400).json({ error: 'Current password is required to change username' });
    }

    const user = queryOne('SELECT id, username, password FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password
    const bcrypt = require('bcryptjs');
    const validPassword = bcrypt.compareSync(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if username already exists
    const existing = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), req.user.id]);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const oldUsername = user.username;
    run("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?", [username.trim(), req.user.id]);

    logAudit(req.user.id, 'username_change', 'profile', `Changed username from ${oldUsername} to ${username.trim()}`, req.ip);
    createNotification(req.user.id, 'Username Changed', `Your username has been changed to ${username.trim()}`, 'info');

    res.json({ message: 'Username changed successfully', username: username.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change own password
router.put('/my-password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = queryOne('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bcrypt = require('bcryptjs');
    const validPassword = bcrypt.compareSync(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    run("UPDATE users SET password = ?, password_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashedPassword, new_password, req.user.id]);

    logAudit(req.user.id, 'password_change', 'profile', 'User changed their own password', req.ip);
    createNotification(req.user.id, 'Password Changed', 'Your password has been changed successfully.', 'security');

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change own PIN
router.put('/my-pin', async (req, res) => {
  try {
    const { current_pin, new_pin } = req.body;

    if (!current_pin || !new_pin) {
      return res.status(400).json({ error: 'Current and new PIN are required' });
    }

    if (!/^\d{4,6}$/.test(new_pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    const user = queryOne('SELECT id, pin FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bcrypt = require('bcryptjs');
    const validPin = bcrypt.compareSync(current_pin, user.pin);
    if (!validPin) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    const hashedPin = await bcrypt.hash(new_pin, 10);
    run("UPDATE users SET pin = ?, pin_plain = ?, updated_at = datetime('now') WHERE id = ?", [hashedPin, new_pin, req.user.id]);

    logAudit(req.user.id, 'pin_change', 'profile', 'User changed their own PIN', req.ip);
    createNotification(req.user.id, 'PIN Changed', 'Your PIN has been changed successfully.', 'security');

    res.json({ message: 'PIN changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update any user's profile (syncs everywhere)
router.put('/admin/user/:id', authorize('super_admin', 'branch_manager', 'manager'), (req, res) => {
  try {
    const { full_name, phone, address, dob, email, gender, national_id, branch, mother_name, id_card_image, profile_picture, username } = req.body;

    const existing = queryOne('SELECT id, username, full_name, email FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone.trim());
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address.trim());
    }
    if (dob !== undefined) {
      updates.push('dob = ?');
      params.push(dob);
    }
    if (email !== undefined) {
      // Check email uniqueness
      const emailExists = queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
      if (emailExists) return res.status(400).json({ error: 'Email already in use' });
      updates.push('email = ?');
      params.push(email.trim());
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      params.push(gender);
    }
    if (national_id !== undefined) {
      updates.push('national_id = ?');
      params.push(national_id.trim());
    }
    if (branch !== undefined) {
      updates.push('branch = ?');
      params.push(branch);
    }
    if (mother_name !== undefined) {
      updates.push('mother_name = ?');
      params.push(mother_name.trim());
    }
    if (id_card_image !== undefined) {
      updates.push('id_card_image = ?');
      params.push(id_card_image);
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      params.push(profile_picture);
    }
    if (username !== undefined) {
      // Check username uniqueness
      if (username.trim().length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      const usernameExists = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), req.params.id]);
      if (usernameExists) return res.status(400).json({ error: 'Username already taken' });
      updates.push('username = ?');
      params.push(username.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Sync to employees table
    const empUpdates = [];
    const empParams = [];
    if (full_name !== undefined) {
      empUpdates.push('full_name = ?');
      empParams.push(full_name.trim());
    }
    if (phone !== undefined) {
      empUpdates.push('phone = ?');
      empParams.push(phone.trim());
    }
    if (email !== undefined) {
      empUpdates.push('email = ?');
      empParams.push(email.trim());
    }
    if (profile_picture !== undefined) {
      empUpdates.push('profile_picture = ?');
      empParams.push(profile_picture || null);
    }
    if (empUpdates.length > 0) {
      empParams.push(req.params.id);
      run(`UPDATE employees SET ${empUpdates.join(', ')} WHERE user_id = ?`, empParams);
    }

    // Log changes
    const changes = Object.keys(req.body).filter(k => req.body[k] !== undefined).join(', ');
    logAudit(req.user.id, 'admin_profile_update', 'user_management', `Admin updated profile for user ${req.params.id}: ${changes}`, req.ip);
    createNotification(req.params.id, 'Profile Updated', 'Your profile has been updated by an administrator.', 'info');

    const updated = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Change any user's username
router.put('/admin/user/:id/username', authorize('super_admin', 'branch_manager', 'manager', 'ict_staff'), (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const existing = queryOne('SELECT id, username, role FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (existing.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot change super admin username' });
    }

    const usernameExists = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), req.params.id]);
    if (usernameExists) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const oldUsername = existing.username;
    run("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?", [username.trim(), req.params.id]);

    logAudit(req.user.id, 'admin_username_change', 'user_management', `Admin changed username from ${oldUsername} to ${username.trim()} for user ${req.params.id}`, req.ip);
    createNotification(req.params.id, 'Username Changed', `Your username has been changed to ${username.trim()} by an administrator.`, 'security');

    res.json({ message: 'Username changed', username: username.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID (for admin view)
router.get('/user/:id', authorize('super_admin', 'branch_manager', 'manager'), (req, res) => {
  try {
    const user = queryOne(`
      SELECT id, username, email, full_name, phone, address, dob, gender, national_id, 
             profile_picture, role, status, branch, mother_name, id_card_image, 
             last_login, created_at, updated_at
      FROM users WHERE id = ?
    `, [req.params.id]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const employee = queryOne('SELECT * FROM employees WHERE user_id = ?', [req.params.id]);
    const accounts = queryAll('SELECT * FROM accounts WHERE user_id = ?', [req.params.id]);

    res.json({ user, employee, accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
