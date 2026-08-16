import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { normalizeGhanaPostGps } from '../util/ghanapost.js';
import { ah } from '../util/asyncHandler.js';

export function favoriteRoutes(db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    res.json({ favorites: await db.favorites.listByUser(req.user.id) });
  }));

  router.post('/', ah(async (req, res) => {
    const { name, lat, lng, ghana_post_gps, note } = req.body || {};
    const nlat = Number(lat);
    const nlng = Number(lng);
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name required' });
    if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return res.status(400).json({ error: 'lat and lng required' });

    let gps = null;
    if (ghana_post_gps) {
      gps = normalizeGhanaPostGps(String(ghana_post_gps));
      if (!gps) return res.status(400).json({ error: 'Invalid GhanaPost GPS code — expected format like GA-183-8164' });
    }

    const favorite = await db.favorites.create({
      userId: req.user.id,
      name: String(name).trim().slice(0, 120),
      lat: nlat,
      lng: nlng,
      ghanaPostGps: gps,
      note: note ? String(note).slice(0, 280) : null,
    });
    res.status(201).json({ favorite });
  }));

  router.delete('/:id', ah(async (req, res) => {
    const removed = await db.favorites.remove(Number(req.params.id), req.user.id);
    if (!removed) return res.status(404).json({ error: 'Favorite not found' });
    res.status(204).end();
  }));

  return router;
}
