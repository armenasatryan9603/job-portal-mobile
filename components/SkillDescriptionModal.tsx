import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiService, Skill } from "@/categories/api";

interface SkillDescriptionModalProps {
  visible: boolean;
  skillId: number | null;
  onClose: () => void;
}

export const SkillDescriptionModal: React.FC<SkillDescriptionModalProps> = ({
  visible,
  skillId,
  onClose,
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const [skill, setSkill] = React.useState<Skill | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible && skillId) {
      loadSkill();
    } else {
      setSkill(null);
      setError(null);
    }
  }, [visible, skillId]);

  const loadSkill = async () => {
    if (!skillId) return;

    setLoading(true);
    setError(null);
    try {
      const skillData = await apiService.getSkillById(skillId);
      setSkill(skillData);
    } catch (err: any) {
      console.error("Error loading skill:", err);
      setError(err?.message || t("failedToLoadSkill"));
    } finally {
      setLoading(false);
    }
  };

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

  const getSkillDescription = (skill: Skill): string | null => {
    switch (language) {
      case "ru":
        return skill.descriptionRu || null;
      case "hy":
        return skill.descriptionHy || null;
      case "en":
      default:
        return skill.descriptionEn || null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("skillDetails")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="xmark" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {t("loading")}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  name="exclamationmark.triangle"
                  size={24}
                  color={colors.errorVariant}
                />
                <Text style={[styles.errorText, { color: colors.errorVariant }]}>
                  {error}
                </Text>
              </View>
            ) : skill ? (
              <View style={styles.skillContent}>
                <Text style={[styles.skillName, { color: colors.text }]}>
                  {getSkillName(skill)}
                </Text>
                {getSkillDescription(skill) && (
                  <Text
                    style={[
                      styles.skillDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {getSkillDescription(skill)}
                  </Text>
                )}
                {!getSkillDescription(skill) && (
                  <Text
                    style={[
                      styles.noDescription,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("noDescriptionAvailable")}
                  </Text>
                )}
              </View>
            ) : null}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  skillContent: {
    gap: 16,
  },
  skillName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  skillDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  noDescription: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
});
