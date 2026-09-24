'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeNav from '../components/EmployeeNav';

const STATUS_COLOR = {
  OnTime: 'bg-ok/15 text-ok border-ok/30',
  Late: 'bg-warn/15 text-warn border-warn/30',
  HalfDay: 'bg-warn/15 text-warn border-warn/30',
  Leave: 'bg-slate/10 text-slate border-line',
  Absent: 'bg-signal/10 text-signal border-signal/30',
};

function fmtTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false });
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const today = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const [month, setMonth] = useState(`${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`);
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((body) => { if (!body.error) setMe(body); }).catch(() => {});
  }, []);

  async function load(m) {
    try {
      const res = await fetch(`/api/history?month=${m}`);
      if (res.status === 401) return router.push('/login');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load.');
      setData(body);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(month); }, [month]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const r of data?.records || []) map.set(r.date, r);
    return map;
  }, [data]);

  const calendarCells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const leadingBlanks = firstDay.getDay(); // 0=Sun
    const cells = Array(leadingBlanks).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, record: byDate.get(dateStr) });
    }
    return cells;
  }, [month, byDate]);

  const selectedRecord = selectedDay ? byDate.get(selectedDay) : null;

  return (
    <div className="min-h-screen bg-mist">
      <EmployeeNav employee={me} />

      <main className="max-w-lg mx-auto px-4 py-6">
        {error && <p className="text-signal text-sm mb-4">{error}</p>}

        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="btn-secondary btn-sm">← Prev</button>
          <p className="font-display font-semibold text-ink">{monthLabel(month)}</p>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="btn-secondary btn-sm">Next →</button>
        </div>

        {data?.summary && (
          <div className="grid grid-cols-4 gap-px bg-line mb-4">
            {Object.entries(data.summary).map(([label, value]) => (
              <div key={label} className="bg-paper text-center py-2">
                <p className="text-[10px] text-slate">{label}</p>
                <p className="font-tabular text-lg font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-paper border border-line p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] text-slate-light font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) => {
              if (!cell) return <div key={`blank-${i}`} />;
              const colorClass = cell.record ? STATUS_COLOR[cell.record.status] : 'bg-mist text-slate-light border-transparent';
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => cell.record && setSelectedDay(cell.dateStr)}
                  className={`aspect-square border text-xs font-tabular flex items-center justify-center ${colorClass} ${cell.record ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate">
          {Object.entries(STATUS_COLOR).map(([label, cls]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 border ${cls}`} />
              {label}
            </span>
          ))}
        </div>

        {selectedRecord && (
          <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50" onClick={() => setSelectedDay(null)}>
            <div className="bg-paper border border-line max-w-xs w-full p-6" onClick={(e) => e.stopPropagation()}>
              <p className="font-display font-semibold text-ink mb-3">{selectedDay}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate">Check-in</span><span className="font-tabular text-ink">{fmtTime(selectedRecord.checkInTime) || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate">Check-out</span><span className="font-tabular text-ink">{fmtTime(selectedRecord.checkOutTime) || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate">Status</span><span className="font-medium text-ink">{selectedRecord.status}</span></div>
              </div>
              <button onClick={() => setSelectedDay(null)} className="btn-secondary w-full mt-4">Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
