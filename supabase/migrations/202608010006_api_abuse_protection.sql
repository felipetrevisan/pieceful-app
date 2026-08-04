-- Durable rate limiting shared by every API instance.
create table if not exists pieceful.api_rate_limits (
  fingerprint text not null,
  route text not null,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  primary key (fingerprint, route)
);

alter table pieceful.api_rate_limits enable row level security;
revoke all on pieceful.api_rate_limits from public, anon, authenticated;
grant all on pieceful.api_rate_limits to service_role;

create or replace function pieceful.consume_api_rate_limit(
  request_fingerprint text,
  route_name text,
  maximum_attempts integer,
  window_seconds integer,
  block_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_attempts integer;
  next_blocked_until timestamptz;
begin
  if char_length(request_fingerprint) <> 64
    or char_length(route_name) not between 1 and 100
    or maximum_attempts not between 1 and 10000
    or window_seconds not between 1 and 86400
    or block_seconds not between 1 and 86400
  then return false; end if;

  insert into pieceful.api_rate_limits as rate_limit (
    fingerprint, route, attempts, window_started_at, blocked_until
  ) values (request_fingerprint, route_name, 1, now(), null)
  on conflict (fingerprint, route) do update set
    attempts = case
      when rate_limit.window_started_at <= now() - make_interval(secs => window_seconds)
        then 1
      else rate_limit.attempts + 1
    end,
    window_started_at = case
      when rate_limit.window_started_at <= now() - make_interval(secs => window_seconds)
        then now()
      else rate_limit.window_started_at
    end,
    blocked_until = case
      when rate_limit.blocked_until > now() then rate_limit.blocked_until
      when rate_limit.window_started_at > now() - make_interval(secs => window_seconds)
        and rate_limit.attempts + 1 > maximum_attempts
        then now() + make_interval(secs => block_seconds)
      else null
    end
  returning attempts, blocked_until into next_attempts, next_blocked_until;

  return next_attempts <= maximum_attempts
    and (next_blocked_until is null or next_blocked_until <= now());
end;
$$;

revoke all on function pieceful.consume_api_rate_limit(text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function pieceful.consume_api_rate_limit(text, text, integer, integer, integer)
  to service_role;

create index if not exists api_rate_limits_cleanup_idx
  on pieceful.api_rate_limits(window_started_at);

create or replace function pieceful.prune_api_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count bigint;
begin
  delete from pieceful.api_rate_limits
  where window_started_at < now() - interval '7 days'
    and coalesce(blocked_until, window_started_at) < now() - interval '7 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function pieceful.prune_api_rate_limits() from public, anon, authenticated;
grant execute on function pieceful.prune_api_rate_limits() to service_role;
