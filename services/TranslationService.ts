import AsyncStorage from "@react-native-async-storage/async-storage";
import TRANSLATION_CONFIG, {
  getCacheKey,
  isLanguageSupported,
} from "../config/translations";

export interface TranslationData {
  [key: string]: string;
}

export interface CacheData {
  translations: TranslationData;
  timestamp: number;
}

class TranslationService {
  private static instance: TranslationService;
  private cache: Map<string, TranslationData> = new Map();
  private fallbackTranslations: Map<string, TranslationData> = new Map();

  private constructor() {
    this.loadFallbackTranslations();
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Load fallback translations from local JSON files
   */
  private async loadFallbackTranslations(): Promise<void> {
    try {
      const enTranslations = require("../translations/en.json");
      const ruTranslations = require("../translations/ru.json");
      const hyTranslations = require("../translations/hy.json");

      this.fallbackTranslations.set("en", enTranslations);
      this.fallbackTranslations.set("ru", ruTranslations);
      this.fallbackTranslations.set("hy", hyTranslations);
    } catch (error) {
      console.warn("Failed to load fallback translations:", error);
    }
  }

  /**
   * Get sheet metadata to find the correct sheet name
   */
  private async getSheetMetadata(language: string): Promise<string | null> {
    try {
      const config =
        TRANSLATION_CONFIG.spreadsheets[
          language as keyof typeof TRANSLATION_CONFIG.spreadsheets
        ];
      const apiKey = TRANSLATION_CONFIG.googleSheets.apiKey;

      if (!apiKey) {
        throw new Error("Google Sheets API key not configured");
      }

      const metadataUrl = `${TRANSLATION_CONFIG.googleSheets.baseUrl}/${config.id}?key=${apiKey}`;

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(`🔍 [TRANSLATION] Fetching sheet metadata for ${language}`);
      }

      const response = await fetch(metadataUrl);

      if (!response.ok) {
        console.error(
          `❌ [TRANSLATION] Failed to fetch metadata for ${language}: ${response.status}`
        );
        return null;
      }

      const data = await response.json();

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(
          `📋 [TRANSLATION] Found ${
            data.sheets?.length || 0
          } sheets for ${language}`
        );
      }

      // Return the first sheet's title (most common case)
      if (data.sheets && data.sheets.length > 0) {
        const sheetTitle = data.sheets[0].properties?.title;
        if (TRANSLATION_CONFIG.debug.enabled) {
          console.log(
            `✅ [TRANSLATION] Using sheet: "${sheetTitle}" for ${language}`
          );
        }
        return sheetTitle;
      }

      return null;
    } catch (error) {
      console.error(
        `❌ [TRANSLATION] Error fetching sheet metadata for ${language}:`,
        error
      );
      return null;
    }
  }

  /**
   * Fetch translations from Google Sheets
   */
  private async fetchFromGoogleSheets(
    language: string
  ): Promise<TranslationData | null> {
    try {
      if (!isLanguageSupported(language)) {
        console.warn(`❌ Language not supported: ${language}`);
        return null;
      }

      // First, get the actual sheet name from metadata
      const sheetName = await this.getSheetMetadata(language);

      if (!sheetName) {
        console.warn(
          `⚠️ [TRANSLATION] Could not determine sheet name for ${language}, using fallback`
        );
        // Fallback to local translations
        return this.fallbackTranslations.get(language) || {};
      }

      // Build URL with the actual sheet name
      const config =
        TRANSLATION_CONFIG.spreadsheets[
          language as keyof typeof TRANSLATION_CONFIG.spreadsheets
        ];
      const apiKey = TRANSLATION_CONFIG.googleSheets.apiKey;
      const url = `${TRANSLATION_CONFIG.googleSheets.baseUrl}/${config.id}/values/${sheetName}!A:B?key=${apiKey}`;

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(
          `🌐 [TRANSLATION] Fetching translations for ${language} from sheet: ${sheetName}`
        );
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ [TRANSLATION] HTTP error! status: ${response.status}`
        );
        console.error(`❌ [TRANSLATION] Error response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(
          `📊 [TRANSLATION] Received ${
            data.values?.length || 0
          } rows for ${language}`
        );
      }

      if (!data.values || data.values.length === 0) {
        console.warn(
          `⚠️ [TRANSLATION] No data found in Google Sheets for ${language}`
        );
        return null;
      }

      // Convert array format to object
      const translations: TranslationData = {};
      let processedRows = 0;
      let skippedRows = 0;

      for (const row of data.values) {
        if (row.length >= 2 && row[0] && row[1]) {
          translations[row[0]] = row[1];
          processedRows++;
        } else {
          skippedRows++;
        }
      }

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(
          `✅ [TRANSLATION] Successfully loaded ${
            Object.keys(translations).length
          } translations for ${language}`
        );
      }

      return translations;
    } catch (error) {
      console.error(
        `❌ [TRANSLATION] Failed to fetch translations from Google Sheets for ${language}:`,
        error
      );
      console.error(`❌ [TRANSLATION] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : "Unknown",
      });
      return null;
    }
  }

  /**
   * Get cached translations
   */
  private async getCachedTranslations(
    language: string
  ): Promise<TranslationData | null> {
    try {
      const cacheKey = getCacheKey(language);
      if (!cacheKey) return null;

      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheData.timestamp > TRANSLATION_CONFIG.cache.expiryTime) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(`✅ [TRANSLATION] Cache hit for ${language}`);
      }

      return cacheData.translations;
    } catch (error) {
      console.error(
        `Failed to get cached translations for ${language}:`,
        error
      );
      return null;
    }
  }

  /**
   * Cache translations
   */
  private async cacheTranslations(
    language: string,
    translations: TranslationData
  ): Promise<void> {
    try {
      const cacheKey = getCacheKey(language);
      if (!cacheKey) return;

      const cacheData: CacheData = {
        translations,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log(
          `Cached ${
            Object.keys(translations).length
          } translations for ${language}`
        );
      }
    } catch (error) {
      console.error(`Failed to cache translations for ${language}:`, error);
    }
  }

  /**
   * Get translations for a specific language
   */
  public async getTranslations(language: string): Promise<TranslationData> {
    // Check memory cache first
    if (this.cache.has(language)) {
      return this.cache.get(language)!;
    }

    // Try to get from AsyncStorage cache
    let translations = await this.getCachedTranslations(language);

    if (!translations) {
      // Try to fetch from Google Sheets
      translations = await this.fetchFromGoogleSheets(language);

      if (translations) {
        // Cache the Google Sheets translations
        await this.cacheTranslations(language, translations);
      } else {
        // Fallback to local JSON files
        translations = this.fallbackTranslations.get(language) || {};
        if (TRANSLATION_CONFIG.debug.enabled) {
          console.warn(
            `⚠️ [TRANSLATION] Using fallback translations for ${language}`
          );
        }
      }
    }

    // Store in memory cache
    this.cache.set(language, translations);
    return translations;
  }

  /**
   * Get a specific translation key
   */
  public async getTranslation(language: string, key: string): Promise<string> {
    const translations = await this.getTranslations(language);
    const translation = translations[key];

    if (
      !translation &&
      TRANSLATION_CONFIG.debug.enabled &&
      TRANSLATION_CONFIG.debug.logMissingTranslations
    ) {
      console.warn(
        `Translation missing for key: ${key} in language: ${language}`
      );
    }

    return translation || key; // Return key if translation not found
  }

  /**
   * Refresh translations from Google Sheets
   */
  public async refreshTranslations(language: string): Promise<TranslationData> {
    try {
      // Clear cache
      const cacheKey = getCacheKey(language);
      if (cacheKey) {
        await AsyncStorage.removeItem(cacheKey);
      }
      this.cache.delete(language);

      // Fetch fresh translations
      const translations = await this.fetchFromGoogleSheets(language);

      if (translations) {
        await this.cacheTranslations(language, translations);
        this.cache.set(language, translations);
        return translations;
      } else {
        // Fallback to local translations
        const fallbackTranslations =
          this.fallbackTranslations.get(language) || {};
        this.cache.set(language, fallbackTranslations);
        return fallbackTranslations;
      }
    } catch (error) {
      console.error(`Failed to refresh translations for ${language}:`, error);
      const fallbackTranslations =
        this.fallbackTranslations.get(language) || {};
      this.cache.set(language, fallbackTranslations);
      return fallbackTranslations;
    }
  }

  /**
   * Clear all caches
   */
  public async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      this.cache.clear();

      // Clear AsyncStorage cache
      const keys = TRANSLATION_CONFIG.supportedLanguages.map((lang) =>
        getCacheKey(lang)
      );
      await AsyncStorage.multiRemove(keys);

      if (TRANSLATION_CONFIG.debug.enabled) {
        console.log("Translation cache cleared");
      }
    } catch (error) {
      console.error("Failed to clear translation cache:", error);
    }
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): string[] {
    return TRANSLATION_CONFIG.supportedLanguages;
  }

  /**
   * Check if translations are cached
   */
  public async isCached(language: string): Promise<boolean> {
    const cacheKey = getCacheKey(language);
    if (!cacheKey) return false;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return false;

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();

      return now - cacheData.timestamp <= TRANSLATION_CONFIG.cache.expiryTime;
    } catch {
      return false;
    }
  }
}

export default TranslationService;
