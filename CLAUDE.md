# AccraMaps — Claude Code Context

## What this is
Ghana-first GPS navigation web app. Live at **accramaps.com** (also accramaps.netlify.app).
Owner: kelvinay3@gmail.com — this email should be treated as admin.

## Stack
- **Frontend**: Vanilla JS (ES modules), Leaflet + OpenStreetMap, PWA
- **Backend**: Node.js + Express, served as a Netlify Function (serverless-http)
- **Database**: Supabase (Postgres) in production, SQLite (better-sqlite3) locally and in tests
- **Routing**: OSRM (free, router.project-osrm.org)
- **Geocoding**: Nominatim (OSM, Ghana-bounded)
- **Hosting**: Netlify — static frontend from `public/`, API as `netlify/functions/api.js`
- **Domain**: accramaps.com → Netlify DNS (Dynadot registrar)

## Repo layout
```
server/         Express app, routes, DB adapters, middleware
  app.js        createApp() factory
  boot.js       shared init (local + serverless)
  db/
    index.js    picks Supabase or SQLite from env
    supabase.js Supabase adapter (production)
    sqlite.js   SQLite adapter (local/tests)
  routes/       auth, places, geocode, directions, reports, favorites, city, trotro, tiles
  seedData.js   65 Ghana places + trotro routes
public/         Static frontend (SPA)
  index.html    App shell
  js/           ES module frontend (map, directions, auth, trotro, reports, etc.)
  css/styles.css
netlify/
  functions/api.js  serverless-http wrapper
supabase/
  migrations/001_init.sql  Postgres schema
tests/api.test.js  25 hermetic node:test + supertest tests
```

## Environment variables (set in Netlify dashboard)
- `SUPABASE_URL` — project root URL (e.g. https://xxx.supabase.co), NOT the /rest/v1 path
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (sb_secret_ prefix), server-side only
- `JWT_SECRET` — long random string for auth tokens

## Local development
```bash
npm install
npm test          # run all tests (SQLite in-memory, no network)
npm start         # local server on :3000 with SQLite
```

## Deploy workflow
Push to `main` → Netlify auto-deploys to accramaps.com within ~1 minute.
Feature branches: use `claude/...` prefix, open PR → merge to main.

## Supabase notes
- RLS enabled on all tables, no public policies — API uses service_role key only
- After running migrations, grant permissions:
  ```sql
  grant usage on schema public to service_role;
  grant all privileges on all tables in schema public to service_role;
  grant usage, select on all sequences in schema public to service_role;
  alter default privileges in schema public grant all privileges on tables to service_role;
  alter default privileges in schema public grant usage, select on sequences to service_role;
  ```
- `seedIfEmpty` only runs when tables are empty (count = 0)

## What's been built
- Full auth system (register/login/JWT, custom scrypt+HMAC)
- Place search with categories (65 seeded Ghana places)
- Directions via OSRM with Accra rush-hour traffic model
- Live incident reports (crowd-sourced, time-limited)
- Saved favorites with GhanaPost GPS support
- 5 trotro routes with station map pins
- Map tile proxy (OSM + Esri satellite) with 7-day cache
- Live Accra weather via Open-Meteo
- Dark mode, PWA manifest, service worker offline shell
- Ghana-bounded geocoding (Nominatim)
- GhanaPost GPS code validation (GA-183-8164 format)
- City overview panel (Accra stats)

## What's next (priority order)
1. **More trotro routes** — expand from 5 to 35+ major Accra corridors
2. **Ride-hailing buttons** — Uber/Bolt/Yango/Shaxi/GoRide deep links after directions
3. **Admin dashboard** — `/admin` page protected by ADMIN_EMAILS env, shows site stats
4. **Fuel prices** — crowdsourced per-station prices
5. **Language toggle** — Twi/Ga/Pidgin UI strings
6. **Better mobile UX** — improved bottom sheet, touch targets
7. **Community feed** — posts, local guide badges, reputation
8. **GhanaPost official API** — requires Ghana Post partnership

## Known constraints
- Tile caching: Supabase adapter has `tiles: null` → falls back to in-memory LRU (600 tiles)
- No WebSocket on Node < 22: inert stub in supabase.js handles this
- esbuild bundles the Netlify function as CJS — `import.meta.url` guarded with try/catch
- `better-sqlite3` is excluded from esbuild bundle (native module)
