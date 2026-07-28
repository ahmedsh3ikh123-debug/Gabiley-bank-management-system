const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');

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

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = verifyAccessToken(token);
    const user = queryOne('SELECT id, username, email, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, branch, last_login, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account is blocked' });
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

const requireAdmin = authorize('super_admin', 'branch_manager');
const requireTeller = authorize('super_admin', 'branch_manager', 'teller');
const requireCustomerService = authorize('super_admin', 'branch_manager', 'customer_service');
const requireAccountant = authorize('super_admin', 'branch_manager', 'accountant');
const requireICT = authorize('super_admin', 'branch_manager', 'ict_staff');

module.exports = {
  generateTokens, verifyAccessToken, verifyRefreshToken,
  authenticateToken, authorize, requireAdmin, requireTeller,
  requireCustomerService, requireAccountant, requireICT,
};
