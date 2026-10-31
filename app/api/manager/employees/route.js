import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/lib/db/connect';
import { Employee } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { parseShift, clockMinutes } from '@/app/lib/attendance-policy';
import { tempPassword } from '@/app/lib/temp-password';
export const dynamic = 'force-dynamic';
function manager(s) { return s?.role === 'manager'; }
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
function fields(body) {
  const name = String(body.name || '').trim(), department = String(body.department || '').trim();
  const shiftStart = String(body.shiftStart || '').trim(), shiftEnd = String(body.shiftEnd || '').trim();
  const assignedLocation = body.assignedLocation || 'either';
  if (!name || name.length > 120 || !department || department.length > 120) throw Error('Enter a name and department (up to 120 characters).');
  if (!/^\d{2}:\d{2}$/.test(shiftStart) || !/^\d{2}:\d{2}$/.test(shiftEnd) || clockMinutes(shiftStart) == null || clockMinutes(shiftEnd) == null || !parseShift({ shiftStart, shiftEnd })) throw Error('Enter valid, different shift start and end times.');
  if (!['office', 'airport', 'either'].includes(assignedLocation)) throw Error('Choose a valid work location.');
  return { name, department, shiftStart, shiftEnd, shift_timing: shiftStart + ' – ' + shiftEnd, assignedLocation };
}
export async function GET() {
  const s = await getSession();
  if (!manager(s)) return fail('Manager access required.', 403);
  await connectDB();
  const employees = await Employee.find({ employeeId: { $type: 'string' } }).select('employeeId name department shift_timing shiftStart shiftEnd status attendanceRole assignedLocation isEnrolled').sort({ name: 1 }).lean();
  return NextResponse.json({ employees }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request) {
  const s = await getSession();
  if (!manager(s)) return fail('Manager access required.', 403);
  try {
    const body = await request.json(), data = fields(body);
    await connectDB();
    let employeeId = String(body.employeeId || '').trim().toUpperCase();
    if (employeeId && !/^MAFHH-\d{3,6}$/.test(employeeId)) return fail('ID must be MAFHH- followed by 3 to 6 digits, or leave it blank.');
    if (!employeeId) {
      const all = await Employee.find({ employeeId: /^MAFHH-\d+$/ }).select('employeeId').lean();
      const highest = all.reduce((v, e) => Math.max(v, Number(e.employeeId.slice(6))), 0);
      const counters = Employee.db.collection('attendance_counters');
      await counters.updateOne({ _id: 'employee-id' }, { $max: { seq: highest } }, { upsert: true });
      const result = await counters.findOneAndUpdate({ _id: 'employee-id' }, { $inc: { seq: 1 } }, { returnDocument: 'after' });
      employeeId = 'MAFHH-' + String((result.value || result).seq).padStart(3, '0');
    }
    const password = tempPassword(), hash = await bcrypt.hash(password, 10);
    await Employee.create({ ...data, employeeId, attendanceRole: 'employee', status: 'active', password: hash, mustChangePassword: true, isEnrolled: false });
    return NextResponse.json({ ok: true, employeeId, name: data.name, tempPassword: password }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return fail(e.code === 11000 ? 'This employee ID already exists. Choose another ID.' : e.name === 'Error' ? e.message : 'Could not add employee.', e.code === 11000 ? 409 : 400); }
}
export async function PATCH(request) {
  const s = await getSession();
  if (!manager(s)) return fail('Manager access required.', 403);
  try {
    const body = await request.json();
    if (typeof body.employeeId !== 'string') return fail('Employee ID required.');
    await connectDB();
    const employee = await Employee.findOne({ employeeId: body.employeeId });
    if (!employee) return fail('Employee not found.', 404);
    if (employee.attendanceRole === 'manager' || employee.employeeId === 'CEO' || employee.employeeId === s.userId) return fail('Manager and CEO accounts are protected here.', 403);
    if (body.action === 'deactivate' || body.action === 'reactivate') {
      const status = body.action === 'deactivate' ? 'inactive' : 'active';
      if (employee.status !== status) await Employee.updateOne({ _id: employee._id }, { $set: { status, updatedAt: new Date() }, $inc: { authVersion: 1 } });
    } else {
      const data = fields(body);
      await Employee.updateOne({ _id: employee._id }, { $set: { ...data, updatedAt: new Date() } }, { runValidators: true });
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return fail(e.name === 'Error' ? e.message : 'Could not update employee.'); }
}
