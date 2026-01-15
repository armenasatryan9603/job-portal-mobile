import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import TranslationService, {
  TranslationData,
} from "../categories/TranslationService";
import { useLanguage } from "./LanguageContext";
import TRANSLATION_CONFIG from "../config/translations";

interface TranslationContextType {
  translations: TranslationData;
  loading: boolean;
  error: string | null;
  refreshTranslations: () => Promise<void>;
  getTranslation: (key: string, fallback?: string) => string;
  t: (key: string, fallback?: string) => string; // Shorthand for getTranslation
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
}) => {
  const { language } = useLanguage();
  const [translations, setTranslations] = useState<TranslationData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translationService = TranslationService.getInstance();

  const refreshTranslations = async () => {
    try {
      setLoading(true);
      setError(null);

      const refreshedTranslations =
        await translationService.refreshTranslations(language);
      setTranslations(refreshedTranslations);
    } catch (err) {
      console.error("Failed to refresh translations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh translations"
      );
    } finally {
      setLoading(false);
    }
  };

  const getTranslation = (key: string, fallback?: string): string => {
    const translation = translations[key];

    if (translation) {
      return translation;
    }

    // If no translation found, return fallback or key
    if (fallback) {
      return fallback;
    }

    // Log missing translation for debugging (only in debug mode)
    if (
      TRANSLATION_CONFIG.debug.enabled &&
      TRANSLATION_CONFIG.debug.logMissingTranslations
    ) {
      console.warn(
        `Translation missing for key: "${key}" in language: ${language}`
      );
    }
    return key;
  };

  const t = getTranslation; // Shorthand alias

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetchedTranslations = await translationService.getTranslations(
          language
        );

        setTranslations(fetchedTranslations);
      } catch (err) {
        console.error("Failed to load translations:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load translations"
        );
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  const value: TranslationContextType = {
    translations,
    loading,
    error,
    refreshTranslations,
    getTranslation,
    t,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};

// Hook for getting a specific translation
export const useT = () => {
  const { t } = useTranslation();
  return t;
};

// Hook for checking if translations are loading
export const useTranslationLoading = () => {
  const { loading } = useTranslation();
  return loading;
};

// Hook for getting translation error
export const useTranslationError = () => {
  const { error } = useTranslation();
  return error;
};

export default TranslationContext;
