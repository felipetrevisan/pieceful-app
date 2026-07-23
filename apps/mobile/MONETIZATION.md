# Android monetization setup

The app code supports a free tier with opt-in rewarded hints and a Premium entitlement. Development builds use Google's official test ad IDs; production monetization stays disabled until the dashboard values below are configured.

## AdMob

1. Create the Android app in AdMob with package `app.perazzo.pieceful`.
2. Create a rewarded ad unit for puzzle hints.
3. Replace the test `androidAppId` in `app.json` with the AdMob app ID.
4. Add the rewarded unit ID to `.env`:

```env
EXPO_PUBLIC_ADMOB_REWARDED_HINT_ID=ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy
```

The current implementation requests non-personalized ads for every age range. It also marks the child range as child-directed, treats child and teen ranges as under the age of consent, and limits child ads to the `G` rating.

## Google Play and RevenueCat

1. Create the Android app in RevenueCat and connect it to Google Play.
2. Create the monthly/yearly subscription products in Play Console.
3. Create the RevenueCat entitlement exactly as `premium`.
4. Add the products to the current RevenueCat offering.
5. Add the public Android SDK key to `.env`:

```env
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_public_sdk_key
```

Real purchases require a native development/release build installed through a Play testing track. Expo Go can render the screens, but cannot make a real purchase or load the native AdMob SDK.

## Before publishing

- Complete Play Console's Target audience and content, Ads, Data safety, and Families declarations.
- Publish a privacy policy covering the selected local age range, authentication, cloud puzzle data, purchases, and advertising.
- Keep the child image catalog curated and free from user-generated/search content.
- Use only Families self-certified ad SDK versions when child users are in scope.
- Test sign-in, purchase, restore, rewarded completion, cancellation, offline behavior, and all three age ranges in an internal Play track.
