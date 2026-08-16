const EARTH_RADIUS_M = 6371000;

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Ghana bounding box (generous)
export const GHANA_BOUNDS = { minLat: 4.5, maxLat: 11.2, minLng: -3.3, maxLng: 1.3 };

export function inGhana(lat, lng) {
  return (
    lat >= GHANA_BOUNDS.minLat && lat <= GHANA_BOUNDS.maxLat &&
    lng >= GHANA_BOUNDS.minLng && lng <= GHANA_BOUNDS.maxLng
  );
}

export function parseLatLng(str) {
  if (typeof str !== 'string') return null;
  const m = str.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// Typical Accra congestion multiplier applied to free-flow drive times.
export function accraTrafficFactor(date = new Date()) {
  const h = date.getHours();
  const month = date.getMonth() + 1;
  const detty = month === 12 || month === 1; // Detty December season
  if ((h >= 7 && h <= 9) || (h >= 17 && h <= 20) || (detty && h >= 14 && h <= 21)) return 1.7;
  if ((h >= 10 && h <= 12) || (h >= 14 && h <= 16) || (h >= 21 && h <= 23)) return 1.3;
  return 1.0;
}
