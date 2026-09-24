import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance, AttendanceConfig } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';
import { classifyLocation } from '@/app/lib/geo';

function faceDistanceServer(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function todayPKT() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function minutesSinceMidnightPKT(date) {
  const pkt = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return pkt.getUTCHours() * 60 + pkt.getUTCMinutes();
}

function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function deriveCheckInStatus(checkInTime, shiftRules) {
  const mins = minutesSinceMidnightPKT(checkInTime);
  if (mins > parseHHMM(shiftRules.halfDayAfter)) return 'HalfDay';
  if (mins > parseHHMM(shiftRules.lateAfter)) return 'Late';
  return 'OnTime';
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const { photo, faceDescriptor, lat, lng } = await request.json();
    if (!photo || lat == null || lng == null) {
      return NextResponse.json({ error: 'Photo and location are required.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOne({ employeeId: session.userId });
    if (!employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    if (!employee.isEnrolled) {
      return NextResponse.json({ error: 'Please complete selfie enrollment first.' }, { status: 400 });
    }

    const config = (await AttendanceConfig.findOne({ key: 'default' })) || new AttendanceConfig({ key: 'default' });
    const now = new Date();

    let faceMatchStatus = 'no_face_detected';
    let faceMatchDistance = null;
    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      faceMatchDistance = faceDistanceServer(employee.faceDescriptor, faceDescriptor);
      faceMatchStatus = faceMatchDistance <= 0.5 ? 'verified' : 'needs_review';
    }

    if (faceMatchStatus !== 'verified') {
      return NextResponse.json(
        { error: "This photo doesn't confidently match your enrollment photo — please try again with better lighting, facing the camera directly." },
        { status: 400 }
      );
    }

    const location = classifyLocation(lat, lng, config);

    if (employee.assignedLocation !== 'either' && location.label !== employee.assignedLocation) {
      const zoneName = employee.assignedLocation === 'office' ? 'the office' : 'the airport';
      return NextResponse.json(
        { error: `You're not near ${zoneName} — you must be within range of your assigned location to check in.` },
        { status: 400 }
      );
    }

    const date = todayPKT();
    const status = deriveCheckInStatus(now, config.shiftRules);

    const record = await Attendance.findOneAndUpdate(
      { employeeId: employee.employeeId, date },
      {
        $setOnInsert: { employeeId: employee.employeeId, employeeName: employee.name, date },
        $set: {
          checkIn: { time: now, lat, lng, photo, faceMatchDistance, faceMatchStatus, locationLabel: location.label, distanceMeters: location.distanceMeters },
          status,
          updatedAt: now,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, status: record.status, faceMatchStatus, locationLabel: location.label });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
