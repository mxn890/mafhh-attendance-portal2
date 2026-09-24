'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ManagerNav from '../../components/ManagerNav';

const LiveMap = dynamic(() => import('../../components/LiveMap'), { ssr: false, loading: () => <p className="text-sm text-slate p-6">Loading map…</p> });

export default function LiveMapPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/manager/live-locations');
      if (res.status === 401) return router.push('/login');
      if (res.status === 403) return setError('Manager access required.');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load.');
      setData(body);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  return (
    <div className="min-h-screen bg-mist">
      <ManagerNav />

      <main className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Live locations</h1>
        {error && <p className="text-signal text-sm">{error}</p>}
        {!data && !error && <p className="text-slate text-sm">Loading…</p>}
        {data && (
          <>
            <p className="text-sm text-slate mb-4">
              {data.points.length} on duty right now · updates every 30 seconds
            </p>
            {data.points.length === 0 ? (
              <div className="card"><p className="text-sm text-slate-light">No one is currently checked in.</p></div>
            ) : (
              <div className="border border-line">
                <LiveMap points={data.points} office={data.office} airport={data.airport} />
              </div>
            )}
            <div className="mt-4 space-y-1">
              {data.points.map((p) => (
                <div key={p.employeeId} className="flex items-center justify-between px-4 py-2 bg-paper border border-line text-sm">
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="text-xs text-slate">{p.live ? 'Live' : 'From check-in'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
