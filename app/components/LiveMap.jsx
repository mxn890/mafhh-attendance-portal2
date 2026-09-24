'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet's default marker icons reference image files by relative path,
// which breaks under Next.js's bundler — point them at reliable CDN URLs
// instead of trying to bundle the package's own image assets.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function timeAgo(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function LiveMap({ points, office, airport }) {
  const center = points[0] ? [points[0].lat, points[0].lng] : office ? [office.lat, office.lng] : [31.5497, 74.3436];

  return (
    <MapContainer center={center} zoom={12} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {office && (
        <Circle center={[office.lat, office.lng]} radius={office.radiusMeters} pathOptions={{ color: '#C8102E', fillOpacity: 0.05 }}>
          <Popup>Office zone</Popup>
        </Circle>
      )}
      {airport && (
        <Circle center={[airport.lat, airport.lng]} radius={airport.radiusMeters} pathOptions={{ color: '#1A7A4C', fillOpacity: 0.05 }}>
          <Popup>Airport zone</Popup>
        </Circle>
      )}
      {points.map((p) => (
        <Marker key={p.employeeId} position={[p.lat, p.lng]}>
          <Popup>
            <strong>{p.name}</strong><br />
            {p.department}<br />
            {p.live ? 'Live' : 'From check-in'} · updated {timeAgo(p.lastUpdate)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
