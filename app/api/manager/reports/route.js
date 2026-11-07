import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { dailyRange, dailyReportRows } from '@/app/lib/daily-report';
import { getAttendanceConfig } from '@/app/lib/attendance-config';
import { reportRange } from '@/app/lib/attendance-policy';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const s = await getSession();
  if (s?.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  try {
    const date = request.nextUrl.searchParams.get('date');
    const daily = date !== null;
    const range = daily ? dailyRange(date) : reportRange(request.nextUrl.searchParams);
    const employeeId = request.nextUrl.searchParams.get('employeeId');
    if (employeeId && !/^[A-Za-z0-9_-]{1,64}$/.test(employeeId)) throw Error('Invalid employee ID.');
    await connectDB();
    const employees = await Employee.find(employeeId ? { employeeId } : { employeeId: { $type: 'string' } }).select('employeeId name department status createdAt shift_timing shiftStart shiftEnd weeklyOffDays workDateOverrides').sort({ name: 1 }).lean();
    const people = new Map(employees.map(e => [e.employeeId, e]));
    const records = await Attendance.find({ employeeId: { $in: [...people.keys()] }, date: { $gte: range.start, $lt: range.end } }).select('employeeId employeeName date status checkIn.time checkOut.time earlyCheckout').sort({ date: -1, employeeId: 1 }).lean();
    const summary = Object.fromEntries((daily ? ['Present', 'Late', 'Absent', 'Leave', 'Off', 'Pending', 'Scheduled', 'ShiftNotSet', 'NotJoined'] : ['OnTime', 'Late', 'HalfDay', 'Absent', 'Leave']).map(k => [k, 0]));
    const rows = daily ? dailyReportRows(employees, records, date, (await getAttendanceConfig()) || {}) : records.map(a => {
      if (a.status in summary) summary[a.status]++;
      const e = people.get(a.employeeId);
      return { employeeId: a.employeeId, name: a.employeeName || e?.name || a.employeeId, department: e?.department || '', date: a.date, status: a.status, checkInTime: a.checkIn?.time || null, checkOutTime: a.checkOut?.time || null, earlyCheckout: a.earlyCheckout || null };
    });
    if (daily) for (const row of rows) {
      if (row.present) summary.Present++;
      if (row.status !== 'OnTime' && row.status in summary) summary[row.status]++;
    }
    return NextResponse.json({ mode: daily ? 'daily' : 'recorded', range, rows, summary, employees: employees.map(e => ({employeeId: e.employeeId, name: e.name})), note: daily ? 'All active employees plus removed employees with a recorded entry. Present includes late arrivals; Late is a subset of Present. Missing check-in becomes Absent only after the shift ends. Dates refer to the shift start date in Pakistan time. Saved attendance is unchanged.' : 'Recorded attendance only. Missing dates are not automatically counted as absence; weekly off days and calendar exceptions are shown in employee schedules.', generatedAt: new Date() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e.name === 'Error' ? e.message : 'Could not load report.' }, { status: 400 }); }
}
