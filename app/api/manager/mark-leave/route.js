import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

function todayPKT() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  try {
    const { employeeId, note } = await request.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });

    await connectDB();
    const employee = await Employee.findOne({ employeeId });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    const date = todayPKT();
    await Attendance.findOneAndUpdate(
      { employeeId, date },
      { $setOnInsert: { employeeId, employeeName: employee.name, date }, $set: { status: 'Leave', reviewedBy: session.userId, reviewNote: note || null, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
