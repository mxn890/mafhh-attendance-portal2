import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { getSession } from '@/app/lib/auth/jwt';
import { resetBatch, recoverBatch } from '@/app/lib/credential-reset';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request) {
  const s = await getSession();
  if (s?.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  try {
    const body = await request.json();
    if (body.confirm !== 'RESET EMPLOYEES') throw Error('Confirm the employee reset first.');
    await connectDB();
    return NextResponse.json(await resetBatch(body.batchId, s.userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e.name === 'Error' ? e.message : 'Reset interrupted. Retry the same request to resume.' }, { status: 409 }); }
}
export async function GET(request) {
  const s = await getSession();
  if (s?.role !== 'manager') return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  try {
    await connectDB();
    return NextResponse.json(await recoverBatch(request.nextUrl.searchParams.get('batchId'), s.userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e.name === 'Error' ? e.message : 'Could not recover list.' }, { status: 404 }); }
}
