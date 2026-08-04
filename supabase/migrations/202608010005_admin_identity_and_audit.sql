-- Bind administrative sessions to Supabase users with the `admin` app role
-- and keep an immutable audit trail for catalog mutations.

alter table pieceful.admin_sessions
  add column if not exists admin_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists idle_expires_at timestamptz,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists user_agent_hash text;

update pieceful.admin_sessions
set idle_expires_at = least(expires_at, last_seen_at + interval '60 minutes')
where idle_expires_at is null;

alter table pieceful.admin_sessions
  alter column idle_expires_at set not null;

create index if not exists admin_sessions_user_active_idx
  on pieceful.admin_sessions(admin_user_id, idle_expires_at, expires_at)
  where revoked_at is null;

create table if not exists pieceful.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  resource_type text not null check (char_length(resource_type) between 2 and 80),
  resource_id text,
  request_id text not null,
  source_fingerprint text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on pieceful.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_admin_idx
  on pieceful.admin_audit_log(admin_user_id, created_at desc);

alter table pieceful.admin_audit_log enable row level security;
revoke all on pieceful.admin_audit_log from public, anon, authenticated;
grant all on pieceful.admin_audit_log to service_role;

-- Login attempts and revoked sessions do not need to live forever.
create or replace function pieceful.prune_security_records()
returns table(deleted_sessions bigint, deleted_attempts bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  sessions_count bigint;
  attempts_count bigint;
begin
  delete from pieceful.admin_sessions
  where expires_at < now() - interval '30 days'
     or revoked_at < now() - interval '30 days';
  get diagnostics sessions_count = row_count;

  delete from pieceful.admin_login_attempts
  where window_started_at < now() - interval '7 days'
    and coalesce(blocked_until, window_started_at) < now() - interval '7 days';
  get diagnostics attempts_count = row_count;

  return query select sessions_count, attempts_count;
end;
$$;

revoke all on function pieceful.prune_security_records() from public, anon, authenticated;
grant execute on function pieceful.prune_security_records() to service_role;
