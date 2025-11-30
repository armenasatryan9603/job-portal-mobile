/**
 * Expo config plugin for Firebase Analytics
 * React Native Firebase modules are autolinked, so this plugin
 * just ensures the module is recognized by Expo
 */
const withFirebaseAnalytics = (config) => {
  // React Native Firebase modules are autolinked via use_native_modules!
  // No additional configuration needed - the package.json dependency is enough
  return config;
};

module.exports = withFirebaseAnalytics;
