import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requiredText = "DELETE";
  const isConfirmationValid = confirmationText === requiredText;

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
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: "#FF3B30" + "20" },
              ]}
            >
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={24}
                color="#FF3B30"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("deleteAccount")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t("thisActionCannotBeUndone")}
            </Text>
          </View>

          {/* Warning Content */}
          <View style={styles.content}>
            <View style={styles.warningBox}>
              <IconSymbol
                name="exclamationmark.triangle"
                size={20}
                color="#FF9500"
              />
              <Text style={[styles.warningText, { color: colors.text }]}>
                {t("accountDeletionWarning")}
              </Text>
            </View>

            {userEmail && (
              <View style={styles.emailBox}>
                <Text
                  style={[styles.emailLabel, { color: colors.textSecondary }]}
                >
                  {t("accountEmail")}:
                </Text>
                <Text style={[styles.emailText, { color: colors.text }]}>
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
                  style={[styles.noEmailText, { color: colors.textSecondary }]}
                >
                  {t("accountWithoutEmail")}
                </Text>
              </View>
            )}

            <View style={styles.confirmationBox}>
              <Text style={[styles.confirmationLabel, { color: colors.text }]}>
                {t("typeDeleteToConfirm")}:
              </Text>
              <TextInput
                style={[
                  styles.confirmationInput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: isConfirmationValid
                      ? "#34C759"
                      : colors.border,
                    color: colors.text,
                  },
                ]}
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder={requiredText}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: colors.border },
              ]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.deleteButton,
                {
                  backgroundColor: isConfirmationValid
                    ? "#FF3B30"
                    : colors.border,
                  opacity: isConfirmationValid ? 1 : 0.5,
                },
              ]}
              onPress={handleConfirm}
              disabled={!isConfirmationValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <IconSymbol name="trash.fill" size={16} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>
                    {t("deleteAccount")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
    backgroundColor: "#FF9500" + "15",
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
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    // backgroundColor set dynamically
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
