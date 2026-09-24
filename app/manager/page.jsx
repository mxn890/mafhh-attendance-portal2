'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ManagerNav from '../components/ManagerNav';

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false });
}

const STATUS_BADGE = { OnTime: 'badge-success', Late: 'badge-warning', HalfDay: 'badge-warning', Absent: 'badge-danger', Leave: 'badge-info' };
const LOCATION_LABEL = { office: 'Office', airport: 'Airport', out_of_range: 'Out of range', not_configured: 'Not set up' };

function LocationCell({ label, distance, assignedLocation }) {
  if (!label) return <span className="text-slate-light text-xs">—</span>;
  const withinRadius = label === 'office' || label === 'airport';
  const isAlert = label === 'out_of_range' && assignedLocation !== 'either'; // "either" employees can be anywhere — never an alert for them
  return (
    <div className="text-xs">
      <span className={withinRadius ? 'text-ok font-medium' : isAlert ? 'text-signal font-medium' : 'text-slate'}>
        {withinRadius ? '✓ ' : isAlert ? '✗ ' : ''}{LOCATION_LABEL[label] || label}
      </span>
      {distance != null && <span className="text-slate-light block">{distance}m away</span>}
    </div>
  );
}

export default function ManagerPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [historyFor, setHistoryFor] = useState(null); // employeeId currently shown
  const [historyData, setHistoryData] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/manager/today');
      if (res.status === 401) return router.push('/login');
      if (res.status === 403) return setError('This account does not have manager access.');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load.');
      setData(body);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleResetPassword(employeeId) {
    if (!confirm(`Reset password for ${employeeId}? They will need the new temporary password to sign in.`)) return;
    try {
      const res = await fetch('/api/manager/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Reset failed.');
      setResetResult(body);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleMarkLeave(employeeId, name) {
    if (!confirm(`Mark ${name} on leave for today?`)) return;
    try {
      const res = await fetch('/api/manager/mark-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed.');
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLocationChange(employeeId, assignedLocation) {
    try {
      const res = await fetch('/api/manager/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, assignedLocation }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed.');
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function openHistory(employeeId) {
    setHistoryFor(employeeId);
    setHistoryData(null);
    try {
      const res = await fetch(`/api/manager/employee/${employeeId}/history?days=30`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed.');
      setHistoryData(body);
    } catch (err) {
      setHistoryData({ error: err.message });
    }
  }

  if (error) return <div className="min-h-screen flex items-center justify-center bg-mist"><p className="text-signal text-sm">{error}</p></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-mist"><p className="text-slate text-sm">Loading…</p></div>;

  const needsReview = data.rows.filter((r) => r.checkInFaceMatch === 'needs_review' || r.checkOutFaceMatch === 'needs_review');

  return (
    <div className="min-h-screen bg-mist">
      <ManagerNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Today — {data.date}</h1>
          <p className="text-sm text-slate">{data.rows.length} employees · {needsReview.length} need photo review</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line mb-6">
          {['OnTime', 'Late', 'HalfDay', 'Absent', 'Leave'].map((status) => {
            const count = data.rows.filter((r) => r.status === status).length;
            return (
              <div key={status} className="bg-paper text-center py-4">
                <p className="text-xs text-slate mb-1">{status}</p>
                <p className="font-tabular text-2xl font-semibold text-ink">{count}</p>
              </div>
            );
          })}
        </div>

        {needsReview.length > 0 && (
          <div className="card border-l-2 border-warn bg-warn/5 mb-6">
            <p className="text-sm text-ink font-medium mb-2">Needs review — face photo didn't confidently match enrollment</p>
            <div className="flex flex-wrap gap-3">
              {needsReview.map((r) => (
                <button key={r.employeeId} onClick={() => setReviewPhoto(r)} className="text-xs text-signal underline">
                  {r.name} ({r.employeeId})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-paper border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mist border-b border-line">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Employee</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Department</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Assigned to</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Check-in</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">In-location</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Check-out</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Out-location</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((r) => (
                <tr key={r.employeeId}>
                  <td className="px-4 py-3">
                    <button onClick={() => openHistory(r.employeeId)} className="font-medium text-ink hover:text-signal text-left">{r.name}</button>
                    <p className="font-tabular text-xs text-slate-light">{r.employeeId}</p>
                  </td>
                  <td className="px-4 py-3 text-slate">{r.department}</td>
                  <td className="px-4 py-3">
                    <select
                      value={r.assignedLocation}
                      onChange={(e) => handleLocationChange(r.employeeId, e.target.value)}
                      className="text-xs border border-line px-1.5 py-1 bg-paper focus:outline-none focus:border-ink"
                    >
                      <option value="either">Either</option>
                      <option value="office">Office only</option>
                      <option value="airport">Airport only</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-tabular text-ink">
                    {fmtTime(r.checkInTime)}
                    {r.checkInFaceMatch === 'needs_review' && <span className="ml-1 text-warn">●</span>}
                  </td>
                  <td className="px-4 py-3"><LocationCell label={r.checkInLocation} distance={r.checkInDistance} assignedLocation={r.assignedLocation} /></td>
                  <td className="px-4 py-3 font-tabular text-ink">
                    {fmtTime(r.checkOutTime)}
                    {r.checkOutFaceMatch === 'needs_review' && <span className="ml-1 text-warn">●</span>}
                  </td>
                  <td className="px-4 py-3"><LocationCell label={r.checkOutLocation} distance={r.checkOutDistance} assignedLocation={r.assignedLocation} /></td>
                  <td className="px-4 py-3"><span className={STATUS_BADGE[r.status] || 'badge-info'}>{r.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleMarkLeave(r.employeeId, r.name)} className="text-xs text-slate hover:text-signal text-left">Mark leave</button>
                      <button onClick={() => handleResetPassword(r.employeeId)} className="text-xs text-slate hover:text-signal text-left">Reset password</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {resetResult && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50" onClick={() => setResetResult(null)}>
          <div className="bg-paper border border-line max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-semibold text-ink mb-2">Password reset</p>
            <p className="text-sm text-slate mb-4">{resetResult.name} ({resetResult.employeeId}) — give them this temporary password:</p>
            <p className="font-tabular text-2xl text-ink text-center bg-mist py-3 mb-4">{resetResult.tempPassword}</p>
            <button onClick={() => setResetResult(null)} className="btn-primary w-full">Done</button>
          </div>
        </div>
      )}

      {reviewPhoto && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50" onClick={() => setReviewPhoto(null)}>
          <div className="bg-paper border border-line max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-semibold text-ink mb-4">{reviewPhoto.name} — {reviewPhoto.employeeId}</p>
            <div className="grid grid-cols-2 gap-3">
              {reviewPhoto.checkInPhoto && <div><p className="text-xs text-slate mb-1">Check-in</p><img src={reviewPhoto.checkInPhoto} className="w-full aspect-square object-cover" /></div>}
              {reviewPhoto.checkOutPhoto && <div><p className="text-xs text-slate mb-1">Check-out</p><img src={reviewPhoto.checkOutPhoto} className="w-full aspect-square object-cover" /></div>}
            </div>
            <button onClick={() => setReviewPhoto(null)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50" onClick={() => setHistoryFor(null)}>
          <div className="bg-paper border border-line max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {!historyData && <p className="text-sm text-slate">Loading…</p>}
            {historyData?.error && <p className="text-sm text-signal">{historyData.error}</p>}
            {historyData?.records && (
              <>
                <p className="font-display font-semibold text-ink mb-1">{historyData.employee.name}</p>
                <p className="font-tabular text-xs text-slate-light mb-4">{historyData.employee.employeeId} · {historyData.employee.department}</p>
                <div className="grid grid-cols-5 gap-px bg-line mb-4">
                  {Object.entries(historyData.summary).map(([label, value]) => (
                    <div key={label} className="bg-mist text-center py-2">
                      <p className="text-[10px] text-slate">{label}</p>
                      <p className="font-tabular text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                {historyData.records.length === 0 ? (
                  <p className="text-sm text-slate-light">No attendance recorded yet.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {historyData.records.map((r) => (
                      <div key={r.date} className="flex items-center justify-between py-2 text-sm">
                        <span className="font-tabular text-slate">{r.date}</span>
                        <span className="font-tabular text-ink">{fmtTime(r.checkInTime)} → {fmtTime(r.checkOutTime)}</span>
                        <span className={STATUS_BADGE[r.status] || 'badge-info'}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <button onClick={() => setHistoryFor(null)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

