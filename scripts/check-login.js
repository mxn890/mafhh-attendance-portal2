/**
 * Checks one employee's record directly and tests the password the same
 * way the login route does — to confirm whether the DATA is correct
 * (separate from whether Vercel's deployment is picking it up).
 *
 * Usage: node scripts/check-login.js MAFHH-018 GRU8ZTJR
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

const employeeSchema = new mongoose.Schema({}, { strict: false });

async function main() {
  const employeeId = (process.argv[2] || '').trim().toUpperCase();
  const password = process.argv[3];
  if (!employeeId || !password) {
    console.error('Usage: node scripts/check-login.js <employeeId> <password>');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected:', MONGODB_URI, '\n');

  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
  const employee = await Employee.findOne({ employeeId });

  if (!employee) {
    console.log(`❌ No employee found with employeeId "${employeeId}"`);
    const all = await Employee.find({}, { employeeId: 1 });
    console.log('\nEmployee IDs that DO exist in this database:');
    console.log(all.map((e) => e.employeeId).join(', '));
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log(`✅ Found employee: ${employee.name} (${employee.employeeId})`);
  console.log(`   has password set: ${!!employee.password}`);
  console.log(`   mustChangePassword: ${employee.mustChangePassword}`);
  console.log(`   isEnrolled: ${employee.isEnrolled}`);
  console.log(`   attendanceRole: ${employee.attendanceRole}`);

  if (!employee.password) {
    console.log('\n❌ This employee has no password hash stored at all.');
  } else {
    const valid = await bcrypt.compare(password, employee.password);
    console.log(`\n${valid ? '✅' : '❌'} bcrypt.compare("${password}", stored hash) = ${valid}`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
