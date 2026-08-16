const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'bank.db');
const DB_TEMP = path.join(__dirname, '..', 'bank.db.tmp');

let db = null;

function safeColumn(table, column, definition) {
  try {
    const result = db.exec(`PRAGMA table_info(${table})`);
    if (result.length > 0) {
      const cols = result[0].values.map(r => r[1]);
      if (!cols.includes(column)) {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    }
  } catch (e) {}
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      db.exec('SELECT 1');
    } catch (e) {
      console.error('Database corrupted, recreating...');
      fs.unlinkSync(DB_PATH);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      dob TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      national_id TEXT DEFAULT '',
      profile_picture TEXT DEFAULT '',
      role TEXT DEFAULT 'customer',
      status TEXT DEFAULT 'active',
      pin TEXT DEFAULT '',
      branch TEXT DEFAULT '',
      refresh_token TEXT DEFAULT '',
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME DEFAULT NULL,
      last_login DATETIME DEFAULT NULL,
      password_plain TEXT DEFAULT '',
      pin_plain TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  safeColumn('users', 'password_plain', "TEXT DEFAULT ''");
  safeColumn('users', 'pin_plain', "TEXT DEFAULT ''");
  safeColumn('users', 'mother_name', "TEXT DEFAULT ''");
  safeColumn('users', 'id_card_image', "TEXT DEFAULT ''");

  // Backfill password_plain and pin_plain for existing users
  db.run(`UPDATE users SET password_plain = 'admin123', pin_plain = '1234' WHERE username = 'admin' AND (password_plain IS NULL OR password_plain = '')`);
  db.run(`UPDATE users SET password_plain = 'employee123', pin_plain = '1234' WHERE username = 'employee' AND (password_plain IS NULL OR password_plain = '')`);
  db.run(`UPDATE users SET password_plain = 'employee123', pin_plain = '1234' WHERE username = 'sara.ibrahim' AND (password_plain IS NULL OR password_plain = '')`);
  db.run(`UPDATE users SET password_plain = 'customer123', pin_plain = '1234' WHERE username = 'customer' AND (password_plain IS NULL OR password_plain = '')`);
  // Backfill for ALL users without password_plain
  db.run(`UPDATE users SET password_plain = 'customer123', pin_plain = '1234' WHERE role = 'customer' AND (password_plain IS NULL OR password_plain = '')`);
  db.run(`UPDATE users SET password_plain = 'employee123', pin_plain = '1234' WHERE role != 'customer' AND role != 'super_admin' AND (password_plain IS NULL OR password_plain = '')`);
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_number TEXT UNIQUE NOT NULL,
      account_type TEXT DEFAULT 'savings',
      balance REAL DEFAULT 0,
      interest_rate REAL DEFAULT 2.5,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'active',
      frozen INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      purpose TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  safeColumn('accounts', 'purpose', "TEXT DEFAULT ''");

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE,
      from_account_id INTEGER,
      to_account_id INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'completed',
      processed_by INTEGER,
      sync_status TEXT DEFAULT 'synced',
      client_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_account_id) REFERENCES accounts(id),
      FOREIGN KEY (to_account_id) REFERENCES accounts(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      employee_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      salary REAL DEFAULT 0,
      hire_date TEXT NOT NULL,
      branch TEXT DEFAULT '',
      profile_picture TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      device TEXT DEFAULT '',
      location TEXT DEFAULT '',
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customer_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      document_name TEXT NOT NULL,
      file_path TEXT DEFAULT '',
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS online_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      target_role TEXT DEFAULT 'all',
      created_by INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loan_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      term_months INTEGER NOT NULL,
      purpose TEXT DEFAULT '',
      loan_type TEXT DEFAULT 'personal',
      monthly_income REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      review_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT DEFAULT '',
      old_data TEXT DEFAULT '',
      new_data TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      device TEXT DEFAULT '',
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      request_type TEXT NOT NULL DEFAULT 'password',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      resolved_by INTEGER,
      resolution_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'general',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      category TEXT DEFAULT 'general',
      assigned_to INTEGER,
      assigned_by INTEGER,
      due_date DATETIME DEFAULT NULL,
      completed_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Add new columns to existing tables (safe migration)
  safeColumn('users', 'gender', "TEXT DEFAULT ''");
  safeColumn('users', 'national_id', "TEXT DEFAULT ''");
  safeColumn('users', 'profile_picture', "TEXT DEFAULT ''");
  safeColumn('users', 'failed_login_attempts', 'INTEGER DEFAULT 0');
  safeColumn('users', 'locked_until', 'DATETIME DEFAULT NULL');
  safeColumn('accounts', 'frozen', 'INTEGER DEFAULT 0');
  safeColumn('accounts', 'currency', "TEXT DEFAULT 'USD'");
  safeColumn('transactions', 'transaction_id', 'TEXT');
  safeColumn('transactions', 'processed_by', 'INTEGER');
  safeColumn('employees', 'profile_picture', "TEXT DEFAULT ''");
  safeColumn('loan_requests', 'loan_type', "TEXT DEFAULT 'personal'");
  safeColumn('loan_requests', 'account_number', "TEXT DEFAULT ''");
  safeColumn('loan_requests', 'disbursed_at', "DATETIME DEFAULT NULL");
  safeColumn('loan_requests', 'total_paid', "REAL DEFAULT 0");
  safeColumn('loan_requests', 'interest_rate', "REAL DEFAULT 12");
  safeColumn('audit_log', 'old_data', "TEXT DEFAULT ''");
  safeColumn('audit_log', 'new_data', "TEXT DEFAULT ''");

  // Migrate online_users to allow multiple sessions per user
  try {
    const tableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='online_users'");
    if (tableInfo.length > 0 && tableInfo[0].values[0][0].includes('UNIQUE')) {
      db.run('CREATE TABLE IF NOT EXISTS online_users_new (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, ip_address TEXT DEFAULT \'\', user_agent TEXT DEFAULT \'\', last_active DATETIME DEFAULT CURRENT_TIMESTAMP, logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))');
      db.run('INSERT OR IGNORE INTO online_users_new SELECT * FROM online_users');
      db.run('DROP TABLE online_users');
      db.run('ALTER TABLE online_users_new RENAME TO online_users');
    }
  } catch (e) { /* table may not exist yet */ }
  safeColumn('audit_log', 'browser', "TEXT DEFAULT ''");
  safeColumn('audit_log', 'device', "TEXT DEFAULT ''");

  db.run(`
    UPDATE loan_requests SET account_number = (
      SELECT a.account_number FROM accounts a WHERE a.user_id = loan_requests.user_id AND a.status = 'active' LIMIT 1
    ) WHERE account_number = '' OR account_number IS NULL
  `);

  const defaultSettings = [
    ['bank_name', 'Gabiley Bank', 'Bank display name'],
    ['currency', 'USD', 'Default currency'],
    ['transfer_fee', '1.5', 'Transfer fee percentage'],
    ['min_balance', '100', 'Minimum account balance'],
    ['max_transfer', '50000', 'Maximum single transfer amount'],
    ['daily_transfer_limit', '200000', 'Daily transfer limit per account'],
    ['interest_rate', '2.5', 'Default interest rate'],
    ['maintenance_mode', 'false', 'System maintenance mode'],
    ['support_email', 'support@gabileybank.com', 'Support contact email'],
    ['support_phone', '+252-61-1234567', 'Support phone number'],
    ['pin_max_attempts', '5', 'Max failed PIN attempts before lock'],
    ['pin_lockout_minutes', '30', 'PIN lockout duration in minutes'],
  ];

  for (const [key, value, desc] of defaultSettings) {
    const existing = db.exec(`SELECT id FROM system_settings WHERE setting_key = ?`, [key]);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(`INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)`, [key, value, desc]);
    }
  }

  // Sync employee emails with user emails
  try {
    db.run("UPDATE employees SET email = (SELECT email FROM users WHERE users.id = employees.user_id) WHERE user_id IS NOT NULL");
    db.run("UPDATE employees SET full_name = (SELECT full_name FROM users WHERE users.id = employees.user_id) WHERE user_id IS NOT NULL AND full_name != (SELECT full_name FROM users WHERE users.id = employees.user_id)");
    db.run("UPDATE employees SET phone = (SELECT phone FROM users WHERE users.id = employees.user_id) WHERE user_id IS NOT NULL AND (phone IS NULL OR phone = '')");
  } catch (e) { console.error('Employee sync error:', e.message); }

  saveDatabase();
  console.log('Database initialized');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_TEMP, buffer);
  fs.renameSync(DB_TEMP, DB_PATH);
}

