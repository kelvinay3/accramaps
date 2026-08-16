import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGhanaPostGps, ghanaPostRegion, looksLikeGhanaPostGps } from '../server/util/ghanapost.js';
import { haversineMeters, parseLatLng, inGhana, accraTrafficFactor } from '../server/util/geo.js';
import { signToken, verifyToken, hashPassword, verifyPassword } from '../server/util/token.js';

test('GhanaPost GPS codes normalize and validate', () => {
  assert.equal(normalizeGhanaPostGps('GA-183-8164'), 'GA-183-8164');
  assert.equal(normalizeGhanaPostGps('ga 183 8164'), 'GA-183-8164');
  assert.equal(normalizeGhanaPostGps('GA1838164'), 'GA-183-8164');
  assert.equal(normalizeGhanaPostGps('AK-039-5028'), 'AK-039-5028');
  assert.equal(normalizeGhanaPostGps('nonsense'), null);
  assert.equal(normalizeGhanaPostGps('G-183-8164'), null);
  assert.equal(normalizeGhanaPostGps(''), null);
  assert.equal(looksLikeGhanaPostGps('GA-183-8164'), true);
  assert.equal(looksLikeGhanaPostGps('Accra Mall'), false);
});

test('GhanaPost region prefix resolves', () => {
  assert.equal(ghanaPostRegion('GA-183-8164'), 'Greater Accra');
  assert.equal(ghanaPostRegion('AK-039-5028'), 'Ashanti');
  assert.equal(ghanaPostRegion('ZZ-000-0000'), null);
});

test('haversine distance is sane (Accra → Kumasi ≈ 200km)', () => {
  const d = haversineMeters(5.6037, -0.187, 6.6885, -1.6244);
  assert.ok(d > 190_000 && d < 210_000, `got ${d}`);
});

test('parseLatLng handles valid and junk input', () => {
  assert.deepEqual(parseLatLng('5.6,-0.18'), { lat: 5.6, lng: -0.18 });
  assert.deepEqual(parseLatLng(' 5.6037 , -0.1870 '), { lat: 5.6037, lng: -0.187 });
  assert.equal(parseLatLng('91,0'), null);
  assert.equal(parseLatLng('abc'), null);
  assert.equal(parseLatLng(''), null);
});

test('Ghana bounds check', () => {
  assert.equal(inGhana(5.6037, -0.187), true);   // Accra
  assert.equal(inGhana(9.4, -0.85), true);        // Tamale
  assert.equal(inGhana(48.85, 2.35), false);      // Paris
});

test('traffic factor stays within sane range', () => {
  for (let h = 0; h < 24; h++) {
    const factor = accraTrafficFactor(new Date(2026, 2, 10, h)); // March, no Detty
    assert.ok(factor >= 1.0 && factor <= 1.7);
  }
});

test('tokens sign, verify, expire and reject tampering', () => {
  const token = signToken({ uid: 42 }, 'secret');
  assert.equal(verifyToken(token, 'secret').uid, 42);
  assert.equal(verifyToken(token, 'other-secret'), null);
  assert.equal(verifyToken(token + 'x', 'secret'), null);
  assert.equal(verifyToken('garbage', 'secret'), null);
  const expired = signToken({ uid: 1 }, 'secret', -10);
  assert.equal(verifyToken(expired, 'secret'), null);
});

test('password hashing verifies and rejects', () => {
  const stored = hashPassword('correct horse');
  assert.equal(verifyPassword('correct horse', stored), true);
  assert.equal(verifyPassword('wrong', stored), false);
});
