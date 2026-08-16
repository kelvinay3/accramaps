import { Router } from 'express';
import { haversineMeters, parseLatLng, accraTrafficFactor } from '../util/geo.js';
import { rateLimit } from '../util/rateLimit.js';

const PROFILES = { driving: 'driving', cycling: 'cycling', walking: 'walking' };
// Free-flow speed assumptions for the offline fallback estimate (km/h)
const FALLBACK_SPEEDS = { driving: 28, cycling: 14, walking: 4.5 };

function formatInstruction(step) {
  const { maneuver, name } = step;
  const road = name && name.trim() ? name : 'the road';
  const modifier = maneuver.modifier || '';
  switch (maneuver.type) {
    case 'depart': return `Head out on ${road}`;
    case 'arrive': return 'You have arrived at your destination';
    case 'turn': return `Turn ${modifier} onto ${road}`;
    case 'new name': return `Continue onto ${road}`;
    case 'merge': return `Merge ${modifier} onto ${road}`;
    case 'on ramp': return `Take the ramp onto ${road}`;
    case 'off ramp': return `Take the exit onto ${road}`;
    case 'fork': return `Keep ${modifier} at the fork onto ${road}`;
    case 'roundabout':
    case 'rotary': return `At the roundabout, take exit ${maneuver.exit || ''} onto ${road}`.replace('  ', ' ');
    case 'end of road': return `At the end of the road, turn ${modifier} onto ${road}`;
    case 'continue': return `Continue ${modifier || 'straight'} on ${road}`;
    default: return `Continue on ${road}`;
  }
}

function maneuverIcon(step) {
  const t = step.maneuver.type;
  const m = step.maneuver.modifier || '';
  if (t === 'arrive') return '🏁';
  if (t === 'roundabout' || t === 'rotary') return '🔄';
  if (m.includes('left')) return '←';
  if (m.includes('right')) return '→';
  if (m.includes('uturn')) return '↩';
  if (t === 'merge' || t === 'on ramp') return '↗';
  return '↑';
}

export function directionRoutes({ osrmBase = 'https://router.project-osrm.org' } = {}) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 60_000, max: 40, key: 'directions' });

  // GET /api/directions?from=lat,lng&to=lat,lng&mode=driving|cycling|walking
  router.get('/', limiter, async (req, res) => {
    const from = parseLatLng(String(req.query.from || ''));
    const to = parseLatLng(String(req.query.to || ''));
    const mode = PROFILES[String(req.query.mode || 'driving')] || 'driving';
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required as "lat,lng"' });
    }

    const trafficFactor = mode === 'driving' ? accraTrafficFactor() : 1.0;

    try {
      const url = `${osrmBase}/route/v1/${mode}/${from.lng},${from.lat};${to.lng},${to.lat}` +
        '?overview=full&geometries=geojson&steps=true&alternatives=false';
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'AccraMaps/0.1' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) throw new Error(`OSRM ${resp.status}`);
      const data = await resp.json();
      if (data.code !== 'Ok' || !data.routes?.length) {
        return res.status(404).json({ error: 'No route found between these points' });
      }
      const route = data.routes[0];
      const leg = route.legs[0];
      const durationSec = Math.round(route.duration * trafficFactor);
      const steps = (leg.steps || []).map((s) => ({
        instruction: formatInstruction(s),
        icon: maneuverIcon(s),
        distance_m: Math.round(s.distance),
        location: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] },
      }));
      res.json({
        source: 'osrm',
        mode,
        distance_m: Math.round(route.distance),
        duration_s: durationSec,
        duration_freeflow_s: Math.round(route.duration),
        traffic_factor: trafficFactor,
        eta: new Date(Date.now() + durationSec * 1000).toISOString(),
        geometry: route.geometry, // GeoJSON LineString
        steps,
      });
    } catch {
      // Offline fallback: straight-line estimate so the app stays usable.
      const meters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
      const roadMeters = meters * 1.35; // typical road-network detour factor
      const speedKmh = FALLBACK_SPEEDS[mode];
      const durationSec = Math.round(((roadMeters / 1000) / speedKmh) * 3600 * trafficFactor);
      res.json({
        source: 'estimate',
        mode,
        distance_m: Math.round(roadMeters),
        duration_s: durationSec,
        duration_freeflow_s: Math.round(durationSec / trafficFactor),
        traffic_factor: trafficFactor,
        eta: new Date(Date.now() + durationSec * 1000).toISOString(),
        geometry: {
          type: 'LineString',
          coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
        },
        steps: [
          { instruction: 'Routing service unreachable — showing a straight-line estimate', icon: 'ℹ️', distance_m: 0, location: from },
          { instruction: 'Head toward your destination', icon: '↑', distance_m: Math.round(roadMeters), location: from },
          { instruction: 'You have arrived at your destination', icon: '🏁', distance_m: 0, location: to },
        ],
      });
    }
  });

  return router;
}
