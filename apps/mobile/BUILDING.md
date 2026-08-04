# Mobile builds

Pieceful uses EAS Build for installable Android and iOS artifacts. Run EAS
commands from this directory so the CLI selects the mobile Expo project.

## Profiles

- `development`: internal development client with native debugging support.
- `preview`: production-like internal build; Android produces an installable APK.
- `production`: store build; Android produces an AAB and native build versions
  are incremented by EAS.

EAS stores the native `versionCode` and `buildNumber` remotely. The values in
`app.json` seed the first remote version. Before the first production build,
sync them with the latest versions already published in each store:

```bash
bunx eas-cli build:version:set
```

## First-time EAS setup

```bash
bunx eas-cli login
bunx eas-cli init
```

The Android app already has an existing release keystore. Do not ask EAS to
generate a replacement if a build with `app.perazzo.pieceful` has ever been
published. Upload the existing keystore to EAS using the credentials manager:

```bash
bunx eas-cli credentials --platform android
```

Select the production profile, then manage the Android keystore and upload the
existing one. Use the EAS-compatible JKS copy stored outside this repository at
`~/.pieceful/android/pieceful-release-eas.jks`; its password is stored in the
macOS Keychain service `pieceful.android.release`. This JKS has the same private
key and certificate as the original PKCS#12 keystore. Never add either
credential to Git.

For iOS, allow EAS to create or reuse the distribution certificate and
provisioning profile associated with `app.perazzo.pieceful`.

## Environment variables

Configure the variables listed in `.env.example` in the EAS project before
sharing a preview or production build. In particular, builds on physical
devices need valid Supabase values and a public HTTPS `EXPO_PUBLIC_API_URL`.
Keep `SENTRY_AUTH_TOKEN` as a secret and do not prefix private values with
`EXPO_PUBLIC_`.

Sentry runtime reporting and source-map uploads are configured in the EAS
`preview` and `production` environments. The organization token uses the
restricted `org:ci` scope and is stored as an EAS secret. Development builds
keep `SENTRY_DISABLE_AUTO_UPLOAD=true` to avoid publishing local source maps and
creating development releases.

## Build commands

```bash
# Development clients
bunx eas-cli build --platform android --profile development
bunx eas-cli build --platform ios --profile development

# Directly installable internal builds
bunx eas-cli build --platform android --profile preview
bunx eas-cli build --platform ios --profile preview

# Google Play / App Store Connect artifacts
bunx eas-cli build --platform android --profile production
bunx eas-cli build --platform ios --profile production
```

Internal iOS builds require every physical device to be registered in the
ad-hoc provisioning profile. Production iOS builds are installed through
TestFlight or the App Store.
