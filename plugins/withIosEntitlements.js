const { withEntitlementsPlist } = require("@expo/config-plugins");

/**
 * Expo config plugin to ensure aps-environment entitlement is set for push notifications
 * This ensures the entitlement persists even after prebuild --clean
 */
const withIosEntitlements = (config) => {
  return withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;

    // Ensure aps-environment is set to development (for testing)
    // Change to "production" when releasing to App Store
    if (!entitlements["aps-environment"]) {
      entitlements["aps-environment"] = "development";
      console.log("✅ Added aps-environment entitlement: development");
    } else {
      console.log(
        `✅ aps-environment entitlement already set: ${entitlements["aps-environment"]}`
      );
    }

    return config;
  });
};

module.exports = withIosEntitlements;
