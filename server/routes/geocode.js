import { Router } from 'express';
import { parseLatLng, inGhana } from '../util/geo.js';
import { looksLikeGhanaPostGps, normalizeGhanaPostGps, ghanaPostRegion } from '../util/ghanapost.js';
import { rateLimit } from '../util/rateLimit.js';
import { ah } from '../util/asyncHandler.js';

const GHANA_VIEWBOX = '-3.3,11.2,1.3,4.5'; // left,top,right,bottom
const USER_AGENT = 'AccraMaps/0.1 (Ghana-first navigation; github.com/kelvinay3/accramaps)';
const CACHE_TTL_HOURS = 24;

async function fetchJson(url, timeoutMs = 6000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

export function geocodeRoutes(db, { nominatimBase = 'https://nominatim.openstreetmap.org' } = {}) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 60_000, max: 60, key: 'geocode' });

  // GET /api/geocode?q=  → local places first, then Nominatim (Ghana-bounded)
  router.get('/', limiter, ah(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });

    // Direct coordinates ("5.60, -0.18")
    const coords = parseLatLng(q);
    if (coords) {
      return res.json({ results: [{ name: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, sub: 'Coordinates', lat: coords.lat, lng: coords.lng, icon: '🎯', source: 'coords' }] });
    }

    // GhanaPost GPS code — resolves only against saved favorites until an
    // official resolver integration lands (see ROADMAP).
    if (looksLikeGhanaPostGps(q)) {
      const code = normalizeGhanaPostGps(q);
      const region = ghanaPostRegion(code);
      const fav = await db.favorites.findByGps(code);
      const results = fav
        ? [{ name: fav.name, sub: `${code} · saved place`, lat: fav.lat, lng: fav.lng, icon: '🇬🇭', source: 'ghanapost' }]
        : [];
      return res.json({ results, ghanaPostGps: { code, region, resolved: Boolean(fav) } });
    }

    const local = (await db.places.search({ q, limit: 5 })).map((p) => ({
      name: p.name, sub: [p.area, p.city].filter(Boolean).join(', '),
      lat: p.lat, lng: p.lng, icon: p.icon, source: 'local', category: p.category,
    }));

    let remote = [];
    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = await db.kv.get(cacheKey, CACHE_TTL_HOURS);
    if (cached) {
      remote = cached;
    } else {
      try {
        const url = `${nominatimBase}/search?format=jsonv2&countrycodes=gh&viewbox=${GHANA_VIEWBOX}&bounded=1&limit=6&q=${encodeURIComponent(q)}`;
        const data = await fetchJson(url);
        remote = data
          .filter((r) => inGhana(Number(r.lat), Number(r.lon)))
          .map((r) => ({
            name: r.name || r.display_name.split(',')[0],
            sub: r.display_name.split(',').slice(1, 3).join(',').trim(),
            lat: Number(r.lat), lng: Number(r.lon), icon: '📍', source: 'osm',
          }));
        await db.kv.put(cacheKey, remote);
      } catch {
        // Offline or upstream down — local results still serve.
      }
    }

    // Merge, local first, dedupe by name
    const seen = new Set(local.map((p) => p.name.toLowerCase()));
    const results = [...local, ...remote.filter((r) => !seen.has(r.name.toLowerCase()))].slice(0, 8);
    res.json({ results });
  }));

  // GET /api/geocode/reverse?lat=&lng=
  router.get('/reverse', limiter, ah(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const cacheKey = `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = await db.kv.get(cacheKey, CACHE_TTL_HOURS);
    if (cached) return res.json(cached);
    try {
      const url = `${nominatimBase}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17`;
      const data = await fetchJson(url);
      const payload = {
        name: data.name || data.display_name?.split(',')[0] || 'Unknown location',
        display: data.display_name || null,
        lat, lng,
      };
      await db.kv.put(cacheKey, payload);
      res.json(payload);
    } catch {
      res.json({ name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, display: null, lat, lng });
    }
  }));

  return router;
}
