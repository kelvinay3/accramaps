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

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id   INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  helpful    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, place_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_place ON reviews(place_id);

CREATE TABLE IF NOT EXISTS credits_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  ref_id     INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credits_user ON credits_ledger(user_id);

CREATE TABLE IF NOT EXISTS report_confirmations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote       TEXT NOT NULL CHECK (vote IN ('confirm','gone')),
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (report_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_rc_report ON report_confirmations(report_id);

CREATE TABLE IF NOT EXISTS saved_places (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  name           TEXT NOT NULL,
  lat            REAL NOT NULL,
  lng            REAL NOT NULL,
  place_type     TEXT NOT NULL DEFAULT 'custom',
  ghana_post_gps TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, label)
);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_places(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event      TEXT NOT NULL,
  payload    TEXT,
  session_id TEXT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_se_event ON site_events(event);
CREATE INDEX IF NOT EXISTS idx_se_created ON site_events(created_at);
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
      async count() {
        return raw.prepare('SELECT COUNT(*) AS n FROM users').get().n;
      },
      async updatePassword(id, passwordHash) {
        raw.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
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

    reviews: {
      async listByPlace(placeId, limit = 50) {
        return raw.prepare(
          `SELECT r.*, u.name as user_name FROM reviews r
           JOIN users u ON u.id = r.user_id
           WHERE r.place_id = ? ORDER BY r.created_at DESC LIMIT ?`
        ).all(placeId, limit);
      },
      async create({ userId, placeId, rating, body }) {
        const info = raw.prepare(
          'INSERT OR REPLACE INTO reviews (user_id, place_id, rating, body) VALUES (?, ?, ?, ?)'
        ).run(userId, placeId, rating, body);
        return raw.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid);
      },
      async remove(id) {
        return raw.prepare('DELETE FROM reviews WHERE id = ?').run(id).changes > 0;
      },
      async avgRating(placeId) {
        const row = raw.prepare('SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM reviews WHERE place_id = ?').get(placeId);
        return { avg: row.avg ? Math.round(row.avg * 10) / 10 : null, count: row.cnt };
      },
    },

    credits: {
      async balance(userId) {
        const row = raw.prepare('SELECT COALESCE(SUM(amount),0) AS bal FROM credits_ledger WHERE user_id = ?').get(userId);
        return row.bal;
      },
      async add({ userId, amount, reason, refId }) {
        raw.prepare('INSERT INTO credits_ledger (user_id, amount, reason, ref_id) VALUES (?, ?, ?, ?)').run(userId, amount, reason, refId ?? null);
        return this.balance(userId);
      },
      async history(userId, limit = 50) {
        return raw.prepare('SELECT * FROM credits_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
      },
    },

    reportConfirmations: {
      async create({ reportId, userId, vote, lat, lng }) {
        try {
          raw.prepare('INSERT INTO report_confirmations (report_id, user_id, vote, lat, lng) VALUES (?, ?, ?, ?, ?)').run(reportId, userId, vote, lat, lng);
        } catch { return null; }
        return raw.prepare('SELECT COUNT(*) AS confirms, SUM(vote="confirm") AS yes, SUM(vote="gone") AS no FROM report_confirmations WHERE report_id = ?').get(reportId);
      },
      async counts(reportId) {
        return raw.prepare('SELECT COUNT(*) AS total, SUM(vote="confirm") AS yes, SUM(vote="gone") AS no FROM report_confirmations WHERE report_id = ?').get(reportId);
      },
      async userVote(reportId, userId) {
        return raw.prepare('SELECT vote FROM report_confirmations WHERE report_id = ? AND user_id = ?').get(reportId, userId) ?? null;
      },
    },

    savedPlaces: {
      async listByUser(userId) {
        return raw.prepare('SELECT * FROM saved_places WHERE user_id = ? ORDER BY place_type, label').all(userId);
      },
      async upsert({ userId, label, name, lat, lng, placeType = 'custom', ghanaPostGps }) {
        raw.prepare(
          `INSERT INTO saved_places (user_id, label, name, lat, lng, place_type, ghana_post_gps)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, label) DO UPDATE SET name=excluded.name, lat=excluded.lat, lng=excluded.lng, place_type=excluded.place_type, ghana_post_gps=excluded.ghana_post_gps`
        ).run(userId, label, name, lat, lng, placeType, ghanaPostGps ?? null);
        return raw.prepare('SELECT * FROM saved_places WHERE user_id = ? AND label = ?').get(userId, label);
      },
      async remove(id, userId) {
        return raw.prepare('DELETE FROM saved_places WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
      },
    },

    resetTokens: {
      async create(userId, token, expiresAt) {
        raw.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
      },
      async findByToken(token) {
        return raw.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token) ?? null;
      },
      async markUsed(id) {
        raw.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(id);
      },
    },

    analytics: {
      async log({ event, payload, sessionId, userId }) {
        raw.prepare(
          'INSERT INTO site_events (event, payload, session_id, user_id) VALUES (?, ?, ?, ?)'
        ).run(event, payload ?? null, sessionId ?? null, userId ?? null);
      },
      async summary() {
        const cutoff7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const cutoff1d = new Date(Date.now() - 86_400_000).toISOString();
        const pageViews = raw.prepare("SELECT COUNT(*) AS n FROM site_events WHERE event='page_view' AND created_at > ?").get(cutoff7d)?.n ?? 0;
        const uniqueSessions = raw.prepare("SELECT COUNT(DISTINCT session_id) AS n FROM site_events WHERE event='page_view' AND created_at > ?").get(cutoff1d)?.n ?? 0;
        const signups = raw.prepare("SELECT COUNT(*) AS n FROM site_events WHERE event='signup' AND created_at > ?").get(cutoff7d)?.n ?? 0;
        const logins = raw.prepare("SELECT COUNT(*) AS n FROM site_events WHERE event='login' AND created_at > ?").get(cutoff7d)?.n ?? 0;
        const onboardViews = raw.prepare("SELECT COUNT(*) AS n FROM site_events WHERE event='onboard_view' AND created_at > ?").get(cutoff7d)?.n ?? 0;
        const onboardDone = raw.prepare("SELECT COUNT(*) AS n FROM site_events WHERE event='onboard_done' AND created_at > ?").get(cutoff7d)?.n ?? 0;
        const searches = raw.prepare(
          "SELECT json_extract(payload,'$.q') AS q, COUNT(*) AS n FROM site_events WHERE event='search' AND payload IS NOT NULL AND created_at > ? GROUP BY q ORDER BY n DESC LIMIT 10"
        ).all(cutoff7d).filter((r) => r.q);
        return { pageViews, uniqueSessions, signups, logins, onboardViews, onboardDone, topSearches: searches };
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
      // Always upsert trotro routes so new routes are added on every boot.
      const ins = raw.prepare(`
        INSERT OR IGNORE INTO trotro_routes (slug, title, route, fare, duration, frequency, board_at, callout, traffic_note, station_name, station_lat, station_lng)
        VALUES (@slug, @title, @route, @fare, @duration, @frequency, @board_at, @callout, @traffic_note, @station_name, @station_lat, @station_lng)
      `);
      const tx = raw.transaction((rows) => { for (const r of rows) ins.run(r); });
      tx(TROTRO_ROUTES);
    },
  };
}
