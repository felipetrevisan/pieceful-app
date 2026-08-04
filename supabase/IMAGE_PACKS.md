# Pieceful remote image packs

Apply all migrations, configure the API environments from `apps/api/.env.example`, and manage packs
only through Pieceful Studio at `/admin`. The `image-packs` bucket is private; direct dashboard SQL
or public Storage URLs are not part of the supported publishing flow.

Studio can create, translate, sort and schedule packs, set free/purchase/level access, require a
minimum app version, and upload or delete canonical images. Every upload is normalized to WebP,
gets a thumbnail and SHA-256 digest, is quota checked, and updates the calculated pack size.

Keep a pack unpublished until all images, translations, age suitability, store product identifiers,
minimum version and download behavior have been reviewed. For paid packs, the product identifier
must exactly match RevenueCat and the store. For reward packs, configure a level from 2 to 100.

The mobile app obtains short-lived URLs only after API authorization, verifies each downloaded file
against its digest, and stores it offline. Removing a pack deletes its source files; existing puzzles
continue to use their own private copy.
