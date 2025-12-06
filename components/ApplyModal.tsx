import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Switch,
  Platform,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Order } from "@/services/api";
import { useTranslation } from "@/contexts/TranslationContext";
import { PeerSelector } from "./PeerSelector";
import { useAuth } from "@/contexts/AuthContext";

interface ApplyModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (
    message: string,
    questionAnswers?: Array<{ questionId: number; answer: string }>,
    peerIds?: number[],
    teamId?: number
  ) => Promise<void>;
  loading?: boolean;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  visible,
  onClose,
  order,
  onSubmit,
  loading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<{
    [questionId: number]: string;
  }>({});
  const [questionErrors, setQuestionErrors] = useState<{
    [questionId: number]: string;
  }>({});
  const [applyWithPeers, setApplyWithPeers] = useState(false);
  const [selectedPeerIds, setSelectedPeerIds] = useState<number[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  const handleSubmit = async () => {
    // Clear previous errors
    setMessageError("");
    setQuestionErrors({});

    // Validate message
    if (message.trim().length < 10) {
      setMessageError(t("messageTooShort"));
      return;
    }

    // Validate question answers
    const errors: { [questionId: number]: string } = {};
    if (order?.questions && order.questions.length > 0) {
      for (const question of order.questions) {
        const answer = questionAnswers[question.id];
        if (!answer || !answer.trim()) {
          errors[question.id] =
            t("pleaseAnswerQuestion") || "Please answer this question";
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setQuestionErrors(errors);
      return;
    }

    try {
      // Prepare question answers array
      const questionAnswersArray =
        order?.questions && order.questions.length > 0
          ? order.questions.map((q) => ({
              questionId: q.id,
              answer: questionAnswers[q.id].trim(),
            }))
          : undefined;

      // Determine peer IDs: if team is selected, use selectedPeerIds (populated by team selection)
      // Otherwise use individual selected peer IDs
      const peerIdsToSubmit =
        applyWithPeers && selectedPeerIds.length > 0
          ? selectedPeerIds
          : undefined;

      // Pass teamId if a team is selected
      const teamIdToSubmit = selectedTeamId || undefined;

      await onSubmit(
        message.trim(),
        questionAnswersArray,
        peerIdsToSubmit,
        teamIdToSubmit
      );
      setMessage("");
      setMessageError("");
      setQuestionAnswers({});
      setQuestionErrors({});
      setApplyWithPeers(false);
      setSelectedPeerIds([]);
      setSelectedTeamId(undefined);
      onClose();
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert(t("error"), t("failedToSubmitApplication"));
    }
  };

  const handleClose = () => {
    setMessage("");
    setMessageError("");
    setQuestionAnswers({});
    setQuestionErrors({});
    setApplyWithPeers(false);
    setSelectedPeerIds([]);
    setSelectedTeamId(undefined);
    onClose();
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    // Clear error when user starts typing
    if (messageError) {
      setMessageError("");
    }
  };

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("applyToOrder")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.orderInfo}>
              <Text style={[styles.orderTitle, { color: colors.text }]}>
                {order.title}
              </Text>
              <Text
                style={[
                  styles.orderDescription,
                  { color: colors.tabIconDefault },
                ]}
              >
                {order.description}
              </Text>
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <IconSymbol
                    name="dollarsign.circle.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    ${order.budget.toLocaleString()}
                  </Text>
                </View>
                {order.location && (
                  <View style={styles.detailRow}>
                    <IconSymbol
                      name="location.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {order.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Peer Selection Section */}
            <View style={styles.peerSection}>
              <View style={styles.peerToggleRow}>
                <View style={styles.peerToggleInfo}>
                  <Text
                    style={[styles.peerToggleLabel, { color: colors.text }]}
                  >
                    {t("applyWithPeers")}
                  </Text>
                  <Text
                    style={[
                      styles.peerToggleDescription,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("applyWithPeersDescription")}
                  </Text>
                </View>
                <Switch
                  value={applyWithPeers}
                  onValueChange={setApplyWithPeers}
                  trackColor={{
                    false:
                      Platform.OS === "ios" ? colors.border : colors.border,
                    true:
                      Platform.OS === "ios"
                        ? colors.primary + "80"
                        : colors.primary + "40",
                  }}
                  thumbColor={
                    Platform.OS === "ios" ? "#FFFFFF" : colors.primary
                  }
                  ios_backgroundColor={colors.border}
                />
              </View>
              {applyWithPeers && (
                <PeerSelector
                  selectedPeerIds={selectedPeerIds}
                  onPeersChange={(peerIds) => {
                    // If individual peers are selected, clear team selection
                    if (peerIds.length > 0 && selectedTeamId) {
                      setSelectedTeamId(undefined);
                    }
                    setSelectedPeerIds(peerIds);
                  }}
                  maxPeers={5}
                  currentUserId={user?.id}
                  onTeamSelect={(teamId) => {
                    // If team is selected, clear individual peer selections
                    if (teamId) {
                      setSelectedPeerIds([]);
                    }
                    setSelectedTeamId(teamId);
                  }}
                  selectedTeamId={selectedTeamId}
                  hideSearchAndAdd={true}
                />
              )}
            </View>

            {/* Questions Section */}
            {order?.questions && order.questions.length > 0 && (
              <View style={styles.questionsSection}>
                <Text style={[styles.questionsLabel, { color: colors.text }]}>
                  {t("pleaseAnswerQuestions") ||
                    "Please answer the following questions"}
                </Text>
                {order.questions
                  .sort((a, b) => a.order - b.order)
                  .map((question) => (
                    <View key={question.id} style={styles.questionItem}>
                      <Text
                        style={[styles.questionText, { color: colors.text }]}
                      >
                        {question.question}
                      </Text>
                      <TextInput
                        style={[
                          styles.questionInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: questionErrors[question.id]
                              ? "#FF3B30"
                              : colors.border,
                            color: colors.text,
                          },
                        ]}
                        placeholder={
                          t("enterYourAnswer") || "Enter your answer..."
                        }
                        placeholderTextColor={colors.tabIconDefault}
                        value={questionAnswers[question.id] || ""}
                        onChangeText={(text) => {
                          setQuestionAnswers((prev) => ({
                            ...prev,
                            [question.id]: text,
                          }));
                          // Clear error when user starts typing
                          if (questionErrors[question.id]) {
                            setQuestionErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors[question.id];
                              return newErrors;
                            });
                          }
                        }}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                      {questionErrors[question.id] && (
                        <Text style={[styles.errorText, { color: "#FF3B30" }]}>
                          {questionErrors[question.id]}
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
            )}

            <View style={styles.messageSection}>
              <Text style={[styles.messageLabel, { color: colors.text }]}>
                {t("messageToClient")}
              </Text>
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: messageError ? "#FF3B30" : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={t("writeMessageToClient")}
                placeholderTextColor={colors.tabIconDefault}
                value={message}
                onChangeText={handleMessageChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {messageError && (
                <Text style={[styles.errorText, { color: "#FF3B30" }]}>
                  {messageError}
                </Text>
              )}
            </View>

            <View style={styles.creditInfo}>
              <View style={styles.creditRow}>
                <IconSymbol
                  name="creditcard.fill"
                  size={16}
                  color={colors.tint}
                />
                <Text style={[styles.creditText, { color: colors.text }]}>
                  {t("applicationCost")}: 1 {t("credit")}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.tint },
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="black" />
                ) : (
                  <>
                    <IconSymbol
                      name="paperplane.fill"
                      size={16}
                      color="black"
                    />
                    <Text style={styles.submitButtonText}>
                      {t("submitApplication")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  orderInfo: {
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  orderDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  orderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 100,
  },
  errorText: {
    fontSize: 14,
    marginTop: Spacing.sm,
    fontWeight: "500",
  },
  creditInfo: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 8,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  creditText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    paddingTop: 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
  questionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  questionsLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  questionItem: {
    marginBottom: Spacing.md,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 40,
  },
  peerSection: {
    padding: Spacing.lg,
  },
  peerToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  peerToggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  peerToggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  peerToggleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
