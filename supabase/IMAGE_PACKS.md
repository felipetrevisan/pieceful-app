# Pieceful remote image packs

Remote packs let Kids mode receive new curated pictures without publishing a new app build.

## 1. Apply the migration

Run `202607230002_child_image_packs.sql` in the Supabase SQL editor or through the project's migration workflow. It creates:

- `pieceful.image_packs`
- `pieceful.pack_images`
- the public `image-packs` Storage bucket
- read-only public catalog policies for published free packs

Only the service role or the Supabase dashboard should manage catalog records. The mobile app can only read published free content.

## Pieceful Studio

The web app now includes a private dashboard at `/admin`. It can:

- create, edit, publish, unpublish, sort, and delete packs;
- upload JPG, PNG, or WebP images to the `image-packs` bucket;
- edit bilingual image titles and visibility;
- choose a pack cover and maintain the calculated download size;
- remove database records and their Storage objects.

Configure these server-only variables in `apps/api/.env` and in the API runtime:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PIECEFUL_ADMIN_PASSWORD=use-a-strong-password-with-at-least-12-characters
PIECEFUL_ADMIN_SESSION_SECRET=generate-at-least-32-random-bytes
```

Generate the session secret with `openssl rand -hex 32`. Never prefix the service-role key or admin secrets with `NEXT_PUBLIC_`; doing so would expose them to browsers. The API issues a signed administrative session that expires after 12 hours and the Studio keeps it only for the current browser tab session.

## 2. Upload assets

Use a predictable folder in the `image-packs` bucket:

```text
dinosaurs/cover.jpg
dinosaurs/thumbs/picnic.jpg
dinosaurs/images/picnic.jpg
```

Copy each public Storage URL after upload.

## 3. Create a pack

```sql
insert into pieceful.image_packs (
  slug,
  title_pt,
  title_en,
  description_pt,
  description_en,
  cover_url,
  audience,
  is_free,
  is_published,
  sort_order,
  total_bytes
) values (
  'dinossauros-divertidos',
  'Dinossauros divertidos',
  'Fun dinosaurs',
  'Aventuras coloridas no mundo dos dinossauros.',
  'Colorful adventures in the world of dinosaurs.',
  'PUBLIC_COVER_URL',
  'child',
  true,
  true,
  10,
  12582912
)
returning id;
```

## 4. Add pictures

```sql
insert into pieceful.pack_images (
  pack_id,
  title_pt,
  title_en,
  image_url,
  thumbnail_url,
  width,
  height,
  bytes,
  sort_order
) values (
  'PACK_UUID',
  'Festa dos dinossauros',
  'Dinosaur party',
  'PUBLIC_FULL_IMAGE_URL',
  'PUBLIC_THUMBNAIL_URL',
  1600,
  1200,
  2097152,
  10
);
```

Keep `is_published = false` while preparing a pack. Publish it only after every image, translation, thumbnail and content-age review is complete.

## Mobile behavior

- The catalog works without login in Kids mode.
- Downloads show progress and are stored under the app's documents directory.
- Installed images are inserted into the existing creation carousel.
- Removing a pack deletes its offline files.
- A selected picture is copied into the puzzle's own folder, so removing its source pack does not break an existing puzzle.
