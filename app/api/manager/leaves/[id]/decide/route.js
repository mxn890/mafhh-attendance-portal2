import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db/connect';
import { LeaveRequest, Attendance } from '@/app/lib/db/models';
import { getSession } from '@/app/lib/auth/jwt';

function datesBetween(fromDate, toDate) {
  const dates = [];
  let current = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current = new Date(current.getTime() + 86400000);
  }
  return dates;
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Manager access required.' }, { status: 403 });
  }

  try {
    const { decision, managerNote } = await request.json(); // decision: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be "approved" or "rejected".' }, { status: 400 });
    }

    await connectDB();
    const leave = await LeaveRequest.findById(params.id);
    if (!leave) return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });

    leave.status = decision;
    leave.reviewedBy = session.userId;
    leave.reviewedAt = new Date();
    leave.managerNote = managerNote || null;
    await leave.save();

    if (decision === 'approved') {
      const dates = datesBetween(leave.fromDate, leave.toDate);
      for (const date of dates) {
        await Attendance.findOneAndUpdate(
          { employeeId: leave.employeeId, date },
          {
            $setOnInsert: { employeeId: leave.employeeId, employeeName: leave.employeeName, date },
            $set: { status: 'Leave', reviewedBy: session.userId, reviewNote: leave.reason, updatedAt: new Date() },
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ ok: true, status: leave.status });
  } catch (err) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
