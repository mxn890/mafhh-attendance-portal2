'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login failed.');

      if (body.mustChangePassword || !body.isEnrolled) router.push('/setup');
      else if (body.role === 'manager') router.push('/manager');
      else router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist px-4">
      <div className="w-full max-w-sm bg-paper border border-line p-8">
        <div className="mb-6">
          <span className="inline-block w-2 h-5 bg-signal mr-2 align-middle" />
          <span className="font-display font-semibold text-ink align-middle">MAFHH AVIATION</span>
        </div>
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Attendance</h1>
        <p className="text-sm text-slate mb-6">Sign in with your employee ID.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1.5">Employee ID</label>
            <input
              type="text" required value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-ink font-tabular"
              placeholder="MAFHH-001" autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1.5">Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-signal border-l-2 border-signal pl-3 py-1">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-signal text-paper py-2.5 text-sm font-medium hover:bg-signal-dark transition-colors disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
