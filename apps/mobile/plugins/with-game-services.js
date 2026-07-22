const { withAndroidManifest, withEntitlementsPlist, withStringsXml } = require("expo/config-plugins");

function upsertString(resources, name, value) {
  resources.string = resources.string ?? [];
  const existing = resources.string.find((entry) => entry.$?.name === name);
  if (existing) existing._ = value;
  else resources.string.push({ $: { name, translatable: "false" }, _: value });
}

module.exports = function withGameServices(config) {
  config = withEntitlementsPlist(config, (next) => {
    next.modResults["com.apple.developer.game-center"] = true;
    return next;
  });

  config = withStringsXml(config, (next) => {
    upsertString(
      next.modResults.resources,
      "game_services_project_id",
      process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_APP_ID || "0",
    );
    return next;
  });

  return withAndroidManifest(config, (next) => {
    const application = next.modResults.manifest.application?.[0];
    if (!application) return next;
    application["meta-data"] = application["meta-data"] ?? [];
    const name = "com.google.android.gms.games.APP_ID";
    const metadata = application["meta-data"].find((item) => item.$?.["android:name"] === name);
    const value = "@string/game_services_project_id";
    if (metadata) metadata.$["android:value"] = value;
    else application["meta-data"].push({ $: { "android:name": name, "android:value": value } });
    return next;
  });
};
