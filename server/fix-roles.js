const { initDatabase, run, queryAll, saveDatabase } = require('./db');

async function fix() {
  await initDatabase();
  
  // EMP00004 - Abdirahman: should be ict_staff
  run("UPDATE employees SET position = 'ICT Officer', department = 'ICT', email = 'sakariye@gmail.com' WHERE id = 4");
  
  // EMP00005 - Khadiir: should be branch_manager  
  run("UPDATE employees SET position = 'Branch Manager', department = 'Operations', email = 'cayool123@gmail.com' WHERE id = 5");
  
  saveDatabase();
  
  const emps = queryAll(
    'SELECT e.id, e.employee_id, e.full_name, e.position, e.department, e.email, u.role ' +
    'FROM employees e JOIN users u ON e.user_id = u.id ORDER BY e.id'
  );
  console.log('After fix:');
  console.log(JSON.stringify(emps, null, 2));
}

fix();
