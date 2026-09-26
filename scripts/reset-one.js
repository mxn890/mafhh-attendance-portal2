/**
 * Resets ONE employee's password and immediately verifies the hash
 * works via bcrypt.compare — so you get a password that's confirmed
 * correct before even trying to log in.
 *
 * Usage: node scripts/reset-one.js MAFHH-018 [newPassword]
 * If newPassword is omitted, a random one is generated.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';

const employeeSchema = new mongoose.Schema({}, { strict: false });

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const employeeId = (process.argv[2] || '').trim().toUpperCase();
  const password = process.argv[3] || generatePassword();
  if (!employeeId) {
    console.error('Usage: node scripts/reset-one.js <employeeId> [newPassword]');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

  const employee = await Employee.findOne({ employeeId });
  if (!employee) {
    console.log(`❌ No employee found with employeeId "${employeeId}"`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await Employee.findOneAndUpdate(
    { employeeId },
    {
      $set: { password: hash, mustChangePassword: true, isEnrolled: false, updatedAt: new Date() },
      $unset: { faceDescriptor: '', enrollmentPhoto: '' },
    }
  );

  // Immediately re-read from the DB (not from memory) and verify —
  // confirms the write actually landed, not just that the call didn't throw.
  const reloaded = await Employee.findOne({ employeeId });
  const verified = await bcrypt.compare(password, reloaded.password);

  console.log(`Employee: ${reloaded.name} (${reloaded.employeeId})`);
  console.log(`New password: ${password}`);
  console.log(`${verified ? '✅ VERIFIED — this password is confirmed correct' : '❌ Something is still wrong — verification failed even right after saving'}`);

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
