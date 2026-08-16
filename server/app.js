import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authMiddleware } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { placeRoutes } from './routes/places.js';
import { geocodeRoutes } from './routes/geocode.js';
import { directionRoutes } from './routes/directions.js';
import { reportRoutes } from './routes/reports.js';
import { favoriteRoutes } from './routes/favorites.js';
import { cityRoutes } from './routes/city.js';
import { trotroRoutes } from './routes/trotro.js';
import { tileRoutes } from './routes/tiles.js';
import { reviewRoutes } from './routes/reviews.js';
import { creditRoutes } from './routes/credits.js';
import { adminRoutes } from './routes/admin.js';
import { savedRoutes } from './routes/saved.js';
import { analyticsRoutes } from './routes/analytics.js';

// import.meta.url is unavailable after serverless bundling (esbuild emits
// CJS) — fall back to cwd. Static serving is skipped there anyway: Netlify's
// CDN delivers public/, the function only handles /api and /tiles.
function resolveDirname() {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

export function createApp(db, {
  secret = 'dev-secret-change-me',
  osrmBase = process.env.OSRM_BASE || 'https://router.project-osrm.org',
  nominatimBase = process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
  status = {},
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(authMiddleware(secret));

  app.get('/api/health', (req, res) => {
    res.json({
      ok: !status.seedError,
      service: 'accramaps',
      db: db.kind,
      seeded: !status.seedError,
      ...(status.seedError ? { seed_error: status.seedError } : {}),
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes(db, secret));
  app.use('/api/places', placeRoutes(db));
  app.use('/api/geocode', geocodeRoutes(db, { nominatimBase }));
  app.use('/api/directions', directionRoutes({ osrmBase }));
  app.use('/api/reports', reportRoutes(db));
  app.use('/api/favorites', favoriteRoutes(db));
  app.use('/api/city', cityRoutes(db));
  app.use('/api/trotro', trotroRoutes(db));
  app.use('/api/reviews', reviewRoutes(db));
  app.use('/api/credits', creditRoutes(db));
  app.use('/api/admin', adminRoutes(db));
  app.use('/api/saved', savedRoutes(db));
  app.use('/api/analytics', analyticsRoutes(db));
  app.use('/tiles', tileRoutes(db));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    next();
  });

  // Static frontend — local/self-hosted only; on Netlify the CDN serves it.
  const publicDir = path.resolve(resolveDirname(), '../public');
  if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    const leafletDist = path.resolve(publicDir, '../node_modules/leaflet/dist');
    if (fs.existsSync(leafletDist)) {
      app.use('/vendor/leaflet', express.static(leafletDist, { maxAge: '30d', immutable: true }));
    }
    app.use(express.static(publicDir));
    // SPA-ish fallback: unknown non-API paths get the app shell.
    app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  }

  // Central error handler — no stack traces to clients, but do surface the
  // error message itself (PostgREST/driver messages are how deploy problems
  // get diagnosed, and they carry no secrets).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: 'Something went wrong', detail: err.message });
  });

  return app;
}
