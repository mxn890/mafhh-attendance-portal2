'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import EmployeeNav from './components/EmployeeNav';

const SelfieCapture = dynamic(() => import('./components/SelfieCapture'), { ssr: false });

const LOCATION_LABEL = { office: 'Office', airport: 'Airport', out_of_range: 'Out of range', not_configured: 'Location not set up yet' };

function fmtTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [justResumed, setJustResumed] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);

  async function loadMe() {
    try {
      const res = await fetch('/api/me');
      if (res.status === 401) return router.push('/login');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load.');
      if (body.mustChangePassword || !body.isEnrolled) return router.push('/setup');
      setMe(body);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadMe(); }, []);

  useEffect(() => {
    function checkPermission() {
      if (!navigator.permissions) { setLocationStatus('ok'); return; }
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationStatus(result.state === 'denied' ? 'denied' : 'ok');
      }).catch(() => setLocationStatus('ok'));
    }
    checkPermission();

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        checkPermission();
        if (me?.today?.checkedIn && !me?.today?.checkedOut) {
          setJustResumed(true);
          setTimeout(() => setJustResumed(false), 4000);
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [me?.today?.checkedIn, me?.today?.checkedOut]);

  useEffect(() => {
    if (locationStatus === 'denied' || !me) return;
    function checkNow() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(`/api/my-location-status?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
            .then((r) => r.json())
            .then((body) => { if (!body.error) setLiveLocation(body); })
            .catch(() => setLiveLocation('error'));
        },
        () => setLiveLocation('error'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    checkNow();
    const interval = setInterval(checkNow, 30000);
    return () => clearInterval(interval);
  }, [locationStatus, me]);

  useEffect(() => {
    if (!me?.today?.checkedIn || me?.today?.checkedOut) return;
    const sendPing = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch('/api/location-ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 15000 }
      );
    };
    sendPing();
    const interval = setInterval(sendPing, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [me?.today?.checkedIn, me?.today?.checkedOut]);

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Location is not supported on this device.'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Please allow location access to mark attendance.')),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function handleCapture(dataUrl, descriptor) {
    setSubmitting(true);
    setError(null);
    try {
      const { lat, lng } = await getLocation();
      const endpoint = mode === 'checkin' ? '/api/checkin' : '/api/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: dataUrl, faceDescriptor: descriptor, lat, lng }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not record attendance.');
      setMode(null);
      await loadMe();
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  if (error && !me) return <div className="min-h-screen flex items-center justify-center bg-mist"><p className="text-signal text-sm">{error}</p></div>;
  if (!me) return <div className="min-h-screen flex items-center justify-center bg-mist"><p className="text-slate text-sm">Loading…</p></div>;

  const withinRadius = liveLocation && liveLocation !== 'error' && (liveLocation.label === 'office' || liveLocation.label === 'airport');

  return (
    <div className="min-h-screen bg-mist">
      <EmployeeNav employee={me} />

      <main className="max-w-sm mx-auto px-4 py-8">
        {locationStatus === 'denied' && (
          <div className="bg-signal-light border border-signal/30 px-4 py-3 mb-4">
            <p className="text-sm text-signal font-medium">Location is turned off</p>
            <p className="text-xs text-signal mt-1">Turn on location access in your phone/browser settings — it's required to check in or out.</p>
          </div>
        )}
        {justResumed && (
          <div className="bg-ok/10 border border-ok/30 px-4 py-2.5 mb-4">
            <p className="text-xs text-ok">Welcome back — resuming location sharing.</p>
          </div>
        )}

        {!mode && locationStatus !== 'denied' && (
          <div className={`px-4 py-3 mb-4 border ${withinRadius ? 'bg-ok/5 border-ok/30' : liveLocation === 'error' ? 'bg-mist border-line' : 'bg-signal-light border-signal/30'}`}>
            <p className="text-xs text-slate mb-0.5">Your location right now</p>
            {!liveLocation && <p className="text-sm text-slate-light">Checking…</p>}
            {liveLocation === 'error' && <p className="text-sm text-slate-light">Couldn't get your location.</p>}
            {liveLocation && liveLocation !== 'error' && (
              <p className={`text-sm font-medium ${withinRadius ? 'text-ok' : 'text-signal'}`}>
                {withinRadius ? '✓ ' : liveLocation.label === 'out_of_range' ? '✗ ' : ''}
                {LOCATION_LABEL[liveLocation.label] || liveLocation.label}
                {liveLocation.distanceMeters != null && <span className="text-slate-light font-normal"> · {liveLocation.distanceMeters}m away</span>}
              </p>
            )}
          </div>
        )}

        {!mode && (
          <div className="bg-paper border border-line p-6">
            <p className="text-xs text-slate mb-1">Shift</p>
            <p className="font-tabular text-sm text-ink mb-4">{me.shift_timing || '—'}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-sm text-slate">Check-in</span>
                <span className="font-tabular text-sm text-ink">{fmtTime(me.today.checkInTime) || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line">
                <span className="text-sm text-slate">Check-out</span>
                <span className="font-tabular text-sm text-ink">{fmtTime(me.today.checkOutTime) || '—'}</span>
              </div>
              {me.today.status && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate">Status</span>
                  <span className={me.today.status === 'OnTime' ? 'badge-success' : me.today.status === 'Leave' ? 'badge-info' : 'badge-warning'}>
                    {me.today.status}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              {!me.today.checkedIn && <button onClick={() => setMode('checkin')} disabled={locationStatus === 'denied'} className="btn-primary w-full disabled:opacity-50">Check in</button>}
              {me.today.checkedIn && !me.today.checkedOut && (
                <>
                  <button onClick={() => setMode('checkout')} disabled={locationStatus === 'denied'} className="btn-primary w-full disabled:opacity-50">Check out</button>
                  <p className="text-xs text-slate-light text-center mt-2">
                    <span className="inline-block w-1.5 h-1.5 bg-ok rounded-full mr-1.5" />
                    Location sharing active while on duty
                  </p>
                </>
              )}
              {me.today.checkedIn && me.today.checkedOut && <p className="text-center text-sm text-ok">Attendance complete for today.</p>}
            </div>
          </div>
        )}

        {mode && (
          <div className="bg-paper border border-line p-6">
            <p className="font-display font-semibold text-ink mb-4 text-center">{mode === 'checkin' ? 'Check in' : 'Check out'}</p>
            <SelfieCapture onCapture={handleCapture} buttonLabel={submitting ? 'Submitting…' : (mode === 'checkin' ? 'Check in' : 'Check out')} />
            {error && <p className="text-sm text-signal text-center mt-3">{error}</p>}
            <button onClick={() => setMode(null)} className="btn-secondary w-full mt-3">Cancel</button>
          </div>
        )}
      </main>
    </div>
  );
}
