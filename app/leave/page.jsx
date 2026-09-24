'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeNav from '../components/EmployeeNav';

const STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function LeavePage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [requests, setRequests] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function load() {
    try {
      const meRes = await fetch('/api/me');
      if (meRes.status === 401) return router.push('/login');
      setMe(await meRes.json());

      const leaveRes = await fetch('/api/leave');
      const body = await leaveRes.json();
      setRequests(body.requests || []);
    } catch {
      setError('Could not load.');
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate, reason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not submit.');
      setFromDate(''); setToDate(''); setReason('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await load();
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-mist">
      <EmployeeNav employee={me} />

      <main className="max-w-sm mx-auto px-4 py-6 pb-24">
        <h1 className="font-display text-xl font-semibold text-ink mb-4">Request leave</h1>

        <form onSubmit={handleSubmit} className="bg-paper border border-line p-5 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">From</label>
              <input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border border-line px-2 py-2 text-sm focus:outline-none focus:border-ink" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">To</label>
              <input type="date" required value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border border-line px-2 py-2 text-sm focus:outline-none focus:border-ink" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1.5">Reason</label>
            <textarea
              required value={reason} onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-line px-3 py-2 text-sm focus:outline-none focus:border-ink resize-none"
              placeholder="Briefly explain why you need leave…"
            />
          </div>
          {error && <p className="text-sm text-signal border-l-2 border-signal pl-3 py-1">{error}</p>}
          {success && <p className="text-sm text-ok">Leave request submitted — your manager will review it.</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>

        <h2 className="font-display text-sm font-semibold text-ink mb-3">My requests</h2>
        {!requests && <p className="text-sm text-slate-light">Loading…</p>}
        {requests?.length === 0 && <p className="text-sm text-slate-light">No leave requests yet.</p>}
        {requests?.length > 0 && (
          <div className="bg-paper border border-line divide-y divide-line">
            {requests.map((r) => (
              <div key={r._id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-tabular text-sm text-ink">{r.fromDate} → {r.toDate}</span>
                  <span className={STATUS_BADGE[r.status]}>{r.status}</span>
                </div>
                <p className="text-xs text-slate">{r.reason}</p>
                {r.managerNote && <p className="text-xs text-slate-light mt-1">Manager: {r.managerNote}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
