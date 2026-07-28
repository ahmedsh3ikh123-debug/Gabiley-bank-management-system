require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase, queryAll } = require('./db');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10mb' }));

const rateLimit = {};
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => now - t < 60000);
  if (rateLimit[ip].length >= 100) return res.status(429).json({ error: 'Too many requests, please try again later' });
  rateLimit[ip].push(now);
  next();
}

app.use(rateLimiter);

const authRateLimit = {};
function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const key = ip + ':' + req.path;
  if (!authRateLimit[key]) authRateLimit[key] = [];
  authRateLimit[key] = authRateLimit[key].filter(t => now - t < 900000);
  if (authRateLimit[key].length >= 10) return res.status(429).json({ error: 'Too many authentication attempts, please try again in 15 minutes' });
  authRateLimit[key].push(now);
  next();
}

app.use('/api/auth', authRateLimiter, require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/employee', require('./routes/employee'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/sync', require('./routes/sync'));

const { authenticateToken } = require('./middleware/auth');

app.get('/api/announcements', authenticateToken, (req, res) => {
  try {
    const announcements = queryAll(
      'SELECT a.*, u.full_name as creator_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.status = \'active\' AND (a.target_role = \'all\' OR a.target_role = ?) ORDER BY a.created_at DESC',
      [req.user.role]
    );
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'sqlite' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
