const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { queryOne, queryAll, run, saveDatabase } = require('../db');

router.use(authenticateToken);

// Get conversations (grouped by other user)
router.get('/conversations', (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages involving the current user
    const rows = queryAll(
      `SELECT m.*, u.full_name as other_name, u.profile_picture as other_picture, u.role as other_role
       FROM messages m
       LEFT JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END
       WHERE m.sender_id = ? OR m.recipient_id = ?
       ORDER BY m.created_at DESC`,
      [userId, userId, userId]
    );

    // Group by conversation partner
    const convMap = {};
    for (const row of rows) {
      const otherId = row.sender_id === userId ? row.recipient_id : row.sender_id;
      if (convMap[otherId]) continue;

      convMap[otherId] = {
        id: otherId,
        other_user_id: otherId,
        other_user_name: row.other_name,
        other_user_picture: row.other_picture,
        other_user_role: row.other_role,
        last_message: row.message,
        last_message_at: row.created_at,
        unread_count: 0,
      };
    }

    // Count unread per conversation
    const unreadRows = queryAll(
      `SELECT sender_id, COUNT(*) as cnt FROM messages WHERE recipient_id = ? AND read = 0 GROUP BY sender_id`,
      [userId]
    );
    for (const u of unreadRows) {
      if (convMap[u.sender_id]) {
        convMap[u.sender_id].unread_count = u.cnt;
      }
    }

    res.json(Object.values(convMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages with a specific user
router.get('/conversations/:userId/messages', (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);

    if (isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const messages = queryAll(
      `SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_picture
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
       ORDER BY m.created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    // Mark as read
    run(
      `UPDATE messages SET read = 1 WHERE sender_id = ? AND recipient_id = ? AND read = 0`,
      [otherUserId, currentUserId]
    );
    saveDatabase();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
router.post('/conversations/:userId/messages', (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    run(
      `INSERT INTO messages (sender_id, recipient_id, subject, message, message_type, read) VALUES (?, ?, ?, ?, 'general', 0)`,
      [currentUserId, otherUserId, 'Chat', message.trim()]
    );
    saveDatabase();

    const newMsg = queryOne(
      `SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_picture
       FROM messages m LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.sender_id = ? AND m.recipient_id = ? AND m.message = ?
       ORDER BY m.id DESC LIMIT 1`,
      [currentUserId, otherUserId, message.trim()]
    );

    res.json(newMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users for starting new conversations
router.get('/users', (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let users = queryAll(
      `SELECT id, full_name, profile_picture, role FROM users WHERE id != ? AND status = 'active' ORDER BY full_name`,
      [userId]
    );

    if (userRole === 'customer') {
      users = users.filter(u => u.role !== 'customer');
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Support request categories with target roles
const SUPPORT_CATEGORIES = [
  { id: 'account', label: 'Account Issues', targetRoles: ['branch_manager', 'manager', 'teller', 'customer_service'] },
  { id: 'loan', label: 'Loan Support', targetRoles: ['branch_manager', 'manager', 'customer_service'] },
  { id: 'technical', label: 'Technical Support', targetRoles: ['ict_staff'] },
  { id: 'complaint', label: 'Complaints', targetRoles: ['branch_manager', 'manager'] },
  { id: 'general', label: 'General Inquiry', targetRoles: ['customer_service', 'teller'] },
];

// Get support categories
router.get('/support-categories', (req, res) => {
  res.json(SUPPORT_CATEGORIES);
});

// Create a support request (customers only)
router.post('/support-request', (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'customer') {
      return res.status(403).json({ error: 'Only customers can create support requests' });
    }

    const { category, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cat = SUPPORT_CATEGORIES.find(c => c.id === category);
    if (!cat) {
      return res.status(400).json({ error: 'Invalid support category' });
    }

    // Find available employees with matching roles
    const placeholders = cat.targetRoles.map(() => '?').join(',');
    const availableEmployees = queryAll(
      `SELECT id FROM users WHERE role IN (${placeholders}) AND status = 'active'`,
      cat.targetRoles
    );

    if (availableEmployees.length === 0) {
      return res.status(400).json({ error: 'No support staff available at the moment' });
    }

    // Pick the first available employee (round-robin could be improved)
    const targetEmployee = availableEmployees[0];

    // Create the support message
    run(
      `INSERT INTO messages (sender_id, recipient_id, subject, message, message_type, read) VALUES (?, ?, ?, ?, 'support', 0)`,
      [userId, targetEmployee.id, `[Support] ${cat.label}`, message.trim()]
    );
    saveDatabase();

    // Get the created message
    const newMsg = queryOne(
      `SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_picture
       FROM messages m LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.sender_id = ? AND m.recipient_id = ? AND m.message_type = 'support'
       ORDER BY m.id DESC LIMIT 1`,
      [userId, targetEmployee.id]
    );

    res.json({ message: 'Support request sent successfully', data: newMsg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get support requests (for employees to see)
router.get('/support-requests', (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    let requests;
    if (userRole === 'customer') {
      // Customers see their own sent support requests
      requests = queryAll(
        `SELECT m.*, u.full_name as recipient_name, u.role as recipient_role
         FROM messages m LEFT JOIN users u ON m.recipient_id = u.id
         WHERE m.sender_id = ? AND m.message_type = 'support'
         ORDER BY m.created_at DESC`,
        [userId]
      );
    } else {
      // Employees see support requests sent to them
      requests = queryAll(
        `SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_picture
         FROM messages m LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.recipient_id = ? AND m.message_type = 'support'
         ORDER BY m.created_at DESC`,
        [userId]
      );
    }

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread chat count
router.get('/unread-count', (req, res) => {
  try {
    const userId = req.user.id;
    const result = queryOne(
      `SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND read = 0 AND message_type = 'general'`,
      [userId]
    );
    res.json({ count: result?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
