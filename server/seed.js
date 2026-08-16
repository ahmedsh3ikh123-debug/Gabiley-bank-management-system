require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDatabase, queryOne, run, saveDatabase } = require('./db');

async function seed() {
  try {
    await initDatabase();
    const db = require('./db').getDb();

    // Clear existing data
    db.run('DELETE FROM notifications');
    db.run('DELETE FROM audit_log');
    db.run('DELETE FROM transactions');
    db.run('DELETE FROM loan_requests');
    db.run('DELETE FROM announcements');
    db.run('DELETE FROM online_users');
    db.run('DELETE FROM employees');
    db.run('DELETE FROM accounts');
    db.run('DELETE FROM password_resets');
    db.run('DELETE FROM system_settings');
    db.run('DELETE FROM users');
    saveDatabase();

    // Create admin
    const adminPass = await bcrypt.hash('admin123', 12);
    run('INSERT INTO users (username, email, password, full_name, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['admin', 'admin@gabileybank.com', adminPass, 'System Administrator', '+252-61-1234567', 'super_admin', 'active']);
    const admin = queryOne('SELECT id FROM users WHERE username = \'admin\'');

    run('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)',
      [admin.id, 'ACC-001', 'savings', 100000]);

    // Create employee
    const empPass = await bcrypt.hash('employee123', 12);
    run('INSERT INTO users (username, email, password, full_name, phone, role, status, pin, pin_plain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['employee', 'employee@gabileybank.com', empPass, 'Employee User', '+252-61-2345678', 'teller', 'active', await bcrypt.hash('1234', 10), '1234']);
    const emp = queryOne('SELECT id FROM users WHERE username = \'employee\'');

    run('INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, salary, hire_date, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [emp.id, 'EMP00001', 'Employee User', 'employee@gabileybank.com', '+252-61-2345678', 'Operations', 'Teller', 2500, '2024-01-15', 'Gabiley HQ']);

    // Create Sara Ibrahim - Teller
    const saraPass = await bcrypt.hash('employee123', 12);
    const saraPin = await bcrypt.hash('1234', 10);
    run('INSERT INTO users (username, email, password, full_name, phone, role, status, pin, pin_plain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['sara.ibrahim', 'sara.ibrahim@gabileybank.com', saraPass, 'Sara Ibrahim', '+252-61-3456789', 'teller', 'active', saraPin, '1234']);
    const sara = queryOne('SELECT id FROM users WHERE username = \'sara.ibrahim\'');

    run('INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, salary, hire_date, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sara.id, 'EMP00002', 'Sara Ibrahim', 'sara.ibrahim@gabileybank.com', '+252-61-3456789', 'Operations', 'Teller', 1200, '2024-02-01', 'Gabiley HQ']);

    // Create sample employees
    const depts = ['Operations', 'Finance', 'Customer Service', 'IT', 'Human Resources'];
    const positions = ['Officer', 'Manager', 'Specialist', 'Analyst', 'Director'];
    for (let i = 0; i < 5; i++) {
      run('INSERT INTO employees (employee_id, full_name, email, phone, department, position, salary, hire_date, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`EMP${String(i + 2).padStart(5, '0')}`, `Employee ${i + 2}`, `employee${i + 2}@gabileybank.com`, `+252-61-${2000000 + i}`, depts[i % 5], positions[i % 5], 2000 + Math.floor(Math.random() * 3000), `2024-0${(i % 9) + 1}-15`, 'Gabiley HQ']);
    }

    // Create customer
    const custPass = await bcrypt.hash('customer123', 12);
    run('INSERT INTO users (username, email, password, full_name, phone, address, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['customer', 'customer@example.com', custPass, 'John Customer', '+1-555-0123', '123 Main St, City', 'customer', 'active']);
    const cust = queryOne('SELECT id FROM users WHERE username = \'customer\'');

    const acctNum = 'ACC-' + String(cust.id + 1).padStart(3, '0');
    run('INSERT INTO accounts (user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?)',
      [cust.id, acctNum, 'savings', 5000]);
    const acct = queryOne('SELECT id FROM accounts WHERE account_number = ?', [acctNum]);

    // Sample transactions
    const types = ['deposit', 'withdrawal', 'transfer'];
    for (let i = 0; i < 10; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString();
      run('INSERT INTO transactions (to_account_id, type, amount, fee, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [acct.id, types[i % 3], 100 + Math.floor(Math.random() * 900), i % 3 === 2 ? 15 : 0, `Sample transaction ${i + 1}`, d]);
    }

    // Announcements
    run('INSERT INTO announcements (title, message, priority, target_role, created_by) VALUES (?, ?, ?, ?, ?)',
      ['System Maintenance', 'Scheduled maintenance on Saturday from 2 AM to 6 AM.', 'important', 'all', admin.id]);
    run('INSERT INTO announcements (title, message, priority, target_role, created_by) VALUES (?, ?, ?, ?, ?)',
      ['Welcome to Gabiley Bank', 'Thank you for choosing Gabiley Bank. We are committed to providing excellent banking services.', 'normal', 'all', admin.id]);

    // Notifications
    run('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [admin.id, 'Welcome Admin', 'You have successfully logged into the system.', 'success']);
    run('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [emp.id, 'Welcome Employee', 'You have successfully logged into the system.', 'success']);
    run('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [cust.id, 'Account Created', 'Your account has been created successfully. Welcome to Gabiley Bank!', 'success']);

    console.log('\n=== Seed Complete ===');
    console.log('Admin: admin / admin123');
    console.log('Employee: employee / employee123');
    console.log('Sara Ibrahim (Teller): sara.ibrahim / employee123 (PIN: 1234)');
    console.log('Customer: customer / customer123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
