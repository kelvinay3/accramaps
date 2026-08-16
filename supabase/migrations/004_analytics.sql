-- AccraMaps migration 004: site analytics events
-- Run in the Supabase SQL editor.

create table if not exists site_events (
  id         bigint generated always as identity primary key,
  event      text not null,
  payload    text,
  session_id text,
  user_id    bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_se_event   on site_events(event);
create index if not exists idx_se_created on site_events(created_at);
create index if not exists idx_se_session on site_events(session_id);

alter table site_events enable row level security;

grant usage on schema public to service_role;
grant all privileges on table site_events to service_role;
grant usage, select on sequence site_events_id_seq to service_role;

-- Helper function to aggregate top search queries
create or replace function top_searches(since timestamptz, lim int default 10)
returns table(q text, n bigint) language sql as $$
  select payload::json->>'q' as q, count(*) as n
  from site_events
  where event = 'search' and payload is not null and created_at > since
    and payload::json->>'q' is not null and payload::json->>'q' != ''
  group by q
  order by n desc
  limit lim;
$$;
