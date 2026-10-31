// Shared server policy. All attendance dates and shift boundaries use Pakistan time.
export const GRACE_MINUTES = 30;
export const LOCATION_RADIUS_METRES = 1000;
const DAY = 86400000;
export function dayPKT(now = new Date()) { return new Date(+now + 18000000).toISOString().slice(0, 10); }
export function addDays(day, n) { return new Date(Date.parse(day + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10); }
export function clockMinutes(value) {
  const m = String(value || '').trim().toUpperCase().replace(/(\d)\s*-\s*(AM|PM)/g, '$1$2').match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = Number(m[1]), min = Number(m[2] || 0);
  if (min > 59 || (m[3] ? h < 1 || h > 12 : h > 23)) return null;
  if (m[3]) h = h % 12 + (m[3] === 'PM' ? 12 : 0);
  return h * 60 + min;
}
export function parseShift(employee, config = {}) {
  const text = String(employee?.shift_timing || '').trim().replace(/(\d)\s*-\s*(AM|PM)/gi, '$1$2');
  const pieces = text.split(/\s*[-–—]\s*|\s+to\s+/i);
  const start = clockMinutes(employee?.shiftStart || pieces[0]);
  const end = clockMinutes(employee?.shiftEnd || pieces[1]);
  if (text && (start == null || end == null || start === end)) return null;
  const a = start ?? clockMinutes(config.shiftRules?.startTime || '09:00');
  const b = end ?? clockMinutes(config.shiftRules?.endTime || '18:00');
  if (a == null || b == null || a === b) return null;
  return { start: a, end: b, overnight: b < a };
}
export function shiftDate(employee, config = {}, now = new Date()) {
  const shift = parseShift(employee, config);
  const day = dayPKT(now), minute = (+now - Date.parse(day + 'T00:00:00+05:00')) / 60000;
  // After midnight, an overnight shift belongs to its starting date.
  return shift?.overnight && minute <= shift.end ? addDays(day, -1) : day;
}
export function shiftWindow(employee, config = {}, date = dayPKT()) {
  const shift = parseShift(employee, config);
  if (!shift) return null;
  const midnight = Date.parse(date + 'T00:00:00+05:00');
  return { start: midnight + shift.start * 60000, end: midnight + (shift.end + (shift.overnight ? 1440 : 0)) * 60000 };
}
export function checkInStatus(employee, config, now, date = shiftDate(employee, config, now)) {
  const window = shiftWindow(employee, config, date);
  if (!window) throw new Error('Shift is not configured. Ask your manager to set a valid shift.');
  return +now > window.start + GRACE_MINUTES * 60000 ? 'Late' : 'OnTime';
}
export function missingStatus(employee, config, now = new Date(), date = shiftDate(employee, config, now)) {
  const window = shiftWindow(employee, config, date);
  if (!window) return 'ShiftNotSet';
  if (+now < window.start) return 'Scheduled';
  if (+now <= window.end) return 'Pending';
  return 'Absent';
}
export function validCoordinates(lat, lng) { return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180; }
export function validDescriptor(d) { return Array.isArray(d) && d.length === 128 && d.every(v => typeof v === 'number' && Number.isFinite(v)); }
export function faceDistance(a, b) { return validDescriptor(a) && validDescriptor(b) ? Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0)) : Infinity; }
export function attendanceReady(employee) { return employee && employee.status === 'active' && !employee.mustChangePassword && employee.isEnrolled; }
export function reportRange(params, now = new Date()) {
  const month = params.get('month');
  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month.');
    const start = month + '-01';
    const end = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 1)).toISOString().slice(0,10);
    return { start, end, label: month };
  }
  const days = Number(params.get('days') || 7);
  if (![7, 14, 30].includes(days)) throw new Error('Choose 7 days, 14 days or a calendar month.');
  const today = dayPKT(now);
  return { start: addDays(today, 1 - days), end: addDays(today, 1), label: 'Last ' + days + ' days' };
}
