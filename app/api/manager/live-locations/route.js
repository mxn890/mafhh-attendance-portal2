import { dayPKT, addDays } from '@/app/lib/attendance-policy';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance, LocationPing, AttendanceConfig } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

function todayPKT() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  await connectDB();
  const date = todayPKT();

  // On duty = checked in today, not yet checked out.
  const onDuty = await Attendance.find({ date: { $gte: addDays(date, -1), $lte: date }, 'checkIn.time': { $exists: true }, 'checkOut.time': { $exists: false } });
  const employeeIds = onDuty.map((r) => r.employeeId);
  const employees = await Employee.find({ employeeId: { $in: employeeIds }, status: 'active' });
  const employeeById = new Map(employees.map((e) => [e.employeeId, e]));

  const points = [];
  for (const rec of onDuty) {
    const latestPing = await LocationPing.findOne({ employeeId: rec.employeeId }).sort({ timestamp: -1 });
    const emp = employeeById.get(rec.employeeId);
    if (!emp) continue;
    const source = latestPing && latestPing.timestamp >= rec.checkIn.time ? latestPing : rec.checkIn; // fall back to check-in point if no ping has landed yet
    points.push({
      employeeId: rec.employeeId,
      name: emp?.name || rec.employeeName,
      department: emp?.department,
      lat: source.lat,
      lng: source.lng,
      lastUpdate: latestPing?.timestamp || rec.checkIn?.time,
      live: !!latestPing,
    });
  }

  const config = await AttendanceConfig.findOne({ key: 'default' });

  return NextResponse.json({
    points,
    office: config?.officeLocation?.lat != null ? { lat: config.officeLocation.lat, lng: config.officeLocation.lng, radiusMeters: 1000 } : null,
    airport: config?.airportLocation?.lat != null ? { lat: config.airportLocation.lat, lng: config.airportLocation.lng, radiusMeters: 1000 } : null,
  });
}

