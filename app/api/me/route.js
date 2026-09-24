import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

function todayPKT() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  await connectDB();
  const employee = await Employee.findOne({ employeeId: session.userId });
  if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

  const today = await Attendance.findOne({ employeeId: employee.employeeId, date: todayPKT() });

  return NextResponse.json({
    employeeId: employee.employeeId,
    name: employee.name,
    department: employee.department,
    shift_timing: employee.shift_timing,
    role: employee.attendanceRole,
    mustChangePassword: employee.mustChangePassword,
    isEnrolled: employee.isEnrolled,
    today: today ? {
      checkedIn: !!today.checkIn,
      checkedOut: !!today.checkOut,
      status: today.status,
      checkInTime: today.checkIn?.time || null,
      checkOutTime: today.checkOut?.time || null,
    } : { checkedIn: false, checkedOut: false, status: null },
  });
}
