// Shared server policy. All attendance dates and shift boundaries use Pakistan time.
import { isOffDay, validWorkDate } from './work-calendar';
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
// Missing weekday entries inherit the employee's existing default shift.
export function weeklyShiftFields(body, existing = {}) {
  const rows = body.weeklyShifts === undefined ? (existing.weeklyShifts || []) : body.weeklyShifts;
  if (!Array.isArray(rows) || rows.length > 7) throw Error('Use at most one custom shift per weekday.');
  const seen = new Set();
  return { weeklyShifts: rows.map(row => {
    if (!row || !Number.isInteger(row.day) || row.day < 0 || row.day > 6 || seen.has(row.day)) throw Error('Choose each weekday only once.');
    const {startTime, endTime} = row;
    if (typeof startTime !== 'string' || typeof endTime !== 'string' || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || clockMinutes(startTime) == null || clockMinutes(endTime) == null || startTime === endTime) throw Error('Custom shifts need valid, different start and end times.');
    seen.add(row.day); return {day: row.day, startTime, endTime};
  }).sort((a,b) => a.day - b.day) };
}
export function parseShift(employee, config = {}, date) {
  const weekday = validWorkDate(date) ? new Date(date + 'T00:00:00Z').getUTCDay() : null;
  const custom = weekday == null ? null : employee?.weeklyShifts?.find(row => row.day === weekday);
  if (custom) {
    const start = clockMinutes(custom.startTime), end = clockMinutes(custom.endTime);
    return start == null || end == null || start === end ? null : {start, end, overnight: end < start};
  }
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
  const day = dayPKT(now), previous = addDays(day, -1);
  const priorShift = parseShift(employee, config, previous);
  const minute = (+now - Date.parse(day + 'T00:00:00+05:00')) / 60000;
  // Use the PREVIOUS weekday's hours for its after-midnight portion.
  return priorShift?.overnight && !isOffDay(employee, previous) && minute <= priorShift.end ? previous : day;
}
export function shiftWindow(employee, config = {}, date = dayPKT()) {
  const shift = parseShift(employee, config, date);
  if (!shift) return null;
  const midnight = Date.parse(date + 'T00:00:00+05:00');
  return { start: midnight + shift.start * 60000, end: midnight + (shift.end + (shift.overnight ? 1440 : 0)) * 60000 };
}
export function shiftLabel(employee, config = {}, date = dayPKT()) {
  if (isOffDay(employee, date)) return 'Off';
  const shift = parseShift(employee, config, date);
  if (!shift) return 'Shift not set';
  const clock = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  return clock(shift.start) + ' – ' + clock(shift.end) + (shift.overnight ? ' (+1 day)' : '');
}
export function checkInStatus(employee, config, now, date = shiftDate(employee, config, now)) {
  if (isOffDay(employee, date)) return 'OnTime';
  const window = shiftWindow(employee, config, date);
  if (!window) throw new Error('Shift is not configured. Ask your manager to set a valid shift.');
  return +now > window.start + GRACE_MINUTES * 60000 ? 'Late' : 'OnTime';
}
export function missingStatus(employee, config, now = new Date(), date = shiftDate(employee, config, now)) {
  if (isOffDay(employee, date)) return 'Off';
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

// Exactly 15 minutes early is dashboard-only; compare seconds before rounding.
export function earlyCheckoutPolicy(employee, config, date, now = new Date()) {
  if (isOffDay(employee, date)) return { policyVersion: 'early-checkout-v1', earlySeconds: 0, earlyMinutes: 0, whatsappRequired: false, notificationState: 'scheduled-off' };
  const window = shiftWindow(employee, config, date);
  if (!window) return { policyVersion: 'early-checkout-v1', earlySeconds: 0, earlyMinutes: 0, whatsappRequired: false, notificationState: 'shift-not-set' };
  const earlySeconds = Math.max(0, Math.ceil((window.end - +now) / 1000));
  const whatsappRequired = window.end - +now > 15 * 60000;
  return { policyVersion: 'early-checkout-v1', shiftEnd: new Date(window.end), earlySeconds,
    earlyMinutes: Math.ceil(earlySeconds / 60), whatsappRequired,
    notificationState: whatsappRequired ? 'pending' : 'not-required' };
}
