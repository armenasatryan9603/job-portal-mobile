import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { ThemeColors, Shadows, BorderRadius } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface BecomeSpecialistModalProps {
  visible: boolean;
  onClose: () => void;
}

const DONT_SHOW_AGAIN_KEY = "becomeSpecialistModalDontShowAgain";

export function BecomeSpecialistModal({
  visible,
  onClose,
}: BecomeSpecialistModalProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { user, updateUser } = useAuth();

  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBecomeSpecialist = async () => {
    if (!user) return;

    try {
      setIsUpdating(true);

      // Update profile on backend
      const updatedProfile = await apiService.updateUserProfile({
        role: "specialist",
      });

      // Update user in AuthContext
      await updateUser({
        role: updatedProfile.role,
      });

      // Save "don't show again" preference if checked
      if (dontShowAgain) {
        await AsyncStorage.setItem(DONT_SHOW_AGAIN_KEY, "true");
      }

      Alert.alert(
        t("success"),
        t("roleUpdatedToSpecialist") ||
          "Your role has been updated to Specialist!"
      );

      onClose();
    } catch (error) {
      console.error("Error updating role to specialist:", error);
      Alert.alert(t("error"), t("failedToUpdateProfile"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = async () => {
    // Save "don't show again" preference if checked
    if (dontShowAgain) {
      await AsyncStorage.setItem(DONT_SHOW_AGAIN_KEY, "true");
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
            },
            Shadows.xl,
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={[
              styles.closeButton,
              { backgroundColor: colors.border + "40" },
            ]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <IconSymbol name="xmark" size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Header with Gradient Background */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <IconSymbol name="person.2.fill" size={28} color="white" />
            </View>
            <Text style={styles.title}>
              {t("becomeASpecialist") || "Become a Specialist"}
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Benefits List */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <View
                  style={[
                    styles.benefitIcon,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <IconSymbol
                    name="eye.fill"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>
                    {t("beVisible") || "Be Visible"}
                  </Text>
                  <Text
                    style={[
                      styles.benefitDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("appearInSpecialistsList") ||
                      "Appear in the specialists list and get discovered by clients"}
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View
                  style={[
                    styles.benefitIcon,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <IconSymbol
                    name="magnifyingglass"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>
                    {t("getFound") || "Get Found"}
                  </Text>
                  <Text
                    style={[
                      styles.benefitDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("searchableByClients") ||
                      "Be searchable by clients looking for your expertise"}
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View
                  style={[
                    styles.benefitIcon,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <IconSymbol
                    name="briefcase.fill"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>
                    {t("receiveOrders") || "Receive Orders"}
                  </Text>
                  <Text
                    style={[
                      styles.benefitDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("getHiredForProjects") ||
                      "Get hired for projects that match your skills"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Note */}
            <View
              style={[
                styles.noteContainer,
                { backgroundColor: colors.border + "30" },
              ]}
            >
              <IconSymbol
                name="info.circle.fill"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {t("youCanEditRoleInProfile") ||
                  "You can edit your role anytime in the Profile section."}
              </Text>
            </View>
          </ScrollView>

          {/* Don't show again checkbox */}
          <View
            style={[styles.checkboxSection, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setDontShowAgain(!dontShowAgain)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: dontShowAgain
                      ? colors.primary
                      : "transparent",
                    borderColor: dontShowAgain ? colors.primary : colors.border,
                  },
                ]}
              >
                {dontShowAgain && (
                  <IconSymbol name="checkmark" size={14} color="white" />
                )}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                {t("dontShowAgain") || "Don't show again"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <Button
              variant="outline"
              title={t("maybeLater") || "Maybe Later"}
              onPress={handleClose}
              backgroundColor={colors.background}
              textColor={colors.text}
              disabled={isUpdating}
              style={styles.actionButton}
            />
            <Button
              variant="primary"
              title={t("becomeSpecialist") || "Become Specialist"}
              onPress={handleBecomeSpecialist}
              backgroundColor={colors.primary}
              textColor="white"
              disabled={isUpdating}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderRadius: BorderRadius.xxl,
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  benefitsContainer: {
    marginBottom: 20,
    gap: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  checkboxSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
  },
});

// Helper function to check if modal should be shown
export async function shouldShowBecomeSpecialistModal(): Promise<boolean> {
  try {
    const dontShowAgain = await AsyncStorage.getItem(DONT_SHOW_AGAIN_KEY);
    return dontShowAgain !== "true";
  } catch (error) {
    console.error("Error checking dont show again preference:", error);
    return true;
  }
}
