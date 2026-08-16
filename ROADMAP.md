# AccraMaps Roadmap

Features land **one at a time**, each as its own branch/PR. This file is the
source of truth for what's next and what groundwork already exists.

## ✅ Phase 0 — Proper project structure (done)

- Express API + static Leaflet frontend, no build step
- Database adapter layer: **Supabase (Postgres)** in production, SQLite for
  local dev and tests — same code path, switched by env vars
- **Netlify** deployment: static site + the whole API as one Function
  (`netlify/functions/api.js`), tile/geocode/routing proxies included
- Core features ported from the prototype: directions (OSRM) with
  turn-by-turn + voice, Ghana-bounded search, places DB, trotro routes,
  weather/traffic/vibe widgets, community incident reports, favorites with
  GhanaPost GPS codes, accounts (token auth), dark mode, PWA shell

## 🔜 Phase 1 — User accounts with Supabase Auth

Replace the custom email+password tokens with Supabase Auth so users get
email magic links / OTP and social sign-in, password reset, and a managed
user table. Keep the API's Bearer-token contract; verify Supabase JWTs
server-side. Groundwork in place: `users.role` column, auth middleware
isolated in `server/middleware/auth.js`.

## 🔜 Phase 2 — Incident reports, deepened

Reports are already real and persistent (server-stored, expiring,
confirmable). Next: photos, severity levels, per-area subscriptions,
moderation queue for the admin, and auto-expiry tuning from confirm decay.

## 🔜 Phase 3 — Fuel prices per station

`fuel_prices` table keyed to fuel-station places (petrol/diesel/LPG, price,
reported_by, verified flag). Crowdsourced updates with admin verification;
show cheapest-near-me and price history.

## 🔜 Phase 4 — Twi / Ga / Pidgin language toggle

i18n layer over all UI strings + voice guidance. Research task first:
evaluate GhanaNLP (khaya), kasahorow word lists, and academic Twi/Ga
dictionaries for navigation phrasing ("branch left" etc.); native-speaker
review before shipping. Voice: pick per-language TTS strategy (Web Speech
lacks tw/gaa voices — likely recorded phrase snippets for turns).

## 🔜 Phase 5 — Better mobile experience

Full bottom-sheet navigation flow, one-handed reachability, larger touch
targets, route overview → follow mode, wake-lock during navigation, data-
saver mode (fewer tiles), install prompts.

## 🔜 Phase 6 — More trotro routes & estimated fares

Expand the routes table (target: 40+ Accra corridors, then Kumasi),
fare-estimate model (per-km bands, updated when GPRTU announces changes),
station walking directions, route-aware "which trotro do I take?" answers.

## 🔜 Phase 7 — Ride-hailing hand-off

Deep links from any destination: Uber, Bolt, Yango, Shaxi, GoRide —
pre-filled pickup/dropoff where each app's link format allows. Compare
screen listing the options; affiliate/referral codes when available.

## 🔜 Phase 8 — Admin & owner access

Admin role (column already exists) + `/admin` dashboard: report moderation,
place editing, fuel-price verification, user management, usage stats.
Owner bootstrap via `ADMIN_EMAILS` env allowlist.

## 🔜 Phase 9 — Monetization surfaces

Feature-flagged ad/banner slots (panel card, mobile sheet card, route-result
footer) served from a `promotions` table with impressions/click tracking —
kept empty until we switch them on. Sponsored pins for businesses.

## 🔜 Phase 10 — Community feed & local guides

Posts + questions ("how do I get to X from Y?"), area tags, replies,
upvotes. Reputation system → **Local Guide** badges (like Google Local
Guides) earned from confirmed reports, answered questions, verified fuel
prices. Requires accounts (Phase 1) and moderation (Phase 8) first.

## 🔜 Phase 11 — GhanaPost GPS integration

Today codes validate and resolve against a user's saved places. Goal:
resolve any digital address via the official GhanaPost GPS system —
requires a partnership/API agreement with Ghana Post (their API is not
public). Fallback: community-mapped codes with confidence scores.
