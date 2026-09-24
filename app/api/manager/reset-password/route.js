import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/lib/db/connect';
import { Employee } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  try {
    const { employeeId } = await request.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });

    await connectDB();
    const employee = await Employee.findOne({ employeeId });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    const tempPassword = generateTempPassword();
    employee.password = await bcrypt.hash(tempPassword, 10);
    employee.mustChangePassword = true;
    employee.updatedAt = new Date();
    await employee.save();

    return NextResponse.json({ ok: true, employeeId: employee.employeeId, name: employee.name, tempPassword });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
