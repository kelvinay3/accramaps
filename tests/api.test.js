import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSqliteDb } from '../server/db/sqlite.js';
import { PLACES, TROTRO_ROUTES } from '../server/seedData.js';
import { createApp } from '../server/app.js';

// Point upstreams at an unreachable port so tests are hermetic and exercise
// the offline fallbacks.
const DEAD = 'http://127.0.0.1:1';

let app;

before(async () => {
  const db = await createSqliteDb(':memory:');
  await db.seedIfEmpty({ PLACES, TROTRO_ROUTES });
  app = createApp(db, { secret: 'test-secret', osrmBase: DEAD, nominatimBase: DEAD });
});

test('GET /api/health responds ok', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.ok, true);
});

test('unknown API path returns JSON 404', async () => {
  const res = await request(app).get('/api/nope').expect(404);
  assert.ok(res.body.error);
});

// ── Places ───────────────────────────────────────────────────────
test('places search finds seeded Labadi Beach', async () => {
  const res = await request(app).get('/api/places?q=labadi').expect(200);
  assert.ok(res.body.places.some((p) => p.name === 'Labadi Beach'));
});

test('places filter by category + near sorts by distance', async () => {
  const res = await request(app)
    .get('/api/places?category=hospital&near=5.6037,-0.1870&radius=20000')
    .expect(200);
  assert.ok(res.body.places.length >= 2);
  const dists = res.body.places.map((p) => p.distance_m);
  assert.deepEqual(dists, [...dists].sort((a, b) => a - b));
  assert.ok(res.body.places.every((p) => p.category === 'hospital'));
});

test('places categories and hot/quick lists', async () => {
  const cats = await request(app).get('/api/places/categories').expect(200);
  assert.ok(cats.body.categories.length >= 10);
  const hot = await request(app).get('/api/places/hot').expect(200);
  assert.ok(hot.body.places.length >= 3);
  const quick = await request(app).get('/api/places/quick').expect(200);
  assert.ok(quick.body.places.some((p) => p.name.includes('Kotoka')));
});

// ── Geocode ──────────────────────────────────────────────────────
test('geocode serves local results when upstream is down', async () => {
  const res = await request(app).get('/api/geocode?q=makola').expect(200);
  assert.ok(res.body.results.length >= 1);
  assert.equal(res.body.results[0].source, 'local');
});

test('geocode parses raw coordinates', async () => {
  const res = await request(app).get('/api/geocode?q=5.60,-0.18').expect(200);
  assert.equal(res.body.results[0].source, 'coords');
});

test('geocode recognizes GhanaPost GPS codes', async () => {
  const res = await request(app).get('/api/geocode?q=GA-183-8164').expect(200);
  assert.equal(res.body.ghanaPostGps.code, 'GA-183-8164');
  assert.equal(res.body.ghanaPostGps.region, 'Greater Accra');
});

// ── Directions ───────────────────────────────────────────────────
test('directions falls back to estimate when OSRM is down', async () => {
  const res = await request(app)
    .get('/api/directions?from=5.6037,-0.1870&to=5.6052,-0.1719&mode=driving')
    .expect(200);
  assert.equal(res.body.source, 'estimate');
  assert.ok(res.body.distance_m > 1000 && res.body.distance_m < 5000);
  assert.ok(res.body.duration_s > 0);
  assert.equal(res.body.geometry.type, 'LineString');
  assert.ok(res.body.steps.length >= 2);
});

test('directions validates input', async () => {
  await request(app).get('/api/directions?from=abc&to=5,0').expect(400);
  await request(app).get('/api/directions').expect(400);
});

// ── Reports ──────────────────────────────────────────────────────
test('report lifecycle: create → list → confirm', async () => {
  const types = await request(app).get('/api/reports/types').expect(200);
  assert.ok(types.body.types.some((t) => t.id === 'go_slow'));

  const created = await request(app)
    .post('/api/reports')
    .send({ type: 'go_slow', lat: 5.57, lng: -0.21, description: 'Ring Road jam' })
    .expect(201);
  const id = created.body.report.id;
  assert.equal(created.body.report.label, 'Go-Slow');

  const list = await request(app).get('/api/reports').expect(200);
  assert.ok(list.body.reports.some((r) => r.id === id));

  const confirmed = await request(app).post(`/api/reports/${id}/confirm`).expect(200);
  assert.equal(confirmed.body.report.confirms, 1);
});

