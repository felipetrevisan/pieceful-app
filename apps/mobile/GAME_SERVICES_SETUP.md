# Native game services setup

The native module in `modules/my-module` uses GameKit on iOS and Play Games Services v2 on Android. It is unavailable inside Expo Go; create a development build after configuring the platform consoles.

## Apple

1. Enable Game Center for `app.perazzo.pieceful` in Apple Developer and App Store Connect.
2. Create achievements with the identifiers listed in `.env.example`.
3. Rebuild the iOS development client so the Game Center entitlement is applied.

## Android

1. Create a Play Games Services project for `app.perazzo.pieceful` in Play Console.
2. Link the Android credential using the same SHA-1 certificate used to sign the development/production build.
3. Create the achievements and place the generated IDs and Games project ID in `.env`.
   Configure `pieces_250` and `puzzles_10` as incremental achievements with 100 steps, since the app reports percentage progress.
4. Add tester accounts or use an internal testing track, then rebuild the Android client.

The in-app Supabase account remains separate from the platform gaming identity. Google/Microsoft sign-in owns cloud data; Game Center/Play Games owns the native achievement presentation.
