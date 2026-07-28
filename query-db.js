const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(process.cwd(), 'server', 'node_modules', 'sql.js'));

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('C:\\Users\\ahmed\\.local\\share\\mimocode\\mimocode.db');
  const db = new SQL.Database(buf);

  // List tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('=== TABLES ===');
  console.log(JSON.stringify(tables, null, 2));

  // Schema for each table
  for (const t of (tables[0]?.values || [])) {
    const tbl = t[0];
    try {
      const info = db.exec(`PRAGMA table_info("${tbl}")`);
      console.log(`\n=== ${tbl} ===`);
      if (info[0]) {
        for (const row of info[0].values) {
          console.log(row.join(' | '));
        }
      }
    } catch(e) {
      console.log(`Error on ${tbl}: ${e.message}`);
    }
  }
}
main().catch(console.error);