test('report validation rejects bad type and non-Ghana coords', async () => {
  await request(app).post('/api/reports').send({ type: 'alien', lat: 5.6, lng: -0.2 }).expect(400);
  await request(app).post('/api/reports').send({ type: 'flood', lat: 48.85, lng: 2.35 }).expect(400);
  await request(app).post('/api/reports/999999/confirm').expect(404);
});

// ── Auth + favorites ─────────────────────────────────────────────
test('auth flow: register → me → login; favorites CRUD', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'ama@example.com', name: 'Ama', password: 'accra-street-1' })
    .expect(201);
  const token = reg.body.token;
  assert.ok(token);

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(me.body.user.email, 'ama@example.com');

  await request(app)
    .post('/api/auth/register')
    .send({ email: 'ama@example.com', name: 'Ama2', password: 'accra-street-2' })
    .expect(409);

  await request(app).post('/api/auth/login').send({ email: 'ama@example.com', password: 'wrong-pass' }).expect(401);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ama@example.com', password: 'accra-street-1' })
    .expect(200);
  assert.ok(login.body.token);

  // favorites require auth
  await request(app).get('/api/favorites').expect(401);

  const fav = await request(app)
    .post('/api/favorites')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: "Auntie's shop", lat: 5.61, lng: -0.20, ghana_post_gps: 'ga 183 8164', note: 'Blue gate' })
    .expect(201);
  assert.equal(fav.body.favorite.ghana_post_gps, 'GA-183-8164');

  await request(app)
    .post('/api/favorites')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Bad GPS', lat: 5.6, lng: -0.2, ghana_post_gps: 'not-a-code' })
    .expect(400);

  const list = await request(app)
    .get('/api/favorites')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(list.body.favorites.length, 1);

  // saved GhanaPost GPS codes resolve through geocode
  const gp = await request(app).get('/api/geocode?q=GA-183-8164').expect(200);
  assert.equal(gp.body.ghanaPostGps.resolved, true);
  assert.equal(gp.body.results[0].name, "Auntie's shop");

  await request(app)
    .delete(`/api/favorites/${fav.body.favorite.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  const after = await request(app)
    .get('/api/favorites')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(after.body.favorites.length, 0);
});

test('auth validation rejects weak input', async () => {
  await request(app).post('/api/auth/register').send({ email: 'bad', name: 'X Y', password: 'longenough1' }).expect(400);
  await request(app).post('/api/auth/register').send({ email: 'ok@example.com', name: 'A', password: 'longenough1' }).expect(400);
  await request(app).post('/api/auth/register').send({ email: 'ok@example.com', name: 'Ama', password: 'short' }).expect(400);
});

// ── City widgets ─────────────────────────────────────────────────
test('traffic and vibe endpoints respond', async () => {
  const traffic = await request(app).get('/api/city/traffic').expect(200);
  assert.ok(['light', 'moderate', 'heavy'].includes(traffic.body.level));
  const vibe = await request(app).get('/api/city/vibe').expect(200);
  assert.ok(vibe.body.score >= 3 && vibe.body.score <= 9.9);
});

// ── Trotro ───────────────────────────────────────────────────────
test('trotro routes list and detail', async () => {
  const list = await request(app).get('/api/trotro').expect(200);
  assert.ok(list.body.routes.length >= 5);
  const detail = await request(app).get('/api/trotro/circle-kaneshie').expect(200);
  assert.equal(detail.body.route.station_name, 'Kwame Nkrumah Circle Station');
  await request(app).get('/api/trotro/nope').expect(404);
});

// ── Tiles ────────────────────────────────────────────────────────
test('tile proxy validates source and coordinates', async () => {
  await request(app).get('/tiles/nope/1/0/0.png').expect(404);
  await request(app).get('/tiles/osm/25/0/0.png').expect(400);
  await request(app).get('/tiles/osm/3/99/0.png').expect(400);
  // Valid coords with unreachable upstream → clean 502, not a crash
  await request(app).get('/tiles/osm/13/4091/3967.png').expect((res) => {
    assert.ok([200, 502].includes(res.status));
  });
});
