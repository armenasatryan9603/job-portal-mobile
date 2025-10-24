#!/usr/bin/env node

/**
 * Translation System Setup Script
 *
 * This script helps set up the translation system by:
 * 1. Validating environment variables
 * 2. Testing Google Sheets connectivity
 * 3. Validating local translation files
 * 4. Providing setup instructions
 */

const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  title: (msg) =>
    console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

// Check if .env file exists
function checkEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    log.success(".env file found");
    return true;
  } else {
    log.error(".env file not found");
    log.info("Create a .env file in your project root with:");
    log.info("GOOGLE_SHEETS_API_KEY=AIzaSyAsvtqOaGbV6E1z-g-5fxc1cnJSW_gWyug");
    return false;
  }
}

// Check environment variables
function checkEnvVariables() {
  const requiredVars = ["GOOGLE_SHEETS_API_KEY"];
  const missing = [];

  requiredVars.forEach((varName) => {
    if (process.env[varName]) {
      log.success(`${varName} is set`);
    } else {
      log.error(`${varName} is not set`);
      missing.push(varName);
    }
  });

  return missing.length === 0;
}

// Check local translation files
function checkLocalTranslations() {
  const translationDir = path.join(process.cwd(), "translations");
  const languages = ["en", "ru", "hy"];
  const missing = [];

  if (!fs.existsSync(translationDir)) {
    log.error("translations directory not found");
    return false;
  }

  languages.forEach((lang) => {
    const filePath = path.join(translationDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const keyCount = Object.keys(content).length;
        log.success(`${lang}.json found (${keyCount} translations)`);
      } catch (err) {
        log.error(`${lang}.json is invalid JSON`);
        missing.push(lang);
      }
    } else {
      log.error(`${lang}.json not found`);
      missing.push(lang);
    }
  });

  return missing.length === 0;
}

// Test Google Sheets connectivity
async function testGoogleSheets() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    log.warning("Skipping Google Sheets test (no API key)");
    return false;
  }

  try {
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/1Mh7mztLyDxRB8HtGDhqDW-M0IfvFocRv5RlBlPfMsnA/values/en!A:B?key=${apiKey}`;
    const response = await fetch(testUrl);

    if (response.ok) {
      const data = await response.json();
      if (data.values && data.values.length > 0) {
        log.success("Google Sheets connectivity test passed");
        log.info(`Found ${data.values.length} rows in English sheet`);
        return true;
      } else {
        log.warning("Google Sheets is accessible but contains no data");
        return false;
      }
    } else {
      log.error(
        `Google Sheets test failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (err) {
    log.error(`Google Sheets test failed: ${err.message}`);
    return false;
  }
}

// Check if required dependencies are installed
function checkDependencies() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    log.error("package.json not found");
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const requiredDeps = ["@react-native-async-storage/async-storage"];
  const missing = [];

  requiredDeps.forEach((dep) => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      log.success(`${dep} is installed`);
    } else if (
      packageJson.devDependencies &&
      packageJson.devDependencies[dep]
    ) {
      log.success(`${dep} is installed (dev dependency)`);
    } else {
      log.error(`${dep} is not installed`);
      missing.push(dep);
    }
  });

  return missing.length === 0;
}

// Generate setup instructions
function generateSetupInstructions() {
  log.title("\n📋 Setup Instructions:");

  console.log(`
1. ${colors.bold}Environment Variables:${colors.reset}
   - Add GOOGLE_SHEETS_API_KEY to your .env file
   - Get API key from Google Cloud Console
   - Enable Google Sheets API

2. ${colors.bold}Google Sheets Setup:${colors.reset}
   - English: https://docs.google.com/spreadsheets/d/1Mh7mztLyDxRB8HtGDhqDW-M0IfvFocRv5RlBlPfMsnA/edit
   - Russian: https://docs.google.com/spreadsheets/d/1-PR5GYLitEBZYaqi69CWOO9FN-g5ql3muzY1rlOLy6s/edit
   - Armenian: https://docs.google.com/spreadsheets/d/1WO56vVlflD1bGtzXQOXpIL6Ol8GGE0kKy9Asljfj6G4/edit
   
   Format: Column A = keys, Column B = translations

3. ${colors.bold}App Integration:${colors.reset}
   - Wrap your app with TranslationProvider
   - Use useTranslation hook in components
   - Test with and without internet connection

4. ${colors.bold}Testing:${colors.reset}
   - Test offline mode (should use local files)
   - Test online mode (should use Google Sheets)
   - Test language switching
   - Test cache functionality
`);
}

// Main setup function
async function runSetup() {
  log.title("🚀 Translation System Setup");
  console.log("");

  let allChecksPassed = true;

  // Check environment file
  log.title("1. Environment Configuration");
  if (!checkEnvFile()) {
    allChecksPassed = false;
  }

  // Check environment variables
  log.title("2. Environment Variables");
  if (!checkEnvVariables()) {
    allChecksPassed = false;
  }

  // Check dependencies
  log.title("3. Dependencies");
  if (!checkDependencies()) {
    allChecksPassed = false;
  }

  // Check local translations
  log.title("4. Local Translation Files");
  if (!checkLocalTranslations()) {
    allChecksPassed = false;
  }

  // Test Google Sheets
  log.title("5. Google Sheets Connectivity");
  const sheetsWorking = await testGoogleSheets();
  if (!sheetsWorking) {
    allChecksPassed = false;
  }

  // Summary
  console.log("");
  if (allChecksPassed) {
    log.success("All checks passed! Translation system is ready to use.");
  } else {
    log.warning("Some checks failed. Please fix the issues above.");
    generateSetupInstructions();
  }

  console.log("");
  log.info("For more information, see docs/TRANSLATION_SETUP.md");
}

// Run the setup
if (require.main === module) {
  runSetup().catch(console.error);
}

module.exports = {
  checkEnvFile,
  checkEnvVariables,
  checkLocalTranslations,
  testGoogleSheets,
  checkDependencies,
};
