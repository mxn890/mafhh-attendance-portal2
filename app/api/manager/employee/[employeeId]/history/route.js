import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  const { employeeId } = params;
  const days = Math.min(parseInt(request.nextUrl.searchParams.get('days'), 10) || 30, 180);

  await connectDB();
  const employee = await Employee.findOne({ employeeId });
  if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

  const records = await Attendance.find({ employeeId }).sort({ date: -1 }).limit(days);

  const summary = { OnTime: 0, Late: 0, HalfDay: 0, Absent: 0, Leave: 0 };
  for (const r of records) if (summary[r.status] !== undefined) summary[r.status]++;

  return NextResponse.json({
    employee: { employeeId: employee.employeeId, name: employee.name, department: employee.department },
    records: records.map((r) => ({
      date: r.date,
      status: r.status,
      checkInTime: r.checkIn?.time || null,
      checkOutTime: r.checkOut?.time || null,
      checkInLocation: r.checkIn?.locationLabel || null,
      checkInPhoto: r.checkIn?.photo || null,
      checkOutPhoto: r.checkOut?.photo || null,
    })),
    summary,
  });
}
