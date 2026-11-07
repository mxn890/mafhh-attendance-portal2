'use client';
import { useState } from 'react';
import { WEEKDAYS, isOffDay, weeklyOffDays } from '../lib/work-calendar';
export default function WorkCalendar({value, onChange, disabled}) {
  const [month, setMonth] = useState(() => new Date(Date.now() + 18000000).toISOString().slice(0, 7));
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const off = weeklyOffDays(value), overrides = value.workDateOverrides || [];
  function move(n) { setMonth(new Date(Date.UTC(year, number - 1 + n, 1)).toISOString().slice(0, 7)); }
  function toggle(date) {
    const isOff = !isOffDay(value, date);
    const weekly = off.includes(new Date(date + 'T00:00:00Z').getUTCDay());
    const next = overrides.filter(row => row.date !== date);
    if (isOff !== weekly) next.push({date, isOff});
    onChange({workDateOverrides: next});
  }
  return <section className="mt-5 border border-line p-3" aria-label="Employee work calendar">
    <h3 className="font-semibold text-sm">Weekly off &amp; work calendar</h3>
    <p className="text-xs text-slate mt-1">Sunday is the default. Change the weekly off, or tap a date for a one-day change. Dates use Pakistan time and the shift start date.</p>
    <label className="block text-sm mt-3">Weekly off day<select disabled={disabled} className="block border border-line p-2 w-full mt-1" value={off.length === 1 ? off[0] : off.length === 0 ? 'none' : 'custom'} onChange={e => onChange({weeklyOffDays: e.target.value === 'none' ? [] : [Number(e.target.value)]})}>
      {WEEKDAYS.map((day,i) => <option key={day} value={i}>{day}</option>)}<option value="none">No weekly off</option>{off.length > 1 && <option value="custom">Multiple off days</option>}
    </select></label>
    <div className="flex items-center justify-between gap-2 mt-4"><button type="button" disabled={disabled || year <= 2000 && number === 1} onClick={() => move(-1)} aria-label="Previous month" className="action-button">←</button><label className="text-sm"><span className="sr-only">Calendar month</span><input type="month" min="2000-01" max="2100-12" value={month} disabled={disabled} onChange={e => {if (/^\d{4}-\d{2}$/.test(e.target.value) && e.target.value >= '2000-01' && e.target.value <= '2100-12') setMonth(e.target.value);}} className="border border-line p-2" /></label><button type="button" disabled={disabled || year >= 2100 && number === 12} onClick={() => move(1)} aria-label="Next month" className="action-button">→</button></div>
    <div className="grid grid-cols-7 gap-1 mt-3 text-center text-xs">{WEEKDAYS.map(day => <span key={day} className="text-slate py-1">{day.slice(0,3)}</span>)}{Array.from({length:first.getUTCDay()},(_,i) => <span key={'blank'+i} />)}
      {Array.from({length:days},(_,i) => {
        const date = month + '-' + String(i+1).padStart(2,'0'), rest = isOffDay(value,date), exception = overrides.some(row => row.date === date);
        return <button type="button" disabled={disabled} key={date} aria-pressed={rest} aria-label={date + (rest ? ', day off' : ', working') + (exception ? ', date exception' : '')} onClick={() => toggle(date)} className={'border p-1 min-h-[44px] rounded ' + (rest ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-line')}><span className="block">{i+1}{exception ? ' *' : ''}</span><span className="block text-[9px]">{rest ? 'Off' : 'Work'}</span></button>;
      })}
    </div><p className="text-xs text-slate mt-2">Dark = off · * = date exception. Saved attendance is unchanged.</p>
    {overrides.length > 0 && <button type="button" disabled={disabled} className="action-button mt-2" onClick={() => onChange({workDateOverrides: []})}>Reset date exceptions ({overrides.length})</button>}
  </section>;
}
