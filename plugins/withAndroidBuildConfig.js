const {
  withAppBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to ensure IS_NEW_ARCHITECTURE_ENABLED is in Android build.gradle
 */
const withAndroidBuildConfig = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults;

    // Check if IS_NEW_ARCHITECTURE_ENABLED is already present
    if (!buildGradle.contents.includes("IS_NEW_ARCHITECTURE_ENABLED")) {
      // Find the defaultConfig block and add the buildConfigField
      const defaultConfigPattern =
        /(defaultConfig\s*\{[^}]*?versionName\s+"[^"]+"\s*\n)/;

      if (defaultConfigPattern.test(buildGradle.contents)) {
        buildGradle.contents = buildGradle.contents.replace(
          defaultConfigPattern,
          (match) => {
            // Check if REACT_NATIVE_RELEASE_LEVEL exists
            if (match.includes("REACT_NATIVE_RELEASE_LEVEL")) {
              return match.replace(
                /(buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL"[^\n]+\n)/,
                '$1        buildConfigField "boolean", "IS_NEW_ARCHITECTURE_ENABLED", "true"\n'
              );
            } else {
              // Add both if neither exists
              return (
                match +
                '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\\"${findProperty(\'reactNativeReleaseLevel\') ?: \'stable\'}\\""\n' +
                '        buildConfigField "boolean", "IS_NEW_ARCHITECTURE_ENABLED", "true"\n'
              );
            }
          }
        );
      }
    }

    return config;
  });
};

module.exports = withAndroidBuildConfig;
