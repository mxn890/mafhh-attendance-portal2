// Work dates use Pakistan shift-start dates; no attendance records are rewritten.
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function validWorkDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date + 'T00:00:00Z')) &&
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}
export function weeklyOffDays(employee = {}) {
  return Array.isArray(employee.weeklyOffDays) ? employee.weeklyOffDays : [0];
}
export function isOffDay(employee, date) {
  if (!validWorkDate(date)) return false;
  const exception = (employee?.workDateOverrides || []).find(item => item.date === date);
  if (exception && typeof exception.isOff === 'boolean') return exception.isOff;
  return weeklyOffDays(employee).includes(new Date(date + 'T00:00:00Z').getUTCDay());
}
export function calendarFields(body, existing = {}) {
  const days = body.weeklyOffDays === undefined ? weeklyOffDays(existing) : body.weeklyOffDays;
  if (!Array.isArray(days) || days.length > 7 || days.some(d => !Number.isInteger(d) || d < 0 || d > 6) || new Set(days).size !== days.length) throw Error('Choose valid weekly off days.');
  const overrides = body.workDateOverrides === undefined ? (existing.workDateOverrides || []) : body.workDateOverrides;
  if (!Array.isArray(overrides) || overrides.length > 366) throw Error('Use up to 366 calendar exceptions.');
  const seen = new Set();
  const normalized = overrides.map(row => {
    if (!row || !validWorkDate(row.date) || typeof row.isOff !== 'boolean' || seen.has(row.date)) throw Error('Each calendar date must be valid, unique and marked working or off.');
    seen.add(row.date); return {date: row.date, isOff: row.isOff};
  }).sort((a,b) => a.date.localeCompare(b.date));
  return {weeklyOffDays: [...days].sort(), workDateOverrides: normalized};
}
