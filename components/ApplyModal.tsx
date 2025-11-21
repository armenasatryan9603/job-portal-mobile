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
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Order } from "@/services/api";
import { useTranslation } from "@/contexts/TranslationContext";

interface ApplyModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (message: string) => Promise<void>;
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
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");

  const handleSubmit = async () => {
    // Clear previous errors
    setMessageError("");

    if (message.trim().length < 10) {
      setMessageError(t("messageTooShort"));
      return;
    }

    try {
      await onSubmit(message.trim());
      setMessage("");
      setMessageError("");
      onClose();
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert(t("error"), t("failedToSubmitApplication"));
    }
  };

  const handleClose = () => {
    setMessage("");
    setMessageError("");
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
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <IconSymbol name="paperplane.fill" size={16} color="black" />
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
});
