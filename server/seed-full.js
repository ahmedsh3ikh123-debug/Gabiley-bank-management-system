const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { initDatabase, run, queryOne, queryAll, saveDatabase, getDb } = require('./db');

const DB_PATH = path.join(__dirname, '..', 'bank.db');

const somaliNames = [
  { first: 'Abdi', last: 'Hassan', gender: 'Male' },
  { first: 'Fatima', last: 'Ali', gender: 'Female' },
  { first: 'Mohamed', last: 'Mohamud', gender: 'Male' },
  { first: 'Amina', last: 'Ibrahim', gender: 'Female' },
  { first: 'Omar', last: 'Warsame', gender: 'Male' },
  { first: 'Khadija', last: 'Farah', gender: 'Female' },
  { first: 'Hassan', last: 'Nur', gender: 'Male' },
  { first: 'Halima', last: 'Jama', gender: 'Female' },
  { first: 'Ahmed', last: 'Osman', gender: 'Male' },
  { first: 'Sahra', last: 'Abdullahi', gender: 'Female' },
  { first: 'Ibrahim', last: 'Isse', gender: 'Male' },
  { first: 'Fartun', last: 'Mohamed', gender: 'Female' },
  { first: 'Abdirahman', last: 'Hussein', gender: 'Male' },
  { first: 'Maryam', last: 'Shire', gender: 'Female' },
  { first: 'Yusuf', last: 'Ahmed', gender: 'Male' },
  { first: 'Zahra', last: 'Hassan', gender: 'Female' },
  { first: 'Ali', last: 'Abdi', gender: 'Male' },
  { first: 'Nimo', last: 'Guled', gender: 'Female' },
  { first: 'Khalid', last: 'Mohamud', gender: 'Male' },
  { first: 'Ifrah', last: 'Ali', gender: 'Female' },
  { first: 'Abdullahi', last: 'Warsame', gender: 'Male' },
  { first: 'Deqa', last: 'Ibrahim', gender: 'Female' },
  { first: 'Said', last: 'Farah', gender: 'Male' },
  { first: 'Rawda', last: 'Nur', gender: 'Female' },
  { first: 'Mahdi', last: 'Jama', gender: 'Male' },
  { first: 'Sumaya', last: 'Osman', gender: 'Female' },
  { first: 'Farhan', last: 'Abdullahi', gender: 'Male' },
  { first: 'Leyla', last: 'Mohamed', gender: 'Female' },
  { first: 'Abdi', last: 'Mohamed', gender: 'Male' },
  { first: 'Hawa', last: 'Hassan', gender: 'Female' },
  { first: 'Osman', last: 'Ahmed', gender: 'Male' },
  { first: 'Fadumo', last: 'Ali', gender: 'Female' },
  { first: 'Jamal', last: 'Isse', gender: 'Male' },
  { first: 'Amal', last: 'Warsame', gender: 'Female' },
  { first: 'Hussein', last: 'Nur', gender: 'Male' },
  { first: 'Sagal', last: 'Farah', gender: 'Female' },
  { first: 'Bashir', last: 'Mohamud', gender: 'Male' },
  { first: 'Safiya', last: 'Jama', gender: 'Female' },
  { first: 'Idris', last: 'Abdi', gender: 'Male' },
  { first: 'Asha', last: 'Osman', gender: 'Female' },
  { first: 'Dahir', last: 'Hussein', gender: 'Male' },
  { first: 'Rashida', last: 'Ahmed', gender: 'Female' },
  { first: 'Warsame', last: 'Ali', gender: 'Male' },
  { first: 'Muna', last: 'Mohamed', gender: 'Female' },
  { first: 'Nuur', last: 'Farah', gender: 'Male' },
  { first: 'Ubah', last: 'Hassan', gender: 'Female' },
  { first: 'Liban', last: 'Nur', gender: 'Male' },
  { first: 'Filsan', last: 'Ibrahim', gender: 'Female' },
  { first: 'Sharif', last: 'Warsame', gender: 'Male' },
  { first: 'Hamdi', last: 'Abdullahi', gender: 'Female' },
];

