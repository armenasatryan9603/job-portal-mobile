import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors } from "@/constants/styles";
import { Reason } from "@/categories/api";
import { useReasons } from "@/hooks/useApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

interface FeedbackDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string, reasonIds?: number[]) => void;
  title: string;
  subtitle?: string;
  loading?: boolean;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  visible,
  onClose,
  onSubmit,
  title,
  subtitle,
  loading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedReasons, setSelectedReasons] = useState<number[]>([]);

  // Use TanStack Query for reasons
  const {
    data: reasons,
    isLoading: loadingReasons,
    error: reasonsError,
  } = useReasons();

  // Debug: Log when rating changes or reasons are loaded
  React.useEffect(() => {
    if (rating > 0 && rating <= 2) {
      console.log("Rating is 1 or 2, showing reasons section");
      console.log("Reasons data:", reasons);
      console.log("Loading reasons:", loadingReasons);
      console.log("Reasons error:", reasonsError);
    }
  }, [rating, reasons, loadingReasons, reasonsError]);

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert(t("error"), t("pleaseSelectRating"));
      return;
    }
    // For negative ratings (≤2 stars), require either reasons or comment
    if (rating <= 2 && selectedReasons.length === 0 && !feedback.trim()) {
      Alert.alert(t("error"), t("pleaseProvideReasonOrFeedback"));
      return;
    }
    onSubmit(rating, feedback, rating <= 2 ? selectedReasons : undefined);
  };

  const handleClose = () => {
    setRating(0);
    setFeedback("");
    setHoveredStar(0);
    setSelectedReasons([]);
    onClose();
  };

  const toggleReason = (reasonId: number) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const getReasonName = (reason: Reason) => {
    switch (language) {
      case "ru":
        return reason.nameRu;
      case "hy":
        return reason.nameHy;
      default:
        return reason.nameEn;
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      const isFilled = starNumber <= (hoveredStar || rating);

      return (
        <TouchableOpacity
          key={index}
          onPress={() => setRating(starNumber)}
          onPressIn={() => setHoveredStar(starNumber)}
          onPressOut={() => setHoveredStar(0)}
          style={styles.starButton}
        >
          <IconSymbol
            name={isFilled ? "star.fill" : "star"}
            size={32}
            color={isFilled ? colors.rating : colors.border}
          />
        </TouchableOpacity>
      );
    });
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return t("veryPoor");
      case 2:
        return t("poor");
      case 3:
        return t("average");
      case 4:
        return t("good");
      case 5:
        return t("excellent");
      default:
        return t("selectRating");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[styles.container, { backgroundColor: colors.background }]}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContentInner}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>

                <View style={styles.content}>
                  <View style={styles.ratingSection}>
                    <Text style={[styles.ratingLabel, { color: colors.text }]}>
                      {t("rating")}
                    </Text>
                    <View style={styles.starsContainer}>{renderStars()}</View>
                    <Text
                      style={[styles.ratingText, { color: colors.primary }]}
                    >
                      {getRatingText(rating)}
                    </Text>
                  </View>

                  {/* Show reasons for negative ratings (≤2 stars) */}
                  {rating > 0 && rating <= 2 && (
                    <View style={styles.reasonsSection}>
                      <Text
                        style={[styles.reasonsLabel, { color: colors.text }]}
                      >
                        {t("whatWentWrong")}
                      </Text>
                      {loadingReasons ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : reasons && reasons.length > 0 ? (
                        <ScrollView
                          style={styles.reasonsScrollView}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                        >
                          <View style={styles.reasonsList}>
                            {reasons.map((reason: Reason) => {
                              const isSelected = selectedReasons.includes(
                                reason.id
                              );
                              return (
                                <TouchableOpacity
                                  key={reason.id}
                                  style={[
                                    styles.reasonItem,
                                    {
                                      backgroundColor: isSelected
                                        ? colors.primary + "20"
                                        : colors.backgroundSecondary,
                                      borderColor: isSelected
                                        ? colors.primary
                                        : colors.border,
                                    },
                                  ]}
                                  onPress={() => toggleReason(reason.id)}
                                >
                                  <View style={styles.checkboxContainer}>
                                    {isSelected && (
                                      <IconSymbol
                                        name="checkmark"
                                        size={16}
                                        color={colors.primary}
                                      />
                                    )}
                                  </View>
                                  <Text
                                    style={[
                                      styles.reasonText,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {getReasonName(reason)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      ) : (
                        <Text
                          style={[
                            styles.noReasonsText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("noReasonsAvailable")}
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.feedbackSection}>
                    <Text
                      style={[styles.feedbackLabel, { color: colors.text }]}
                    >
                      {t("feedback")} ({t("optional")})
                    </Text>
                    <TextInput
                      style={[
                        styles.feedbackInput,
                        {
                          backgroundColor: colors.backgroundSecondary,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder={t("writeYourFeedback")}
                      placeholderTextColor={colors.textSecondary}
                      value={feedback}
                      onChangeText={setFeedback}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { borderColor: colors.border },
                    ]}
                    onPress={handleClose}
                    disabled={loading}
                  >
                    <Text style={[styles.buttonText, { color: colors.text }]}>
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: colors.primary },
                      loading && styles.disabledButton,
                    ]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                      {loading ? t("submitting") : t("submit")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  scrollContentInner: {
    flexGrow: 1,
  },
  container: {
    width: "90%",
    maxWidth: 500,
    borderRadius: 12,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    alignSelf: "center",
    maxHeight: "90%",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  content: {
    marginBottom: 16,
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 6,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  feedbackSection: {
    marginBottom: 6,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 6,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 80,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  reasonsSection: {
    marginBottom: 16,
  },
  reasonsLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  reasonsScrollView: {
    maxHeight: 160,
    marginBottom: 4,
  },
  reasonsList: {
    gap: 6,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  noReasonsText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
});
