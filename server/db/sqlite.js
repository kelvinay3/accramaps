// SQLite adapter — local development, tests, and simple self-hosted deploys.
// Implements the same async repository interface as the Supabase adapter
// (server/db/supabase.js), so routes never know which store they run on.
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS places (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  icon           TEXT NOT NULL DEFAULT '📍',
  description    TEXT,
  area           TEXT,
  city           TEXT NOT NULL DEFAULT 'Accra',
  lat            REAL NOT NULL,
  lng            REAL NOT NULL,
  ghana_post_gps TEXT,
  tags           TEXT NOT NULL DEFAULT '',
  rating         REAL,
  source         TEXT NOT NULL DEFAULT 'seed',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);

CREATE TABLE IF NOT EXISTS trotro_routes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  route        TEXT NOT NULL,
  fare         TEXT NOT NULL,
  duration     TEXT NOT NULL,
  frequency    TEXT NOT NULL,
  board_at     TEXT NOT NULL,
  callout      TEXT NOT NULL,
  traffic_note TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_lat  REAL NOT NULL,
  station_lng  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  description TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  confirms    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_expires ON reports(expires_at);

CREATE TABLE IF NOT EXISTS favorites (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  lat            REAL NOT NULL,
  lng            REAL NOT NULL,
  ghana_post_gps TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS kv_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tile_cache (
  key        TEXT PRIMARY KEY,
  body       BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const nowIso = () => new Date().toISOString();
const isoIn = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

export async function createSqliteDb(dbPath) {
  const { default: Database } = await import('better-sqlite3');
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.exec(SCHEMA);

  return {
    kind: 'sqlite',
    raw,

    users: {
      async create({ email, name, passwordHash }) {
        const info = raw.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
          .run(email, name, passwordHash);
        return raw.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
      },
      async findByEmail(email) {
        return raw.prepare('SELECT * FROM users WHERE email = ?').get(email) ?? null;
      },
      async findById(id) {
        return raw.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id) ?? null;
      },
    },

    places: {
      async search({ q, category, limit = 300 }) {
        let sql = 'SELECT * FROM places WHERE 1=1';
        const params = [];
        if (category) { sql += ' AND category = ?'; params.push(category); }
        if (q) {
          sql += ' AND (name LIKE ? OR area LIKE ? OR city LIKE ? OR description LIKE ?)';
          const like = `%${q}%`;
          params.push(like, like, like, like);
        }
        sql += ' ORDER BY rating DESC, name ASC LIMIT ?';
        params.push(limit);
        return raw.prepare(sql).all(...params);
      },
      async byTag(tag) {
        return raw.prepare('SELECT * FROM places WHERE tags LIKE ? ORDER BY rating DESC').all(`%${tag}%`);
      },
      async byId(id) {
        return raw.prepare('SELECT * FROM places WHERE id = ?').get(id) ?? null;
      },
      async count() {
        return raw.prepare('SELECT COUNT(*) AS n FROM places').get().n;
      },
    },

    favorites: {
      async listByUser(userId) {
        return raw.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      },
      async create({ userId, name, lat, lng, ghanaPostGps, note }) {
        const info = raw.prepare(
          'INSERT INTO favorites (user_id, name, lat, lng, ghana_post_gps, note) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(userId, name, lat, lng, ghanaPostGps, note);
        return raw.prepare('SELECT * FROM favorites WHERE id = ?').get(info.lastInsertRowid);
      },
      async remove(id, userId) {
        return raw.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
      },
      async findByGps(code) {
        return raw.prepare('SELECT name, lat, lng FROM favorites WHERE ghana_post_gps = ? LIMIT 1').get(code) ?? null;
      },
    },

    reports: {
      async listActive(limit = 200) {
        return raw.prepare(
          'SELECT id, type, description, lat, lng, confirms, created_at, expires_at FROM reports WHERE expires_at > ? ORDER BY created_at DESC LIMIT ?'
        ).all(nowIso(), limit);
      },
      async create({ userId, type, description, lat, lng, ttlMin }) {
        const info = raw.prepare(
          'INSERT INTO reports (user_id, type, description, lat, lng, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(userId, type, description, lat, lng, isoIn(ttlMin));
        return raw.prepare('SELECT * FROM reports WHERE id = ?').get(info.lastInsertRowid);
      },
      async confirm(id) {
        const row = raw.prepare('SELECT * FROM reports WHERE id = ? AND expires_at > ?').get(id, nowIso());
        if (!row) return null;
        const extended = new Date(new Date(row.expires_at).getTime() + 10 * 60_000).toISOString();
        raw.prepare('UPDATE reports SET confirms = confirms + 1, expires_at = ? WHERE id = ?').run(extended, id);
        return raw.prepare('SELECT * FROM reports WHERE id = ?').get(id);
      },
      async countActive() {
        return raw.prepare('SELECT COUNT(*) AS n FROM reports WHERE expires_at > ?').get(nowIso()).n;
      },
      async sweepExpired(olderThanDays = 1) {
        const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
        raw.prepare('DELETE FROM reports WHERE expires_at < ?').run(cutoff);
      },
    },

    trotro: {
      async list() {
        return raw.prepare('SELECT * FROM trotro_routes ORDER BY id').all();
      },
      async bySlug(slug) {
        return raw.prepare('SELECT * FROM trotro_routes WHERE slug = ?').get(slug) ?? null;
      },
      async count() {
        return raw.prepare('SELECT COUNT(*) AS n FROM trotro_routes').get().n;
      },
    },

    kv: {
      async get(key, maxAgeHours) {
        const row = raw.prepare(
          `SELECT payload FROM kv_cache WHERE key = ? AND created_at > datetime('now', ?)`
        ).get(key, `-${maxAgeHours} hours`);
        return row ? JSON.parse(row.payload) : null;
      },
      async put(key, payload) {
        raw.prepare(
          `INSERT INTO kv_cache (key, payload, created_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, created_at = datetime('now')`
        ).run(key, JSON.stringify(payload));
      },
    },

    tiles: {
      async get(key, maxAgeHours) {
        const row = raw.prepare(
          `SELECT body FROM tile_cache WHERE key = ? AND created_at > datetime('now', ?)`
        ).get(key, `-${maxAgeHours} hours`);
        return row ? row.body : null;
      },
      async put(key, body) {
        raw.prepare(
          `INSERT INTO tile_cache (key, body, created_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET body = excluded.body, created_at = datetime('now')`
        ).run(key, body);
      },
    },

    async seedIfEmpty({ PLACES, TROTRO_ROUTES }) {
      if ((await this.places.count()) === 0) {
        const ins = raw.prepare(`
          INSERT INTO places (name, category, icon, description, area, city, lat, lng, tags, rating, source)
          VALUES (@name, @category, @icon, @description, @area, @city, @lat, @lng, @tags, @rating, 'seed')
        `);
        const tx = raw.transaction((rows) => {
          for (const p of rows) {
            ins.run({ description: null, area: null, city: 'Accra', tags: '', rating: null, ...p });
          }
        });
        tx(PLACES);
      }
      if ((await this.trotro.count()) === 0) {
        const ins = raw.prepare(`
          INSERT INTO trotro_routes (slug, title, route, fare, duration, frequency, board_at, callout, traffic_note, station_name, station_lat, station_lng)
          VALUES (@slug, @title, @route, @fare, @duration, @frequency, @board_at, @callout, @traffic_note, @station_name, @station_lat, @station_lng)
        `);
        const tx = raw.transaction((rows) => { for (const r of rows) ins.run(r); });
        tx(TROTRO_ROUTES);
      }
    },
  };
}
