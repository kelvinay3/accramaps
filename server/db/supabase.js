// Supabase (Postgres) adapter — production database on Netlify.
// Uses the service-role key server-side only; Row Level Security stays on
// with no public policies, so the anon key can't touch these tables.
// Schema lives in supabase/migrations/001_init.sql.
import { createClient } from '@supabase/supabase-js';

const nowIso = () => new Date().toISOString();
const isoIn = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

// PostgREST .or() filters are comma/paren delimited — strip those from user text.
const sanitizeFilter = (s) => String(s).replace(/[,()%.]/g, ' ').trim();

function must(result) {
  if (result.error) {
    const err = new Error(result.error.message);
    err.code = result.error.code;
    throw err;
  }
  return result.data;
}

// Accept the URL however it was pasted from the dashboard — with a trailing
// slash or a service path like /rest/v1 — and reduce it to the project root.
function normalizeSupabaseUrl(url) {
  return String(url).trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|realtime|storage|functions)\/v1$/, '');
}

export function createSupabaseDb(rawUrl, serviceRoleKey) {
  const url = normalizeSupabaseUrl(rawUrl);
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };
  // supabase-js eagerly wires up its realtime client, which demands a
  // WebSocket constructor even though this app never opens a realtime
  // channel. On runtimes without native WebSocket (Node < 22 lambdas),
  // hand it an inert stub so createClient doesn't throw.
  if (typeof globalThis.WebSocket === 'undefined') {
    options.realtime = { transport: class StubWebSocket { close() {} } };
  }
  const client = createClient(url, serviceRoleKey, options);

  return {
    kind: 'supabase',
    client,

    users: {
      async create({ email, name, passwordHash }) {
        const data = must(await client.from('users')
          .insert({ email: email.toLowerCase(), name, password_hash: passwordHash })
          .select('id, email, name, role, created_at').single());
        return data;
      },
      async findByEmail(email) {
        return must(await client.from('users').select('*').ilike('email', email).maybeSingle());
      },
      async findById(id) {
        return must(await client.from('users').select('id, email, name, role, created_at').eq('id', id).maybeSingle());
      },
      async count() {
        const { count, error } = await client.from('users').select('*', { count: 'exact', head: true });
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },

    places: {
      async search({ q, category, limit = 300 }) {
        let query = client.from('places').select('*');
        if (category) query = query.eq('category', category);
        if (q) {
          const s = sanitizeFilter(q);
          if (s) query = query.or(`name.ilike.%${s}%,area.ilike.%${s}%,city.ilike.%${s}%,description.ilike.%${s}%`);
        }
        query = query.order('rating', { ascending: false, nullsFirst: false }).order('name').limit(limit);
        return must(await query);
      },
      async byTag(tag) {
        return must(await client.from('places').select('*').ilike('tags', `%${tag}%`)
          .order('rating', { ascending: false, nullsFirst: false }));
      },
      async byId(id) {
        return must(await client.from('places').select('*').eq('id', id).maybeSingle());
      },
      async count() {
        const { count, error } = await client.from('places').select('*', { count: 'exact', head: true });
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },

    favorites: {
      async listByUser(userId) {
        return must(await client.from('favorites').select('*').eq('user_id', userId)
          .order('created_at', { ascending: false }));
      },
      async create({ userId, name, lat, lng, ghanaPostGps, note }) {
        return must(await client.from('favorites')
          .insert({ user_id: userId, name, lat, lng, ghana_post_gps: ghanaPostGps, note })
          .select('*').single());
      },
      async remove(id, userId) {
        const data = must(await client.from('favorites').delete().eq('id', id).eq('user_id', userId).select('id'));
        return data.length > 0;
      },
      async findByGps(code) {
        return must(await client.from('favorites').select('name, lat, lng').eq('ghana_post_gps', code)
          .limit(1).maybeSingle());
      },
    },

    reports: {
      async listActive(limit = 200) {
        return must(await client.from('reports')
          .select('id, type, description, lat, lng, confirms, created_at, expires_at')
          .gt('expires_at', nowIso())
          .order('created_at', { ascending: false }).limit(limit));
      },
      async create({ userId, type, description, lat, lng, ttlMin }) {
        return must(await client.from('reports')
          .insert({ user_id: userId, type, description, lat, lng, expires_at: isoIn(ttlMin) })
          .select('*').single());
      },
      async confirm(id) {
        const row = must(await client.from('reports').select('*').eq('id', id).gt('expires_at', nowIso()).maybeSingle());
        if (!row) return null;
        const extended = new Date(new Date(row.expires_at).getTime() + 10 * 60_000).toISOString();
        return must(await client.from('reports')
          .update({ confirms: row.confirms + 1, expires_at: extended })
          .eq('id', id).select('*').single());
      },
      async countActive() {
        const { count, error } = await client.from('reports')
          .select('*', { count: 'exact', head: true }).gt('expires_at', nowIso());
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
      async sweepExpired(olderThanDays = 1) {
        const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
        must(await client.from('reports').delete().lt('expires_at', cutoff));
      },
    },

    trotro: {
      async list() {
        return must(await client.from('trotro_routes').select('*').order('id'));
      },
      async bySlug(slug) {
        return must(await client.from('trotro_routes').select('*').eq('slug', slug).maybeSingle());
      },
      async count() {
        const { count, error } = await client.from('trotro_routes').select('*', { count: 'exact', head: true });
        if (error) throw new Error(error.message);
        return count ?? 0;
      },
    },

    kv: {
      async get(key, maxAgeHours) {
        const cutoff = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();
        const row = must(await client.from('kv_cache').select('payload')
          .eq('key', key).gt('created_at', cutoff).maybeSingle());
        return row ? row.payload : null;
      },
      async put(key, payload) {
        must(await client.from('kv_cache')
          .upsert({ key, payload, created_at: nowIso() }, { onConflict: 'key' }));
      },
    },

    reviews: {
      async listByPlace(placeId, limit = 50) {
        return must(await client.from('reviews')
          .select('*, users(name)')
          .eq('place_id', placeId)
          .order('created_at', { ascending: false }).limit(limit));
      },
      async create({ userId, placeId, rating, body }) {
        return must(await client.from('reviews')
          .upsert({ user_id: userId, place_id: placeId, rating, body }, { onConflict: 'user_id,place_id' })
          .select('*').single());
      },
      async remove(id) {
        const data = must(await client.from('reviews').delete().eq('id', id).select('id'));
        return data.length > 0;
      },
      async avgRating(placeId) {
        const rows = must(await client.from('reviews').select('rating').eq('place_id', placeId));
        if (!rows.length) return { avg: null, count: 0 };
        const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
        return { avg: Math.round(avg * 10) / 10, count: rows.length };
      },
    },

    credits: {
      async balance(userId) {
        const rows = must(await client.from('credits_ledger').select('amount').eq('user_id', userId));
        return rows.reduce((s, r) => s + r.amount, 0);
      },
      async add({ userId, amount, reason, refId }) {
        must(await client.from('credits_ledger').insert({ user_id: userId, amount, reason, ref_id: refId ?? null }));
        return this.balance(userId);
      },
      async history(userId, limit = 50) {
        return must(await client.from('credits_ledger').select('*').eq('user_id', userId)
          .order('created_at', { ascending: false }).limit(limit));
      },
    },

    reportConfirmations: {
      async create({ reportId, userId, vote, lat, lng }) {
        try {
          must(await client.from('report_confirmations').insert({ report_id: reportId, user_id: userId, vote, lat, lng }));
        } catch { return null; }
        const rows = must(await client.from('report_confirmations').select('vote').eq('report_id', reportId));
        const yes = rows.filter((r) => r.vote === 'confirm').length;
        const no = rows.filter((r) => r.vote === 'gone').length;
        return { total: rows.length, yes, no };
      },
      async counts(reportId) {
        const rows = must(await client.from('report_confirmations').select('vote').eq('report_id', reportId));
        const yes = rows.filter((r) => r.vote === 'confirm').length;
        const no = rows.filter((r) => r.vote === 'gone').length;
        return { total: rows.length, yes, no };
      },
      async userVote(reportId, userId) {
        return must(await client.from('report_confirmations').select('vote').eq('report_id', reportId).eq('user_id', userId).maybeSingle());
      },
    },

    savedPlaces: {
      async listByUser(userId) {
        return must(await client.from('saved_places').select('*').eq('user_id', userId)
          .order('place_type').order('label'));
      },
      async upsert({ userId, label, name, lat, lng, placeType = 'custom', ghanaPostGps }) {
        return must(await client.from('saved_places')
          .upsert({ user_id: userId, label, name, lat, lng, place_type: placeType, ghana_post_gps: ghanaPostGps ?? null }, { onConflict: 'user_id,label' })
          .select('*').single());
      },
      async remove(id, userId) {
        const data = must(await client.from('saved_places').delete().eq('id', id).eq('user_id', userId).select('id'));
        return data.length > 0;
      },
    },

    // Tile blobs don't belong in Postgres — the tiles route falls back to an
    // in-memory LRU per serverless instance when this is null.
    tiles: null,

    async seedIfEmpty({ PLACES, TROTRO_ROUTES }) {
      if ((await this.places.count()) === 0) {
        const rows = PLACES.map((p) => ({
          description: null, area: null, city: 'Accra', tags: '', rating: null, source: 'seed', ...p,
        }));
        must(await client.from('places').insert(rows));
      }
      // Always upsert trotro routes so new routes are added without wiping existing.
      must(await client.from('trotro_routes').upsert(TROTRO_ROUTES, { onConflict: 'slug', ignoreDuplicates: true }));
    },
  };
}
