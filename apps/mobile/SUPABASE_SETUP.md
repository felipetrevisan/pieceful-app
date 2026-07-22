# Supabase setup

1. Create a Supabase project and run `supabase/migrations/202607200001_mobile_social.sql` in the SQL editor. The app tables and functions live in the `pieceful` schema.
2. In Settings > API > Exposed schemas, add `pieceful` so the Data API can access it.
3. Copy `.env.example` to `.env` and fill in the project URL and publishable key.
4. In Authentication > URL Configuration > Redirect URLs, allow `pieceful://auth/callback` and `pieceful://**`. Development builds and installed APKs return through `pieceful://auth/callback`; do not replace the Site URL used by the web app. Expo Go cannot test OAuth/OIDC flows, so use a development build on physical devices.
5. Enable Google in Authentication > Providers and configure its OAuth client.
6. Enable Azure (Microsoft), request the `email` scope, and configure the callback shown by Supabase in Microsoft Entra ID.
7. Rebuild the development clients after changing native configuration.

`service_role` keys and OAuth client secrets must never use the `EXPO_PUBLIC_` prefix or be included in the app. Only the Supabase publishable key belongs in the mobile environment.
