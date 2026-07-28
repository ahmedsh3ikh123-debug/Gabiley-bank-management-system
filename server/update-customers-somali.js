const path = require('path');
const { initDatabase, run, queryOne, queryAll, saveDatabase } = require('./db');

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

async function updateCustomers() {
  console.log('Initializing database...');
  await initDatabase();

  const customers = queryAll("SELECT id, username, full_name FROM users WHERE role = 'customer'");
  console.log(`Found ${customers.length} customers to update`);

  const allOtherUsers = queryAll("SELECT username FROM users WHERE role != 'customer'");
  const usedUsernames = new Set(allOtherUsers.map(u => u.username));

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const nameIndex = i % somaliNames.length;
    const { first, last, gender } = somaliNames[nameIndex];
    const fullName = `${first} ${last}`;
    let newUsername = `${first.toLowerCase()}.${last.toLowerCase()}`;
    let counter = 1;
    while (usedUsernames.has(newUsername)) {
      newUsername = `${first.toLowerCase()}.${last.toLowerCase()}${counter}`;
      counter++;
    }
    usedUsernames.add(newUsername);
    const profilePicture = avatarUrl(newUsername);
    const address = randomFrom(somaliAddresses);
    const dob = randomDOB();
    const phone = randomPhone();

    run(
      `UPDATE users SET full_name = ?, username = ?, gender = ?, profile_picture = ?, address = ?, dob = ?, phone = ?, national_id = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [fullName, newUsername, gender, profilePicture, address, dob, phone, customer.id]
    );

    console.log(`  Updated ${customer.full_name} -> ${fullName}`);
  }

  saveDatabase();
  console.log(`\nDone! Updated ${customers.length} customers - removed national_id and added profile images.`);
}

updateCustomers().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
