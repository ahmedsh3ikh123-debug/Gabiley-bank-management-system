const Database = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await Database();
  const db = new SQL.Database(fs.readFileSync(path.join(__dirname, '..', 'bank.db')));
  db.run("UPDATE users SET role='customer_service' WHERE username='employee1'");
  db.run("UPDATE users SET role='super_admin' WHERE username='admin'");
  fs.writeFileSync(path.join(__dirname, '..', 'bank.db'), Buffer.from(db.export()));
  console.log('Roles updated!');
})();
