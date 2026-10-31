import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { tempPassword } from '@/app/lib/temp-password';
import connectDB from '@/app/lib/db/connect';
import { Employee } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  try {
    const { employeeId, resetSelfie } = await request.json();
    if (typeof employeeId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(employeeId)) return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });

    await connectDB();
    const employee = await Employee.findOne({ employeeId });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    if (employeeId === session.userId || employeeId === 'CEO' || employee.attendanceRole === 'manager') return NextResponse.json({ error: 'Use your own account setup to change this password.' }, { status: 403 });
    const password = tempPassword();
    employee.password = await bcrypt.hash(password, 10);
    employee.mustChangePassword = true;
    employee.authVersion = Number(employee.authVersion || 0) + 1;
    if (resetSelfie === true) { employee.isEnrolled = false; employee.faceDescriptor = null; employee.enrollmentPhoto = null; employee.profile_photo = null; }
    employee.updatedAt = new Date();
    await employee.save();

    return NextResponse.json({ ok: true, employeeId: employee.employeeId, name: employee.name, tempPassword: password }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

