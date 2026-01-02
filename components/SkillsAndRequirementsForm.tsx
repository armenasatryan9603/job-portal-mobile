import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { ResponsiveCard } from "./ResponsiveContainer";
import { IconSymbol } from "./ui/icon-symbol";
import { Skill } from "@/services/api";
import { SkillDescriptionModal } from "./SkillDescriptionModal";
import { useSkills } from "@/hooks/useApi";

interface SkillBadge {
  id: number | null;
  name: string;
  skillId?: number;
}

interface SkillsAndRequirementsFormProps {
  formData: {
    skills: string;
  };
  errors: {
    skills: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onSkillIdsChange?: (skillIds: number[], newSkillNames?: string[]) => void;
}

export const SkillsAndRequirementsForm: React.FC<
  SkillsAndRequirementsFormProps
> = ({ formData, errors, onFieldChange, onSkillIdsChange }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // Convert comma-separated string to array of skill names
  const skillsArray = formData.skills
    ? formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
    : [];

  // Initialize with skill badges
  const [skillBadges, setSkillBadges] = useState<SkillBadge[]>(
    skillsArray.map((name, index) => ({
      id: index,
      name,
      skillId: undefined,
    }))
  );

  // Current input value
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Fetch all skills from cache
  const { data: allSkills = [], isLoading: isLoadingSkills } = useSkills();

  // Sync skill badges when formData.skills changes (e.g., when loading order for edit)
  // Also match skill names with skillIds from cache
  useEffect(() => {
    // Only sync if allSkills are loaded (not empty or still loading)
    if (isLoadingSkills || allSkills.length === 0) {
      return;
    }

    const currentSkillsArray = formData.skills
      ? formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s)
      : [];

    // If no skills in formData, clear badges
    if (currentSkillsArray.length === 0) {
      if (skillBadges.length > 0) {
        setSkillBadges([]);
      }
      return;
    }

    // Check if badges need to be updated by comparing skill names
    const currentBadgeNames = skillBadges
      .map((b) => b.name.trim().toLowerCase())
      .sort()
      .join(",");
    const newSkillNames = currentSkillsArray
      .map((s) => s.trim().toLowerCase())
      .sort()
      .join(",");

    // Only update if skill names have changed
    if (currentBadgeNames !== newSkillNames) {
      // Match skill names with skillIds from cache
      const matchedBadges: SkillBadge[] = currentSkillsArray.map(
        (name, index) => {
          // Try to find matching skill in cache
          const matchedSkill = allSkills.find((skill) => {
            const skillNameEn = skill.nameEn?.toLowerCase().trim();
            const skillNameRu = skill.nameRu?.toLowerCase().trim();
            const skillNameHy = skill.nameHy?.toLowerCase().trim();
            const searchName = name.toLowerCase().trim();
            return (
              skillNameEn === searchName ||
              skillNameRu === searchName ||
              skillNameHy === searchName
            );
          });

          return {
            id: Date.now() + index,
            name: name.trim(),
            skillId: matchedSkill?.id,
          };
        }
      );

      setSkillBadges(matchedBadges);
    }
  }, [formData.skills, allSkills, isLoadingSkills]); // Removed onSkillIdsChange from deps

  // Keep ref updated with latest callback
  useEffect(() => {
    onSkillIdsChangeRef.current = onSkillIdsChange;
  }, [onSkillIdsChange]);

