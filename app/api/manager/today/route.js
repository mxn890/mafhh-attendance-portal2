import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { Employee, Attendance, AttendanceConfig } from '@/app/lib/db/models';
import { dayPKT, addDays, shiftDate, missingStatus } from '@/app/lib/attendance-policy';
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
  const employees = await Employee.find({ status: 'active' }).sort({ department: 1, name: 1 });
  const config = (await AttendanceConfig.findOne({ key: 'default' })) || {};
  const now = new Date();
  const records = await Attendance.find({ date: { $gte: addDays(date, -1), $lte: date } });
  const byEmployeeId = new Map(records.map((r) => [r.employeeId + ":" + r.date, r]));

  const rows = employees.map((e) => {
    const rec = byEmployeeId.get(e.employeeId + ":" + shiftDate(e, config, now)) || records.find(r => r.employeeId === e.employeeId && r.checkIn?.time && !r.checkOut?.time);
    return {
      employeeId: e.employeeId,
      name: e.name,
      department: e.department,
      shift_timing: e.shift_timing,
      isEnrolled: e.isEnrolled,
      assignedLocation: e.assignedLocation || 'either',
      status: rec?.status || missingStatus(e, config, now),
      attendanceDate: rec?.date || shiftDate(e, config, now),
      checkInTime: rec?.checkIn?.time || null,
      checkOutTime: rec?.checkOut?.time || null,
      checkInFaceMatch: rec?.checkIn?.faceMatchStatus || null,
      checkOutFaceMatch: rec?.checkOut?.faceMatchStatus || null,
      checkInLocation: rec?.checkIn?.locationLabel || null,
      checkInDistance: rec?.checkIn?.distanceMeters ?? null,
      checkOutLocation: rec?.checkOut?.locationLabel || null,
      checkOutDistance: rec?.checkOut?.distanceMeters ?? null,
      checkInPhoto: rec?.checkIn?.photo || null,
      checkOutPhoto: rec?.checkOut?.photo || null,
    };
  });

  return NextResponse.json({ date, rows });
}

