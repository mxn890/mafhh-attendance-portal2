'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ManagerNav from '../../components/ManagerNav';

const STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function ManagerLeavesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [noteDraft, setNoteDraft] = useState({});

  async function load() {
    try {
      const res = await fetch(`/api/manager/leaves${filter ? `?status=${filter}` : ''}`);
      if (res.status === 401) return router.push('/login');
      if (res.status === 403) return setError('Manager access required.');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load.');
      setRequests(body.requests);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function handleDecide(id, decision) {
    try {
      const res = await fetch(`/api/manager/leaves/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, managerNote: noteDraft[id] || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed.');
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (error) return <div className="min-h-screen flex items-center justify-center bg-mist"><p className="text-signal text-sm">{error}</p></div>;

  return (
    <div className="min-h-screen bg-mist">
      <ManagerNav />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink">Leave requests</h1>
          <div className="flex gap-1">
            {['pending', 'approved', 'rejected', ''].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setFilter(s)}
                className={s === filter ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {!requests && <p className="text-sm text-slate">Loading…</p>}
        {requests?.length === 0 && <p className="text-sm text-slate-light">No {filter || ''} leave requests.</p>}

        <div className="space-y-3">
          {requests?.map((r) => (
            <div key={r._id} className="bg-paper border border-line p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-ink">{r.employeeName}</p>
                  <p className="font-tabular text-xs text-slate-light">{r.employeeId} · {r.department}</p>
                </div>
                <span className={STATUS_BADGE[r.status]}>{r.status}</span>
              </div>
              <p className="font-tabular text-sm text-ink mb-1">{r.fromDate} → {r.toDate}</p>
              <p className="text-sm text-slate mb-3">"{r.reason}"</p>

              {r.status === 'pending' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Optional note…"
                    value={noteDraft[r._id] || ''}
                    onChange={(e) => setNoteDraft((prev) => ({ ...prev, [r._id]: e.target.value }))}
                    className="w-full border border-line px-2.5 py-1.5 text-xs focus:outline-none focus:border-ink"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleDecide(r._id, 'approved')} className="btn-primary btn-sm flex-1">Approve</button>
                    <button onClick={() => handleDecide(r._id, 'rejected')} className="btn-secondary btn-sm flex-1">Reject</button>
                  </div>
                </div>
              )}
              {r.status !== 'pending' && r.managerNote && (
                <p className="text-xs text-slate-light">Note: {r.managerNote}</p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
