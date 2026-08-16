const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { queryOne, queryAll, run, saveDatabase, logAudit } = require('../db');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const { status, priority, assigned_to, category } = req.query;
    let sql = `
      SELECT t.*, 
        assignee.full_name as assignee_name,
        assigner.full_name as assigner_name
      FROM tasks t
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN users assigner ON t.assigned_by = assigner.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND t.priority = ?`;
      params.push(priority);
    }
    if (assigned_to) {
      sql += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }
    if (category) {
      sql += ` AND t.category = ?`;
      params.push(category);
    }

    if (req.user.role === 'customer') {
      sql += ` AND t.assigned_to = ?`;
      params.push(req.user.id);
    }

    sql += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC`;

    const tasks = queryAll(sql, params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    let whereClause = '';
    const params = [];

    if (req.user.role === 'customer') {
      whereClause = 'WHERE assigned_to = ?';
      params.push(req.user.id);
    }

    const total = queryOne(`SELECT COUNT(*) as count FROM tasks ${whereClause}`, params);
    const pending = queryOne(`SELECT COUNT(*) as count FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'pending'`, params);
    const inProgress = queryOne(`SELECT COUNT(*) as count FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'in_progress'`, params);
    const completed = queryOne(`SELECT COUNT(*) as count FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'completed'`, params);
    const overdue = queryOne(`SELECT COUNT(*) as count FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} due_date < datetime('now') AND status != 'completed'`, params);

    res.json({
      total: total?.count || 0,
      pending: pending?.count || 0,
      in_progress: inProgress?.count || 0,
      completed: completed?.count || 0,
      overdue: overdue?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const task = queryOne(`
      SELECT t.*, 
        assignee.full_name as assignee_name,
        assigner.full_name as assigner_name
      FROM tasks t
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN users assigner ON t.assigned_by = assigner.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const comments = queryAll(`
      SELECT tc.*, u.full_name as user_name
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at DESC
    `, [req.params.id]);

    res.json({ ...task, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, description, priority, status, category, assigned_to, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    run(`INSERT INTO tasks (title, description, priority, status, category, assigned_to, assigned_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || '', priority || 'medium', status || 'pending', category || 'general', assigned_to || null, req.user.id, due_date || null]);

    const task = queryOne('SELECT * FROM tasks ORDER BY id DESC LIMIT 1');

    logAudit(req.user.id, 'create', 'tasks', `Created task: ${title}`, req.ip);

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, priority, status, category, assigned_to, due_date } = req.body;

    let completedAt = task.completed_at;
    if (status === 'completed' && task.status !== 'completed') {
      completedAt = new Date().toISOString();
    } else if (status !== 'completed') {
      completedAt = null;
    }

    run(`UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, category = ?, assigned_to = ?, due_date = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        title || task.title,
        description !== undefined ? description : task.description,
        priority || task.priority,
        status || task.status,
        category || task.category,
        assigned_to !== undefined ? assigned_to : task.assigned_to,
        due_date !== undefined ? due_date : task.due_date,
        completedAt,
        req.params.id
      ]);

    const updated = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);

    logAudit(req.user.id, 'update', 'tasks', `Updated task: ${updated.title}`, req.ip);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    run('DELETE FROM task_comments WHERE task_id = ?', [req.params.id]);
    run('DELETE FROM tasks WHERE id = ?', [req.params.id]);

    logAudit(req.user.id, 'delete', 'tasks', `Deleted task: ${task.title}`, req.ip);

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', (req, res) => {
  try {
    const task = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    run('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, comment]);

    const newComment = queryOne(`
      SELECT tc.*, u.full_name as user_name
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      ORDER BY tc.id DESC LIMIT 1
    `);

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/comments', (req, res) => {
  try {
    const comments = queryAll(`
      SELECT tc.*, u.full_name as user_name
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at DESC
    `, [req.params.id]);

    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
