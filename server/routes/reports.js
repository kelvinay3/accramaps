import { Router } from 'express';
import { inGhana } from '../util/geo.js';
import { rateLimit } from '../util/rateLimit.js';
import { ah } from '../util/asyncHandler.js';

export const REPORT_TYPES = {
  accident:   { label: 'Accident',   icon: '🚨', ttlMin: 60 },
  police:     { label: 'Police',     icon: '👮', ttlMin: 45 },
  flood:      { label: 'Flood',      icon: '🌊', ttlMin: 180 },
  pothole:    { label: 'Pothole',    icon: '🕳️', ttlMin: 24 * 60 },
  go_slow:    { label: 'Go-Slow',    icon: '🐢', ttlMin: 40 },
  fuel_queue: { label: 'Fuel Queue', icon: '⛽', ttlMin: 90 },
  closure:    { label: 'Road Closed', icon: '🚧', ttlMin: 240 },
};

const decorate = (r) => ({
  ...r,
  label: REPORT_TYPES[r.type]?.label || r.type,
  icon: REPORT_TYPES[r.type]?.icon || '⚠️',
});

export function reportRoutes(db) {
  const router = Router();
  const postLimiter = rateLimit({ windowMs: 60_000, max: 6, key: 'reports-post' });

  router.get('/types', (req, res) => {
    res.json({ types: Object.entries(REPORT_TYPES).map(([id, t]) => ({ id, ...t })) });
  });

  // Active reports only
  router.get('/', ah(async (req, res) => {
    const rows = await db.reports.listActive();
    res.json({ reports: rows.map(decorate) });
  }));

  router.post('/', postLimiter, ah(async (req, res) => {
    const { type, lat, lng, description } = req.body || {};
    const spec = REPORT_TYPES[type];
    if (!spec) return res.status(400).json({ error: `Unknown report type. Use one of: ${Object.keys(REPORT_TYPES).join(', ')}` });
    const nlat = Number(lat);
    const nlng = Number(lng);
    if (!Number.isFinite(nlat) || !Number.isFinite(nlng) || !inGhana(nlat, nlng)) {
      return res.status(400).json({ error: 'Report location must be inside Ghana' });
    }
    const report = await db.reports.create({
      userId: req.user?.id ?? null,
      type,
      description: description ? String(description).slice(0, 280) : null,
      lat: nlat,
      lng: nlng,
      ttlMin: spec.ttlMin,
    });
    res.status(201).json({ report: decorate(report) });
  }));

  // Confirming a report extends its life a little and bumps its count.
  router.post('/:id/confirm', ah(async (req, res) => {
    const updated = await db.reports.confirm(Number(req.params.id));
    if (!updated) return res.status(404).json({ error: 'Report not found or expired' });
    res.json({ report: decorate(updated) });
  }));

  return router;
}
