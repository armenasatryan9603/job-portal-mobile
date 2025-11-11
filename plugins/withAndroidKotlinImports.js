const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to add BuildConfig and R imports to Android Kotlin files
 * This ensures the imports persist after expo prebuild
 */
const withAndroidKotlinImports = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const androidProjectRoot = config.modRequest.platformProjectRoot;
      // Try both possible package structures
      const mainActivityPath1 = path.join(
        androidProjectRoot,
        "app/src/main/java/com/jobportalmobile/app/MainActivity.kt"
      );
      const mainActivityPath2 = path.join(
        androidProjectRoot,
        "app/src/main/java/com/jobportalmobile/MainActivity.kt"
      );
      const mainApplicationPath1 = path.join(
        androidProjectRoot,
        "app/src/main/java/com/jobportalmobile/app/MainApplication.kt"
      );
      const mainApplicationPath2 = path.join(
        androidProjectRoot,
        "app/src/main/java/com/jobportalmobile/MainApplication.kt"
      );

      const mainActivityPath = fs.existsSync(mainActivityPath1)
        ? mainActivityPath1
        : mainActivityPath2;
      const mainApplicationPath = fs.existsSync(mainApplicationPath1)
        ? mainApplicationPath1
        : mainApplicationPath2;

      // Fix MainActivity.kt
      if (fs.existsSync(mainActivityPath)) {
        let content = fs.readFileSync(mainActivityPath, "utf-8");

        // Check if imports are missing
        const needsBuildConfig =
          content.includes("BuildConfig") &&
          !content.includes("import com.jobportalmobile.app.BuildConfig");
        const needsR =
          content.includes("R.") &&
          !content.includes("import com.jobportalmobile.app.R");

        if (needsBuildConfig || needsR) {
          // Find the expo.modules import line
          const expoImportPattern =
            /(import expo\.modules\.ReactActivityDelegateWrapper\s*\n)/;

          if (expoImportPattern.test(content)) {
            let importsToAdd = "";
            if (needsBuildConfig) {
              importsToAdd += "import com.jobportalmobile.app.BuildConfig\n";
            }
            if (needsR) {
              importsToAdd += "import com.jobportalmobile.app.R\n";
            }

            content = content.replace(expoImportPattern, `$1${importsToAdd}`);
            fs.writeFileSync(mainActivityPath, content);
          }
        }
      }

      // Fix MainApplication.kt
      if (fs.existsSync(mainApplicationPath)) {
        let content = fs.readFileSync(mainApplicationPath, "utf-8");

        // Check if BuildConfig import is missing
        const needsBuildConfig =
          content.includes("BuildConfig") &&
          !content.includes("import com.jobportalmobile.app.BuildConfig");

        if (needsBuildConfig) {
          // Find the expo.modules import line
          const expoImportPattern =
            /(import expo\.modules\.ReactNativeHostWrapper\s*\n)/;

          if (expoImportPattern.test(content)) {
            content = content.replace(
              expoImportPattern,
              "$1import com.jobportalmobile.app.BuildConfig\n"
            );
            fs.writeFileSync(mainApplicationPath, content);
          }
        }
      }

      return config;
    },
  ]);
};

module.exports = withAndroidKotlinImports;
