import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  try {
    const { employeeId, assignedLocation } = await request.json();
    if (!employeeId || !['office', 'airport', 'either'].includes(assignedLocation)) {
      return NextResponse.json({ error: 'A valid employeeId and assignedLocation are required.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { assignedLocation, updatedAt: new Date() },
      { new: true }
    );
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    return NextResponse.json({ ok: true, employeeId: employee.employeeId, assignedLocation: employee.assignedLocation });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
