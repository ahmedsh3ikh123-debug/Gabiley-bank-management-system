const express = require('express');
const { queryOne, queryAll, run, logAudit, saveDatabase } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const messages = queryAll(`
      SELECT m.*, u.full_name as sender_name, r.full_name as recipient_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE m.recipient_id = ?
      ORDER BY m.created_at DESC
    `, [req.user.id]);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', (req, res) => {
  try {
    const result = queryOne('SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND read = 0', [req.user.id]);
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM messages WHERE id = ? AND recipient_id = ?', [req.params.id, req.user.id]);
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    run('UPDATE messages SET read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Message marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', (req, res) => {
  try {
    run('UPDATE messages SET read = 1 WHERE recipient_id = ? AND read = 0', [req.user.id]);
    res.json({ message: 'All messages marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT id FROM messages WHERE id = ? AND recipient_id = ?', [req.params.id, req.user.id]);
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    run('DELETE FROM messages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
