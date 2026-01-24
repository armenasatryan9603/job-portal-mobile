import {
  AVAILABLE_LANGUAGES,
  Language,
  LanguageProficiencyLevel,
  PROFICIENCY_LEVELS,
  getLanguageByCode,
  getProficiencyLevelLabel,
} from "@/constants/languages";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { ThemeColors, Typography } from "@/constants/styles";
import { UserLanguage, UserProfile, apiService } from "@/categories/api";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/CountBadge";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

interface LanguagesSectionProps {
  profile: UserProfile;
  userId?: number;
  onProfileUpdate?: (profile: UserProfile) => void;
}

// Proficiency level colors for visual indicators
const getProficiencyColor = (level: LanguageProficiencyLevel, colors: typeof ThemeColors.light | typeof ThemeColors.dark): string => {
  switch (level) {
    case LanguageProficiencyLevel.NATIVE:
      return colors.success;
    case LanguageProficiencyLevel.FLUENT:
      return colors.info;
    case LanguageProficiencyLevel.ADVANCED:
      return colors.purple;
    case LanguageProficiencyLevel.UPPER_INTERMEDIATE:
      return colors.warning;
    case LanguageProficiencyLevel.INTERMEDIATE:
      return colors.amber;
    case LanguageProficiencyLevel.ELEMENTARY:
      return colors.deepOrange;
    case LanguageProficiencyLevel.BEGINNER:
      return colors.textTertiary;
    default:
      return colors.textTertiary;
  }
};

