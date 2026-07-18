const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativewind } = require("nativewind/metro");

// getSentryExpoConfig is a drop-in replacement for Expo's getDefaultConfig
// that adds Sentry's source-map support. We then wrap it with NativeWind.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativewind(config);