const somaliAddresses = [
  'Hargeisa, Woqooyi Galbeed',
  'Berbera, Woqooyi Galbeed',
  'Burao, Togdheer',
  'Borama, Awdal',
  'Las Anod, Sool',
  'Garowe, Nugaal',
  'Galkayo, Mudug',
  'Bosaso, Bari',
  'Mogadishu, Banaadir',
  'Kismayo, Jubbada Hoose',
  'Beledweyne, Hiraan',
  'Baidoa, Bay',
  'Marka, Shabelle Hoose',
  'Jowhar, Shabelle Dhexe',
  'Dhusamareb, Galgaduud',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBalance() {
  return Math.round((500 + Math.random() * 49500) * 100) / 100;
}

function randomPhone() {
  return `+252-61-${String(Math.floor(1000000 + Math.random() * 9000000))}`;
}

function randomDOB() {
  const year = 1970 + Math.floor(Math.random() * 30);
  const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
  const day = String(Math.floor(1 + Math.random() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomNationalId() {
  return `SN-${String(Math.floor(1000000 + Math.random() * 9000000))}`;
}

function avatarUrl(seed) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

async function seed() {
  console.log('Deleting old database...');
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  console.log('Initializing fresh database...');
  await initDatabase();

  const db = getDb();

  console.log('Seeding admin user...');
  const adminHash = await bcrypt.hash('admin123', 12);
  const adminPin = await bcrypt.hash('1234', 10);
  run(
    `INSERT INTO users (username, email, password, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, pin, branch, password_plain, pin_plain)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'admin', 'admin@gabileybank.com', adminHash,
      'System Administrator', '+252-61-1234567',
      'Hargeisa, Woqooyi Galbeed', '1985-06-15', 'Male',
      'SN-1234567', avatarUrl('admin-gabiley'),
      'super_admin', 'active', adminPin, 'Hargeisa HQ', 'admin123', '1234'
    ]
  );

  console.log('Seeding 5 employees...');
  const employeeData = [
    { username: 'sara.ibrahim', name: 'Sara Ibrahim', dept: 'Operations', pos: 'Teller', salary: 1200 },
    { username: 'hassan.ali', name: 'Hassan Ali Mohamed', dept: 'Customer Service', pos: 'Customer Service Officer', salary: 1400 },
    { username: 'mina.warsame', name: 'Mina Warsame Abdi', dept: 'Finance', pos: 'Accountant', salary: 1600 },
    { username: 'abdirahman.hussein', name: 'Abdirahman Hussein Farah', dept: 'Operations', pos: 'Manager', salary: 1500 },
    { username: 'zainab.osman', name: 'Zainab Osman Ahmed', dept: 'ICT', pos: 'ICT Officer', salary: 1800 },
  ];

  const dbRoles = ['teller', 'customer_service', 'accountant', 'manager', 'ict_staff'];

  for (let i = 0; i < employeeData.length; i++) {
    const emp = employeeData[i];
    const empHash = await bcrypt.hash('employee123', 12);
    const empPin = await bcrypt.hash('1234', 10);

    run(
      `INSERT INTO users (username, email, password, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, pin, branch, password_plain, pin_plain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.username, `${emp.username}@gabileybank.com`, empHash,
        emp.name, randomPhone(),
        randomFrom(somaliAddresses), randomDOB(), i % 2 === 0 ? 'Female' : 'Male',
        randomNationalId(), avatarUrl(emp.username),
        dbRoles[i], 'active', empPin, 'Hargeisa HQ', 'employee123', '1234'
      ]
    );

    const user = queryOne('SELECT id FROM users WHERE username = ?', [emp.username]);
    const employeeId = `EMP${String(i + 1).padStart(5, '0')}`;
    run(
      `INSERT INTO employees (user_id, employee_id, full_name, email, phone, department, position, salary, hire_date, branch, profile_picture, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, employeeId, emp.name,
        `${emp.username}@gabileybank.com`, randomPhone(),
        emp.dept, emp.pos, emp.salary,
        `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`,
        'Gabiley HQ', avatarUrl(emp.username), 'active'
      ]
    );

    console.log(`  Employee ${i + 1}: ${emp.name} (${emp.pos})`);
  }

  console.log('Seeding 50 Somali customers...');
  const usedUsernames = new Set(employeeData.map(e => e.username));
  usedUsernames.add('admin');
  const usedAccountNumbers = new Set();
  let nextAccountNum = 1;

  for (let i = 0; i < somaliNames.length; i++) {
    const { first, last, gender } = somaliNames[i];
    const fullName = `${first} ${last}`;
    let username = `${first.toLowerCase()}.${last.toLowerCase()}`;
    let counter = 1;
    while (usedUsernames.has(username)) {
      username = `${first.toLowerCase()}.${last.toLowerCase()}${counter}`;
      counter++;
    }
    usedUsernames.add(username);

    const custHash = await bcrypt.hash('customer123', 12);
    const custPin = await bcrypt.hash('1234', 10);

    const email = `${username}${i}@gabileybank.com`;
    run(
      `INSERT INTO users (username, email, password, full_name, phone, address, dob, gender, national_id, profile_picture, role, status, pin, branch, password_plain, pin_plain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username, email, custHash,
        fullName, randomPhone(),
        randomFrom(somaliAddresses), randomDOB(), gender,
        randomNationalId(), avatarUrl(username),
        'customer', 'active', custPin, 'Hargeisa HQ', 'customer123', '1234'
      ]
    );

    const user = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    let accountNumber;
    do {
      accountNumber = `ACC-${String(nextAccountNum).padStart(3, '0')}`;
    } while (usedAccountNumbers.has(accountNumber));
    usedAccountNumbers.add(accountNumber);
    nextAccountNum++;

    const balance = randomBalance();
    const accountTypes = ['savings', 'current', 'fixed_deposit', 'customer'];
    const accountType = randomFrom(accountTypes);

    run(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, interest_rate, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, accountNumber, accountType, balance, accountType === 'fixed_deposit' ? 5.0 : 2.5, 'USD', 'active']
    );

    const account = queryOne('SELECT id FROM accounts WHERE account_number = ?', [accountNumber]);
    console.log(`  Customer ${i + 1}: ${fullName} (${accountNumber}) - $${balance.toFixed(2)}`);
  }

  console.log('Seeding transactions...');
  const allAccounts = queryAll('SELECT id, account_number, user_id FROM accounts ORDER BY id');
  const allCustomerIds = queryAll("SELECT id FROM users WHERE role = 'customer'").map(u => u.id);

  const txnTypes = ['deposit', 'withdrawal', 'transfer'];
  const txnDescriptions = [
    'Salary deposit', 'Grocery shopping', 'Family transfer', 'Business payment',
    'Utility bill', 'School fees', 'Medical expenses', 'Savings deposit',
    'ATM withdrawal', 'Online transfer', 'Rent payment', 'Travel expenses'
  ];

  for (let i = 0; i < 50; i++) {
    const type = randomFrom(txnTypes);
    const desc = randomFrom(txnDescriptions);
    const amount = Math.round((10 + Math.random() * 5000) * 100) / 100;
    const fee = type === 'transfer' ? Math.round(amount * 0.015 * 100) / 100 : 0;

    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const txnId = `TXN-${ts}-${rand}-${i}`;

    if (type === 'deposit' && allAccounts.length > 0) {
      const acc = randomFrom(allAccounts);
      run(
        `INSERT INTO transactions (transaction_id, to_account_id, type, amount, fee, description, status, processed_by)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [txnId, acc.id, type, amount, fee, desc, Math.random() > 0.3 ? 1 : null]
      );
    } else if (type === 'withdrawal' && allAccounts.length > 0) {
      const acc = randomFrom(allAccounts);
      run(
        `INSERT INTO transactions (transaction_id, from_account_id, type, amount, fee, description, status, processed_by)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [txnId, acc.id, type, amount, fee, desc, Math.random() > 0.3 ? 1 : null]
      );
    } else if (type === 'transfer' && allAccounts.length >= 2) {
      let fromAcc = randomFrom(allAccounts);
      let toAcc = randomFrom(allAccounts);
      let attempts = 0;
      while (fromAcc.id === toAcc.id && attempts < 10) {
        toAcc = randomFrom(allAccounts);
        attempts++;
      }
      if (fromAcc.id !== toAcc.id) {
        run(
          `INSERT INTO transactions (transaction_id, from_account_id, to_account_id, type, amount, fee, description, status, processed_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
          [txnId, fromAcc.id, toAcc.id, type, amount, fee, desc, Math.random() > 0.3 ? 1 : null]
        );
      }
    }
  }
  console.log('  50 transactions seeded');

  console.log('Seeding loan requests...');
  const loanStatuses = ['pending', 'approved', 'rejected'];
  const loanTypes = ['personal', 'business', 'education', 'mortgage'];
  const loanPurposes = [
    'Business expansion', 'Home renovation', 'Education fees',
    'Medical emergency', 'Vehicle purchase', 'Agricultural investment',
    'Equipment purchase', 'Working capital'
  ];

  for (let i = 0; i < 15; i++) {
    const custId = randomFrom(allCustomerIds);
    const amount = Math.round((1000 + Math.random() * 49000));
    const term = [6, 12, 24, 36, 60][Math.floor(Math.random() * 5)];
    const status = randomFrom(loanStatuses);
    const loanType = randomFrom(loanTypes);
    const purpose = randomFrom(loanPurposes);
    const monthlyIncome = Math.round(500 + Math.random() * 5000);

    const custAccount = queryOne('SELECT account_number FROM accounts WHERE user_id = ? AND status = ? LIMIT 1', [custId, 'active']);
    const accountNumber = custAccount ? custAccount.account_number : '';

    run(
      `INSERT INTO loan_requests (user_id, amount, term_months, purpose, loan_type, monthly_income, status, reviewed_by, review_notes, account_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        custId, amount, term, purpose, loanType, monthlyIncome, status,
        status !== 'pending' ? 1 : null,
        status === 'approved' ? 'Loan meets all criteria' :
        status === 'rejected' ? 'Insufficient documentation' : '',
        accountNumber
      ]
    );
  }
  console.log('  15 loan requests seeded');

  console.log('Seeding announcements...');
  run(
    `INSERT INTO announcements (title, message, priority, target_role, created_by, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['System Maintenance Notice', 'Scheduled maintenance on Saturday from 2:00 AM to 4:00 AM. Some services may be temporarily unavailable.', 'important', 'all', 1, 'active']
  );
  run(
    `INSERT INTO announcements (title, message, priority, target_role, created_by, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['New Mobile Banking App', 'We are excited to announce the launch of our new mobile banking application. Download now from your app store!', 'normal', 'all', 1, 'active']
  );
  run(
    `INSERT INTO announcements (title, message, priority, target_role, created_by, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['Holiday Hours', 'Branches will be closed on public holidays. ATMs and online banking remain available 24/7.', 'normal', 'customer', 1, 'active']
  );
  console.log('  3 announcements seeded');

  console.log('Seeding notifications...');
  const notifTypes = ['info', 'success', 'warning', 'error', 'security'];
  for (let i = 0; i < 20; i++) {
    const custId = randomFrom(allCustomerIds);
    const notifType = randomFrom(notifTypes);
    const titles = {
      info: 'Account Update', success: 'Transaction Successful',
      warning: 'Security Alert', error: 'Action Required', security: 'Security Notice'
    };
    const messages = {
      info: 'Your account information has been updated.',
      success: 'Your recent transaction has been processed successfully.',
      warning: 'Unusual activity detected on your account.',
      error: 'Please update your contact information.',
      security: 'For your security, please change your password regularly.'
    };
    run(
      `INSERT INTO notifications (user_id, title, message, type, read) VALUES (?, ?, ?, ?, ?)`,
      [custId, titles[notifType], messages[notifType], notifType, Math.random() > 0.5 ? 1 : 0]
    );
  }
  console.log('  20 notifications seeded');

  console.log('Seeding system settings...');
  const settings = [
    ['bank_name', 'Gabiley Bank', 'Bank display name'],
    ['bank_slogan', 'Your Trusted Financial Partner', 'Bank slogan'],
    ['currency', 'USD', 'Default currency'],
    ['currency_symbol', '$', 'Currency symbol'],
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
    ['password_min_length', '8', 'Minimum password length'],
    ['session_timeout_minutes', '30', 'Session timeout in minutes'],
    ['max_login_attempts', '5', 'Max failed login attempts before lock'],
    ['login_lockout_minutes', '30', 'Login lockout duration in minutes'],
    ['timezone', 'Africa/Mogadishu', 'System timezone'],
    ['theme', 'light', 'Default theme'],
    ['primary_color', '#1e40af', 'Primary brand color'],
    ['secondary_color', '#d4af37', 'Secondary brand color (gold)'],
  ];

  for (const [key, value, desc] of settings) {
    const existing = queryOne('SELECT id FROM system_settings WHERE setting_key = ?', [key]);
    if (!existing) {
      run('INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)', [key, value, desc]);
    }
  }
  console.log('  System settings seeded');

  saveDatabase();

  const stats = {
    users: queryOne('SELECT COUNT(*) as count FROM users').count,
    customers: queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").count,
    employees: queryOne('SELECT COUNT(*) as count FROM employees').count,
    accounts: queryOne('SELECT COUNT(*) as count FROM accounts').count,
    transactions: queryOne('SELECT COUNT(*) as count FROM transactions').count,
    loans: queryOne('SELECT COUNT(*) as count FROM loan_requests').count,
  };

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Users: ${stats.users} (1 admin, ${stats.employees} employees, ${stats.customers} customers)`);
  console.log(`Employees: ${stats.employees}`);
  console.log(`Customers: ${stats.customers}`);
  console.log(`Accounts: ${stats.accounts}`);
  console.log(`Transactions: ${stats.transactions}`);
  console.log(`Loans: ${stats.loans}`);
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin / admin123');
  console.log('  Employee: sara.ibrahim / employee123 (Teller)');
  console.log('  Employee: hassan.ali / employee123 (Customer Service)');
  console.log('  Employee: mina.warsame / employee123 (Accountant)');
  console.log('  Employee: abdirahman.hussein / employee123 (Manager)');
  console.log('  Employee: zainab.osman / employee123 (ICT Officer)');
  console.log('  Customer: abdi.hassan / customer123');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
