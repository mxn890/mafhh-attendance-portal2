import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { LocationPing, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

function todayPKT() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const { lat, lng } = await request.json();
    if (lat == null || lng == null) return NextResponse.json({ error: 'lat/lng required.' }, { status: 400 });

    await connectDB();

    // Only log pings while actually checked in and not yet checked out —
    // this is a duty-hours trail, not indefinite tracking.
    const today = await Attendance.findOne({ employeeId: session.userId, date: todayPKT() });
    if (!today?.checkIn || today?.checkOut) {
      return NextResponse.json({ ok: false, reason: 'not_on_duty' });
    }

    await LocationPing.create({ employeeId: session.userId, lat, lng });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
