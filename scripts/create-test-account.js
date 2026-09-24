/**
 * Creates a test employee account with a known password.
 * Usage: node scripts/create-test-account.js [employeeId] [password]
 * Defaults to TEST-001 / Test1234 if not given.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';
const TEST_ID = process.argv[2] || 'TEST-001';
const TEST_PASSWORD = process.argv[3] || 'Test1234';

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, sparse: true },
  name: String, email: String, phone: String, designation: String, department: String,
  status: { type: String, default: 'active' },
  assigned_pc: { type: String, default: null },
  shift_timing: String, profile_photo: String,
  password: String,
  mustChangePassword: { type: Boolean, default: true },
  attendanceRole: { type: String, default: 'employee' },
  isEnrolled: { type: Boolean, default: false },
  faceDescriptor: { type: [Number], default: null },
  enrollmentPhoto: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

  const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
  await Employee.findOneAndUpdate(
    { employeeId: TEST_ID },
    {
      employeeId: TEST_ID, name: 'Test Account', department: 'Testing', shift_timing: '9AM - 6PM',
      status: 'active', attendanceRole: 'employee', password: hashed, mustChangePassword: true, isEnrolled: false,
      updatedAt: new Date(),
    },
    { upsert: true }
  );

  console.log('✅ Test account ready:');
  console.log(`   Employee ID: ${TEST_ID}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log('   Log in at /login — full first-login flow, then check-in screen.');

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
