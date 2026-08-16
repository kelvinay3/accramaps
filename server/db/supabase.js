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

export function createSupabaseDb(url, serviceRoleKey) {
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
      if ((await this.trotro.count()) === 0) {
        must(await client.from('trotro_routes').insert(TROTRO_ROUTES));
      }
    },
  };
}
