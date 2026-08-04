-- Keep progression and social relationship state authoritative on the server.
-- Puzzle rows remain user-owned, but XP and achievements are derived from them
-- instead of accepting arbitrary values from the mobile client.

create or replace function pieceful.puzzle_xp(configuration jsonb, session jsonb, completed_at timestamptz)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  total_pieces integer := greatest(6, least(1000, case
    when configuration ->> 'totalPieces' ~ '^[0-9]+$'
      then (configuration ->> 'totalPieces')::integer
    else 6
  end));
  placed_pieces integer := 0;
  completed boolean := completed_at is not null or nullif(session ->> 'completedAt', '') is not null;
  earned numeric := 0;
begin
  if jsonb_typeof(session -> 'pieces') = 'array' then
    select least(total_pieces, count(*))::integer
    into placed_pieces
    from jsonb_array_elements(session -> 'pieces') piece
    where piece ->> 'isPlaced' = 'true';
  end if;

  earned := placed_pieces;
  if completed then
    earned := earned
      + 500
      + least(250, greatest(0, total_pieces - 48)::numeric / 4)
      + case when configuration ->> 'rotationEnabled' = 'true' then 100 else 0 end
      + case
          when configuration ->> 'hintsEnabled' is distinct from 'false'
            and case when session ->> 'hintsUsed' ~ '^[0-9]+$'
              then (session ->> 'hintsUsed')::integer = 0 else true end then 100
          else 0
        end;
  end if;
  return round(earned)::integer;
exception
  when invalid_text_representation then
    return 0;
end;
$$;

create or replace function pieceful.refresh_player_progress(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_xp integer;
  completed_count integer;
  placed_count integer;
  no_hints_completed boolean;
begin
  select
    coalesce(sum(pieceful.puzzle_xp(p.configuration, p.session, p.completed_at)), 0)::integer,
    count(*) filter (where p.completed_at is not null or nullif(p.session ->> 'completedAt', '') is not null)::integer,
    coalesce(sum(
      case when jsonb_typeof(p.session -> 'pieces') = 'array' then (
        select least(
          greatest(6, least(1000, case
            when p.configuration ->> 'totalPieces' ~ '^[0-9]+$'
              then (p.configuration ->> 'totalPieces')::integer
            else 6
          end)),
          count(*)
        ) from jsonb_array_elements(p.session -> 'pieces') piece
          where piece ->> 'isPlaced' = 'true'
      ) else 0 end
    ), 0)::integer,
    coalesce(bool_or(
      (p.completed_at is not null or nullif(p.session ->> 'completedAt', '') is not null)
      and case when p.session ->> 'hintsUsed' ~ '^[0-9]+$'
        then (p.session ->> 'hintsUsed')::integer = 0 else false end
    ), false)
  into total_xp, completed_count, placed_count, no_hints_completed
  from pieceful.puzzles p
  where p.user_id = target_user_id;

  update pieceful.profiles
  set xp = total_xp, updated_at = now()
  where id = target_user_id;

  insert into pieceful.user_achievements (user_id, key, progress, unlocked, unlocked_at, updated_at)
  values
    (target_user_id, 'first_puzzle', case when completed_count >= 1 then 100 else 0 end,
      completed_count >= 1, case when completed_count >= 1 then now() else null end, now()),
    (target_user_id, 'no_hints', case when no_hints_completed then 100 else 0 end,
      no_hints_completed, case when no_hints_completed then now() else null end, now()),
    (target_user_id, 'pieces_250', least(100, placed_count / 2.5),
      placed_count >= 250, case when placed_count >= 250 then now() else null end, now()),
    (target_user_id, 'puzzles_10', least(100, completed_count * 10),
      completed_count >= 10, case when completed_count >= 10 then now() else null end, now())
  on conflict (user_id, key) do update set
    progress = excluded.progress,
    unlocked = pieceful.user_achievements.unlocked or excluded.unlocked,
    unlocked_at = coalesce(pieceful.user_achievements.unlocked_at, excluded.unlocked_at),
    updated_at = now();
end;
$$;

create or replace function pieceful.refresh_puzzle_owner_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform pieceful.refresh_player_progress(old.user_id);
    return old;
  end if;
  perform pieceful.refresh_player_progress(new.user_id);
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform pieceful.refresh_player_progress(old.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists refresh_pieceful_progress on pieceful.puzzles;
create trigger refresh_pieceful_progress
after insert or update or delete on pieceful.puzzles
for each row execute function pieceful.refresh_puzzle_owner_progress();

create or replace function pieceful.update_my_profile(
  next_display_name text,
  next_avatar_url text,
  next_bio text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if next_display_name is null or char_length(trim(next_display_name)) not between 1 and 40 then
    raise exception 'invalid_display_name';
  end if;
  if char_length(coalesce(next_bio, '')) > 120 then raise exception 'invalid_bio'; end if;

  update pieceful.profiles
  set display_name = trim(next_display_name), avatar_url = next_avatar_url,
      bio = coalesce(next_bio, ''), updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function pieceful.touch_my_profile()
returns void
language sql
security definer
set search_path = ''
as $$
  update pieceful.profiles set last_seen_at = now() where id = auth.uid();
$$;

-- Direct writes bypass the domain rules above. Keep reads available and route
-- all mutations through the deliberately narrow functions.
revoke insert, update, delete on pieceful.profiles from authenticated;
revoke insert, update, delete on pieceful.user_achievements from authenticated;
revoke insert, update, delete on pieceful.friendships from authenticated;

revoke all on function pieceful.refresh_player_progress(uuid) from public, anon, authenticated;
revoke all on function pieceful.puzzle_xp(jsonb, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function pieceful.refresh_puzzle_owner_progress() from public, anon, authenticated;
revoke all on function pieceful.update_my_profile(text, text, text) from public, anon;
revoke all on function pieceful.touch_my_profile() from public, anon;
grant execute on function pieceful.update_my_profile(text, text, text) to authenticated;
grant execute on function pieceful.touch_my_profile() to authenticated;

revoke all on function pieceful.send_friend_request(uuid) from public, anon;
revoke all on function pieceful.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function pieceful.remove_friend(uuid) from public, anon;
revoke all on function pieceful.block_player(uuid) from public, anon;
revoke all on function pieceful.friend_leaderboard() from public, anon;
revoke all on function pieceful.friend_requests() from public, anon;
revoke all on function pieceful.search_players(text) from public, anon;
revoke all on function pieceful.my_social_identity() from public, anon;

-- Backfill authoritative values when this migration is deployed.
do $$
declare player record;
begin
  for player in select id from pieceful.profiles loop
    perform pieceful.refresh_player_progress(player.id);
  end loop;
end $$;
