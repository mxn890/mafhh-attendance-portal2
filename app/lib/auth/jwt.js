import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import connectDB from '../db/connect';
import { Employee } from '../db/models';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const JWT_EXPIRE = process.env.JWT_EXPIRE || '1d'; // shorter than the CEO dashboard — this may run on a shared/shift device

export async function createToken(employeeId, email, role, authVersion = 0) {
  return await new SignJWT({ userId: employeeId, email, role, authVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRE)
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload?.userId) return null;
    await connectDB();
    const employee = await Employee.findOne({ employeeId: payload.userId }).select('employeeId attendanceRole status authVersion').lean();
    if (!employee || employee.status !== 'active' || Number(payload.authVersion || 0) !== Number(employee.authVersion || 0)) return null;
    return { ...payload, role: employee.attendanceRole };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

