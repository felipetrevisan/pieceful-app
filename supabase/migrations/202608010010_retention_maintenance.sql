-- Keep operational security data bounded without touching user-created puzzles.
create or replace function pieceful.run_retention_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_result record;
  rate_limit_count bigint;
  webhook_count bigint;
  audit_count bigint;
  entitlement_count bigint;
begin
  select * into session_result from pieceful.prune_security_records();
  rate_limit_count := pieceful.prune_api_rate_limits();
  webhook_count := pieceful.prune_revenuecat_events();

  delete from pieceful.admin_audit_log where created_at < now() - interval '400 days';
  get diagnostics audit_count = row_count;

  delete from pieceful.purchase_entitlements
  where not is_active and updated_at < now() - interval '400 days';
  get diagnostics entitlement_count = row_count;

  return jsonb_build_object(
    'sessions', session_result.deleted_sessions,
    'loginAttempts', session_result.deleted_attempts,
    'rateLimits', rate_limit_count,
    'webhooks', webhook_count,
    'auditEntries', audit_count,
    'inactiveEntitlements', entitlement_count
  );
end;
$$;

revoke all on function pieceful.run_retention_maintenance() from public, anon, authenticated;
grant execute on function pieceful.run_retention_maintenance() to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'pieceful-retention-maintenance') then
    perform cron.unschedule('pieceful-retention-maintenance');
  end if;
  perform cron.schedule(
    'pieceful-retention-maintenance',
    '23 3 * * *',
    'select pieceful.run_retention_maintenance()'
  );
end;
$$;
