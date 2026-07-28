const express = require('express');
const { queryOne, queryAll, run } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const notifications = queryAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.id]);
    res.json(notifications);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const result = queryOne('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [req.user.id]);
    res.json({ count: result ? result.count : 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read-all', authenticateToken, (req, res) => {
  try { run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', [req.user.id]); res.json({ message: 'All notifications marked as read' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', authenticateToken, (req, res) => {
  try { run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]); res.json({ message: 'Notification marked as read' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try { run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]); res.json({ message: 'Notification deleted' }); } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
