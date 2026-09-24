import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, LeaveRequest } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  await connectDB();
  const requests = await LeaveRequest.find({ employeeId: session.userId }).sort({ requestedAt: -1 });
  return NextResponse.json({ requests });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const { fromDate, toDate, reason } = await request.json();
    if (!fromDate || !toDate || !reason?.trim()) {
      return NextResponse.json({ error: 'From date, to date and a reason are all required.' }, { status: 400 });
    }
    if (toDate < fromDate) {
      return NextResponse.json({ error: 'End date must be on or after the start date.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOne({ employeeId: session.userId });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    const leave = await LeaveRequest.create({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      fromDate, toDate, reason: reason.trim(),
    });

    return NextResponse.json({ ok: true, id: leave._id });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
