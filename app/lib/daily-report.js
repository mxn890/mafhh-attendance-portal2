import { addDays, dayPKT, missingStatus } from './attendance-policy';
import { validWorkDate } from './work-calendar';

export function dailyRange(date) {
  if (!validWorkDate(date)) throw Error('Choose a valid report date.');
  return {start: date, end: addDays(date, 1), label: 'Daily report · ' + date};
}
export function dailyReportRows(employees, records, date, config, now = new Date()) {
  const byId = new Map(records.map(r => [r.employeeId, r]));
  return employees.filter(e => e.status === 'active' || byId.has(e.employeeId)).map(e => {
    const a = byId.get(e.employeeId);
    const notJoined = e.createdAt && dayPKT(new Date(e.createdAt)) > date;
    const status = a?.status || (notJoined ? 'NotJoined' : missingStatus(e, config, now, date));
    return {employeeId:e.employeeId, name:a?.employeeName || e.name, department:e.department || '', date,
      status, present:!!a?.checkIn?.time, checkInTime:a?.checkIn?.time || null,
      checkOutTime:a?.checkOut?.time || null, earlyCheckout:a?.earlyCheckout || null};
  });
}
