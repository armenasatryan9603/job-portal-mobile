import { useTranslation as useTranslationContext } from "../contexts/TranslationContext";

/**
 * Custom hook for easy translation access
 * Provides the same interface as the context but with a cleaner API
 */
export const useTranslation = () => {
  const context = useTranslationContext();

  return {
    t: context.t,
    getTranslation: context.getTranslation,
    translations: context.translations,
    loading: context.loading,
    error: context.error,
    refreshTranslations: context.refreshTranslations,
  };
};

/**
 * Hook for getting a specific translation with fallback
 * @param key - Translation key
 * @param fallback - Fallback text if translation not found
 * @returns Translated text or fallback
 */
export const useT = (key: string, fallback?: string) => {
  const { t } = useTranslation();
  return t(key, fallback);
};

/**
 * Hook for getting multiple translations at once
 * @param keys - Array of translation keys
 * @returns Object with key-value pairs of translations
 */
export const useTranslations = (keys: string[]) => {
  const { t } = useTranslation();

  const result: { [key: string]: string } = {};
  keys.forEach((key) => {
    result[key] = t(key);
  });

  return result;
};

/**
 * Hook for conditional translations
 * @param condition - Boolean condition
 * @param trueKey - Translation key for true condition
 * @param falseKey - Translation key for false condition
 * @returns Translated text based on condition
 */
export const useConditionalTranslation = (
  condition: boolean,
  trueKey: string,
  falseKey: string
) => {
  const { t } = useTranslation();
  return t(condition ? trueKey : falseKey);
};

/**
 * Hook for plural translations
 * @param count - Number for pluralization
 * @param singularKey - Translation key for singular form
 * @param pluralKey - Translation key for plural form
 * @returns Translated text based on count
 */
export const usePluralTranslation = (
  count: number,
  singularKey: string,
  pluralKey: string
) => {
  const { t } = useTranslation();
  return t(count === 1 ? singularKey : pluralKey);
};

export default useTranslation;
