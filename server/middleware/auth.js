const jwt = require('jsonwebtoken');
const { queryOne, queryAll, run, saveDatabase } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  process.exit(1);
}

const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

function generateTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function storeRefreshToken(userId, token, userAgent = '') {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  run('INSERT INTO refresh_tokens (user_id, token, user_agent, expires_at) VALUES (?, ?, ?, ?)', [userId, token, userAgent, expiresAt]);
  saveDatabase();
}

function removeRefreshToken(token) {
  run('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  saveDatabase();
}

function removeAllRefreshTokens(userId) {
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  saveDatabase();
}

function isValidRefreshToken(token) {
  const row = queryOne('SELECT id FROM refresh_tokens WHERE token = ?', [token]);
  return row !== null;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = verifyAccessToken(token);
    const user = queryOne('SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, branch, last_login, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account is blocked' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Your account is pending approval. Please wait for an admin to activate your account.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Your registration has been rejected. Please contact support.' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(403).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

const requireAdmin = authorize('super_admin', 'branch_manager', 'manager');
const requireTeller = authorize('super_admin', 'branch_manager', 'manager', 'teller');
const requireCustomerService = authorize('super_admin', 'branch_manager', 'manager', 'customer_service');
const requireAccountant = authorize('super_admin', 'branch_manager', 'manager', 'accountant');
const requireICT = authorize('super_admin', 'branch_manager', 'manager', 'ict_staff');
const requireStaff = authorize('super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff');
const requireAdminOrICT = authorize('super_admin', 'branch_manager', 'manager', 'ict_staff');
const requireCSOrAdmin = authorize('super_admin', 'branch_manager', 'manager', 'customer_service', 'ict_staff');
const requireSuperAdmin = authorize('super_admin');

module.exports = {
  generateTokens, verifyAccessToken, verifyRefreshToken,
  storeRefreshToken, removeRefreshToken, removeAllRefreshTokens, isValidRefreshToken,
  authenticateToken, authorize, requireAdmin, requireTeller,
  requireCustomerService, requireAccountant, requireICT, requireStaff, requireAdminOrICT, requireCSOrAdmin, requireSuperAdmin,
};
