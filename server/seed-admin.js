const Database = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

(async () => {
  const SQL = await Database();
  const dbPath = path.join(__dirname, '..', 'bank.db');

  if (!fs.existsSync(dbPath)) {
    console.error('bank.db not found. Start the server first to create it.');
    process.exit(1);
  }

  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Create admin user if not exists
  const existingAdmin = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (existingAdmin.length === 0 || existingAdmin[0].values.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    db.run(`INSERT INTO users (username, email, password, full_name, phone, address, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['admin', 'admin@gabileybank.com', hashedPassword, 'System Administrator', '+252-61-1234567', 'Gabiley Branch', 'super_admin', 'active']);
    console.log('Admin user created (username: admin, password: admin123)');
  } else {
    db.run("UPDATE users SET role='super_admin' WHERE username='admin'");
    console.log('Admin user role confirmed');
  }

  // Create employee user if not exists
  const existingEmp = db.exec("SELECT id FROM users WHERE username = 'employee'");
  if (existingEmp.length === 0 || existingEmp[0].values.length === 0) {
    const hashedPassword = await bcrypt.hash('employee123', 12);
    db.run(`INSERT INTO users (username, email, password, full_name, phone, address, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['employee', 'employee@gabileybank.com', hashedPassword, 'Bank Employee', '+252-61-7654321', 'Gabiley Branch', 'teller', 'active']);
    console.log('Employee user created (username: employee, password: employee123)');
  }

  // Create Sara Ibrahim - Teller
  const existingSara = db.exec("SELECT id FROM users WHERE username = 'sara.ibrahim'");
  if (existingSara.length === 0 || existingSara[0].values.length === 0) {
    const hashedPassword = await bcrypt.hash('employee123', 12);
    const hashedPin = await bcrypt.hash('1234', 10);
    db.run(`INSERT INTO users (username, email, password, full_name, phone, address, role, status, pin, pin_plain, password_plain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['sara.ibrahim', 'sara.ibrahim@gabileybank.com', hashedPassword, 'Sara Ibrahim', '+252-61-3456789', 'Gabiley Branch', 'teller', 'active', hashedPin, '1234', 'employee123']);
    const sara = db.exec("SELECT id FROM users WHERE username = 'sara.ibrahim'");
    if (sara.length > 0 && sara[0].values.length > 0) {
      const saraId = sara[0].values[0][0];
      const existingEmpRecord = db.exec("SELECT id FROM employees WHERE user_id = ?", [saraId]);
      if (existingEmpRecord.length === 0 || existingEmpRecord[0].values.length === 0) {
        db.run(`INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, salary, hire_date, status) VALUES (?, 'EMP00006', 'Sara Ibrahim', 'sara.ibrahim@gabileybank.com', '+252-61-3456789', 'Operations', 'Teller', 1200, '2024-02-01', 'active')`,
          [saraId]);
      }
    }
    console.log('Sara Ibrahim created (username: sara.ibrahim, password: employee123, PIN: 1234)');
  } else {
    // Update existing Sara Ibrahim record to ensure plain credentials are set
    db.run("UPDATE users SET password_plain = 'employee123', pin_plain = '1234' WHERE username = 'sara.ibrahim'");
    console.log('Sara Ibrahim already exists - credentials verified');
  }

  // Add sample employees
  db.run(`INSERT OR IGNORE INTO employees (employee_id, full_name, email, phone, department, position, salary, hire_date, status) VALUES ('EMP00001', 'Ahmed Hassan', 'ahmed@gabileybank.com', '+252-61-1111111', 'IT', 'Senior Developer', 1800, '2023-03-15', 'active')`);
  db.run(`INSERT OR IGNORE INTO employees (employee_id, full_name, email, phone, department, position, salary, hire_date, status) VALUES ('EMP00002', 'Fatima Ali', 'fatima@gabileybank.com', '+252-61-2222222', 'Finance', 'Financial Analyst', 1600, '2023-06-01', 'active')`);
  db.run(`INSERT OR IGNORE INTO employees (employee_id, full_name, email, phone, department, position, salary, hire_date, status) VALUES ('EMP00003', 'Omar Ibrahim', 'omar@gabileybank.com', '+252-61-3333333', 'HR', 'HR Manager', 1700, '2022-11-20', 'active')`);
  db.run(`INSERT OR IGNORE INTO employees (employee_id, full_name, email, phone, department, position, salary, hire_date, status) VALUES ('EMP00004', 'Said Mohamed', 'said@gabileybank.com', '+252-61-4444444', 'Customer Service', 'Team Lead', 1400, '2024-01-10', 'active')`);
  db.run(`INSERT OR IGNORE INTO employees (employee_id, full_name, email, phone, department, position, salary, hire_date, status) VALUES ('EMP00005', 'Amina Yusuf', 'amina@gabileybank.com', '+252-61-5555555', 'Operations', 'Operations Manager', 1500, '2023-09-05', 'active')`);

  // Add sample announcements
  const adminId = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (adminId.length > 0 && adminId[0].values.length > 0) {
    const userId = adminId[0].values[0][0];
    db.run(`INSERT INTO announcements (title, message, priority, target_role, created_by) VALUES (?, ?, ?, ?, ?)`,
      ['Welcome to Gabiley Bank', 'Thank you for choosing Gabiley Bank Management System. We are committed to providing you with the best banking experience.', 'normal', 'all', userId]);
    db.run(`INSERT INTO announcements (title, message, priority, target_role, created_by) VALUES (?, ?, ?, ?, ?)`,
      ['System Maintenance Notice', 'Scheduled maintenance on July 20, 2026 from 2:00 AM to 6:00 AM.', 'important', 'all', userId]);
  }

  // Update bank name setting
  db.run(`UPDATE system_settings SET setting_value = 'Gabiley Bank' WHERE setting_key = 'bank_name'`);
  db.run(`UPDATE system_settings SET setting_value = '+252-61-1234567' WHERE setting_key = 'support_phone'`);
  db.run(`UPDATE system_settings SET setting_value = 'support@gabileybank.com' WHERE setting_key = 'support_email'`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('Sample data seeded successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:           admin / admin123');
  console.log('  Employee:        employee / employee123');
  console.log('  Sara Ibrahim:    sara.ibrahim / employee123 (PIN: 1234)');
})();
