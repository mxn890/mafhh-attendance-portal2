import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { AttendanceConfig } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { classifyLocation } from '@/app/lib/geo';

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const lat = parseFloat(request.nextUrl.searchParams.get('lat'));
  const lng = parseFloat(request.nextUrl.searchParams.get('lng'));
  if (isNaN(lat) || isNaN(lng)) return NextResponse.json({ error: 'lat/lng required.' }, { status: 400 });

  await connectDB();
  const config = await AttendanceConfig.findOne({ key: 'default' });
  const result = classifyLocation(lat, lng, config);

  return NextResponse.json(result);
}
