const { initDatabase, run, queryAll, saveDatabase } = require('./db');
const bcrypt = require('bcryptjs');

async function setAllCustomerCredentials() {
  await initDatabase();
  
  const password = 'customer123';
  const pin = '1234';
  
  const hashedPassword = await bcrypt.hash(password, 12);
  const hashedPin = await bcrypt.hash(pin, 10);
  
  const customers = queryAll("SELECT id, username FROM users WHERE role = 'customer'");
  console.log(`Found ${customers.length} customers`);
  
  let updated = 0;
  for (const customer of customers) {
    run(
      "UPDATE users SET password = ?, password_plain = ?, pin = ?, pin_plain = ?, updated_at = datetime('now') WHERE id = ?",
      [hashedPassword, password, hashedPin, pin, customer.id]
    );
    console.log(`Updated: ${customer.username}`);
    updated++;
  }
  
  saveDatabase();
  
  console.log(`\nDone! Updated ${updated} customers`);
  console.log(`Password: ${password}`);
  console.log(`PIN: ${pin}`);
  
  process.exit(0);
}

setAllCustomerCredentials().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
