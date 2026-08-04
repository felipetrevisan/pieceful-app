create table if not exists pieceful.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists admin_sessions_active_idx
  on pieceful.admin_sessions(token_hash, expires_at)
  where revoked_at is null;

create table if not exists pieceful.admin_login_attempts (
  fingerprint text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);

alter table pieceful.admin_sessions enable row level security;
alter table pieceful.admin_login_attempts enable row level security;
revoke all on pieceful.admin_sessions, pieceful.admin_login_attempts from public, anon, authenticated;
grant all on pieceful.admin_sessions, pieceful.admin_login_attempts to service_role;
