import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance, AttendanceConfig } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { classifyAssignedLocation } from '@/app/lib/geo';
import { validCoordinates, faceDistance, attendanceReady, shiftDate, checkInStatus } from '@/app/lib/attendance-policy';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const { photo, faceDescriptor, lat, lng } = await request.json();
    if (typeof photo !== 'string' || !photo.startsWith('data:image/') || photo.length > 3000000 || !validCoordinates(lat, lng)) return NextResponse.json({ error: 'A photo and valid location are required.' }, { status: 400 });
    await connectDB();
    const employee = await Employee.findOne({ employeeId: session.userId });
    if (!attendanceReady(employee)) return NextResponse.json({ error: 'Complete your password and selfie setup first.' }, { status: 403 });
    const config = (await AttendanceConfig.findOne({ key: 'default' })) || {};
    const now = new Date(), date = shiftDate(employee, config, now);
    const existing = await Attendance.findOne({ employeeId: employee.employeeId, date });
    if (existing?.checkIn?.time) return NextResponse.json({ ok: true, alreadyCheckedIn: true, status: existing.status, checkInTime: existing.checkIn.time });
    if (existing?.status === 'Leave') return NextResponse.json({ error: 'Leave is recorded for this shift. Ask your manager to correct it before checking in.' }, { status: 409 });
    const distance = faceDistance(employee.faceDescriptor, faceDescriptor);
    if (distance > 0.5) return NextResponse.json({ error: 'Selfie did not match. Please try again with better lighting.' }, { status: 400 });
    const location = classifyAssignedLocation(lat, lng, config, employee.assignedLocation);
    if (employee.assignedLocation !== 'either' && location.label !== employee.assignedLocation) return NextResponse.json({ error: 'You must be within 1 km of your assigned location.' }, { status: 400 });
    let status;
    try { status = checkInStatus(employee, config, now, date); }
    catch (e) { return NextResponse.json({ error: e.message }, { status: 409 }); }
    const checkIn = { time: now, lat, lng, photo, faceMatchDistance: distance, faceMatchStatus: 'verified', locationLabel: location.label, distanceMeters: location.distanceMeters };
    let record;
    try {
      record = await Attendance.findOneAndUpdate(
        { employeeId: employee.employeeId, date, 'checkIn.time': { $exists: false }, status: { $ne: 'Leave' } },
        { $setOnInsert: { employeeId: employee.employeeId, employeeName: employee.name, date }, $set: { checkIn, status, updatedAt: now } },
        { upsert: true, new: true }
      );
    } catch (e) {
      if (e.code !== 11000) throw e;
      record = await Attendance.findOne({ employeeId: employee.employeeId, date });
      if (!record?.checkIn?.time) return NextResponse.json({ error: 'Attendance changed. Refresh and try again.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: record.status, checkInTime: record.checkIn.time, faceMatchStatus: 'verified', locationLabel: record.checkIn.locationLabel });
  } catch { return NextResponse.json({ error: 'Could not record attendance. Please try again.' }, { status: 500 }); }
}
