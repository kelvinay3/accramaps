import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ah } from '../util/asyncHandler.js';

export function savedRoutes(db) {
  const router = Router();

  router.get('/', requireAuth, ah(async (req, res) => {
    const places = await db.savedPlaces.listByUser(req.user.id);
    res.json({ places });
  }));

  router.put('/:label', requireAuth, ah(async (req, res) => {
    const { name, lat, lng, place_type, ghana_post_gps } = req.body || {};
    if (!name || lat == null || lng == null) return res.status(400).json({ error: 'name, lat, lng required' });
    const label = decodeURIComponent(req.params.label).slice(0, 50);
    const place = await db.savedPlaces.upsert({
      userId: req.user.id,
      label,
      name: String(name).slice(0, 100),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      placeType: place_type || 'custom',
      ghanaPostGps: ghana_post_gps || null,
    });
    res.json({ place });
  }));

  router.delete('/:id', requireAuth, ah(async (req, res) => {
    const ok = await db.savedPlaces.remove(parseInt(req.params.id), req.user.id);
    res.json({ ok });
  }));

  return router;
}
