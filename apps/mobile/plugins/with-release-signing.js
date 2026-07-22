const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING_SETUP = `
def piecefulReleaseRequested = gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }
def piecefulReleaseStore = System.getenv("PIECEFUL_ANDROID_KEYSTORE") ?: new File(System.getProperty("user.home"), ".pieceful/android/pieceful-release.keystore").absolutePath
def piecefulReleasePassword = System.getenv("PIECEFUL_ANDROID_KEYSTORE_PASSWORD")

if (!piecefulReleasePassword && piecefulReleaseRequested && System.getProperty("os.name").toLowerCase().contains("mac")) {
    def credential = ["security", "find-generic-password", "-a", System.getProperty("user.name"), "-s", "pieceful.android.release", "-w"].execute()
    def output = new ByteArrayOutputStream()
    credential.consumeProcessOutput(output, new ByteArrayOutputStream())
    if (credential.waitFor() == 0) piecefulReleasePassword = output.toString("UTF-8").trim()
}

if (piecefulReleaseRequested && (!piecefulReleasePassword || !file(piecefulReleaseStore).exists())) {
    throw new GradleException("Pieceful release signing is not configured. Restore the keystore and its macOS Keychain credential, or set PIECEFUL_ANDROID_KEYSTORE and PIECEFUL_ANDROID_KEYSTORE_PASSWORD.")
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (next) => {
    if (next.modResults.language !== "groovy") return next;
    let source = next.modResults.contents;
    if (!source.includes("def piecefulReleaseRequested")) {
      source = source.replace("android {", `${SIGNING_SETUP}\nandroid {`);
    }
    if (!source.includes("piecefulRelease {")) {
      source = source.replace(
        /signingConfigs\s*\{\s*debug\s*\{/,
        `signingConfigs {\n        piecefulRelease {\n            if (piecefulReleaseRequested) {\n                storeFile file(piecefulReleaseStore)\n                storePassword piecefulReleasePassword\n                keyAlias "pieceful"\n                keyPassword piecefulReleasePassword\n            }\n        }\n        debug {`,
      );
    }
    source = source.replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig signingConfigs.piecefulRelease",
    );
    next.modResults.contents = source;
    return next;
  });
};
