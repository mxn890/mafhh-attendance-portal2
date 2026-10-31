import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { AttendanceConfig, Employee } from '@/app/lib/db/models';
import { validCoordinates } from '@/app/lib/attendance-policy';
import { getSession } from '@/app/lib/auth/jwt';
import { classifyAssignedLocation } from '@/app/lib/geo';

export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const lat = parseFloat(request.nextUrl.searchParams.get('lat'));
  const lng = parseFloat(request.nextUrl.searchParams.get('lng'));
  if (!validCoordinates(lat, lng)) return NextResponse.json({ error: 'lat/lng required.' }, { status: 400 });

  await connectDB();
  const config = await AttendanceConfig.findOne({ key: 'default' });
  const employee = await Employee.findOne({ employeeId: session.userId }).select('assignedLocation');
  const result = classifyAssignedLocation(lat, lng, config, employee?.assignedLocation);
  result.exempt = employee?.assignedLocation === 'either';

  return NextResponse.json(result);
}

