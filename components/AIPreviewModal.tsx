import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/contexts/TranslationContext";

interface AIPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  original: {
    title: string;
    description: string;
  };
  enhanced: {
    titleEn: string;
    titleRu: string;
    titleHy: string;
    descriptionEn: string;
    descriptionRu: string;
    descriptionHy: string;
    detectedLanguage: string;
  };
  onAccept: (enhanced: any) => void;
  onReject: () => void;
  onRetryAI?: (title: string, description: string) => Promise<void>;
  loading?: boolean;
}

export const AIPreviewModal: React.FC<AIPreviewModalProps> = ({
  visible,
  onClose,
  original,
  enhanced,
  onAccept,
  onReject,
  onRetryAI,
  loading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "ru" | "hy">(
    language as "en" | "ru" | "hy"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(original.title);
  const [editedDescription, setEditedDescription] = useState(
    original.description
  );
  const [currentEnhanced, setCurrentEnhanced] = useState(enhanced);
  const [isRetrying, setIsRetrying] = useState(false);

  // Update edited text when original changes
  useEffect(() => {
    if (visible) {
      setEditedTitle(original.title);
      setEditedDescription(original.description);
      setCurrentEnhanced(enhanced);
      setIsEditing(false);
    }
  }, [original, enhanced, visible]);

  const handleRetryAI = async () => {
    if (!onRetryAI || !editedTitle.trim() || !editedDescription.trim()) return;
    setIsRetrying(true);
    try {
      await onRetryAI(editedTitle.trim(), editedDescription.trim());
      setIsEditing(false);
      // The enhanced data will be updated via useEffect when props change
    } catch (error) {
      console.error("Error retrying AI:", error);
      // Keep editing mode open so user can fix and retry
    } finally {
      setIsRetrying(false);
    }
  };

  const getTitle = (
    lang: "en" | "ru" | "hy",
    enhancedData = currentEnhanced
  ) => {
    switch (lang) {
      case "ru":
        return enhancedData.titleRu;
      case "hy":
        return enhancedData.titleHy;
      default:
        return enhancedData.titleEn;
    }
  };

  const getDescription = (
    lang: "en" | "ru" | "hy",
    enhancedData = currentEnhanced
  ) => {
    switch (lang) {
      case "ru":
        return enhancedData.descriptionRu;
      case "hy":
        return enhancedData.descriptionHy;
      default:
        return enhancedData.descriptionEn;
    }
  };

  const getLanguageName = (lang: "en" | "ru" | "hy") => {
    switch (lang) {
      case "ru":
        return "Русский";
      case "hy":
        return "Հայերեն";
      default:
        return "English";
    }
  };

  const getLanguageFlag = (lang: "en" | "ru" | "hy") => {
    switch (lang) {
      case "ru":
        return "🇷🇺";
      case "hy":
        return "🇦🇲";
      default:
        return "🇬🇧";
    }
  };

  const handleEnhancedChange = (
    field: "title" | "description",
    lang: "en" | "ru" | "hy",
    value: string
  ) => {
    setCurrentEnhanced((prev) => {
      const key =
        field === "title"
          ? lang === "ru"
            ? "titleRu"
            : lang === "hy"
            ? "titleHy"
            : "titleEn"
          : lang === "ru"
          ? "descriptionRu"
          : lang === "hy"
          ? "descriptionHy"
          : "descriptionEn";

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Compact Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View
              style={[styles.iconBadge, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="sparkles" size={18} color={colors.textInverse} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("aiPreview")}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          bounces={false}
        >
          {/* Compact Language Selector */}
          <View style={styles.languageSelector}>
            {(["en", "ru", "hy"] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languagePill,
                  selectedLanguage === lang && {
                    backgroundColor: colors.primary,
                  },
                  selectedLanguage !== lang && {
                    backgroundColor: colors.border + "40",
                  },
                ]}
                onPress={() => setSelectedLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text style={styles.languageFlag}>{getLanguageFlag(lang)}</Text>
                <Text
                  style={[
                    styles.languageText,
                    {
                      color: selectedLanguage === lang ? colors.textInverse : colors.text,
                      fontWeight: selectedLanguage === lang ? "600" : "400",
                    },
                  ]}
                >
                  {getLanguageName(lang)}
                </Text>
              </TouchableOpacity>
            ))}
            <View
              style={[
                styles.detectedBadge,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <IconSymbol
                name="checkmark.circle.fill"
                size={12}
                color={colors.primary}
              />
              <Text style={[styles.detectedText, { color: colors.primary }]}>
                {currentEnhanced.detectedLanguage.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Compact Comparison */}
          <View style={styles.comparisonContainer}>
            {/* Original / Editable */}
            <View style={[styles.compactCard, { borderColor: colors.border }]}>
              <View style={styles.compactHeader}>
                <IconSymbol
                  name="doc.text"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.compactLabel, { color: colors.textSecondary }]}
                >
                  {t("originalText")}
                </Text>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editButtonSmall}
                  >
                    <IconSymbol
                      name="pencil"
                      size={12}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.editButtonText, { color: colors.primary }]}
                    >
                      {t("edit")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[
                      styles.textInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={editedTitle}
                    onChangeText={setEditedTitle}
                    placeholder={t("title")}
                    placeholderTextColor={colors.textSecondary}
                    multiline={false}
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputMultiline,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    placeholder={t("description")}
                    placeholderTextColor={colors.textSecondary}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditing(false);
                        setEditedTitle(original.title);
                        setEditedDescription(original.description);
                      }}
                      style={[
                        styles.cancelEditButton,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[styles.cancelEditText, { color: colors.text }]}
                      >
                        {t("cancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleRetryAI}
                      style={[
                        styles.retryButton,
                        { backgroundColor: colors.primary },
                      ]}
                      disabled={
                        isRetrying ||
                        !editedTitle.trim() ||
                        !editedDescription.trim()
                      }
                    >
                      {isRetrying ? (
                        <ActivityIndicator size="small" color={colors.textInverse} />
                      ) : (
                        <>
                          <IconSymbol
                            name="arrow.clockwise"
                            size={14}
                            color={colors.textInverse}
                          />
                          <Text style={styles.retryButtonText}>
                            {t("retryAI")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.compactTitle,
                      { color: colors.text },
                    ]}
                    selectable={false}
                  >
                    {editedTitle}
                  </Text>
                  <Text
                    style={[styles.compactDescription, { color: colors.text }]}
                    numberOfLines={3}
                    selectable={false}
                  >
                    {editedDescription}
                  </Text>
                </>
              )}
            </View>

            {/* Enhanced */}
            <View
              style={[
                styles.compactCard,
                styles.enhancedCard,
                {
                  borderColor: colors.primary + "60",
                  backgroundColor: colors.primary + "05",
                },
              ]}
            >
              <View style={styles.compactHeader}>
                <IconSymbol name="sparkles" size={14} color={colors.primary} />
                <Text style={[styles.compactLabel, { color: colors.primary }]}>
                  {t("aiEnhancedText")}
                </Text>
              </View>
              <View style={styles.editContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={getTitle(selectedLanguage, currentEnhanced)}
                  onChangeText={(text) =>
                    handleEnhancedChange("title", selectedLanguage, text)
                  }
                  placeholder={t("title")}
                  placeholderTextColor={colors.textSecondary}
                  multiline={false}
                  contextMenuHidden
                  selectTextOnFocus={false}
                />
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textInputMultiline,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={getDescription(selectedLanguage, currentEnhanced)}
                  onChangeText={(text) =>
                    handleEnhancedChange("description", selectedLanguage, text)
                  }
                  placeholder={t("description")}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  contextMenuHidden
                  selectTextOnFocus={false}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Compact Action Buttons */}
        {!isEditing && (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Button
              variant="outline"
              title={t("rejectUseOriginal")}
              onPress={onReject}
              textColor={colors.text}
              disabled={loading}
              style={styles.rejectButton}
            />
            <Button
              variant="primary"
              title={t("acceptAndSave")}
              onPress={() => onAccept(currentEnhanced)}
              disabled={loading}
              loading={loading}
              style={styles.acceptButton}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 12,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  languageFlag: {
    fontSize: 14,
  },
  languageText: {
    fontSize: 12,
    fontWeight: "500",
  },
  detectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: "auto",
  },
  detectedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  comparisonContainer: {
    gap: 10,
  },
  compactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  enhancedCard: {
    borderWidth: 1.5,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  compactDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#666",
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 50,
    borderTopWidth: 1,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    minHeight: 44,
  },
  editButton: {
    flex: 1,
    minHeight: 44,
  },
  acceptButton: {
    flex: 1.2,
    minHeight: 44,
  },
  editButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  editContainer: {
    gap: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    minHeight: 44,
  },
  textInputMultiline: {
    minHeight: 100,
    paddingTop: 10,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  cancelEditButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEditText: {
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
  },
  retryButtonText: {
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
