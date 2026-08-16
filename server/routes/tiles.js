import { Router } from 'express';
import { ah } from '../util/asyncHandler.js';

// Map tiles are proxied through the backend so the browser only talks to us:
// caching makes repeat loads fast on slow connections, the tile provider can
// be swapped without touching clients, and requests carry a proper
// User-Agent per the OSM tile usage policy.

const SOURCES = {
  osm: {
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    maxZoom: 19,
  },
  sat: {
    // Esri World Imagery uses {z}/{y}/{x} order
    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    maxZoom: 19,
  },
};

const CACHE_TTL_HOURS = 24 * 7;
const USER_AGENT = 'AccraMaps/0.1 (Ghana-first navigation; github.com/kelvinay3/accramaps)';

// In-memory fallback cache for adapters without blob storage (serverless).
const MEM_CAP = 600;
const memCache = new Map();
function memGet(key) {
  const hit = memCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_HOURS * 3_600_000) { memCache.delete(key); return null; }
  return hit.body;
}
function memPut(key, body) {
  if (memCache.size >= MEM_CAP) memCache.delete(memCache.keys().next().value);
  memCache.set(key, { body, at: Date.now() });
}

export function tileRoutes(db) {
  const router = Router();

  router.get('/:source/:z/:x/:y.png', ah(async (req, res) => {
    const source = SOURCES[req.params.source];
    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);
    if (!source) return res.status(404).json({ error: 'Unknown tile source' });
    const n = 2 ** z;
    if (!Number.isInteger(z) || z < 0 || z > source.maxZoom ||
        !Number.isInteger(x) || x < 0 || x >= n ||
        !Number.isInteger(y) || y < 0 || y >= n) {
      return res.status(400).json({ error: 'Invalid tile coordinates' });
    }

    const key = `${req.params.source}/${z}/${x}/${y}`;
    const cached = db.tiles ? await db.tiles.get(key, CACHE_TTL_HOURS) : memGet(key);
    if (cached) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Tile-Cache', 'hit');
      return res.end(Buffer.from(cached));
    }

    try {
      const upstream = await fetch(source.url(z, x, y), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });
      if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
      const body = Buffer.from(await upstream.arrayBuffer());
      if (db.tiles) await db.tiles.put(key, body); else memPut(key, body);
      res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Tile-Cache', 'miss');
      res.end(body);
    } catch {
      res.status(502).json({ error: 'Tile source unreachable' });
    }
  }));

  return router;
}
