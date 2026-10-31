import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { reportRange } from '@/app/lib/attendance-policy';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const s = await getSession();
  if (s?.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  try {
    const range = reportRange(request.nextUrl.searchParams);
    const employeeId = request.nextUrl.searchParams.get('employeeId');
    if (employeeId && !/^[A-Za-z0-9_-]{1,64}$/.test(employeeId)) throw Error('Invalid employee ID.');
    await connectDB();
    const employees = await Employee.find(employeeId ? { employeeId } : { employeeId: { $type: 'string' } }).select('employeeId name department status').sort({ name: 1 }).lean();
    const people = new Map(employees.map(e => [e.employeeId, e]));
    const records = await Attendance.find({ employeeId: { $in: [...people.keys()] }, date: { $gte: range.start, $lt: range.end } }).select('employeeId employeeName date status checkIn.time checkOut.time').sort({ date: -1, employeeId: 1 }).lean();
    const summary = Object.fromEntries(['OnTime', 'Late', 'HalfDay', 'Absent', 'Leave'].map(k => [k, 0]));
    const rows = records.map(a => {
      if (a.status in summary) summary[a.status]++;
      const e = people.get(a.employeeId);
      return { employeeId: a.employeeId, name: a.employeeName || e?.name || a.employeeId, department: e?.department || '', date: a.date, status: a.status, checkInTime: a.checkIn?.time || null, checkOutTime: a.checkOut?.time || null };
    });
    return NextResponse.json({ range, rows, summary, employees: employees.map(e => ({employeeId: e.employeeId, name: e.name})), note: 'Recorded attendance only. Missing dates are not automatically counted as absence; no holiday or working-day calendar is configured.', generatedAt: new Date() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e.name === 'Error' ? e.message : 'Could not load report.' }, { status: 400 }); }
}
