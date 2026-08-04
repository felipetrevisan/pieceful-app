-- Restrict profile discovery and route puzzle mutations through validated RPCs.

-- New tables must start private. Explicit grants are added only after RLS and
-- the intended policies exist.
alter default privileges in schema pieceful
  revoke select, insert, update, delete on tables from authenticated;

drop policy if exists "Authenticated players can view profiles" on pieceful.profiles;
drop policy if exists "Players read visible profiles" on pieceful.profiles;
create policy "Players read visible profiles"
on pieceful.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from pieceful.friendships friendship
    where friendship.status = 'accepted'
      and auth.uid() in (friendship.requester_id, friendship.addressee_id)
      and id in (friendship.requester_id, friendship.addressee_id)
  )
);

revoke select on pieceful.profiles from authenticated;
grant select (id, display_name, avatar_url, bio, xp, last_seen_at, created_at, updated_at)
  on pieceful.profiles to authenticated;

create or replace function pieceful.my_profile()
returns table(
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  xp integer,
  friend_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.display_name, profile.avatar_url, profile.bio,
    profile.xp, profile.friend_code
  from pieceful.profiles profile
  where profile.id = auth.uid();
$$;

create table if not exists pieceful.user_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  primary key (user_id, action)
);

alter table pieceful.user_rate_limits enable row level security;
revoke all on pieceful.user_rate_limits from public, anon, authenticated;
grant all on pieceful.user_rate_limits to service_role;

create or replace function pieceful.enforce_user_rate_limit(
  action_name text,
  maximum_attempts integer,
  window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_attempts integer;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if maximum_attempts < 1 or window_seconds < 1 then raise exception 'invalid_rate_limit'; end if;

  insert into pieceful.user_rate_limits as rate_limit (
    user_id, action, attempts, window_started_at
  ) values (current_user_id, action_name, 1, now())
  on conflict (user_id, action) do update set
    attempts = case
      when rate_limit.window_started_at <= now() - make_interval(secs => window_seconds)
        then 1
      else rate_limit.attempts + 1
    end,
    window_started_at = case
      when rate_limit.window_started_at <= now() - make_interval(secs => window_seconds)
        then now()
      else rate_limit.window_started_at
    end
  returning attempts into next_attempts;

  if next_attempts > maximum_attempts then raise exception 'rate_limit_exceeded'; end if;
end;
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := trim(search_text);
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if char_length(normalized) not between 3 and 40 then raise exception 'invalid_search'; end if;
  perform pieceful.enforce_user_rate_limit('player_search', 30, 60);

  return query
  select
    profile.id,
    profile.display_name,
    profile.avatar_url,
    profile.xp,
    profile.last_seen_at > now() - interval '5 minutes',
    case when profile.friend_code = upper(normalized) then profile.friend_code else null end,
    relationship.status,
    case
      when relationship.requester_id = auth.uid() then 'outgoing'
      when relationship.addressee_id = auth.uid() then 'incoming'
      else null
    end
  from pieceful.profiles profile
  left join lateral (
    select friendship.requester_id, friendship.addressee_id, friendship.status
    from pieceful.friendships friendship
    where (friendship.requester_id = auth.uid() and friendship.addressee_id = profile.id)
       or (friendship.addressee_id = auth.uid() and friendship.requester_id = profile.id)
    order by friendship.updated_at desc
    limit 1
  ) relationship on true
  where profile.id <> auth.uid()
    and (
      profile.display_name ilike '%' || normalized || '%'
      or profile.friend_code = upper(normalized)
    )
    and coalesce(relationship.status, '') <> 'blocked'
  order by
    (profile.friend_code = upper(normalized)) desc,
    profile.xp desc
  limit 20;
end;
$$;

revoke all on function pieceful.my_profile() from public, anon;
revoke all on function pieceful.enforce_user_rate_limit(text, integer, integer)
  from public, anon, authenticated;
revoke all on function pieceful.search_players(text) from public, anon;
grant execute on function pieceful.my_profile() to authenticated;
grant execute on function pieceful.search_players(text) to authenticated;

-- Puzzle writes are accepted only through the RPC below. The payload is
-- bounded and structurally checked before it reaches the table.
drop policy if exists "Players manage their puzzles" on pieceful.puzzles;
drop policy if exists "Players read their puzzles" on pieceful.puzzles;
create policy "Players read their puzzles"
on pieceful.puzzles for select to authenticated
using (auth.uid() = user_id);

revoke insert, update, delete on pieceful.puzzles from authenticated;
grant select on pieceful.puzzles to authenticated;

alter table pieceful.puzzles
  add column if not exists earned_xp integer not null default 0 check (earned_xp >= 0),
  add column if not exists placed_count integer not null default 0 check (placed_count between 0 and 1000),
  add column if not exists is_completed boolean not null default false,
  add column if not exists completed_without_hints boolean not null default false;

create table if not exists pieceful.player_progress_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  placed_count integer not null default 0 check (placed_count >= 0),
  no_hints_count integer not null default 0 check (no_hints_count >= 0),
  updated_at timestamptz not null default now()
);

