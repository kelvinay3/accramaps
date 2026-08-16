import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ah } from '../util/asyncHandler.js';

function isAdmin(req) {
  if (req.user.role === 'admin') return true;
  const emails = (process.env.ADMIN_EMAILS || 'kelvinay3@gmail.com').split(',').map((e) => e.trim().toLowerCase());
  return emails.includes(String(req.user.email || '').toLowerCase());
}

export function adminRoutes(db) {
  const router = Router();

  router.use(requireAuth);
  router.use((req, res, next) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
    next();
  });

  router.get('/stats', ah(async (req, res) => {
    const [places, trotro, reports, users] = await Promise.all([
      db.places.count(),
      db.trotro.count(),
      db.reports.countActive(),
      db.users?.count ? db.users.count() : Promise.resolve(null),
    ]);
    res.json({ places, trotro_routes: trotro, active_reports: reports, users, time: new Date().toISOString() });
  }));

  router.get('/reports', ah(async (req, res) => {
    const reports = await db.reports.listActive(500);
    res.json({ reports });
  }));

  router.get('/analytics', ah(async (req, res) => {
    if (!db.analytics) return res.json({ pageViews: 0, uniqueSessions: 0, topSearches: [], signups: 0, logins: 0, onboardViews: 0, onboardDone: 0 });
    const summary = await db.analytics.summary();
    res.json(summary);
  }));

  return router;
}