  // Notify parent when skillBadges change (separate effect to avoid render-time updates)
  useEffect(() => {
    if (!onSkillIdsChangeRef.current) {
      return;
    }

    // Create a stable string representation of current badges
    const badgesKey =
      skillBadges.length === 0
        ? "empty"
        : skillBadges
            .map((b) => `${b.skillId || "new"}:${b.name}`)
            .sort()
            .join("|");

    // Only notify if badges actually changed
    if (badgesKey === lastNotifiedBadgesRef.current) {
      return;
    }

    // Update the ref to track what we've notified
    lastNotifiedBadgesRef.current = badgesKey;

    const skillIds = skillBadges
      .filter((b) => b.skillId !== undefined)
      .map((b) => b.skillId!);
    const newSkillNames = skillBadges
      .filter((b) => b.skillId === undefined && b.name.trim().length > 0)
      .map((b) => b.name.trim());

    // Use setTimeout to ensure this runs after render
    const timeoutId = setTimeout(() => {
      if (onSkillIdsChangeRef.current) {
        onSkillIdsChangeRef.current(
          skillIds,
          newSkillNames.length > 0 ? newSkillNames : undefined
        );
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [skillBadges]);

  // Autocomplete suggestions (filtered locally)
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const containerRef = useRef<View>(null);
  const isSelectingSuggestionRef = useRef(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotifiedBadgesRef = useRef<string>("");
  const onSkillIdsChangeRef = useRef(onSkillIdsChange);

  // Get skill name in current language
  const getSkillName = (skill: Skill): string => {
    switch (language) {
      case "ru":
        return skill.nameRu;
      case "hy":
        return skill.nameHy;
      case "en":
      default:
        return skill.nameEn;
    }
  };

  // Filter skills locally when user types
  useEffect(() => {
    // Keep suggestions visible even when keyboard closes - don't check isInputFocused
    if (!currentInput || currentInput.trim().length === 0) {
      // Only hide if input is completely empty
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    const query = currentInput.trim().toLowerCase();
    if (query.length < 1) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    // Filter skills locally from cached data
    const filtered = allSkills
      .filter((skill) => {
        const nameEn = skill.nameEn?.toLowerCase() || "";
        const nameRu = skill.nameRu?.toLowerCase() || "";
        const nameHy = skill.nameHy?.toLowerCase() || "";
        return (
          nameEn.includes(query) ||
          nameRu.includes(query) ||
          nameHy.includes(query)
        );
      })
      .slice(0, 8); // Limit to 8 suggestions

    setSuggestions(filtered);
    // Show suggestions area if there are suggestions OR if we want to show create button
    // (i.e., always show when there's input, regardless of whether suggestions exist)
    setShowSuggestions(true);
  }, [currentInput, allSkills, language]);

  // Update parent when skill badges change
  const updateParentSkills = (badges: SkillBadge[]) => {
    const skillNames = badges
      .filter((b) => b.name.trim().length > 0)
      .map((b) => b.name.trim());
    const skillsString = skillNames.join(", ");
    onFieldChange("skills", skillsString);

    if (onSkillIdsChange) {
      // Get skill IDs for existing skills
      const skillIds = badges
        .filter((b) => b.skillId !== undefined)
        .map((b) => b.skillId!)
        .filter((id) => id > 0);

      // Get skill names for new skills (without IDs)
      const newSkillNames = badges
        .filter((b) => b.skillId === undefined && b.name.trim().length > 0)
        .map((b) => b.name.trim());

      // Pass both skillIds and new skill names
      // The parent component needs to handle both
      onSkillIdsChange(skillIds, newSkillNames);
    }
  };

  // Handle selecting a skill from suggestions
  const handleSelectSuggestion = (skill: Skill) => {
    // Mark that we're selecting a suggestion to prevent blur handler
    isSelectingSuggestionRef.current = true;

    // Clear any pending blur timeout IMMEDIATELY
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Get skill name BEFORE clearing input
    const skillName = getSkillName(skill);

    // Clear input and hide suggestions IMMEDIATELY
    setCurrentInput("");
    setShowSuggestions(false);
    setIsInputFocused(false);

    // Check if skill already exists
    const exists = skillBadges.some(
      (b) =>
        b.skillId === skill.id ||
        b.name.toLowerCase() === skillName.toLowerCase()
    );

    if (exists) {
      // Reset flag after delay
      setTimeout(() => {
        isSelectingSuggestionRef.current = false;
      }, 300);
      inputRef.current?.blur();
      return;
    }

    // Add new badge with the FULL skill name from suggestion (not the typed input like "po")
    const newBadge: SkillBadge = {
      id: Date.now(),
      name: skillName, // This will be "pos porox", not "po"
      skillId: skill.id,
    };
    const newBadges = [...skillBadges, newBadge];
    setSkillBadges(newBadges);
    updateParentSkills(newBadges);

    // Reset flag after delay
    setTimeout(() => {
      isSelectingSuggestionRef.current = false;
    }, 300);

    // Blur input to close keyboard
    inputRef.current?.blur();
  };

  // Handle creating a new skill
  const handleCreateNewSkill = () => {
    if (!currentInput || currentInput.trim().length === 0) return;

    const skillName = currentInput.trim();

    // Check if skill already exists
    const exists = skillBadges.some(
      (b) => b.name.toLowerCase() === skillName.toLowerCase()
    );

    if (exists) {
      setCurrentInput("");
      return;
    }

    // Add new badge
    const newBadge: SkillBadge = {
      id: Date.now(),
      name: skillName,
      skillId: undefined, // New skill, no ID yet
    };
    const newBadges = [...skillBadges, newBadge];
    setSkillBadges(newBadges);
    updateParentSkills(newBadges);

    setCurrentInput("");
    setShowSuggestions(false);
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    setCurrentInput(value);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    // Don't auto-create skills on blur - let user decide
    // Just update focus state and keep suggestions visible if they exist
    setIsInputFocused(false);

    // If there's no input, hide suggestions
    if (!currentInput || currentInput.trim().length === 0) {
      setShowSuggestions(false);
    }
    // Otherwise, keep suggestions visible so user can select or explicitly create
  };

  // Handle submitting input (Enter/Return key)
  const handleSubmitEditing = () => {
    if (suggestions.length > 0) {
      // Select first suggestion if available
      handleSelectSuggestion(suggestions[0]);
    } else {
      handleCreateNewSkill();
    }
  };

  // Handle deleting a badge
  const handleBadgeDelete = (index: number, e: any) => {
    e?.stopPropagation();
    const newBadges = skillBadges.filter((_, i) => i !== index);
    setSkillBadges(newBadges);
    updateParentSkills(newBadges);
  };

  // Handle long press on badge to show description
  const handleBadgeLongPress = (badge: SkillBadge) => {
    if (badge.skillId) {
      setSelectedSkillId(badge.skillId);
      setShowDescriptionModal(true);
    }
  };

  // Focus input when container is pressed
  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  const inputBorderColor = errors.skills
    ? "#ff4444"
    : isInputFocused
    ? colors.tint
    : colors.border;

  return (
    <ResponsiveCard>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("requiredSkills")}
      </Text>

      {/* Main input container */}
      <Pressable
        ref={containerRef}
        onPress={handleContainerPress}
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: inputBorderColor,
            borderWidth: isInputFocused ? 2 : 1,
          },
        ]}
      >
        <View style={styles.badgesContainer}>
          {skillBadges.map((badge, index) => (
            <Pressable
              key={badge.id || index}
              style={[
                styles.skillBadge,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                },
              ]}
              onLongPress={() => handleBadgeLongPress(badge)}
            >
              <Text
                style={[styles.skillBadgeText, { color: colors.text }]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
              <Pressable
                onPress={(e) => handleBadgeDelete(index, e)}
                style={styles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol
                  name="xmark.circle.fill"
                  size={16}
                  color={colors.tabIconDefault}
                />
              </Pressable>
            </Pressable>
          ))}

          <TextInput
            ref={inputRef}
            style={[styles.skillInput, { color: colors.text }]}
            value={currentInput}
            onChangeText={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onSubmitEditing={handleSubmitEditing}
            placeholder={t("addSkill") || "Add skill..."}
            placeholderTextColor={colors.tabIconDefault}
            maxLength={50}
            returnKeyType="done"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="none"
          />
        </View>

        {isLoadingSkills && (
          <ActivityIndicator
            size="small"
            color={colors.tint}
            style={styles.loadingIndicator}
          />
        )}
      </Pressable>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Pressable
          onPressIn={() => {
            // Prevent blur when tapping anywhere in suggestions area
            isSelectingSuggestionRef.current = true;
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
          }}
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowColor: "#000",
            },
          ]}
        >
          {suggestions.map((item) => (
            <Pressable
              key={item.id.toString()}
              style={({ pressed }) => [
                styles.suggestionItem,
                pressed && {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                },
              ]}
              onPress={() => {
                handleSelectSuggestion(item);
              }}
              onPressIn={() => {
                // Mark that we're selecting to prevent blur handler
                isSelectingSuggestionRef.current = true;

                // Clear blur timeout immediately
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current);
                  blurTimeoutRef.current = null;
                }
              }}
            >
              <IconSymbol
                name="checkmark.circle"
                size={18}
                color={colors.tint}
                style={styles.suggestionIcon}
              />
              <Text style={[styles.suggestionText, { color: colors.text }]}>
                {getSkillName(item)}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      )}

      {/* Option to create new skill if no suggestions match */}
      {currentInput.trim().length > 0 &&
        suggestions.length === 0 &&
        !isLoadingSkills && (
          <Pressable
            style={[
              styles.createNewSkillButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.tint,
              },
            ]}
            onPress={handleCreateNewSkill}
          >
            <IconSymbol name="plus.circle.fill" size={18} color={colors.tint} />
            <Text style={[styles.createNewSkillText, { color: colors.tint }]}>
              {t("createSkill") || "Create"} "{currentInput.trim()}"
            </Text>
          </Pressable>
        )}

      {errors.skills ? (
        <Text style={[styles.errorText, { color: "#ff4444" }]}>
          {errors.skills}
        </Text>
      ) : null}

      <SkillDescriptionModal
        visible={showDescriptionModal}
        skillId={selectedSkillId}
        onClose={() => {
          setShowDescriptionModal(false);
          setSelectedSkillId(null);
        }}
      />
    </ResponsiveCard>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    alignItems: "center",
  },
  skillBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    maxWidth: "100%",
  },
  skillBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  deleteButton: {
    padding: 2,
    marginLeft: -2,
  },
  skillInput: {
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
    margin: 0,
    minWidth: 100,
    flex: 1,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    maxHeight: 240,
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  createNewSkillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  createNewSkillText: {
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
});
