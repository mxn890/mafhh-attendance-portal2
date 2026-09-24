'use client';

import { useEffect, useRef, useState } from 'react';
import { getFaceDescriptor, captureFrame, dataUrlToImage, loadFaceModels } from '../lib/faceMatch';

export default function SelfieCapture({ onCapture, buttonLabel = 'Capture' }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let stream;
    (async () => {
      try {
        await loadFaceModels();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch {
        setError('Camera access is needed for attendance. Please allow it and reload.');
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  async function handleCapture() {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = captureFrame(videoRef.current);
      const img = await dataUrlToImage(dataUrl);
      const descriptor = await getFaceDescriptor(img);
      if (!descriptor) {
        setError('Could not see a clear face — please center your face in frame and try again.');
        setBusy(false);
        return;
      }
      setPreview(dataUrl);
      onCapture(dataUrl, descriptor);
    } catch {
      setError('Something went wrong capturing the photo. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="relative bg-ink aspect-square max-w-xs mx-auto overflow-hidden">
        {preview ? (
          <img src={preview} alt="Captured selfie" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        )}
        {!ready && !error && (
          <p className="absolute inset-0 flex items-center justify-center text-slate-light text-sm">Starting camera…</p>
        )}
      </div>

      {error && <p className="text-signal text-sm text-center mt-3">{error}</p>}

      {!preview && ready && (
        <button onClick={handleCapture} disabled={busy} className="btn-primary w-full mt-4 disabled:opacity-60">
          {busy ? 'Checking face…' : buttonLabel}
        </button>
      )}

      {preview && (
        <button onClick={() => { setPreview(null); setError(null); }} className="btn-secondary w-full mt-4">
          Retake
        </button>
      )}
    </div>
  );
}