alter table pieceful.player_progress_stats enable row level security;
revoke all on pieceful.player_progress_stats from public, anon, authenticated;
grant all on pieceful.player_progress_stats to service_role;

create or replace function pieceful.placed_piece_count(session_payload jsonb, total_pieces integer)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (
    select least(
    greatest(0, total_pieces),
    count(*) filter (where piece ->> 'isPlaced' = 'true')
    )::integer
    from jsonb_array_elements(
      case when jsonb_typeof(session_payload -> 'pieces') = 'array'
        then session_payload -> 'pieces'
        else '[]'::jsonb
      end
    ) piece
  );
exception when others then
  return 0;
end;
$$;

create or replace function pieceful.puzzle_total_pieces(configuration_payload jsonb)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  if configuration_payload ->> 'totalPieces' !~ '^[0-9]+$' then return 6; end if;
  return greatest(6, least(1000, (configuration_payload ->> 'totalPieces')::integer));
exception when others then
  return 6;
end;
$$;

drop trigger if exists refresh_pieceful_progress on pieceful.puzzles;

with base as (
  select
    puzzle.id,
    puzzle.configuration,
    puzzle.session,
    pieceful.puzzle_total_pieces(puzzle.configuration) as total_pieces,
    pieceful.placed_piece_count(
      puzzle.session,
      pieceful.puzzle_total_pieces(puzzle.configuration)
    ) as placed,
    coalesce(
      puzzle.completed_at,
      nullif(puzzle.session ->> 'completedAt', '')::timestamptz
    ) as completion_at
  from pieceful.puzzles puzzle
), metrics as (
  select
    base.*,
    base.completion_at is not null and base.placed = base.total_pieces as completed
  from base
)
update pieceful.puzzles puzzle
set
  placed_count = metrics.placed,
  is_completed = metrics.completed,
  completed_without_hints = metrics.completed
    and coalesce((puzzle.session ->> 'hintsUsed')::integer, 0) = 0,
  earned_xp = pieceful.puzzle_xp(
    puzzle.configuration,
    puzzle.session,
    case when metrics.completed then metrics.completion_at else null end
  )
from metrics
where metrics.id = puzzle.id;

insert into pieceful.player_progress_stats (
  user_id, total_xp, completed_count, placed_count, no_hints_count, updated_at
)
select
  profile.id,
  coalesce(sum(puzzle.earned_xp), 0)::integer,
  count(puzzle.id) filter (where puzzle.is_completed)::integer,
  coalesce(sum(puzzle.placed_count), 0)::integer,
  count(puzzle.id) filter (where puzzle.completed_without_hints)::integer,
  now()
from pieceful.profiles profile
left join pieceful.puzzles puzzle on puzzle.user_id = profile.id
group by profile.id
on conflict (user_id) do update set
  total_xp = excluded.total_xp,
  completed_count = excluded.completed_count,
  placed_count = excluded.placed_count,
  no_hints_count = excluded.no_hints_count,
  updated_at = now();

