import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/app/lib/auth/jwt';

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
