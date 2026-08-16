// Picks the database backend from the environment:
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  → Supabase Postgres (production)
//   otherwise                                  → SQLite (local dev / tests)
// The SQLite module (and its native dependency) is only imported when used,
// so serverless bundles with Supabase configured never load better-sqlite3.
import path from 'node:path';

export async function createDbFromEnv(env = process.env) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createSupabaseDb } = await import('./supabase.js');
    return createSupabaseDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  const { createSqliteDb } = await import('./sqlite.js');
  const dbPath = env.DB_PATH || path.resolve('data/accramaps.db');
  return createSqliteDb(dbPath);
}