create or replace function pieceful.refresh_progress_rewards(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stats pieceful.player_progress_stats%rowtype;
begin
  select * into stats
  from pieceful.player_progress_stats
  where user_id = target_user_id;
  if not found then return; end if;

  update pieceful.profiles
  set xp = stats.total_xp, updated_at = now()
  where id = target_user_id;

  insert into pieceful.user_achievements (user_id, key, progress, unlocked, unlocked_at, updated_at)
  values
    (target_user_id, 'first_puzzle', case when stats.completed_count >= 1 then 100 else 0 end,
      stats.completed_count >= 1, case when stats.completed_count >= 1 then now() else null end, now()),
    (target_user_id, 'no_hints', case when stats.no_hints_count >= 1 then 100 else 0 end,
      stats.no_hints_count >= 1, case when stats.no_hints_count >= 1 then now() else null end, now()),
    (target_user_id, 'pieces_250', least(100, stats.placed_count / 2.5),
      stats.placed_count >= 250, case when stats.placed_count >= 250 then now() else null end, now()),
    (target_user_id, 'puzzles_10', least(100, stats.completed_count * 10),
      stats.completed_count >= 10, case when stats.completed_count >= 10 then now() else null end, now())
  on conflict (user_id, key) do update set
    progress = excluded.progress,
    unlocked = pieceful.user_achievements.unlocked or excluded.unlocked,
    unlocked_at = coalesce(pieceful.user_achievements.unlocked_at, excluded.unlocked_at),
    updated_at = now();
end;
$$;

create or replace function pieceful.apply_player_progress_delta(
  target_user_id uuid,
  xp_delta integer,
  completed_delta integer,
  placed_delta integer,
  no_hints_delta integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from pieceful.profiles where id = target_user_id) then return; end if;

  insert into pieceful.player_progress_stats (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  update pieceful.player_progress_stats
  set
    total_xp = greatest(0, total_xp + xp_delta),
    completed_count = greatest(0, completed_count + completed_delta),
    placed_count = greatest(0, placed_count + placed_delta),
    no_hints_count = greatest(0, no_hints_count + no_hints_delta),
    updated_at = now()
  where user_id = target_user_id;

  perform pieceful.refresh_progress_rewards(target_user_id);
end;
$$;

create or replace function pieceful.apply_puzzle_progress_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pieceful.apply_player_progress_delta(
      new.user_id, new.earned_xp, new.is_completed::integer,
      new.placed_count, new.completed_without_hints::integer
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform pieceful.apply_player_progress_delta(
      old.user_id, -old.earned_xp, -old.is_completed::integer,
      -old.placed_count, -old.completed_without_hints::integer
    );
    return old;
  end if;

  if old.user_id is distinct from new.user_id then
    perform pieceful.apply_player_progress_delta(
      old.user_id, -old.earned_xp, -old.is_completed::integer,
      -old.placed_count, -old.completed_without_hints::integer
    );
    perform pieceful.apply_player_progress_delta(
      new.user_id, new.earned_xp, new.is_completed::integer,
      new.placed_count, new.completed_without_hints::integer
    );
  else
    perform pieceful.apply_player_progress_delta(
      new.user_id,
      new.earned_xp - old.earned_xp,
      new.is_completed::integer - old.is_completed::integer,
      new.placed_count - old.placed_count,
      new.completed_without_hints::integer - old.completed_without_hints::integer
    );
  end if;
  return new;
end;
$$;

create trigger apply_pieceful_progress_delta
after insert or update or delete on pieceful.puzzles
for each row execute function pieceful.apply_puzzle_progress_delta();

do $$
declare player record;
begin
  for player in select user_id from pieceful.player_progress_stats loop
    perform pieceful.refresh_progress_rewards(player.user_id);
  end loop;
end $$;

create or replace function pieceful.sync_my_puzzles(payloads jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  payload jsonb;
  configuration_payload jsonb;
  session_payload jsonb;
  piece_payload jsonb;
  puzzle_id text;
  puzzle_name text;
  puzzle_difficulty text;
  image_path text;
  rows_count integer;
  columns_count integer;
  total_pieces integer;
  pieces_count integer;
  placed_pieces integer;
  piece_row integer;
  piece_column integer;
  hints_used integer;
  elapsed_time numeric;
  completion_time timestamptz;
  creation_time timestamptz;
  update_time timestamptz;
  completed boolean;
  completed_no_hints boolean;
  processed integer := 0;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if jsonb_typeof(payloads) <> 'array'
    or jsonb_array_length(payloads) not between 1 and 25
    or octet_length(payloads::text) > 12 * 1024 * 1024
  then
    raise exception 'invalid_puzzle_batch';
  end if;
  perform pieceful.enforce_user_rate_limit('puzzle_sync', 120, 60);

  for payload in select value from jsonb_array_elements(payloads)
  loop
    if jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 8 * 1024 * 1024 then
      raise exception 'invalid_puzzle_payload';
    end if;

    puzzle_id := payload ->> 'id';
    puzzle_name := trim(payload ->> 'name');
    puzzle_difficulty := payload ->> 'difficulty';
    configuration_payload := payload -> 'configuration';
    session_payload := payload -> 'session';
    image_path := nullif(payload ->> 'image_uri', '');

    if puzzle_id is null or char_length(puzzle_id) not between 8 and 120
      or puzzle_id !~ '^[A-Za-z0-9][A-Za-z0-9._-]+$'
      or puzzle_name is null or char_length(puzzle_name) not between 1 and 100
      or puzzle_difficulty not in (
        'beginner', 'easy', 'normal', 'medium', 'hard',
        'advanced', 'master', 'legendary', 'custom'
      )
      or jsonb_typeof(configuration_payload) <> 'object'
      or jsonb_typeof(session_payload) <> 'object'
      or octet_length(configuration_payload::text) > 8192
      or octet_length(session_payload::text) > 6 * 1024 * 1024
    then raise exception 'invalid_puzzle_payload'; end if;

    rows_count := (configuration_payload ->> 'rows')::integer;
    columns_count := (configuration_payload ->> 'columns')::integer;
    total_pieces := (configuration_payload ->> 'totalPieces')::integer;
    if rows_count is null or columns_count is null or total_pieces is null
      or rows_count not between 2 and 40 or columns_count not between 2 and 40
      or rows_count * columns_count <> total_pieces
      or total_pieces not between 6 and 1000
    then raise exception 'invalid_puzzle_configuration'; end if;

    if jsonb_typeof(session_payload -> 'pieces') <> 'array'
      or jsonb_array_length(session_payload -> 'pieces') <> total_pieces
      or session_payload ->> 'puzzleId' is distinct from puzzle_id
    then raise exception 'invalid_puzzle_session'; end if;

    hints_used := (session_payload ->> 'hintsUsed')::integer;
    elapsed_time := (session_payload ->> 'elapsedTime')::numeric;
    if hints_used is null or elapsed_time is null
      or hints_used not between 0 and 100000
      or elapsed_time < 0 or elapsed_time > 2592000
    then raise exception 'invalid_puzzle_session'; end if;

    pieces_count := 0;
    placed_pieces := 0;
    for piece_payload in select value from jsonb_array_elements(session_payload -> 'pieces')
    loop
      if jsonb_typeof(piece_payload) <> 'object'
        or char_length(coalesce(piece_payload ->> 'id', '')) not between 1 and 80
        or jsonb_typeof(piece_payload -> 'isPlaced') <> 'boolean'
      then raise exception 'invalid_puzzle_piece'; end if;
      piece_row := (piece_payload ->> 'row')::integer;
      piece_column := (piece_payload ->> 'column')::integer;
      if piece_row is null or piece_column is null
        or piece_row < 0 or piece_row >= rows_count
        or piece_column < 0 or piece_column >= columns_count
      then raise exception 'invalid_puzzle_piece'; end if;
      pieces_count := pieces_count + 1;
      if (piece_payload ->> 'isPlaced')::boolean then placed_pieces := placed_pieces + 1; end if;
    end loop;

    if pieces_count <> total_pieces
      or (
        select count(distinct value ->> 'id')
        from jsonb_array_elements(session_payload -> 'pieces')
      ) <> total_pieces
      or (
        select count(distinct ((value ->> 'row')::integer, (value ->> 'column')::integer))
        from jsonb_array_elements(session_payload -> 'pieces')
      ) <> total_pieces
    then raise exception 'duplicate_puzzle_piece'; end if;

    completion_time := nullif(session_payload ->> 'completedAt', '')::timestamptz;
    completed := completion_time is not null and placed_pieces = total_pieces;
    if completion_time is not null and (
      not completed or completion_time > now() + interval '5 minutes'
    ) then raise exception 'invalid_puzzle_completion'; end if;
    completed_no_hints := completed and hints_used = 0;

    creation_time := coalesce(nullif(payload ->> 'created_at', '')::timestamptz, now());
    if creation_time > now() + interval '5 minutes' or creation_time < now() - interval '10 years' then
      raise exception 'invalid_puzzle_creation_time';
    end if;
    update_time := coalesce(nullif(payload ->> 'updated_at', '')::timestamptz, creation_time);
    if update_time > now() + interval '5 minutes' or update_time < creation_time then
      raise exception 'invalid_puzzle_update_time';
    end if;

    if image_path is not null and (
      char_length(image_path) > 300
      or image_path not like current_user_id::text || '/%'
      or image_path like '%..%'
    ) then raise exception 'invalid_puzzle_image_path'; end if;

    if not exists (select 1 from pieceful.puzzles where id = puzzle_id)
      and (select count(*) from pieceful.puzzles where user_id = current_user_id) >= 250
    then raise exception 'puzzle_quota_exceeded'; end if;

    insert into pieceful.puzzles as existing (
      id, user_id, name, difficulty, configuration, session, image_uri,
      completed_at, created_at, updated_at, earned_xp, placed_count,
      is_completed, completed_without_hints
    ) values (
      puzzle_id, current_user_id, puzzle_name, to_jsonb(puzzle_difficulty),
      configuration_payload, session_payload, image_path,
      case when completed then completion_time else null end,
      creation_time, now(),
      pieceful.puzzle_xp(
        configuration_payload,
        session_payload,
        case when completed then completion_time else null end
      ),
      placed_pieces, completed, completed_no_hints
    )
    on conflict (id) do update set
      name = excluded.name,
      difficulty = excluded.difficulty,
      configuration = excluded.configuration,
      session = excluded.session,
      image_uri = excluded.image_uri,
      completed_at = excluded.completed_at,
      updated_at = now(),
      earned_xp = excluded.earned_xp,
      placed_count = excluded.placed_count,
      is_completed = excluded.is_completed,
      completed_without_hints = excluded.completed_without_hints
    where existing.user_id = current_user_id
      and existing.updated_at <= update_time;

    if not found then
      if exists (
        select 1 from pieceful.puzzles
        where id = puzzle_id and user_id = current_user_id
      ) then continue; end if;
      raise exception 'puzzle_owner_mismatch';
    end if;
    processed := processed + 1;
  end loop;
  return processed;
exception
  when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
    raise exception 'invalid_puzzle_payload';
end;
$$;

create or replace function pieceful.delete_my_puzzles(puzzle_ids text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if coalesce(array_length(puzzle_ids, 1), 0) not between 1 and 50 then
    raise exception 'invalid_puzzle_batch';
  end if;
  perform pieceful.enforce_user_rate_limit('puzzle_delete', 30, 60);
  delete from pieceful.puzzles
  where user_id = auth.uid() and id = any(puzzle_ids);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function pieceful.placed_piece_count(jsonb, integer)
  from public, anon, authenticated;
revoke all on function pieceful.puzzle_total_pieces(jsonb)
  from public, anon, authenticated;
revoke all on function pieceful.refresh_progress_rewards(uuid)
  from public, anon, authenticated;
revoke all on function pieceful.apply_player_progress_delta(uuid, integer, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function pieceful.apply_puzzle_progress_delta()
  from public, anon, authenticated;
revoke all on function pieceful.sync_my_puzzles(jsonb) from public, anon;
revoke all on function pieceful.delete_my_puzzles(text[]) from public, anon;
grant execute on function pieceful.sync_my_puzzles(jsonb) to authenticated;
grant execute on function pieceful.delete_my_puzzles(text[]) to authenticated;
