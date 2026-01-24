import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import TranslationService from "../categories/TranslationService";

/**
 * Example component showing how to use the new translation system
 */
const TranslationExample: React.FC = () => {
  const { t, loading, refreshTranslations } = useTranslation();

  const handleRefresh = async () => {
    try {
      await refreshTranslations();
      setTimeout(() => {
        handleClearCache();
        Alert.alert(t("success"), t("translationsRefreshedFromBackend"));
      }, 1000);
    } catch (err) {
      Alert.alert("Error", "Failed to refresh translations");
    }
  };

  const handleClearCache = async () => {
    try {
      const service = TranslationService.getInstance();
      await service.clearCache();

      // Force reload translations after clearing cache
      await refreshTranslations();

      Alert.alert(t("success"), t("cacheClearedTranslationsReloaded"));
    } catch (err) {
      Alert.alert(t("error"), t("failedToClearCache"));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading translations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Translation System Demo</Text>

      <TouchableOpacity style={styles.button} onPress={handleRefresh}>
        <Text style={styles.buttonText}>🔄 Refresh Translations</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    // Note: Should use colors.link dynamically - consider inline style
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
});

export default TranslationExample;
