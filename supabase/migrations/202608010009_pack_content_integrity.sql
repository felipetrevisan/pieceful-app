-- Give paid pack clients a tamper-evident digest for every downloadable image.
alter table pieceful.pack_images
  add column if not exists content_sha256 text;

alter table pieceful.pack_images
  drop constraint if exists pack_images_content_sha256_format;

alter table pieceful.pack_images
  add constraint pack_images_content_sha256_format
  check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$');

comment on column pieceful.pack_images.content_sha256 is
  'SHA-256 of the canonical downloadable WebP bytes; required for new uploads.';

-- Legacy objects cannot be hashed safely from SQL. Require a reviewed Studio
-- re-upload before their packs become downloadable again.
update pieceful.image_packs pack
set is_published = false, updated_at = now()
where exists (
  select 1 from pieceful.pack_images image
  where image.pack_id = pack.id and image.content_sha256 is null
);

alter table pieceful.image_packs
  drop constraint if exists image_packs_minimum_version_format;

alter table pieceful.image_packs
  add constraint image_packs_minimum_version_format
  check (
    minimum_app_version is null
    or minimum_app_version ~ '^[0-9]+\.[0-9]+\.[0-9]+(?:[-+].*)?$'
  );
