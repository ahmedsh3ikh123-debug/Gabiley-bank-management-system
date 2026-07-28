const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(__dirname, 'server', 'node_modules', 'sql.js'));

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(path.join(__dirname, 'bank.db')));
  const r = db.exec('SELECT id, account_number FROM accounts ORDER BY id');
  if (r.length) console.table(r[0].values.map(([id, acc]) => ({ id, account_number: acc })));
  else console.log('no accounts');
})();
