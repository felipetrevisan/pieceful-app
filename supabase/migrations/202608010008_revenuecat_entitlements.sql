-- Server-owned purchase ledger. Clients never write entitlement state.
create table if not exists pieceful.purchase_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (char_length(product_id) between 1 and 200),
  is_active boolean not null default true,
  purchased_at timestamptz,
  expires_at timestamptz,
  environment text check (environment in ('SANDBOX', 'PRODUCTION')),
  source text not null default 'revenuecat' check (source in ('revenuecat', 'reconciliation')),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists purchase_entitlements_active_idx
  on pieceful.purchase_entitlements(user_id, product_id)
  where is_active;

create table if not exists pieceful.revenuecat_webhook_events (
  id text primary key,
  event_type text not null,
  app_user_id text,
  product_id text,
  environment text,
  payload_sha256 text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table pieceful.purchase_entitlements enable row level security;
alter table pieceful.revenuecat_webhook_events enable row level security;
revoke all on pieceful.purchase_entitlements, pieceful.revenuecat_webhook_events
  from public, anon, authenticated;
grant all on pieceful.purchase_entitlements, pieceful.revenuecat_webhook_events to service_role;

create or replace function pieceful.prune_revenuecat_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count bigint;
begin
  delete from pieceful.revenuecat_webhook_events
  where received_at < now() - interval '180 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function pieceful.prune_revenuecat_events() from public, anon, authenticated;
grant execute on function pieceful.prune_revenuecat_events() to service_role;
