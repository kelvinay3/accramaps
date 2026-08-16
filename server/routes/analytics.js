import { Router } from 'express';
import { ah } from '../util/asyncHandler.js';
import { rateLimit } from '../util/rateLimit.js';

export function analyticsRoutes(db) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 60_000, max: 60, key: 'analytics' });

  // Log an analytics event from the frontend
  router.post('/', limiter, ah(async (req, res) => {
    if (!db.analytics) return res.json({ ok: true });
    const { event, payload, session_id } = req.body || {};
    if (!event || typeof event !== 'string') return res.status(400).json({ error: 'event required' });
    await db.analytics.log({
      event: String(event).slice(0, 64),
      payload: payload ? JSON.stringify(payload).slice(0, 512) : null,
      sessionId: String(session_id || '').slice(0, 64),
      userId: req.user?.id ?? null,
    });
    res.json({ ok: true });
  }));

  return router;
}
