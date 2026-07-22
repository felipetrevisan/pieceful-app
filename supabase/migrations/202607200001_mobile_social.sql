create extension if not exists "pgcrypto";
create schema if not exists pieceful;
grant usage on schema pieceful to anon, authenticated, service_role;

create table if not exists pieceful.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player One' check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text not null default 'One piece at a time.' check (char_length(bio) <= 120),
  xp integer not null default 0 check (xp >= 0),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pieceful.puzzles (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  difficulty jsonb not null,
  configuration jsonb not null,
  session jsonb not null,
  image_uri text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists puzzles_user_updated_idx on pieceful.puzzles(user_id, updated_at desc);

create table if not exists pieceful.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists pieceful.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on pieceful.friendships(addressee_id, status);

alter table pieceful.profiles enable row level security;
alter table pieceful.puzzles enable row level security;
alter table pieceful.user_achievements enable row level security;
alter table pieceful.friendships enable row level security;

create policy "Authenticated players can view profiles" on pieceful.profiles for select to authenticated using (true);
create policy "Players update their profile" on pieceful.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Players insert their profile" on pieceful.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Players manage their puzzles" on pieceful.puzzles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Players manage their achievements" on pieceful.user_achievements for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Players view their friendships" on pieceful.friendships for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "Players request friendships" on pieceful.friendships for insert to authenticated with check (auth.uid() = requester_id);
create policy "Players update received friendships" on pieceful.friendships for update to authenticated using (auth.uid() in (requester_id, addressee_id)) with check (auth.uid() in (requester_id, addressee_id));
create policy "Players remove their friendships" on pieceful.friendships for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create or replace function pieceful.friend_leaderboard()
returns table(id uuid, display_name text, avatar_url text, xp integer, online boolean)
language sql
security definer
set search_path = pieceful
as $$
  select p.id, p.display_name, p.avatar_url, p.xp, p.last_seen_at > now() - interval '5 minutes'
  from pieceful.profiles p
  where p.id in (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from pieceful.friendships f
    where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  )
  order by p.xp desc;
$$;
grant execute on function pieceful.friend_leaderboard() to authenticated;

create or replace function pieceful.handle_new_player()
returns trigger
language plpgsql
security definer set search_path = pieceful
as $$
begin
  insert into pieceful.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Player'), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_pieceful on auth.users;
create trigger on_auth_user_created_pieceful after insert on auth.users for each row execute procedure pieceful.handle_new_player();

grant select, insert, update, delete on all tables in schema pieceful to authenticated;
grant all privileges on all tables in schema pieceful to service_role;
alter default privileges in schema pieceful grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema pieceful grant all privileges on tables to service_role;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('puzzle-images', 'puzzle-images', true) on conflict (id) do update set public = true;
create policy "Public avatar access" on storage.objects for select using (bucket_id = 'avatars');
create policy "Players upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Players update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Public puzzle image access" on storage.objects for select using (bucket_id = 'puzzle-images');
create policy "Players upload own puzzle images" on storage.objects for insert to authenticated with check (bucket_id = 'puzzle-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Players update own puzzle images" on storage.objects for update to authenticated using (bucket_id = 'puzzle-images' and (storage.foldername(name))[1] = auth.uid()::text);
