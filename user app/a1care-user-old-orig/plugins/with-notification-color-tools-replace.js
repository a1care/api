const { withAndroidManifest } = require("@expo/config-plugins");

const NOTIFICATION_COLOR_META_DATA =
  "com.google.firebase.messaging.default_notification_color";

module.exports = function withNotificationColorToolsReplace(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const application = manifest.application?.[0];
    const metadata = application?.["meta-data"] || [];
    const notificationColor = metadata.find(
      (item) => item.$?.["android:name"] === NOTIFICATION_COLOR_META_DATA
    );

    if (notificationColor) {
      notificationColor.$["tools:replace"] = "android:resource";
    }

    return config;
  });
};
