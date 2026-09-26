/**
 * Full reset before delivery: wipes ALL attendance history, leave
 * requests and location pings (everyone — real and test), deletes
 * TEST-* accounts entirely, and resets the 27 real employees back to a
 * clean first-login state (new temp password, no selfie enrollment yet).
 * Their name/department/shift/assignedLocation are left untouched.
 *
 * Usage: node scripts/full-reset.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

const employeeSchema = new mongoose.Schema({}, { strict: false });
const attendanceSchema = new mongoose.Schema({}, { strict: false });
const leaveRequestSchema = new mongoose.Schema({}, { strict: false });
const locationPingSchema = new mongoose.Schema({}, { strict: false });

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const readline = require('readline');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); }));
}

async function main() {
  console.log('⚠️  WARNING: this deletes ALL attendance/leave/location history and');
  console.log('   generates NEW passwords for every real employee — their CURRENT');
  console.log('   passwords (including any already shared with staff) will stop working.\n');
  const answer = await confirm('Type "yes" to continue: ');
  if (answer !== 'yes') {
    console.log('Cancelled — nothing was changed.');
    process.exit(0);
  }
  console.log('');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected:', MONGODB_URI, '\n');

  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
  const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
  const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
  const LocationPing = mongoose.models.LocationPing || mongoose.model('LocationPing', locationPingSchema);

  const attResult = await Attendance.deleteMany({});
  console.log(`✅ Deleted ${attResult.deletedCount} attendance record(s) — everyone`);

  const leaveResult = await LeaveRequest.deleteMany({});
  console.log(`✅ Deleted ${leaveResult.deletedCount} leave request(s) — everyone`);

  const pingResult = await LocationPing.deleteMany({});
  console.log(`✅ Deleted ${pingResult.deletedCount} location ping(s) — everyone`);

  const testResult = await Employee.deleteMany({ employeeId: /^TEST-/ });
  console.log(`✅ Deleted ${testResult.deletedCount} test employee account(s) entirely\n`);

  const realEmployees = await Employee.find({ employeeId: { $nin: [/^TEST-/, 'CEO'] } });
  const issuedCredentials = [];

  for (const emp of realEmployees) {
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await Employee.findOneAndUpdate(
      { employeeId: emp.employeeId },
      {
        $set: { password: hash, mustChangePassword: true, isEnrolled: false, updatedAt: new Date() },
        $unset: { faceDescriptor: '', enrollmentPhoto: '' },
      }
    );
    // Verify each write actually landed before trusting it — the whole
    // reason this fix exists is that a prior version of this script
    // looked successful without actually persisting anything.
    const reloaded = await Employee.findOne({ employeeId: emp.employeeId });
    const ok = await bcrypt.compare(tempPassword, reloaded.password || '');
    if (!ok) {
      console.error(`❌ Verification failed for ${emp.employeeId} — stopping, nothing after this point has run.`);
      await mongoose.connection.close();
      process.exit(1);
    }
    issuedCredentials.push({ id: emp.employeeId, name: emp.name, tempPassword });
  }
  console.log(`✅ Reset ${realEmployees.length} real employee(s) to a clean first-login state (each verified)`);

  const lines = issuedCredentials.map((c) => `${c.id}\t${c.name}\t${c.tempPassword}`).join('\n');
  fs.writeFileSync('temp-passwords.txt', `EmployeeID\tName\tTempPassword\n${lines}\n`);
  console.log(`✅ New temporary passwords saved to temp-passwords.txt (${issuedCredentials.length} employees) — share these, then delete the file`);

  console.log('\n✅ Full reset complete. System is ready for delivery.');

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
