/**
 * @param {import("expo/config").ConfigContext} context
 * @returns {import("expo/config").ExpoConfig}
 */
module.exports = ({ config }) => {
  let nextConfig = config;

  const callback = process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL;
  if (callback?.startsWith("https://")) {
    const url = new URL(callback);
    const associatedDomain = `applinks:${url.host}`;
    const associatedDomains = new Set(config.ios?.associatedDomains ?? []);
    associatedDomains.add(associatedDomain);

    nextConfig = {
      ...nextConfig,
      ios: {
        ...nextConfig.ios,
        associatedDomains: [...associatedDomains],
      },
      android: {
        ...nextConfig.android,
        intentFilters: [
          ...(nextConfig.android?.intentFilters ?? []),
          {
            action: "VIEW",
            autoVerify: true,
            category: ["BROWSABLE", "DEFAULT"],
            data: [
              {
                scheme: "https",
                host: url.host,
                pathPrefix: url.pathname,
              },
            ],
          },
        ],
      },
    };
  }

  // Falls back to Google's published sample AdMob App IDs (safe for
  // development/preview) unless the real ones are configured for this build.
  const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID;
  if (androidAppId || iosAppId) {
    nextConfig = {
      ...nextConfig,
      plugins: (nextConfig.plugins ?? []).map((plugin) =>
        Array.isArray(plugin) && plugin[0] === "react-native-google-mobile-ads"
          ? [
              plugin[0],
              {
                ...plugin[1],
                ...(androidAppId ? { androidAppId } : null),
                ...(iosAppId ? { iosAppId } : null),
              },
            ]
          : plugin,
      ),
    };
  }

  return nextConfig;
};
