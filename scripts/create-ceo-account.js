/**
 * Creates a CEO account in the Attendance Portal with manager-role
 * access. This is a SEPARATE login from the CEO Dashboard's own
 * (different system, different database collection for auth) — but
 * gives the CEO the same oversight view (Dashboard/Live Map/Leave
 * Requests) that a manager gets, with no check-in/check-out option
 * (that only ever shows for the 'employee' role).
 *
 * Usage: node scripts/create-ceo-account.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';
const CEO_ID = 'CEO';
const CEO_PASSWORD = '1wGNi1ASSA';

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
  assignedLocation: { type: String, default: 'either' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

  const hashed = await bcrypt.hash(CEO_PASSWORD, 10);
  await Employee.findOneAndUpdate(
    { employeeId: CEO_ID },
    {
      employeeId: CEO_ID, name: 'CEO', department: 'Management', shift_timing: '—',
      status: 'active', attendanceRole: 'manager',
      password: hashed, mustChangePassword: false, // set true if you'd rather choose your own password on first login
      isEnrolled: true, // managers don't check in, so enrollment isn't needed — skip straight past setup
      assignedLocation: 'either',
      updatedAt: new Date(),
    },
    { upsert: true }
  );

  console.log('✅ CEO account ready in the Attendance Portal:');
  console.log(`   Employee ID: ${CEO_ID}`);
  console.log(`   Password: ${CEO_PASSWORD}`);
  console.log('   Log in at /login — goes straight to the manager dashboard, no check-in screen.');

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
