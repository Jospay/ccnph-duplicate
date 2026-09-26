const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

/** @type {import('@expo/config-plugins').ConfigPlugin} */
const withDisableForceDark = (config) => {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    application.$["android:forceDarkAllowed"] = "false";
    return config;
  });
};

module.exports = withDisableForceDark;
