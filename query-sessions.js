const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(process.cwd(), 'server', 'node_modules', 'sql.js'));

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('C:\\Users\\ahmed\\.local\\share\\mimocode\\mimocode.db');
  const db = new SQL.Database(buf);

  // Get all projects
  console.log('=== PROJECTS ===');
  let r = db.exec("SELECT id, worktree, name, time_created FROM project");
  if (r[0]) {
    for (const row of r[0].values) {
      console.log(JSON.stringify(row));
    }
  }

  // Get all sessions ordered by time_created DESC
  console.log('\n=== SESSIONS (newest first) ===');
  r = db.exec("SELECT id, project_id, directory, title, time_created FROM session ORDER BY time_created DESC LIMIT 20");
  if (r[0]) {
    for (const row of r[0].values) {
      const date = new Date(row[4] * 1000).toISOString();
      console.log(`${row[0]} | proj:${row[1]} | dir:${row[2]} | title:${row[3]} | ${date}`);
    }
  }
}
main().catch(console.error);
