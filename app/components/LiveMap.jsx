'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function timeAgo(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// A small labeled pin — the employee ID sits right on the marker, so
// anyone can see who's who on the map without tapping each pin. Built as
// a DivIcon (plain HTML/CSS) rather than an image, so it scales to any
// number of employees without needing custom marker images per person.
function labeledIcon(employeeId, isLive) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%);">
        <div style="background:#0A0A0A;color:#FFFFFF;font-family:monospace;font-size:10px;font-weight:600;padding:2px 6px;white-space:nowrap;border:1px solid ${isLive ? '#1A7A4C' : '#C8102E'};">
          ${employeeId}
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${isLive ? '#1A7A4C' : '#C8102E'};"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
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
        <Marker key={p.employeeId} position={[p.lat, p.lng]} icon={labeledIcon(p.employeeId, p.live)}>
          <Popup>
            <strong>{p.name}</strong> ({p.employeeId})<br />
            {p.department}<br />
            {p.live ? 'Live' : 'From check-in'} · updated {timeAgo(p.lastUpdate)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
