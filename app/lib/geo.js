/**
 * Distance between two lat/lng points, in meters (Haversine formula).
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Classify only valid configured pins, with a fixed 1 km attendance radius. */
export function classifyLocation(lat, lng, config) {
  const candidates = [];
  for (const label of ['office', 'airport', 'quarantine']) {
    const zone = config?.[label + 'Location'];
    if (!validLocationPin(zone)) continue;
    const d = distanceMeters(lat, lng, zone.lat, zone.lng);
    candidates.push({ label, distanceMeters: d, withinRadius: d <= 1000 });
  }
  if (!candidates.length) return { label: 'not_configured', distanceMeters: null };
  const within = candidates.find(c => c.withinRadius);
  const nearest = within || candidates.reduce((a,b) => a.distanceMeters < b.distanceMeters ? a : b);
  return { label: within ? nearest.label : 'out_of_range', distanceMeters: Math.round(nearest.distanceMeters) };
}

export function validLocationPin(zone) {
  return typeof zone?.lat === 'number' && Number.isFinite(zone.lat) && Math.abs(zone.lat) <= 90 &&
    typeof zone?.lng === 'number' && Number.isFinite(zone.lng) && Math.abs(zone.lng) <= 180;
}

export function allowedLocationLabels(assignedLocation) {
  const assignments = {
    office: ['office'], airport: ['airport'], quarantine: ['quarantine'],
    office_quarantine: ['office', 'quarantine'],
    office_airport: ['office', 'airport'],
    airport_quarantine: ['airport', 'quarantine'],
    either: ['office', 'airport', 'quarantine'],
  };
  return assignments[assignedLocation] || [];
}

export function classifyAssignedLocation(lat, lng, config, assignedLocation) {
  const selected = {};
  for (const label of allowedLocationLabels(assignedLocation)) {
    const field = label + 'Location';
    selected[field] = config?.[field];
  }
  return classifyLocation(lat, lng, selected);
}
