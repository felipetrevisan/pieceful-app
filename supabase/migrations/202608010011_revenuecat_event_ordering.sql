-- Apply webhook events atomically, once, and never let an older delivery undo newer state.
alter table pieceful.purchase_entitlements
  add column if not exists last_event_at timestamptz;

create or replace function pieceful.process_revenuecat_event(
  p_event_id text,
  p_event_type text,
  p_app_user_id text,
  p_product_id text,
  p_event_environment text,
  p_payload_hash text,
  p_entitlement_active boolean,
  p_purchased_at timestamptz,
  p_expires_at timestamptz,
  p_event_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare inserted_count integer;
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 300
    or p_event_type is null or char_length(p_event_type) not between 1 and 100
    or p_payload_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_revenuecat_event'; end if;

  insert into pieceful.revenuecat_webhook_events (
    id, event_type, app_user_id, product_id, environment, payload_sha256
  ) values (
    p_event_id, p_event_type, p_app_user_id, p_product_id, p_event_environment, p_payload_hash
  ) on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;

  if p_entitlement_active is not null
    and p_app_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and p_product_id is not null and char_length(p_product_id) between 1 and 200
  then
    insert into pieceful.purchase_entitlements as entitlement (
      user_id, product_id, is_active, purchased_at, expires_at,
      environment, source, updated_at, last_event_at
    ) values (
      p_app_user_id::uuid, p_product_id, p_entitlement_active, p_purchased_at, p_expires_at,
      case when p_event_environment = 'SANDBOX' then 'SANDBOX' else 'PRODUCTION' end,
      'revenuecat', now(), coalesce(p_event_at, now())
    )
    on conflict (user_id, product_id) do update set
      is_active = excluded.is_active,
      purchased_at = coalesce(excluded.purchased_at, entitlement.purchased_at),
      expires_at = excluded.expires_at,
      environment = excluded.environment,
      source = 'revenuecat',
      updated_at = now(),
      last_event_at = excluded.last_event_at
    where entitlement.last_event_at is null
       or entitlement.last_event_at <= excluded.last_event_at;
  end if;

  update pieceful.revenuecat_webhook_events
  set processed_at = now()
  where id = p_event_id;
  return true;
end;
$$;

revoke all on function pieceful.process_revenuecat_event(
  text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function pieceful.process_revenuecat_event(
  text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz
) to service_role;
