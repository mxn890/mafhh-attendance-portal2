'use client';

import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return;
  const MODEL_URL = '/face-models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function getFaceDescriptor(imageElement) {
  await loadFaceModels();
  const detections = await faceapi
    .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (detections.length !== 1) return null;
  return Array.from(detections[0].descriptor);
}

export function captureFrame(videoEl, maxWidth = 480) {
  const scale = Math.min(1, maxWidth / videoEl.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth * scale;
  canvas.height = videoEl.videoHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
