// Translation configuration
export const TRANSLATION_CONFIG = {
  // Cache configuration
  cache: {
    expiryTime: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    keys: {
      en: "@translations_en",
      ru: "@translations_ru",
      hy: "@translations_hy",
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
