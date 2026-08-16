import { Router } from 'express';
import { ah } from '../util/asyncHandler.js';

export function trotroRoutes(db) {
  const router = Router();

  router.get('/', ah(async (req, res) => {
    res.json({ routes: await db.trotro.list() });
  }));

  router.get('/:slug', ah(async (req, res) => {
    const route = await db.trotro.bySlug(String(req.params.slug));
    if (!route) return res.status(404).json({ error: 'Trotro route not found' });
    res.json({ route });
  }));

  return router;
}
