import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/app/lib/db/connect';
import { Employee } from '@/app/lib/db/models';
import { validDescriptor } from '@/app/lib/attendance-policy';
import { getSession, createToken, setAuthCookie } from '@/app/lib/auth/jwt';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const { newPassword, faceDescriptor, enrollmentPhoto } = await request.json();

    await connectDB();
    const employee = await Employee.findOne({ employeeId: session.userId });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 256) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      employee.password = await bcrypt.hash(newPassword, 10);
      employee.mustChangePassword = false;
      employee.authVersion = Number(employee.authVersion || 0) + 1;
    }

    if (faceDescriptor && enrollmentPhoto) {
      if (typeof enrollmentPhoto !== 'string' || !enrollmentPhoto.startsWith('data:image/') || enrollmentPhoto.length > 3000000) return NextResponse.json({ error: 'A valid enrollment photo is required.' }, { status: 400 });
      if (!validDescriptor(faceDescriptor)) {
        return NextResponse.json({ error: 'Could not read a clear face from that photo — please try again.' }, { status: 400 });
      }
      employee.faceDescriptor = faceDescriptor;
      employee.enrollmentPhoto = enrollmentPhoto;
      employee.isEnrolled = true;
    }

    employee.updatedAt = new Date();
    await employee.save();
    if (newPassword) await setAuthCookie(await createToken(employee.employeeId, employee.email || employee.employeeId, employee.attendanceRole, employee.authVersion));

    return NextResponse.json({ ok: true, mustChangePassword: employee.mustChangePassword, isEnrolled: employee.isEnrolled });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

