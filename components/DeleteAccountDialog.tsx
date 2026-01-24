import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "./ui/button";

interface DeleteAccountDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (confirmationText: string) => Promise<void>;
  userEmail?: string;
}

export default function DeleteAccountDialog({
  visible,
  onClose,
  onConfirm,
  userEmail,
}: DeleteAccountDialogProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requiredText = "DELETE";
  // Normalize both to uppercase for case-insensitive comparison
  const isConfirmationValid =
    confirmationText.toUpperCase().trim() === requiredText;

  const handleConfirm = async () => {
    if (!isConfirmationValid) {
      Alert.alert(t("invalidConfirmation"), t("pleaseTypeDeleteToConfirm"), [
        { text: t("ok") },
      ]);
      return;
    }

    // Final confirmation with more details
    Alert.alert(t("finalConfirmation"), t("accountDeletionFinalWarning"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("deleteAccount"),
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await onConfirm(confirmationText);
          } catch (error) {
            console.error("Error deleting account:", error);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleClose = () => {
    setConfirmationText("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={[styles.dialog, { backgroundColor: colors.background }]}
              >
                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: colors.errorVariant + "20" },
                      ]}
                    >
                      <IconSymbol
                        name="exclamationmark.triangle.fill"
                        size={24}
                        color={colors.errorVariant}
                      />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {t("deleteAccount")}
                    </Text>
                    <Text
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                      {t("thisActionCannotBeUndone")}
                    </Text>
                  </View>

                  {/* Warning Content */}
                  <View style={styles.content}>
                    <View style={[styles.warningBox, { backgroundColor: colors.orange + "15" }]}>
                      <IconSymbol
                        name="exclamationmark.triangle"
                        size={20}
                        color={colors.orange}
                      />
                      <Text
                        style={[styles.warningText, { color: colors.text }]}
                      >
                        {t("accountDeletionWarning")}
                      </Text>
                    </View>

                    {userEmail && (
                      <View style={styles.emailBox}>
                        <Text
                          style={[
                            styles.emailLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("accountEmail")}:
                        </Text>
                        <Text
                          style={[styles.emailText, { color: colors.text }]}
                        >
                          {userEmail}
                        </Text>
                      </View>
                    )}

                    {!userEmail && (
                      <View style={styles.noEmailBox}>
                        <IconSymbol
                          name="person.circle"
                          size={20}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.noEmailText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("accountWithoutEmail")}
                        </Text>
                      </View>
                    )}

                    <View style={styles.confirmationBox}>
                      <Text
                        style={[
                          styles.confirmationLabel,
                          { color: colors.text },
                        ]}
                      >
                        {t("typeDeleteToConfirm")}:
                      </Text>
                      <TextInput
                        style={[
                          styles.confirmationInput,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderColor: isConfirmationValid
                              ? colors.openNow
                              : colors.border,
                            color: colors.text,
                          },
                        ]}
                        value={confirmationText}
                        onChangeText={(text) => {
                          // Convert to uppercase automatically
                          setConfirmationText(text.toUpperCase());
                        }}
                        placeholder={requiredText}
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoComplete="off"
                      />
                    </View>
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={styles.actions}>
                  <Button
                    title={t("cancel")}
                    variant="outline"
                    icon="xmark"
                    iconSize={16}
                    backgroundColor={colors.background}
                    textColor={colors.text}
                    onPress={handleClose}
                    disabled={isLoading}
                    style={styles.actionButton}
                  />

                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    </View>
                  ) : (
                    <Button
                      disabled={!isConfirmationValid}
                      title={t("deleteAccount")}
                      variant="primary"
                      icon="trash.fill"
                      iconSize={16}
                      backgroundColor={
                        isConfirmationValid ? colors.errorVariant : colors.border
                      }
                      textColor={colors.textInverse}
                      onPress={handleConfirm}
                      style={styles.actionButton}
                    />
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  content: {
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  emailBox: {
    backgroundColor: "#F2F2F7" + "50",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  noEmailBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7" + "50",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  noEmailText: {
    fontSize: 14,
    flex: 1,
  },
  confirmationBox: {
    marginBottom: 8,
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  confirmationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 24,
  },
  actionButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
});