function getDb() { return db; }

function getSetting(key) {
  const result = db.exec(`SELECT setting_value FROM system_settings WHERE setting_key = ?`, [key]);
  if (result.length > 0 && result[0].values.length > 0) return result[0].values[0][0];
  return null;
}

function logAudit(userId, action, module, details, ipAddress, status = 'success', browser = '', device = '') {
  try {
    db.run(`INSERT INTO audit_log (user_id, action, module, details, ip_address, browser, device, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, module, details || '', ipAddress || '', browser || '', device || '', status]);
    saveDatabase();
  } catch (e) { console.error('Audit log error:', e.message); }
}

function logLoginHistory(userId, ip, userAgent, browser, device, status = 'success') {
  try {
    db.run(`INSERT INTO login_history (user_id, ip_address, user_agent, browser, device, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, ip || '', userAgent || '', browser || '', device || '', status]);
    saveDatabase();
  } catch (e) { console.error('Login history error:', e.message); }
}

function createNotification(userId, title, message, type = 'info') {
  try {
    db.run(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [userId, title, message, type]);
    saveDatabase();
  } catch (e) { console.error('Notification error:', e.message); }
}

function generateTransactionId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN-${ts}-${rand}`;
}

function queryOne(sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveDatabase();
    saveTimeout = null;
  }, 100);
}

function run(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
}

function runBatch(statements) {
  for (const { sql, params } of statements) {
    db.run(sql, params || []);
  }
  saveDatabase();
}

module.exports = { initDatabase, getDb, saveDatabase, getSetting, logAudit, logLoginHistory, createNotification, generateTransactionId, queryOne, queryAll, run, runBatch };
