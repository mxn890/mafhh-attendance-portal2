'use client';
import { WEEKDAYS, weeklyOffDays } from '../lib/work-calendar';

export default function WeeklyShiftEditor({value, onChange, disabled}) {
  const shifts = value.weeklyShifts || [], off = weeklyOffDays(value);
  function set(day, fields) {
    const current = shifts.find(row => row.day === day);
    onChange({weeklyShifts: [...shifts.filter(row => row.day !== day), {day, startTime: current?.startTime || value.shiftStart, endTime: current?.endTime || value.shiftEnd, ...fields}].sort((a,b) => a.day-b.day)});
  }
  return <section className="mt-5 border border-line p-3" aria-label="Day-wise shifts">
    <h3 className="font-semibold text-sm">Day-wise shift timings</h3>
    <p className="text-xs text-slate mt-1">Every day uses the default shift above. Enable custom hours only for days that differ. Weekly off and calendar exceptions still apply.</p>
    <div className="divide-y divide-line mt-2">{[1,2,3,4,5,6,0].map(day => {
      const custom = shifts.find(row => row.day === day);
      return <fieldset key={day} disabled={disabled} className="py-3 min-w-0">
        <legend className="sr-only">{WEEKDAYS[day]} shift</legend>
        <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{WEEKDAYS[day]}{off.includes(day) && <span className="text-xs text-slate ml-2">Weekly off</span>}</span>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!custom} onChange={e => e.target.checked ? set(day, {}) : onChange({weeklyShifts: shifts.filter(row => row.day !== day)})} />Custom hours</label>
        </div>
        {custom ? <div className="grid grid-cols-2 gap-3 mt-2"><label className="text-xs">Starts<input required type="time" aria-label={WEEKDAYS[day] + ' shift starts'} value={custom.startTime} onChange={e => set(day, {startTime:e.target.value})} className="block border border-line p-2 w-full min-w-0 mt-1" /></label><label className="text-xs">Ends<input required type="time" aria-label={WEEKDAYS[day] + ' shift ends'} value={custom.endTime} onChange={e => set(day, {endTime:e.target.value})} className="block border border-line p-2 w-full min-w-0 mt-1" /></label></div> : <p className="text-xs text-slate mt-1">Default: {value.shiftStart || '—'} – {value.shiftEnd || '—'}</p>}
      </fieldset>;
    })}</div>
    <p className="text-xs text-slate">An end time earlier than the start means next-day checkout. Timings follow Pakistan time. Saved attendance and sent alerts are not recalculated.</p>
  </section>;
}
