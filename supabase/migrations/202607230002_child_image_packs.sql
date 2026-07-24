-- Remotely managed image packs. Published free packs are readable without an
-- account so Kids mode can stay local and login-free.
create table if not exists pieceful.image_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_pt text not null,
  title_en text not null,
  description_pt text not null default '',
  description_en text not null default '',
  cover_url text not null,
  audience text not null default 'child' check (audience in ('child', 'teen', 'adult', 'all')),
  is_free boolean not null default true,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  total_bytes bigint not null default 0 check (total_bytes >= 0),
  available_from timestamptz,
  minimum_app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pieceful.pack_images (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references pieceful.image_packs(id) on delete cascade,
  title_pt text not null,
  title_en text not null,
  image_url text not null,
  thumbnail_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes bigint not null default 0 check (bytes >= 0),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists image_packs_catalog_idx
  on pieceful.image_packs(audience, is_published, sort_order);
create index if not exists pack_images_pack_idx
  on pieceful.pack_images(pack_id, is_published, sort_order);

alter table pieceful.image_packs enable row level security;
alter table pieceful.pack_images enable row level security;

create policy "Anyone reads published free image packs"
on pieceful.image_packs for select to anon, authenticated
using (
  is_published
  and is_free
  and (available_from is null or available_from <= now())
);

create policy "Anyone reads images from published free packs"
on pieceful.pack_images for select to anon, authenticated
using (
  is_published
  and exists (
    select 1 from pieceful.image_packs pack
    where pack.id = pack_id
      and pack.is_published
      and pack.is_free
      and (pack.available_from is null or pack.available_from <= now())
  )
);

grant select on pieceful.image_packs, pieceful.pack_images to anon, authenticated;
grant all privileges on pieceful.image_packs, pieceful.pack_images to service_role;

insert into storage.buckets (id, name, public)
values ('image-packs', 'image-packs', true)
on conflict (id) do update set public = true;

create policy "Public image pack downloads"
on storage.objects for select to anon, authenticated
using (bucket_id = 'image-packs');
