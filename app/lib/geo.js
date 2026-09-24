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

/**
 * Checks a GPS point against the office and airport geofences from
 * AttendanceConfig. Returns { label, distanceMeters } — label is
 * 'office' | 'airport' | 'out_of_range' | 'not_configured'.
 */
export function classifyLocation(lat, lng, config) {
  const candidates = [];
  const office = config?.officeLocation;
  const airport = config?.airportLocation;

  if (office?.lat != null && office?.lng != null) {
    const d = distanceMeters(lat, lng, office.lat, office.lng);
    candidates.push({ label: 'office', distanceMeters: d, withinRadius: d <= (office.radiusMeters || 150) });
  }
  if (airport?.lat != null && airport?.lng != null) {
    const d = distanceMeters(lat, lng, airport.lat, airport.lng);
    candidates.push({ label: 'airport', distanceMeters: d, withinRadius: d <= (airport.radiusMeters || 300) });
  }

  if (candidates.length === 0) return { label: 'not_configured', distanceMeters: null };

  const withinAny = candidates.find((c) => c.withinRadius);
  if (withinAny) return { label: withinAny.label, distanceMeters: Math.round(withinAny.distanceMeters) };

  const nearest = candidates.reduce((a, b) => (a.distanceMeters < b.distanceMeters ? a : b));
  return { label: 'out_of_range', distanceMeters: Math.round(nearest.distanceMeters) };
}
