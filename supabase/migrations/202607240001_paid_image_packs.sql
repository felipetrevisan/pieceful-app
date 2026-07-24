-- Adds remotely managed paid packs. Prices are owned by Google Play/App Store;
-- this table stores only the matching one-time product identifier.
alter table pieceful.image_packs
  add column if not exists store_product_id text;

create unique index if not exists image_packs_store_product_unique
  on pieceful.image_packs(store_product_id)
  where store_product_id is not null;

alter table pieceful.image_packs
  drop constraint if exists image_packs_paid_product_check;
alter table pieceful.image_packs
  add constraint image_packs_paid_product_check
  check (is_free or nullif(trim(store_product_id), '') is not null) not valid;

drop policy if exists "Anyone reads published free image packs" on pieceful.image_packs;
create policy "Anyone reads published image pack catalog"
on pieceful.image_packs for select to anon, authenticated
using (
  is_published
  and (available_from is null or available_from <= now())
);

drop policy if exists "Anyone reads images from published free packs" on pieceful.pack_images;
create policy "Anyone reads images from published packs"
on pieceful.pack_images for select to anon, authenticated
using (
  is_published
  and exists (
    select 1 from pieceful.image_packs pack
    where pack.id = pack_id
      and pack.is_published
      and (pack.available_from is null or pack.available_from <= now())
  )
);

