import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/lib/db/connect';
import { Employee } from '@/app/lib/db/models';
import { createToken, setAuthCookie } from '@/app/lib/auth/jwt';

export async function POST(request) {
  try {
    const { employeeId, password } = await request.json();
    if (!employeeId || !password) {
      return NextResponse.json({ error: 'Employee ID and password are required.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOne({ employeeId: employeeId.trim().toUpperCase() });
    console.log(`[login debug] looked up "${employeeId.trim().toUpperCase()}" -> found: ${!!employee}, hasPassword: ${!!employee?.password}`);
    if (!employee || !employee.password) {
      return NextResponse.json({ error: 'Incorrect employee ID or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, employee.password);
    console.log(`[login debug] bcrypt.compare result: ${valid}`);
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect employee ID or password.' }, { status: 401 });
    }

    const token = await createToken(employee.employeeId, employee.email || employee.employeeId, employee.attendanceRole);
    await setAuthCookie(token);

    return NextResponse.json({
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.attendanceRole,
      mustChangePassword: employee.mustChangePassword,
      isEnrolled: employee.isEnrolled,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
