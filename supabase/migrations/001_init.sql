-- AccraMaps initial schema for Supabase (Postgres).
-- Run this in the Supabase SQL editor, or: supabase db push
--
-- The API server talks to these tables with the SERVICE ROLE key only.
-- RLS is enabled with no public policies, so the anon/publishable key
-- cannot read or write anything directly.

create table if not exists users (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  role          text not null default 'user',
  created_at    timestamptz not null default now()
);

create table if not exists places (
  id             bigint generated always as identity primary key,
  name           text not null,
  category       text not null,
  icon           text not null default '📍',
  description    text,
  area           text,
  city           text not null default 'Accra',
  lat            double precision not null,
  lng            double precision not null,
  ghana_post_gps text,
  tags           text not null default '',
  rating         double precision,
  source         text not null default 'seed',
  created_at     timestamptz not null default now()
);
create index if not exists idx_places_category on places(category);
create index if not exists idx_places_name on places(name);

create table if not exists trotro_routes (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  title        text not null,
  route        text not null,
  fare         text not null,
  duration     text not null,
  frequency    text not null,
  board_at     text not null,
  callout      text not null,
  traffic_note text not null,
  station_name text not null,
  station_lat  double precision not null,
  station_lng  double precision not null
);

create table if not exists reports (
  id          bigint generated always as identity primary key,
  user_id     bigint references users(id) on delete set null,
  type        text not null,
  description text,
  lat         double precision not null,
  lng         double precision not null,
  confirms    integer not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_reports_expires on reports(expires_at);

create table if not exists favorites (
  id             bigint generated always as identity primary key,
  user_id        bigint not null references users(id) on delete cascade,
  name           text not null,
  lat            double precision not null,
  lng            double precision not null,
  ghana_post_gps text,
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_favorites_user on favorites(user_id);

create table if not exists kv_cache (
  key        text primary key,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

-- Lock everything down: the API uses the service role key, which bypasses
-- RLS. No policies are defined on purpose — the anon key gets nothing.
alter table users         enable row level security;
alter table places        enable row level security;
alter table trotro_routes enable row level security;
alter table reports       enable row level security;
alter table favorites     enable row level security;
alter table kv_cache      enable row level security;
