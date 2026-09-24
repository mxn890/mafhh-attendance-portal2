/**
 * Sets radius to 3km (placeholder, until real allowed-distance is known)
 * for both office and airport, and gives each employee a starting
 * location assignment based on department. This is a reasoned starting
 * point, not confirmed by the client — check it against reality and
 * adjust per-employee from the manager dashboard (each row has a
 * dropdown: Either / Office only / Airport only).
 *
 * Usage: node scripts/set-starting-locations.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

// Reasoning: customs clearance and quarantine inspection for cargo
// physically happen at the airport; documentation, finance, office
// support and sales are desk-based. Operations, riders and drivers are
// left as "either" since their work plausibly spans both.
const LOCATION_BY_DEPARTMENT = {
  'Custom Clearance': 'airport',
  'Quarantine Dep': 'airport',
  'Documentations': 'office',
  'Finance': 'office',
  'Office Boy': 'office',
  'Sales': 'office',
  'Security': 'office',
  'Operations': 'either',
  'Rider': 'either',
  'Driver': 'either',
};

const employeeSchema = new mongoose.Schema({
  employeeId: String, department: String, assignedLocation: String, updatedAt: Date,
});
const attendanceConfigSchema = new mongoose.Schema({
  key: String,
  officeLocation: { address: String, lat: Number, lng: Number, radiusMeters: Number },
  airportLocation: { address: String, lat: Number, lng: Number, radiusMeters: Number },
  shiftRules: { startTime: String, lateAfter: String, halfDayAfter: String, endTime: String },
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
  const AttendanceConfig = mongoose.models.AttendanceConfig || mongoose.model('AttendanceConfig', attendanceConfigSchema);

  await AttendanceConfig.updateOne(
    { key: 'default' },
    { $set: { 'officeLocation.radiusMeters': 3000, 'airportLocation.radiusMeters': 3000 } }
  );
  console.log('✅ Radius set to 3km for both office and airport.');

  const employees = await Employee.find({});
  let updated = 0;
  for (const emp of employees) {
    const loc = LOCATION_BY_DEPARTMENT[emp.department] || 'either';
    emp.assignedLocation = loc;
    emp.updatedAt = new Date();
    await emp.save();
    updated++;
  }
  console.log(`✅ Assigned starting locations for ${updated} employee(s) — review/adjust from the manager dashboard.`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
