const { withAppDelegate } = require("@expo/config-plugins");

/**
 * Expo config plugin to make Firebase initialization conditional
 * This prevents crashes when using placeholder GoogleService-Info.plist files
 *
 * This plugin must run AFTER @react-native-firebase/app plugin
 * so it can modify the FirebaseApp.configure() call that Firebase generates.
 */
const withFirebaseConditionalInit = (config) => {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults;

    // Replacement code that checks for placeholder values
    const replacementCode = `    // Initialize Firebase only if config file is valid (skip for placeholder)
    if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let plist = NSDictionary(contentsOfFile: path),
       let appId = plist["GOOGLE_APP_ID"] as? String,
       !appId.contains("placeholder") {
      FirebaseApp.configure()
    } else {
      print("⚠️ Skipping Firebase initialization - using placeholder config file")
    }`;

    // Look for the FirebaseApp.configure() call (usually in a generated block)
    // Replace standalone FirebaseApp.configure() calls
    if (
      appDelegate.contents.includes("FirebaseApp.configure()") &&
      !appDelegate.contents.includes("if let path = Bundle.main.path")
    ) {
      // First, try to replace within the generated block (most common case)
      const generatedBlockPattern =
        /(\/\/ @generated begin @react-native-firebase\/app-didFinishLaunchingWithOptions[^\n]*\n)([^/]*?)(FirebaseApp\.configure\(\))([^/]*?)(\/\/ @generated end @react-native-firebase\/app-didFinishLaunchingWithOptions)/s;

      if (generatedBlockPattern.test(appDelegate.contents)) {
        appDelegate.contents = appDelegate.contents.replace(
          generatedBlockPattern,
          (match, startComment, before, firebaseCall, after, endComment) => {
            // Preserve indentation from the original FirebaseApp.configure() line
            const indentMatch = before.match(/(\s*)$/);
            const indent = indentMatch ? indentMatch[1] : "    ";
            return (
              startComment +
              before +
              replacementCode.replace(/^    /, indent) +
              after +
              endComment
            );
          }
        );
      } else {
        // Fallback: replace standalone FirebaseApp.configure() calls
        appDelegate.contents = appDelegate.contents.replace(
          /(\s*)FirebaseApp\.configure\(\)/,
          replacementCode
        );
      }
    }

    return config;
  });
};

module.exports = withFirebaseConditionalInit;
