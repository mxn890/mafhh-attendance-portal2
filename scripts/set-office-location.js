/**
 * Run once you have the office's exact GPS pin.
 * Usage: node scripts/set-office-location.js <lat> <lng> [radiusMeters]
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

async function main() {
  const [lat, lng, radius] = process.argv.slice(2).map(Number);
  if (!lat || !lng) {
    console.error('Usage: node scripts/set-office-location.js <lat> <lng> [radiusMeters]');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const AttendanceConfig = mongoose.models.AttendanceConfig || mongoose.model(
    'AttendanceConfig',
    new mongoose.Schema({
      key: String,
      officeLocation: { address: String, lat: Number, lng: Number, radiusMeters: Number },
      airportLocation: { address: String, lat: Number, lng: Number, radiusMeters: Number },
      shiftRules: { startTime: String, lateAfter: String, halfDayAfter: String, endTime: String },
    })
  );

  const update = { 'officeLocation.lat': lat, 'officeLocation.lng': lng };
  if (radius) update['officeLocation.radiusMeters'] = radius;

  await AttendanceConfig.updateOne({ key: 'default' }, { $set: update });
  console.log(`✅ Office location set: ${lat}, ${lng}${radius ? ` (radius ${radius}m)` : ''}`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