export function LanguagesSection({
  profile,
  userId,
  onProfileUpdate,
}: LanguagesSectionProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userLanguages, setUserLanguages] = useState<UserLanguage[]>(
    profile.languages || []
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Sync userLanguages when profile changes
  useEffect(() => {
    setUserLanguages(profile.languages || []);
  }, [profile.languages]);

  const handleStartEdit = () => {
    setUserLanguages(profile.languages || []);
    setIsEditing(true);
    setExpandedIndex(null);
  };

  const handleCancelEdit = () => {
    setUserLanguages(profile.languages || []);
    setIsEditing(false);
    setExpandedIndex(null);
  };

  const handleAddLanguage = () => {
    const existingCodes = userLanguages.map((lang) => lang.code);
    const availableLanguage = AVAILABLE_LANGUAGES.find(
      (lang) => !existingCodes.includes(lang.code)
    );

    if (availableLanguage) {
      const newLanguage: UserLanguage = {
        code: availableLanguage.code,
        level: LanguageProficiencyLevel.INTERMEDIATE,
      };
      setUserLanguages([...userLanguages, newLanguage]);
      setExpandedIndex(userLanguages.length);
    }
  };

  const handleRemoveLanguage = (index: number) => {
    Alert.alert(t("removeLanguage"), t("areYouSureRemoveLanguage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: () => {
          setUserLanguages(userLanguages.filter((_, i) => i !== index));
          if (expandedIndex === index) {
            setExpandedIndex(null);
          } else if (expandedIndex !== null && expandedIndex > index) {
            setExpandedIndex(expandedIndex - 1);
          }
        },
      },
    ]);
  };

  const handleLanguageChange = (index: number, code: string) => {
    const updated = [...userLanguages];
    updated[index] = { ...updated[index], code };
    setUserLanguages(updated);
  };

  const handleLevelChange = (
    index: number,
    level: LanguageProficiencyLevel
  ) => {
    const updated = [...userLanguages];
    updated[index] = { ...updated[index], level };
    setUserLanguages(updated);
    setExpandedIndex(null); // Collapse after selection
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);

      // Validate languages
      const languageCodes = userLanguages.map((lang) => lang.code);
      const uniqueCodes = new Set(languageCodes);
      if (languageCodes.length !== uniqueCodes.size) {
        Alert.alert(t("error"), t("duplicateLanguagesNotAllowed"));
        return;
      }

      // Update profile on backend
      const updatedProfile = await apiService.updateUserProfile({
        languages: userLanguages,
      });

      // Update user in AuthContext
      await updateUser({
        languages: updatedProfile.languages || undefined,
      });

      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      setIsEditing(false);
      setExpandedIndex(null);
    } catch (error) {
      console.error("Error updating languages:", error);
      Alert.alert(t("error"), t("failedToUpdateProfile"));
    } finally {
      setSaving(false);
    }
  };

  const getAvailableLanguagesForIndex = (index: number): Language[] => {
    const existingCodes = userLanguages
      .map((lang, i) => (i !== index ? lang.code : null))
      .filter((code): code is string => code !== null);
    return AVAILABLE_LANGUAGES.filter(
      (lang) => !existingCodes.includes(lang.code)
    );
  };

  const getLanguageName = (code: string): string => {
    const lang = getLanguageByCode(code);
    if (!lang) return code;
    if (language === "ru" && lang.nameRu) return lang.nameRu;
    if (language === "hy" && lang.nameHy) return lang.nameHy;
    return lang.name;
  };

  return (
    <ResponsiveCard>
      <View style={styles.languagesHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("languages")}
          </Text>
          <CountBadge count={profile.languages?.length || 0} />
        </View>
        {!userId && !isEditing && (
          <Button
            variant="primary"
            icon="pencil"
            iconSize={14}
            title={t("edit")}
            iconPosition="left"
            backgroundColor={colors.primary}
            textColor="white"
            onPress={handleStartEdit}
          />
        )}
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          {userLanguages.length > 0 ? (
            <View style={styles.languagesList}>
              {userLanguages.map((userLang, index) => {
                const lang = getLanguageByCode(userLang.code);
                const levelLabel = getProficiencyLevelLabel(
                  userLang.level as LanguageProficiencyLevel,
                  language as "en" | "ru" | "hy"
                );
                const proficiencyColor = getProficiencyColor(
                  userLang.level as LanguageProficiencyLevel,
                  colors
                );
                const isExpanded = expandedIndex === index;
                const availableLanguages = getAvailableLanguagesForIndex(index);

                // Combine available languages with current language, ensuring no duplicates
                const allLanguagesForSelection = (() => {
                  const all = [...availableLanguages];
                  if (
                    lang &&
                    !availableLanguages.find((l) => l.code === lang.code)
                  ) {
                    all.push(lang);
                  }
                  // Remove any duplicates by code
                  const seen = new Set<string>();
                  return all.filter((l) => {
                    if (seen.has(l.code)) {
                      return false;
                    }
                    seen.add(l.code);
                    return true;
                  });
                })();

                return (
                  <View
                    key={`lang-item-${index}-${userLang.code}`}
                    style={[
                      styles.languageItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.languageItemHeader}>
                      <TouchableOpacity
                        style={styles.languageItemMain}
                        onPress={() =>
                          setExpandedIndex(isExpanded ? null : index)
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.proficiencyIndicator,
                            { backgroundColor: proficiencyColor },
                          ]}
                        />
                        <View style={styles.languageItemText}>
                          <Text
                            style={[
                              styles.languageName,
                              { color: colors.text },
                            ]}
                          >
                            {lang
                              ? getLanguageName(lang.code)
                              : userLang.code.toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              styles.languageLevel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {levelLabel}
                          </Text>
                        </View>
                        <IconSymbol
                          name={isExpanded ? "chevron.up" : "chevron.down"}
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveLanguage(index)}
                        style={styles.removeButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol
                          name="trash.fill"
                          size={16}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {/* Language Selection */}
                        <View style={styles.selectionGroup}>
                          <Text
                            style={[
                              styles.selectionLabel,
                              { color: colors.text },
                            ]}
                          >
                            {t("language")}
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.optionsScroll}
                            contentContainerStyle={styles.optionsContainer}
                          >
                            {allLanguagesForSelection.map((l) => {
                              const isSelected = userLang.code === l.code;
                              return (
                                <TouchableOpacity
                                  key={`lang-option-${index}-${l.code}`}
                                  style={[
                                    styles.optionChip,
                                    {
                                      backgroundColor: isSelected
                                        ? colors.primary
                                        : colors.background,
                                      borderColor: isSelected
                                        ? colors.primary
                                        : colors.border,
                                    },
                                  ]}
                                  onPress={() =>
                                    handleLanguageChange(index, l.code)
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.optionChipText,
                                      {
                                        color: isSelected
                                          ? colors.textInverse
                                          : colors.text,
                                      },
                                    ]}
                                  >
                                    {getLanguageName(l.code)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>

                        {/* Proficiency Level Selection */}
                        <View style={styles.selectionGroup}>
                          <Text
                            style={[
                              styles.selectionLabel,
                              { color: colors.text },
                            ]}
                          >
                            {t("proficiencyLevel")}
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.optionsScroll}
                            contentContainerStyle={styles.optionsContainer}
                          >
                            {PROFICIENCY_LEVELS.map((level) => {
                              const isSelected = userLang.level === level.value;
                              const levelColor = getProficiencyColor(
                                level.value,
                                colors
                              );
                              return (
                                <TouchableOpacity
                                  key={`level-${index}-${level.value}`}
                                  style={[
                                    styles.optionChip,
                                    {
                                      backgroundColor: isSelected
                                        ? colors.primary
                                        : colors.background,
                                      borderColor: isSelected
                                        ? colors.primary
                                        : colors.border,
                                    },
                                  ]}
                                  onPress={() =>
                                    handleLevelChange(index, level.value)
                                  }
                                  activeOpacity={0.7}
                                >
                                  <View
                                    style={[
                                      styles.levelDot,
                                      { backgroundColor: levelColor },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.optionChipText,
                                      {
                                        color: isSelected
                                          ? colors.textInverse
                                          : colors.text,
                                      },
                                    ]}
                                  >
                                    {language === "ru" && level.labelRu
                                      ? level.labelRu
                                      : language === "hy" && level.labelHy
                                      ? level.labelHy
                                      : level.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="globe" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("noLanguagesAdded")}
              </Text>
            </View>
          )}

          {userLanguages.length < AVAILABLE_LANGUAGES.length && (
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + "10",
                },
              ]}
              onPress={handleAddLanguage}
              disabled={saving}
              activeOpacity={0.7}
            >
              <IconSymbol
                name="plus.circle.fill"
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                {t("addLanguage")}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.editActions}>
            <Button
              variant="outline"
              icon="trash"
              iconSize={14}
              title={t("cancel")}
              iconPosition="left"
              backgroundColor={colors.background}
              textColor={colors.text}
              onPress={handleCancelEdit}
              disabled={saving}
            />
            <Button
              variant="primary"
              icon="checkmark"
              iconSize={14}
              title={t("save")}
              iconPosition="left"
              backgroundColor={colors.primary}
              textColor="white"
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </View>
      ) : (
        <>
          {profile.languages && profile.languages.length > 0 ? (
            <View style={styles.languagesChipsContainer}>
              {profile.languages.map((userLang, index) => {
                const lang = getLanguageByCode(userLang.code);
                const levelLabel = getProficiencyLevelLabel(
                  userLang.level as LanguageProficiencyLevel,
                  language as "en" | "ru" | "hy"
                );
                const proficiencyColor = getProficiencyColor(
                  userLang.level as LanguageProficiencyLevel,
                  colors
                );

                return (
                  <View
                    key={`display-lang-${index}-${userLang.code}-${userLang.level}`}
                    style={[
                      styles.languageChip,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.proficiencyIndicator,
                        { backgroundColor: proficiencyColor },
                      ]}
                    />
                    <Text
                      style={[styles.chipLanguageName, { color: colors.text }]}
                    >
                      {lang
                        ? getLanguageName(lang.code)
                        : userLang.code.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.chipLevel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      • {levelLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="globe" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("noLanguagesAdded")}
              </Text>
            </View>
          )}
        </>
      )}
    </ResponsiveCard>
  );
}

const styles = StyleSheet.create({
  languagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  languagesChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  proficiencyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLanguageName: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipLevel: {
    fontSize: 11,
    fontWeight: "500",
  },
  editContainer: {
    gap: 12,
  },
  languagesList: {
    gap: 8,
  },
  languageItem: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  languageItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  languageItemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  languageItemText: {
    flex: 1,
  },
  languageName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  languageLevel: {
    fontSize: 12,
    fontWeight: "500",
  },
  removeButton: {
    padding: 4,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  selectionGroup: {
    gap: 8,
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsScroll: {
    maxHeight: 50,
  },
  optionsContainer: {
    gap: 6,
    paddingRight: 12,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    alignSelf: "flex-start",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
});
