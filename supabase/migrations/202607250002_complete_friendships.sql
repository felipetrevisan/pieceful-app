create extension if not exists "pgcrypto";

alter table pieceful.profiles
  add column if not exists friend_code text;

update pieceful.profiles
set friend_code = upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8))
where friend_code is null;

alter table pieceful.profiles
  alter column friend_code set default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
alter table pieceful.profiles
  alter column friend_code set not null;

create unique index if not exists profiles_friend_code_unique
  on pieceful.profiles(friend_code);

-- A friendship is a single relationship regardless of who sent the request.
-- This also prevents two simultaneous requests from creating mirrored rows.
with ranked_friendships as (
  select
    ctid,
    row_number() over (
      partition by least(requester_id, addressee_id), greatest(requester_id, addressee_id)
      order by
        case status when 'blocked' then 1 when 'accepted' then 2 else 3 end,
        updated_at desc
    ) as duplicate_rank
  from pieceful.friendships
)
delete from pieceful.friendships friendship
using ranked_friendships ranked
where friendship.ctid = ranked.ctid
  and ranked.duplicate_rank > 1;

create unique index if not exists friendships_unique_pair
  on pieceful.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create or replace function pieceful.my_social_identity()
returns table(friend_code text)
language sql
security definer
set search_path = pieceful
as $$
  select p.friend_code from pieceful.profiles p where p.id = auth.uid();
$$;

create or replace function pieceful.search_players(search_text text)
returns table(
  id uuid,
  display_name text,
  avatar_url text,
  xp integer,
  online boolean,
  friend_code text,
  relationship_status text,
  relationship_direction text
)
language sql
security definer
set search_path = pieceful, auth
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.xp,
    p.last_seen_at > now() - interval '5 minutes',
    p.friend_code,
    relationship.status,
    case
      when relationship.requester_id = auth.uid() then 'outgoing'
      when relationship.addressee_id = auth.uid() then 'incoming'
      else null
    end
  from pieceful.profiles p
  join auth.users account on account.id = p.id
  left join lateral (
    select f.requester_id, f.addressee_id, f.status
    from pieceful.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = p.id)
       or (f.addressee_id = auth.uid() and f.requester_id = p.id)
    order by f.updated_at desc
    limit 1
  ) relationship on true
  where p.id <> auth.uid()
    and length(trim(search_text)) >= 3
    and (
      p.display_name ilike '%' || trim(search_text) || '%'
      or p.friend_code = upper(trim(search_text))
      or lower(account.email) = lower(trim(search_text))
    )
    and coalesce(relationship.status, '') <> 'blocked'
  order by
    (p.friend_code = upper(trim(search_text))) desc,
    (lower(account.email) = lower(trim(search_text))) desc,
    p.xp desc
  limit 20;
$$;

create or replace function pieceful.friend_requests()
returns table(
  id uuid,
  display_name text,
  avatar_url text,
  xp integer,
  online boolean,
  direction text,
  created_at timestamptz
)
language sql
security definer
set search_path = pieceful
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.xp,
    p.last_seen_at > now() - interval '5 minutes',
    case when f.addressee_id = auth.uid() then 'incoming' else 'outgoing' end,
    f.created_at
  from pieceful.friendships f
  join pieceful.profiles p
    on p.id = case when f.addressee_id = auth.uid() then f.requester_id else f.addressee_id end
  where f.status = 'pending'
    and auth.uid() in (f.requester_id, f.addressee_id)
  order by f.created_at desc;
$$;

create or replace function pieceful.send_friend_request(target_id uuid)
returns text
language plpgsql
security definer
set search_path = pieceful
as $$
declare
  existing pieceful.friendships%rowtype;
begin
  if auth.uid() is null or target_id is null or target_id = auth.uid() then
    raise exception 'invalid_friend_target';
  end if;
  if not exists (select 1 from pieceful.profiles where id = target_id) then
    raise exception 'player_not_found';
  end if;

  select * into existing
  from pieceful.friendships
  where (requester_id = auth.uid() and addressee_id = target_id)
     or (requester_id = target_id and addressee_id = auth.uid())
  order by updated_at desc
  limit 1;

  if existing.status = 'blocked' then raise exception 'friendship_blocked'; end if;
  if existing.status = 'accepted' then return 'accepted'; end if;
  if existing.status = 'pending' and existing.addressee_id = auth.uid() then
    update pieceful.friendships
    set status = 'accepted', updated_at = now()
    where requester_id = existing.requester_id and addressee_id = existing.addressee_id;
    return 'accepted';
  end if;
  if existing.status = 'pending' then return 'pending'; end if;

  insert into pieceful.friendships(requester_id, addressee_id, status)
  values (auth.uid(), target_id, 'pending');
  return 'pending';
end;
$$;

create or replace function pieceful.respond_friend_request(requester uuid, accept_request boolean)
returns boolean
language plpgsql
security definer
set search_path = pieceful
as $$
begin
  if accept_request then
    update pieceful.friendships set status = 'accepted', updated_at = now()
    where requester_id = requester and addressee_id = auth.uid() and status = 'pending';
  else
    delete from pieceful.friendships
    where requester_id = requester and addressee_id = auth.uid() and status = 'pending';
  end if;
  return found;
end;
$$;

create or replace function pieceful.remove_friend(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pieceful
as $$
begin
  delete from pieceful.friendships
  where ((requester_id = auth.uid() and addressee_id = target_id)
      or (requester_id = target_id and addressee_id = auth.uid()))
    and status <> 'blocked';
  return found;
end;
$$;

create or replace function pieceful.block_player(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pieceful
as $$
begin
  if target_id is null or target_id = auth.uid() then return false; end if;
  delete from pieceful.friendships
  where (requester_id = auth.uid() and addressee_id = target_id)
     or (requester_id = target_id and addressee_id = auth.uid());
  insert into pieceful.friendships(requester_id, addressee_id, status)
  values (auth.uid(), target_id, 'blocked');
  return true;
end;
$$;

grant execute on function pieceful.my_social_identity() to authenticated;
grant execute on function pieceful.search_players(text) to authenticated;
grant execute on function pieceful.friend_requests() to authenticated;
grant execute on function pieceful.send_friend_request(uuid) to authenticated;
grant execute on function pieceful.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function pieceful.remove_friend(uuid) to authenticated;
grant execute on function pieceful.block_player(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'pieceful' and tablename = 'friendships'
  ) then alter publication supabase_realtime add table pieceful.friendships; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'pieceful' and tablename = 'profiles'
  ) then alter publication supabase_realtime add table pieceful.profiles; end if;
end $$;
