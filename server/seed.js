// CLI seeder: node server/seed.js
// Seeds SQLite locally; with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set it
// seeds your Supabase project instead (tables must exist — run the SQL in
// supabase/migrations/ first).
import { createDbFromEnv } from './db/index.js';
import { PLACES, TROTRO_ROUTES } from './seedData.js';

const db = await createDbFromEnv();
await db.seedIfEmpty({ PLACES, TROTRO_ROUTES });
const places = await db.places.count();
const trotro = await db.trotro.count();
console.log(`Seeded (${db.kind}): ${places} places, ${trotro} trotro routes`);
