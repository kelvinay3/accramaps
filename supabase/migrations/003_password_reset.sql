-- AccraMaps migration 003: password reset tokens
-- Run in the Supabase SQL editor.

create table if not exists password_reset_tokens (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_prt_token on password_reset_tokens(token);
create index if not exists idx_prt_user  on password_reset_tokens(user_id);

alter table password_reset_tokens enable row level security;

-- Service role bypass (same pattern as other tables)
grant usage on schema public to service_role;
grant all privileges on table password_reset_tokens to service_role;
grant usage, select on sequence password_reset_tokens_id_seq to service_role;
