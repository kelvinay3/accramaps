import { Router } from 'express';
import { CATEGORIES } from '../seedData.js';
import { haversineMeters, parseLatLng } from '../util/geo.js';
import { ah } from '../util/asyncHandler.js';

export function placeRoutes(db) {
  const router = Router();

  router.get('/categories', (req, res) => {
    res.json({ categories: CATEGORIES });
  });

  // GET /api/places?q=&category=&near=lat,lng&radius=m&limit=
  router.get('/', ah(async (req, res) => {
    const q = req.query.q ? String(req.query.q).trim() : undefined;
    const category = req.query.category && req.query.category !== 'all' ? String(req.query.category) : undefined;
    const near = parseLatLng(String(req.query.near || ''));
    const radius = Math.min(Number(req.query.radius) || 15000, 500000);
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    let rows = await db.places.search({ q, category });

    if (near) {
      rows = rows
        .map((p) => ({ ...p, distance_m: Math.round(haversineMeters(near.lat, near.lng, p.lat, p.lng)) }))
        .filter((p) => p.distance_m <= radius)
        .sort((a, b) => a.distance_m - b.distance_m);
    }
    res.json({ places: rows.slice(0, limit) });
  }));

  router.get('/hot', ah(async (req, res) => {
    res.json({ places: await db.places.byTag('hot') });
  }));

  router.get('/quick', ah(async (req, res) => {
    res.json({ places: await db.places.byTag('quick') });
  }));

  router.get('/:id', ah(async (req, res) => {
    const place = await db.places.byId(Number(req.params.id));
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json({ place });
  }));

  return router;
}
