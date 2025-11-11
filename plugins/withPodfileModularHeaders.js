const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to add use_modular_headers! to Podfile
 * Required for Firebase pods to work correctly
 */
const withPodfileModularHeaders = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (fs.existsSync(podfilePath)) {
        let podfileContents = fs.readFileSync(podfilePath, "utf-8");

        // Check if use_modular_headers! is already present
        if (!podfileContents.includes("use_modular_headers!")) {
          // Find the target block and add use_modular_headers! after use_expo_modules!
          const targetPattern = /(target\s+['"][^'"]+['"]\s+do\s*\n\s*use_expo_modules!\s*\n)/;
          
          if (targetPattern.test(podfileContents)) {
            podfileContents = podfileContents.replace(
              targetPattern,
              "$1  use_modular_headers!\n\n"
            );
            fs.writeFileSync(podfilePath, podfileContents);
          }
        }
      }

      return config;
    },
  ]);
};

module.exports = withPodfileModularHeaders;

