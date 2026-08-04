-- Catalog metadata remains readable, but image files are delivered only as
-- short-lived signed URLs by the Pieceful API after entitlement verification.
update storage.buckets set public = false where id = 'image-packs';

drop policy if exists "Public image pack downloads" on storage.objects;
drop policy if exists "Anyone reads images from published free packs" on pieceful.pack_images;
drop policy if exists "Anyone reads images from published packs" on pieceful.pack_images;

revoke select on pieceful.pack_images from anon, authenticated;

-- Published catalog rows are safe to expose. cover_url is only an object path
-- once the bucket becomes private; the API replaces it with a signed URL.
drop policy if exists "Anyone reads published free image packs" on pieceful.image_packs;
drop policy if exists "Anyone reads published image pack catalog" on pieceful.image_packs;
create policy "Anyone reads published image pack catalog"
on pieceful.image_packs for select to anon, authenticated
using (is_published and (available_from is null or available_from <= now()));

grant select on pieceful.image_packs to anon, authenticated;
