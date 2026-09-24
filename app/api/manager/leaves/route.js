import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { LeaveRequest } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

export async function GET(request) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  await connectDB();
  const status = request.nextUrl.searchParams.get('status');
  const query = status ? { status } : {};
  const requests = await LeaveRequest.find(query).sort({ requestedAt: -1 });
  return NextResponse.json({ requests });
}
