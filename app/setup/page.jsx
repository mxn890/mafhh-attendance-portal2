'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const SelfieCapture = dynamic(() => import('../components/SelfieCapture'), { ssr: false });

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState('password');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update password.');
      setStep('selfie');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSelfieCapture(dataUrl, descriptor) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceDescriptor: descriptor, enrollmentPhoto: dataUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save enrollment.');
      setStep('done');
      setTimeout(() => { router.push('/'); router.refresh(); }, 1200);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist px-4">
      <div className="w-full max-w-sm bg-paper border border-line p-8">
        <h1 className="font-display text-xl font-semibold text-ink mb-1">
          {step === 'password' && 'Set your password'}
          {step === 'selfie' && 'One-time face enrollment'}
          {step === 'done' && 'All set'}
        </h1>
        <p className="text-sm text-slate mb-6">
          {step === 'password' && 'Choose a password only you know.'}
          {step === 'selfie' && 'This photo is used to verify your daily check-in and check-out.'}
          {step === 'done' && 'Taking you to attendance…'}
        </p>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">New password</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-ink" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">Confirm password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-ink" />
            </div>
            {error && <p className="text-sm text-signal border-l-2 border-signal pl-3 py-1">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-signal text-paper py-2.5 text-sm font-medium hover:bg-signal-dark transition-colors disabled:opacity-60">
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'selfie' && (
          <div>
            <SelfieCapture onCapture={handleSelfieCapture} buttonLabel="Save my photo" />
            {error && <p className="text-sm text-signal text-center mt-3">{error}</p>}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8">
            <span className="inline-block w-3 h-3 bg-ok rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
