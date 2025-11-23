import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import TRANSLATION_CONFIG, {
  getCacheKey,
  isLanguageSupported,
} from "../config/translations";
import { getApiBaseUrl } from "../config/api";

// Import local translation files
import enTranslations from "../translations/en.json";
import ruTranslations from "../translations/ru.json";
import hyTranslations from "../translations/hy.json";

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

  private constructor() {}

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Check if running on simulator/emulator
   */
  private isSimulator(): boolean {
    return !Device.isDevice;
  }

  /**
   * Load translations from local JSON files
   */
  private loadFromLocal(language: string): TranslationData | null {
    try {
      if (!isLanguageSupported(language)) {
        console.warn(`❌ Language not supported: ${language}`);
        return null;
      }

      let translations: TranslationData | null = null;

      switch (language) {
        case "en":
          translations = enTranslations as TranslationData;
          break;
        case "ru":
          translations = ruTranslations as TranslationData;
          break;
        case "hy":
          translations = hyTranslations as TranslationData;
          break;
        default:
          console.warn(
            `❌ No local translation file for language: ${language}`
          );
          return null;
      }

      if (translations && Object.keys(translations).length > 0) {
        console.log(
          `✅ [TRANSLATION] Loaded ${
            Object.keys(translations).length
          } translations from local file for ${language}`
        );
        return translations;
      }

      return null;
    } catch (error) {
      console.error(
        `❌ [TRANSLATION] Failed to load local translations for ${language}:`,
        error
      );
      return null;
    }
  }

  /**
   * Fetch translations from backend API
   */
  private async fetchFromBackend(
    language: string
  ): Promise<TranslationData | null> {
    try {
      if (!isLanguageSupported(language)) {
        console.warn(`❌ Language not supported: ${language}`);
        return null;
      }

      const apiUrl = getApiBaseUrl();
      const url = `${apiUrl}/translations/${language}`;

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

      if (!data.success || !data.translations) {
        console.warn(
          `⚠️ [TRANSLATION] No data found in backend response for ${language}`
        );
        return null;
      }

      const translations = data.translations as TranslationData;

      return translations;
    } catch (error) {
      console.error(
        `❌ [TRANSLATION] Failed to fetch translations from backend for ${language}:`,
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

      // Validate cache data - check if it looks corrupted
      const sampleValue = cacheData.translations["welcome"];
      if (
        sampleValue &&
        typeof sampleValue === "string" &&
        sampleValue.length > 0
      ) {
        return cacheData.translations;
      } else {
        console.warn(
          `⚠️ [TRANSLATION] Cache data appears corrupted for ${language}, ignoring cache`
        );
        // Remove corrupted cache
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
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

    // If running on simulator, use local files
    if (this.isSimulator()) {
      const localTranslations = this.loadFromLocal(language);
      if (localTranslations && Object.keys(localTranslations).length > 0) {
        // Store in memory cache
        this.cache.set(language, localTranslations);
        return localTranslations;
      }
      // If local load fails, fall through to backend/cache
    }

    // Try to get from AsyncStorage cache
    let translations = await this.getCachedTranslations(language);

    if (!translations) {
      // Try to fetch from backend API
      translations = await this.fetchFromBackend(language);

      if (translations && Object.keys(translations).length > 0) {
        // Cache the translations
        await this.cacheTranslations(language, translations);
      } else {
        console.warn(
          `⚠️ [TRANSLATION] No translations found for ${language}, returning empty object`
        );
        translations = {}; // Return empty object if fetch fails
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
   * Refresh translations (reloads from backend or local files)
   */
  public async refreshTranslations(language: string): Promise<TranslationData> {
    try {
      // Clear cache
      const cacheKey = getCacheKey(language);
      if (cacheKey) {
        await AsyncStorage.removeItem(cacheKey);
      }
      this.cache.delete(language);

      // If running on simulator, use local files
      if (this.isSimulator()) {
        const localTranslations = this.loadFromLocal(language);
        if (localTranslations && Object.keys(localTranslations).length > 0) {
          this.cache.set(language, localTranslations);
          return localTranslations;
        }
      }

      // Fetch fresh translations from backend
      const translations = await this.fetchFromBackend(language);

      if (translations && Object.keys(translations).length > 0) {
        await this.cacheTranslations(language, translations);
        this.cache.set(language, translations);
        return translations;
      } else {
        // Return empty object if fetch fails
        const emptyTranslations: TranslationData = {};
        this.cache.set(language, emptyTranslations);
        return emptyTranslations;
      }
    } catch (error) {
      console.error(`Failed to refresh translations for ${language}:`, error);
      const emptyTranslations: TranslationData = {};
      this.cache.set(language, emptyTranslations);
      return emptyTranslations;
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
