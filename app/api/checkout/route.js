import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance, AttendanceConfig } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { classifyAssignedLocation } from '@/app/lib/geo';
import { validCoordinates, faceDistance, attendanceReady, dayPKT, addDays } from '@/app/lib/attendance-policy';
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const { photo, faceDescriptor, lat, lng } = await request.json();
    if (typeof photo !== 'string' || !photo.startsWith('data:image/') || photo.length > 3000000 || !validCoordinates(lat, lng)) return NextResponse.json({ error: 'A photo and valid location are required.' }, { status: 400 });
    await connectDB();
    const employee = await Employee.findOne({ employeeId: session.userId });
    if (!attendanceReady(employee)) return NextResponse.json({ error: 'Complete your password and selfie setup first.' }, { status: 403 });
    const now = new Date();
    // A night shift is checked out against its original shift date, even after midnight.
    const existing = await Attendance.findOne({ employeeId: employee.employeeId, date: { $gte: addDays(dayPKT(now), -1), $lte: dayPKT(now) }, 'checkIn.time': { $exists: true }, 'checkOut.time': { $exists: false } }).sort({ 'checkIn.time': -1 });
    if (!existing) return NextResponse.json({ error: 'No open check-in found. Refresh your attendance.' }, { status: 409 });
    const config = (await AttendanceConfig.findOne({ key: 'default' })) || {};
    const distance = faceDistance(employee.faceDescriptor, faceDescriptor);
    if (distance > 0.5) return NextResponse.json({ error: 'Selfie did not match. Please try again with better lighting.' }, { status: 400 });
    const location = classifyAssignedLocation(lat, lng, config, employee.assignedLocation);
    if (employee.assignedLocation !== 'either' && location.label !== employee.assignedLocation) return NextResponse.json({ error: 'You must be within 1 km of your assigned location.' }, { status: 400 });
    const checkOut = { time: now, lat, lng, photo, faceMatchDistance: distance, faceMatchStatus: 'verified', locationLabel: location.label, distanceMeters: location.distanceMeters };
    const record = await Attendance.findOneAndUpdate({ _id: existing._id, 'checkOut.time': { $exists: false } }, { $set: { checkOut, updatedAt: now } }, { new: true });
    return NextResponse.json({ ok: true, alreadyCheckedOut: !record, faceMatchStatus: 'verified', locationLabel: location.label });
  } catch { return NextResponse.json({ error: 'Could not record attendance. Please try again.' }, { status: 500 }); }
}
