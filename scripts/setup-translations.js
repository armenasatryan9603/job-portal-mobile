#!/usr/bin/env node

/**
 * Translation System Setup Script
 *
 * This script helps set up the translation system by:
 * 1. Validating backend translation files
 * 2. Testing backend API connectivity
 * 3. Providing setup instructions
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

// Check backend translation files
function checkBackendTranslations() {
  const backendDir = path.join(process.cwd(), "..", "backend");
  const translationDir = path.join(backendDir, "locales");
  const languages = ["en", "ru", "hy"];
  const missing = [];

  if (!fs.existsSync(translationDir)) {
    log.error("Backend locales directory not found");
    log.info(`Expected path: ${translationDir}`);
    return false;
  }

  languages.forEach((lang) => {
    const filePath = path.join(translationDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const keyCount = Object.keys(content).length;
        log.success(`Backend ${lang}.json found (${keyCount} translations)`);
      } catch (err) {
        log.error(`Backend ${lang}.json is invalid JSON`);
        missing.push(lang);
      }
    } else {
      log.error(`Backend ${lang}.json not found`);
      missing.push(lang);
    }
  });

  return missing.length === 0;
}

// Test backend API connectivity
async function testBackendAPI() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
  
  try {
    log.info(`Testing backend API at: ${apiUrl}`);
    
    // Test available languages endpoint
    const languagesUrl = `${apiUrl}/translations`;
    const languagesResponse = await fetch(languagesUrl);
    
    if (languagesResponse.ok) {
      const languagesData = await languagesResponse.json();
      log.success("Backend API is accessible");
      log.info(`Available languages: ${languagesData.languages?.join(", ") || "N/A"}`);
      
      // Test fetching English translations
      const translationsUrl = `${apiUrl}/translations/en`;
      const translationsResponse = await fetch(translationsUrl);
      
      if (translationsResponse.ok) {
        const translationsData = await translationsResponse.json();
        const keyCount = Object.keys(translationsData.translations || {}).length;
        log.success(`Successfully fetched translations (${keyCount} keys)`);
        return true;
      } else {
        log.warning("Backend API is accessible but translations endpoint failed");
        return false;
      }
    } else {
      log.error(`Backend API test failed: ${languagesResponse.status} ${languagesResponse.statusText}`);
      return false;
    }
  } catch (err) {
    log.error(`Backend API test failed: ${err.message}`);
    log.warning("Make sure the backend server is running");
    return false;
  }
}

// Generate setup instructions
function generateSetupInstructions() {
  log.title("\n📋 Setup Instructions:");

  console.log(`
1. ${colors.bold}Backend Translation Files:${colors.reset}
   - Translation files are located in backend/locales/ folder
   - Supported languages: en, ru, hy
   - Format: JSON files with key-value pairs

2. ${colors.bold}Backend API:${colors.reset}
   - Backend must be running to serve translations
   - API endpoint: GET /translations/:language
   - Translations are cached in the mobile app

3. ${colors.bold}App Integration:${colors.reset}
   - Wrap your app with TranslationProvider
   - Use useTranslation hook in components
   - Translations are automatically cached

4. ${colors.bold}Adding New Translations:${colors.reset}
   - Edit the JSON files in backend/locales/ folder
   - Add new keys to all language files
   - Restart backend server
   - Clear cache in app to see changes immediately

5. ${colors.bold}Testing:${colors.reset}
   - Test language switching
   - Test cache functionality
   - Test offline mode (uses cached translations)
`);
}

// Main setup function
async function runSetup() {
  log.title("🚀 Translation System Setup");

  // Check backend translations
  log.title("\n1. Backend Translation Files");
  const translationsValid = checkBackendTranslations();

  // Test backend API
  log.title("\n2. Backend API Connectivity");
  const apiWorking = await testBackendAPI();

  // Generate instructions
  generateSetupInstructions();

  // Summary
  log.title("\n📊 Summary:");
  if (translationsValid) {
    log.success("Backend translation files are valid");
  } else {
    log.error("Some backend translation files are missing or invalid");
  }
  
  if (apiWorking) {
    log.success("Backend API is working");
    console.log("\n✅ Translation system is ready to use!");
  } else {
    log.warning("Backend API test failed - make sure backend is running");
    console.log("\n⚠️  Please ensure the backend server is running");
  }
}

// Run if called directly
if (require.main === module) {
  runSetup().catch((err) => {
    log.error(`Setup failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkBackendTranslations,
  testBackendAPI,
};
