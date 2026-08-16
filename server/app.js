import express from 'express';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(db, {
  secret = 'dev-secret-change-me',
  osrmBase = process.env.OSRM_BASE || 'https://router.project-osrm.org',
  nominatimBase = process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(authMiddleware(secret));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'accramaps', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes(db, secret));
  app.use('/api/places', placeRoutes(db));
  app.use('/api/geocode', geocodeRoutes(db, { nominatimBase }));
  app.use('/api/directions', directionRoutes({ osrmBase }));
  app.use('/api/reports', reportRoutes(db));
  app.use('/api/favorites', favoriteRoutes(db));
  app.use('/api/city', cityRoutes(db));
  app.use('/api/trotro', trotroRoutes(db));
  app.use('/tiles', tileRoutes(db));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    next();
  });

  const publicDir = path.resolve(__dirname, '../public');
  // Leaflet is served from node_modules so the app has no CDN dependency.
  app.use('/vendor/leaflet', express.static(path.resolve(__dirname, '../node_modules/leaflet/dist'), { maxAge: '30d', immutable: true }));
  app.use(express.static(publicDir));
  // SPA-ish fallback: unknown non-API paths get the app shell.
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

  // Central error handler — never leak stack traces to clients.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.expose ? err.message : 'Something went wrong' });
  });

  return app;
}
