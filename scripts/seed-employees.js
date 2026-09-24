/**
 * One-time setup: loads the real employee roster and issues each one a
 * temporary attendance-portal password (only if they don't already have
 * one — re-running this never resets a password someone has already
 * changed), and seeds the office/airport geofence + shift rules.
 * Safe to re-run.
 *
 * Usage: node scripts/seed-employees.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

const EMPLOYEES = [
  { id: 'MAFHH-001', name: 'Mudassar Abid', department: 'Operations', shift: '9AM - 6PM' },
  { id: 'MAFHH-002', name: 'Faisal Akhter', department: 'Operations', shift: '10AM – 6:30PM' },
  { id: 'MAFHH-003', name: 'Yousaf Aslam', department: 'Operations', shift: '9AM - 6PM' },
  { id: 'MAFHH-004', name: 'Ahmed Naeem', department: 'Operations', shift: '9AM - 6PM' },
  { id: 'MAFHH-005', name: 'Sabir Imran', department: 'Documentations', shift: '9AM - 6PM' },
  { id: 'MAFHH-006', name: 'Nasir Khan', department: 'Documentations', shift: '10AM – 6:30PM' },
  { id: 'MAFHH-007', name: 'Zeeshan Ali', department: 'Documentations', shift: '9AM - 6PM' },
  { id: 'MAFHH-008', name: 'Khalid Nadeem', department: 'Documentations', shift: '9AM - 6PM' },
  { id: 'MAFHH-009', name: 'Amjad Ashraf', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-010', name: 'Furqan Ahmad', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-011', name: 'Khalid Masood', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-012', name: 'Zaheer Rafique', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-013', name: 'Umair Ali', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-014', name: 'Hassam Fareed', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-015', name: 'M. Zohaib', department: 'Custom Clearance', shift: '9AM - 6PM' },
  { id: 'MAFHH-016', name: 'Hamza Khan', department: 'Custom Clearance', shift: '9-PM - 6AM' },
  { id: 'MAFHH-017', name: 'Aamar Mahmood', department: 'Finance', shift: '9AM - 6PM' },
  { id: 'MAFHH-018', name: 'Mahboob Alam', department: 'Finance', shift: '9AM - 6PM', manager: true },
  { id: 'MAFHH-019', name: 'Ejaz Ahmad', department: 'Quarantine Dep', shift: '9AM - 6PM' },
  { id: 'MAFHH-020', name: 'Irfan Dastagir', department: 'Quarantine Dep', shift: '9AM - 6PM' },
  { id: 'MAFHH-021', name: 'Siddique', department: 'Rider', shift: '9AM - 6PM' },
  { id: 'MAFHH-022', name: 'Chaand Ali', department: 'Office Boy', shift: '10AM - 7PM' },
  { id: 'MAFHH-023', name: 'Atif', department: 'Office Boy', shift: '8AM - 5PM' },
  { id: 'MAFHH-024', name: 'Irfan Ahmad', department: 'Security', shift: '7AM - 7PM' },
  { id: 'MAFHH-025', name: 'Sana ullah', department: 'Driver', shift: '7AM - 7PM' },
  { id: 'MAFHH-026', name: 'Sada Hussain', department: 'Driver', shift: '7AM - 7PM' },
  { id: 'MAFHH-027', name: 'Kamran Noor', department: 'Sales', shift: '9AM - 6PM' },
];

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: String, phone: String, designation: String, department: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  assigned_pc: { type: String, default: null },
  shift_timing: String, profile_photo: String,
  password: { type: String, default: null },
  mustChangePassword: { type: Boolean, default: true },
  attendanceRole: { type: String, enum: ['employee', 'manager'], default: 'employee' },
  isEnrolled: { type: Boolean, default: false },
  faceDescriptor: { type: [Number], default: null },
  enrollmentPhoto: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const attendanceConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  officeLocation: { address: String, lat: Number, lng: Number, radiusMeters: Number },
  airportLocation: { address: String, lat: Number, lng: Number, radiusMeters: Number },
  shiftRules: { startTime: String, lateAfter: String, halfDayAfter: String, endTime: String },
});

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected:', MONGODB_URI);

  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
  const AttendanceConfig = mongoose.models.AttendanceConfig || mongoose.model('AttendanceConfig', attendanceConfigSchema);

  let created = 0, updated = 0;
  const issuedCredentials = [];

  for (const emp of EMPLOYEES) {
    const existing = await Employee.findOne({ employeeId: emp.id });
    const update = {
      employeeId: emp.id,
      name: emp.name,
      department: emp.department,
      shift_timing: emp.shift,
      status: 'active',
      attendanceRole: emp.manager ? 'manager' : 'employee',
      updatedAt: new Date(),
    };

    if (!existing || !existing.password) {
      const tempPassword = generateTempPassword();
      update.password = await bcrypt.hash(tempPassword, 10);
      update.mustChangePassword = true;
      issuedCredentials.push({ id: emp.id, name: emp.name, tempPassword });
    }

    const result = await Employee.findOneAndUpdate({ employeeId: emp.id }, update, { upsert: true, new: true, rawResult: true });
    if (result.lastErrorObject?.updatedExisting) updated++; else created++;
  }
  console.log(`✅ Employees: ${created} created, ${updated} updated (${EMPLOYEES.length} total)`);

  if (issuedCredentials.length > 0) {
    const lines = issuedCredentials.map((c) => `${c.id}\t${c.name}\t${c.tempPassword}`).join('\n');
    fs.writeFileSync('temp-passwords.txt', `EmployeeID\tName\tTempPassword\n${lines}\n`);
    console.log(`✅ ${issuedCredentials.length} temporary password(s) issued — saved to temp-passwords.txt (share these with each employee, then delete the file)`);
  } else {
    console.log('ℹ️  All employees already have a password set — none re-issued.');
  }

  const existingConfig = await AttendanceConfig.findOne({ key: 'default' });
  if (!existingConfig) {
    await AttendanceConfig.create({
      key: 'default',
      officeLocation: { address: "43 Block 'S' Khuda Baksh Colony, New Airport Road Lahore", lat: null, lng: null, radiusMeters: 150 },
      airportLocation: { address: "Allama Iqbal Int'l Airport, Airport Rd, Cantt, Lahore, Punjab 54000", lat: 31.5216, lng: 74.4036, radiusMeters: 300 },
      shiftRules: { startTime: '09:00', lateAfter: '09:30', halfDayAfter: '10:00', endTime: '18:00' },
    });
    console.log('✅ Attendance config created — ⚠️  office lat/lng still missing, get an exact pin from Google Maps and run scripts/set-office-location.js');
  } else {
    console.log('ℹ️  Attendance config already exists — left as-is.');
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Seed failed:', err.message); process.exit(1); });
