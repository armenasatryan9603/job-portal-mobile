import Constants from "expo-constants";

// Translation configuration
export const TRANSLATION_CONFIG = {
  // Google Sheets API configuration
  googleSheets: {
    apiKey:
      Constants.expoConfig?.extra?.GOOGLE_SHEETS_API_KEY ||
      "AIzaSyAsvtqOaGbV6E1z-g-5fxc1cnJSW_gWyug",
    baseUrl: "https://sheets.googleapis.com/v4/spreadsheets",
  },

  // Spreadsheet configurations for each language
  spreadsheets: {
    en: {
      id: "1Mh7mztLyDxRB8HtGDhqDW-M0IfvFocRv5RlBlPfMsnA",
      name: "English Translations",
    },
    ru: {
      id: "1PD57nH_tgSUa9BGLN2lc9rvpbFZ3HR9n",
      name: "Russian Translations",
    },
    hy: {
      id: "1XR-nbk34SkEKBZiBIVj07S0PugIjZ0Wk",
      name: "Armenian Translations",
    },
  },

  // Cache configuration
  cache: {
    expiryTime: 5 * 60 * 1000, // 5 minutes in milliseconds (for development)
    keys: {
      en: "@translations_en",
      ru: "@translations_ru",
      hy: "@translations_hy",
    },
  },

  // Fallback configuration
  fallback: {
    enabled: true,
    files: {
      en: "../translations/en.json",
      ru: "../translations/ru.json",
      hy: "../translations/hy.json",
    },
  },

  // Supported languages
  supportedLanguages: ["en", "ru", "hy"],

  // Default language
  defaultLanguage: "en",

  // Debug configuration
  debug: {
    enabled: __DEV__,
    logMissingTranslations: true,
    logCacheHits: false,
    logGoogleSheetsRequests: true,
  },
};

// Get cache key for a specific language
export const getCacheKey = (language: string): string => {
  return (
    TRANSLATION_CONFIG.cache.keys[
      language as keyof typeof TRANSLATION_CONFIG.cache.keys
    ] || `@translations_${language}`
  );
};

// Check if a language is supported
export const isLanguageSupported = (language: string): boolean => {
  return TRANSLATION_CONFIG.supportedLanguages.includes(language);
};

export default TRANSLATION_CONFIG;
