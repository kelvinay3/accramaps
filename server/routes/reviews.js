import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ah } from '../util/asyncHandler.js';
import { rateLimit } from '../util/rateLimit.js';

export function reviewRoutes(db) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 60_000, max: 10, key: 'reviews' });

  router.get('/', ah(async (req, res) => {
    const placeId = parseInt(req.query.place_id);
    if (!placeId) return res.status(400).json({ error: 'place_id required' });
    const reviews = await db.reviews.listByPlace(placeId);
    const stats = await db.reviews.avgRating(placeId);
    res.json({ reviews, ...stats });
  }));

  router.post('/', requireAuth, limiter, ah(async (req, res) => {
    const { place_id, rating, body } = req.body || {};
    if (!place_id || !rating) return res.status(400).json({ error: 'place_id and rating required' });
    const r = parseInt(rating);
    if (r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1–5' });
    const review = await db.reviews.create({
      userId: req.user.id,
      placeId: parseInt(place_id),
      rating: r,
      body: body ? String(body).slice(0, 1000) : null,
    });
    res.status(201).json({ review });
  }));

  router.delete('/:id', requireAuth, ah(async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
    const ok = await db.reviews.remove(parseInt(req.params.id));
    res.json({ ok });
  }));

  return router;
}
