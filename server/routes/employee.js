const express = require('express');
const { queryOne, run, logAudit, createNotification } = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.put('/users/:id/activate', authorize('super_admin', 'branch_manager', 'teller', 'customer_service'), (req, res) => {
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

module.exports = router;
