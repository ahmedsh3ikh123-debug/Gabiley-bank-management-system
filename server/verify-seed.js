const { initDatabase, queryAll, getDb } = require('./db');

(async () => {
  await initDatabase();
  const db = getDb();

  const tables = ['users', 'accounts', 'transactions', 'employees', 'announcements', 'system_settings'];
  for (const t of tables) {
    const r = db.exec('SELECT COUNT(*) as cnt FROM ' + t);
    console.log(t + ': ' + r[0].values[0][0] + ' rows');
  }

  const admins = queryAll("SELECT username, role FROM users WHERE role='super_admin'");
  console.log('Admins:', JSON.stringify(admins));

  const emps = queryAll('SELECT e.employee_id, u.username, e.position FROM employees e JOIN users u ON e.user_id = u.id');
  console.log('Employees:');
  emps.forEach(e => console.log('  ' + e.employee_id + ' - ' + e.username + ' - ' + e.position));

  const custs = queryAll("SELECT COUNT(*) as cnt FROM users WHERE role='customer'");
  console.log('Customers:', custs[0].cnt);

  const accts = queryAll('SELECT account_number, balance FROM accounts ORDER BY account_number LIMIT 3');
  console.log('First 3 accounts:', JSON.stringify(accts));

  const txns = queryAll('SELECT type, amount, description FROM transactions');
  console.log('Transactions:', JSON.stringify(txns));

  process.exit(0);
})();
