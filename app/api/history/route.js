import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const month = request.nextUrl.searchParams.get('month'); // 'YYYY-MM'
  const days = Math.min(parseInt(request.nextUrl.searchParams.get('days'), 10) || 14, 90);

  await connectDB();
  const employee = await Employee.findOne({ employeeId: session.userId });
  if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

  let records;
  if (month) {
    records = await Attendance.find({ employeeId: employee.employeeId, date: { $regex: `^${month}` } }).sort({ date: 1 });
  } else {
    records = await Attendance.find({ employeeId: employee.employeeId }).sort({ date: -1 }).limit(days);
  }

  const summary = { OnTime: 0, Late: 0, HalfDay: 0, Leave: 0 };
  for (const r of records) if (summary[r.status] !== undefined) summary[r.status]++;

  return NextResponse.json({
    records: records.map((r) => ({
      date: r.date,
      status: r.status,
      checkInTime: r.checkIn?.time || null,
      checkOutTime: r.checkOut?.time || null,
    })),
    summary,
  });
}
