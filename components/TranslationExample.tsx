import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useTranslation, useT } from "../hooks/useTranslation";
import { useLanguage } from "../contexts/LanguageContext";
import TranslationService from "../services/TranslationService";

/**
 * Example component showing how to use the new translation system
 */
const TranslationExample: React.FC = () => {
  const { t, loading, error, refreshTranslations } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [translationSource, setTranslationSource] =
    useState<string>("Checking...");
  const [isCached, setIsCached] = useState<boolean>(false);

  // Example of using the shorthand hook
  const welcomeText = useT("welcome", "Welcome");
  const servicesText = useT("services", "Services");

  // Check translation source
  useEffect(() => {
    const checkSource = async () => {
      try {
        const service = TranslationService.getInstance();
        const cached = await service.isCached(language);
        setIsCached(cached);
        setTranslationSource(
          cached
            ? "📱 Cached (from Google Sheets)"
            : "🌐 Fresh (from Google Sheets)"
        );
      } catch (err) {
        setTranslationSource("📁 Local files (fallback)");
      }
    };

    checkSource();
  }, [language]);

  const handleRefresh = async () => {
    try {
      await refreshTranslations();
      setTranslationSource("🌐 Fresh (from Google Sheets)");
      Alert.alert("Success", "Translations refreshed from Google Sheets!");
    } catch (err) {
      Alert.alert("Error", "Failed to refresh translations");
    }
  };

  const handleClearCache = async () => {
    try {
      const service = TranslationService.getInstance();
      await service.clearCache();
      setTranslationSource("🔄 Cache cleared");
      Alert.alert(
        "Success",
        "Cache cleared! Next load will fetch from Google Sheets."
      );
    } catch (err) {
      Alert.alert("Error", "Failed to clear cache");
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    // @ts-ignore
    setLanguage(newLanguage);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading translations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.button} onPress={handleRefresh}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Translation System Demo</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Language: {language}</Text>
        <Text style={styles.sourceText}>
          Translation Source: {translationSource}
        </Text>
        <Text style={styles.cacheText}>
          Cache Status: {isCached ? "✅ Cached" : "❌ Not Cached"}
        </Text>

        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              language === "en" && styles.activeButton,
            ]}
            onPress={() => handleLanguageChange("en")}
          >
            <Text style={styles.languageButtonText}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              language === "ru" && styles.activeButton,
            ]}
            onPress={() => handleLanguageChange("ru")}
          >
            <Text style={styles.languageButtonText}>Русский</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              language === "hy" && styles.activeButton,
            ]}
            onPress={() => handleLanguageChange("hy")}
          >
            <Text style={styles.languageButtonText}>Հայերեն</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sample Translations:</Text>
        <Text style={styles.translationText}>Welcome: {welcomeText}</Text>
        <Text style={styles.translationText}>Services: {servicesText}</Text>
        <Text style={styles.translationText}>
          Orders: {t("orders", "Orders")}
        </Text>
        <Text style={styles.translationText}>
          Profile: {t("profile", "Profile")}
        </Text>
        <Text style={styles.translationText}>
          Settings: {t("settings", "Settings")}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions:</Text>
        <TouchableOpacity style={styles.button} onPress={handleRefresh}>
          <Text style={styles.buttonText}>🔄 Refresh from Google Sheets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Test:</Text>
        <Text style={styles.instructionText}>
          1. Click "Clear Cache" then "Refresh" to force Google Sheets fetch
        </Text>
        <Text style={styles.instructionText}>
          2. Check console logs for "Fetching translations from Google Sheets"
        </Text>
        <Text style={styles.instructionText}>
          3. If you see "🌐 Fresh (from Google Sheets)" - it's working!
        </Text>
        <Text style={styles.instructionText}>
          4. If you see "📁 Local files" - check your API key
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  languageButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  languageButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  activeButton: {
    backgroundColor: "#007AFF",
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  translationText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#FF3B30",
    marginBottom: 10,
  },
  sourceText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 5,
  },
  cacheText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    marginTop: 10,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default TranslationExample;
