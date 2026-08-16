# 🇬🇭 AccraMaps — Navigate Ghana

Ghana-first GPS navigation web app: live directions, trotro routes, community
incident reports, curated places, and GhanaPost GPS support — wrapped in a
kente-trimmed UI made for Accra.

**Stack:** Node.js + Express API · **Supabase (Postgres)** in production /
SQLite locally · Leaflet + OpenStreetMap frontend (no build step) · deployed
on **Netlify** (static site + serverless function).

See [ROADMAP.md](ROADMAP.md) for what ships next, one feature at a time.

## Local development

```bash
npm install
npm start        # → http://localhost:3000  (SQLite, auto-seeded)
```

`npm run dev` starts with auto-reload. `npm test` runs the hermetic test
suite (in-memory DB, no network).

No configuration needed locally — without Supabase env vars the API runs on
SQLite in `data/`.

## Deploying (Netlify + Supabase)

1. **Supabase** — create a project at [supabase.com](https://supabase.com),
   open the SQL editor, and run `supabase/migrations/001_init.sql`.
   Copy the project URL and the **service_role** key
   (Settings → API — server-side secret, never exposed to the client).

2. **Netlify** — create a site from this repo. `netlify.toml` already
   configures the build, the function bundling, and the redirects.
   Set the environment variables:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | your project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key |
   | `JWT_SECRET` | long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

3. **Deploy.** On first boot the API seeds Ghana places + trotro routes into
   Supabase automatically (or run `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed`).

The frontend is served from Netlify's CDN; every `/api/*` and `/tiles/*`
request runs through one Express-in-a-Function (`netlify/functions/api.js`).

## Features

- **Directions** — driving / cycling / walking routes from OSRM with
  turn-by-turn steps, voice guidance (Web Speech), ETAs adjusted by an
  Accra rush-hour traffic model, and an offline straight-line fallback.
- **Search** — local Ghana places database first, then OpenStreetMap
  (Nominatim) bounded to Ghana; understands raw coordinates and GhanaPost
  GPS codes (`GA-183-8164`).
- **Community reports** — accidents, police, floods, potholes, go-slows,
  fuel queues, road closures. Stored server-side, visible to everyone,
  confirmable ("still there"), and they expire naturally.
- **Places** — 65+ curated spots across Accra and Ghana, category browse,
  near-me sorting, What's Hot and Quick Access rails.
- **Trotro routes** — fares, frequency, stations and the mate's callout,
  with one-tap navigation to the station.
- **Accounts & saved places** — register/sign in, star any spot, attach a
  GhanaPost GPS code and note; codes then resolve in search.
- **City pulse** — live Accra weather (Open-Meteo), traffic status fed by
  time-of-day + live report volume, the Vibe Score, Detty December banner.
- **Map extras** — satellite view, dark mode, speed HUD, GPS tracking,
  right-click for directions-from-here / save-this-spot, WhatsApp sharing,
  installable PWA. Map tiles are proxied and cached by the backend, so the
  browser only ever talks to AccraMaps.

## Project layout

```
server/              Express app (runs locally and inside the Netlify function)
  index.js           local entry point
  boot.js            shared init: pick DB, seed, build app
  app.js             app factory (also used by tests)
  db/                database adapters — same async interface
    index.js         env-based selection
    sqlite.js        local dev/tests (better-sqlite3)
    supabase.js      production (@supabase/supabase-js, service role)
  routes/            auth, places, geocode, directions, reports,
                     favorites, trotro, city widgets, tile proxy
  util/              geo math, GhanaPost GPS, tokens, rate limiting
  middleware/        bearer-token auth
netlify/functions/   api.js — the whole API as one serverless function
netlify.toml         build, bundling, redirects
supabase/migrations/ 001_init.sql — Postgres schema (run in SQL editor)
public/              static frontend, no build step
  index.html         app shell
  css/styles.css     design system (Ghana flag palette + kente trim)
  js/                ES modules (map, search, directions, reports, …)
  sw.js              offline app-shell service worker
tests/               node:test + supertest (hermetic — no network)
```

## API overview

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | liveness probe |
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | accounts (Bearer token) |
| `GET /api/places?q=&category=&near=lat,lng&radius=` | search/browse places |
| `GET /api/places/categories` · `/hot` · `/quick` · `/:id` | place collections |
| `GET /api/geocode?q=` · `GET /api/geocode/reverse?lat=&lng=` | Ghana-bounded geocoding (cached) |
| `GET /api/directions?from=lat,lng&to=lat,lng&mode=driving\|cycling\|walking` | routing + turn-by-turn |
| `GET /api/reports` · `POST /api/reports` · `POST /api/reports/:id/confirm` · `GET /api/reports/types` | community incidents |
| `GET/POST/DELETE /api/favorites` | saved places (auth) |
| `GET /api/trotro` · `GET /api/trotro/:slug` | trotro routes |
| `GET /api/city/weather` · `/traffic` · `/vibe` | city widgets |
| `GET /tiles/:source/:z/:x/:y.png` | cached map-tile proxy (osm, sat) |

## Production notes

- The public OSRM/Nominatim demo servers are for light use — self-host both
  with a [Ghana OSM extract](https://download.geofabrik.de/africa/ghana.html)
  when traffic grows, and point `OSRM_BASE` / `NOMINATIM_BASE` at them.
- Supabase tables run with RLS enabled and **no** public policies; only the
  API (service role) touches them.
- Keep the service-role key server-side only. The browser never talks to
  Supabase directly in this architecture.

## License

MIT
