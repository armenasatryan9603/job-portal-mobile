import AsyncStorage from "@react-native-async-storage/async-storage";
import TRANSLATION_CONFIG, {
  getCacheKey,
  isLanguageSupported,
} from "../config/translations";
import { getApiBaseUrl } from "../config/api";

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

      console.log(
        `🌐 [FRONTEND] Fetching translations for ${language} from backend API: ${url}`
      );

      const startTime = Date.now();
      const response = await fetch(url);
      const fetchDuration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ [TRANSLATION] HTTP error! status: ${response.status}`
        );
        console.error(`❌ [TRANSLATION] Error response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log(
        `📊 [FRONTEND] Received response from backend for ${language} (${fetchDuration}ms)`
      );

      if (!data.success || !data.translations) {
        console.warn(
          `⚠️ [FRONTEND] No data found in backend response for ${language}`
        );
        return null;
      }

      const translations = data.translations as TranslationData;
      const keyCount = Object.keys(translations).length;

      console.log(
        `✅ [FRONTEND] Successfully loaded ${keyCount} translations for ${language} from backend`
      );

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

      const keyCount = Object.keys(cacheData.translations).length;
      const ageMinutes = Math.floor((Date.now() - cacheData.timestamp) / 60000);
      console.log(
        `💾 [FRONTEND] Cache hit for ${language} (${keyCount} keys, cached ${ageMinutes}min ago)`
      );

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

      console.log(
        `💾 [FRONTEND] Cached ${Object.keys(translations).length} translations for ${language} in AsyncStorage`
      );
    } catch (error) {
      console.error(`Failed to cache translations for ${language}:`, error);
    }
  }

  /**
   * Get translations for a specific language
   */
  public async getTranslations(language: string): Promise<TranslationData> {
    console.log(`🔍 [FRONTEND] Getting translations for language: ${language}`);
    
    // Check memory cache first
    if (this.cache.has(language)) {
      const cached = this.cache.get(language)!;
      const keyCount = Object.keys(cached).length;
      console.log(`⚡ [FRONTEND] Memory cache hit for ${language} (${keyCount} keys)`);
      return cached;
    }

    // Try to get from AsyncStorage cache
    let translations = await this.getCachedTranslations(language);

    if (!translations) {
      console.log(`📡 [FRONTEND] Cache miss for ${language}, fetching from backend...`);
      // Try to fetch from backend API
      translations = await this.fetchFromBackend(language);

      if (translations && Object.keys(translations).length > 0) {
        // Cache the translations
        console.log(`💾 [FRONTEND] Caching translations for ${language}`);
        await this.cacheTranslations(language, translations);
      } else {
        console.warn(
          `⚠️ [FRONTEND] No translations found for ${language}, returning empty object`
        );
        translations = {}; // Return empty object if fetch fails
      }
    } else {
      console.log(`📦 [FRONTEND] Using cached translations for ${language}`);
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
   * Refresh translations (reloads from backend)
   */
  public async refreshTranslations(language: string): Promise<TranslationData> {
    console.log(`🔄 [FRONTEND] Refreshing translations for ${language} from backend...`);
    try {
      // Clear cache
      const cacheKey = getCacheKey(language);
      if (cacheKey) {
        await AsyncStorage.removeItem(cacheKey);
        console.log(`🗑️ [FRONTEND] Cleared AsyncStorage cache for ${language}`);
      }
      this.cache.delete(language);
      console.log(`🗑️ [FRONTEND] Cleared memory cache for ${language}`);

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
