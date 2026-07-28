const Database = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await Database();
  const db = new SQL.Database(fs.readFileSync(path.join(__dirname, '..', 'bank.db')));
  db.run("UPDATE users SET role='employee' WHERE username='employee1'");
  db.run("UPDATE users SET role='admin' WHERE username='admin'");
  fs.writeFileSync(path.join(__dirname, '..', 'bank.db'), Buffer.from(db.export()));
  console.log('Roles updated!');
})();
