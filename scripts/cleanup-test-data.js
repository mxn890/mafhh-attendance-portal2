/**
 * Deletes all test accounts (TEST-001, TEST-002, ...) and everything
 * linked to them — Employee record, Attendance history, Leave requests,
 * Location pings. Only touches employeeIds starting with "TEST-", so the
 * real 27 employees are never affected.
 *
 * Usage: node scripts/cleanup-test-data.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

const employeeSchema = new mongoose.Schema({ employeeId: String }, { strict: false });
const attendanceSchema = new mongoose.Schema({ employeeId: String }, { strict: false });
const leaveRequestSchema = new mongoose.Schema({ employeeId: String }, { strict: false });
const locationPingSchema = new mongoose.Schema({ employeeId: String }, { strict: false });

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected:', MONGODB_URI);

  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
  const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
  const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
  const LocationPing = mongoose.models.LocationPing || mongoose.model('LocationPing', locationPingSchema);

  const testEmployees = await Employee.find({ employeeId: /^TEST-/ });
  if (testEmployees.length === 0) {
    console.log('ℹ️  No TEST-* accounts found — nothing to clean up.');
  } else {
    console.log(`Found ${testEmployees.length} test account(s): ${testEmployees.map((e) => e.employeeId).join(', ')}`);

    const attResult = await Attendance.deleteMany({ employeeId: /^TEST-/ });
    console.log(`✅ Deleted ${attResult.deletedCount} attendance record(s)`);

    const leaveResult = await LeaveRequest.deleteMany({ employeeId: /^TEST-/ });
    console.log(`✅ Deleted ${leaveResult.deletedCount} leave request(s)`);

    const pingResult = await LocationPing.deleteMany({ employeeId: /^TEST-/ });
    console.log(`✅ Deleted ${pingResult.deletedCount} location ping(s)`);

    const empResult = await Employee.deleteMany({ employeeId: /^TEST-/ });
    console.log(`✅ Deleted ${empResult.deletedCount} test employee account(s)`);
  }

  const remaining = await Employee.countDocuments({});
  console.log(`\n✅ Cleanup complete. ${remaining} real employee(s) remain untouched.`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
