'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
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
      else if (body.role === 'manager') {
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next === '/manager' || next?.startsWith('/manager/') ? next : '/manager');
      }
      else router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="MAFHH Aviation">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">M<span /></span><span><strong>MAFHH AVIATION</strong><small>People & attendance</small></span></div>
        <div className="login-story-content"><span className="eyebrow">YOUR TEAM. IN SYNC.</span><h1>A better start<br />to every shift.</h1><p>One place for attendance, your team and the working day ahead.</p><div className="login-feature-list"><span><i />Simple daily check-ins</span><span><i />Clear shifts and attendance</span><span><i />Reports when you need them</span></div></div>
        <svg className="login-flight-path" viewBox="0 0 600 420" fill="none" aria-hidden="true"><path d="M-60 380C140 350 130 100 390 170S620 120 680 10" stroke="white" strokeOpacity=".14" strokeWidth="1.5"/><path d="M-60 410C180 370 180 110 440 220S650 140 680 30" stroke="white" strokeOpacity=".07" strokeWidth="1.5"/><circle cx="390" cy="170" r="7" fill="#E54862"/><circle cx="390" cy="170" r="20" stroke="#E54862" strokeOpacity=".25"/></svg>
        <p className="login-story-footer">MAFHH Aviation · Team workspace</p>
      </section>
      <section className="login-form-side"><div className="login-card">
        <div className="mobile-login-brand brand-lockup"><span className="brand-mark" aria-hidden="true">M<span /></span><span><strong>MAFHH AVIATION</strong><small>People & attendance</small></span></div>
        <span className="eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p className="login-subtitle">Use your employee ID and password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label htmlFor="employee-id" className="form-label">Employee ID</label><input id="employee-id" type="text" autoComplete="username" required value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="login-input font-tabular" placeholder="e.g. MAFHH-001" autoFocus disabled={loading} /></div>
          <div><label htmlFor="attendance-password" className="form-label">Password</label><div className="password-field"><input id="attendance-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="login-input" placeholder="Enter your password" disabled={loading} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary login-submit">{loading ? 'Signing in…' : 'Sign in'}<span aria-hidden="true">→</span></button>
        </form><p className="login-help">Need access or a password reset?<br />Contact your attendance manager.</p>
      </div><p className="login-footer">MAFHH Aviation · Employee attendance</p></section>
    </main>
  );
}
