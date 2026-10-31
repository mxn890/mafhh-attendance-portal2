// Durable, encrypted reset batches allow recovery after a disconnected browser.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Employee } from './db/models';
import { tempPassword } from './temp-password';
function key() {
  if (!process.env.JWT_SECRET) throw Error('JWT_SECRET must be configured before resetting credentials.');
  return createHash('sha256').update('attendance-reset-v1:' + process.env.JWT_SECRET).digest();
}
export function seal(value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('base64') };
}
export function unseal(value) {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(value.tag, 'hex'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'));
}
export async function resetBatch(batchId, managerId) {
  if (!/^[a-f0-9-]{36}$/i.test(batchId)) throw Error('Invalid reset request.');
  const db = Employee.db, batches = db.collection('attendance_credential_resets_v1');
  await batches.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const control = db.collection('attendance_credential_reset_lock');
  try { await control.insertOne({ _id: 'all', owner: batchId, until: new Date(Date.now() + 120000) }); }
  catch (e) {
    if (e.code !== 11000) throw e;
    // A retry of the same request must also wait for the current worker to finish.
    const claimed = await control.updateOne({ _id: 'all', until: { $lt: new Date() } }, { $set: { owner: batchId, until: new Date(Date.now() + 120000) } });
    if (!claimed.modifiedCount) throw Error('Another reset is still running. Wait two minutes, then retry the same request.');
  }
  try {
    let batch = await batches.findOne({ _id: batchId });
    if (batch && (batch.managerId !== managerId || +batch.expiresAt <= Date.now())) throw Error('This reset batch is unavailable.');
    if (!batch) {
      const employees = await Employee.find({ status: 'active', attendanceRole: { $ne: 'manager' }, employeeId: { $nin: [managerId, 'CEO'] } }).select('employeeId name password authVersion').lean();
      if (employees.length > 150 || employees.some(e => !/^[A-Za-z0-9_-]{1,64}$/.test(e.employeeId))) throw Error('Employee roster needs review before a bulk reset.');
      const entries = [];
      for (const e of employees) {
        const password = tempPassword(), hash = await bcrypt.hash(password, 10);
        if (!await bcrypt.compare(password, hash)) throw Error('Password verification failed before reset.');
        entries.push({ employeeId: e.employeeId, name: e.name, password, hash, previousHash: e.password ?? null, version: Number(e.authVersion || 0) });
      }
      batch = { _id: batchId, managerId, encrypted: seal(entries), createdAt: new Date(), expiresAt: new Date(Date.now() + 86400000) };
      // Persist recovery credentials BEFORE changing any employee account.
      await batches.insertOne(batch);
    }
    const entries = unseal(batch.encrypted), rows = [];
    for (const e of entries) {
      const current = await Employee.findOne({ employeeId: e.employeeId }).select('status password authVersion').lean();
      if (!current || current.status !== 'active') { rows.push({ employeeId: e.employeeId, name: e.name, state: 'skipped-inactive' }); continue; }
      if (current.password !== e.hash) {
        const versionFilter = e.version === 0 ? { $or: [{ authVersion: 0 }, { authVersion: { $exists: false } }] } : { authVersion: e.version };
        const result = await Employee.updateOne({ employeeId: e.employeeId, status: 'active', attendanceRole: { $ne: 'manager' }, password: e.previousHash, ...versionFilter }, { $set: { password: e.hash, mustChangePassword: true, isEnrolled: false, faceDescriptor: null, enrollmentPhoto: null, profile_photo: null, updatedAt: new Date() }, $inc: { authVersion: 1 } });
        if (!result.modifiedCount) { rows.push({ employeeId: e.employeeId, name: e.name, state: 'conflict-not-reset' }); continue; }
      }
      const verified = await Employee.findOne({ employeeId: e.employeeId }).select('password isEnrolled faceDescriptor enrollmentPhoto mustChangePassword').lean();
      const ok = await bcrypt.compare(e.password, verified.password) && !verified.isEnrolled && !verified.faceDescriptor && !verified.enrollmentPhoto && verified.mustChangePassword;
      rows.push({ employeeId: e.employeeId, name: e.name, tempPassword: ok ? e.password : undefined, state: ok ? 'verified' : 'verification-failed' });
    }
    await batches.updateOne({ _id: batchId }, { $set: { lastRunAt: new Date(), complete: rows.every(r => r.state === 'verified' || r.state === 'skipped-inactive') } });
    return { batchId, rows, verified: rows.filter(r => r.state === 'verified').length, total: rows.length, complete: rows.every(r => r.state === 'verified' || r.state === 'skipped-inactive') };
  } finally { await control.deleteOne({ _id: 'all', owner: batchId }); }
}
export async function recoverBatch(batchId, managerId) {
  const batch = await Employee.db.collection('attendance_credential_resets_v1').findOne({ _id: batchId, managerId, expiresAt: { $gt: new Date() } });
  if (!batch) throw Error('Reset list expired or not found.');
  const rows = [];
  for (const e of unseal(batch.encrypted)) {
    const current = await Employee.findOne({ employeeId: e.employeeId }).select('password status').lean();
    if (current?.status === 'active' && current.password === e.hash) rows.push({ employeeId: e.employeeId, name: e.name, tempPassword: e.password, state: 'verified' });
    else rows.push({ employeeId: e.employeeId, name: e.name, state: 'changed-or-not-reset' });
  }
  return { batchId, rows, complete: Boolean(batch.complete), verified: rows.filter(r => r.state === 'verified').length, total: rows.length };
}
