import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { apiService } from "@/services/api";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import TranslationExample from "@/components/TranslationExample";
import { ReferralModal } from "@/components/ReferralModal";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";

export default function ProfileSettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth();
  const { showLoginModal } = useModal();

  const colors = ThemeColors[isDark ? "dark" : "light"];
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  const languages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "ru", name: "Russian", nativeName: "Русский" },
    { code: "hy", name: "Armenian", nativeName: "Հայերեն" },
  ];

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as any);
    setShowLanguageModal(false);
  };

  const handleDeleteAccount = async (confirmationText: string) => {
    if (!user?.id) {
      Alert.alert(t("error"), t("userNotLoggedIn"));
      return;
    }

    console.log("🗑️ User attempting to delete account:", {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });

    setIsDeletingAccount(true);
    try {
      await apiService.deleteAccount(user.id, user.phone);

      // Show success message
      Alert.alert(
        t("accountDeletedSuccessfully"),
        t("accountDeletionSuccessMessage"),
        [
          {
            text: t("ok"),
            onPress: async () => {
              // Logout and redirect to login
              await logout();
              router.replace("/");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error deleting account:", error);

      let errorMessage = t("accountDeletionFailed");

      // Handle specific error cases
      if (error?.response?.status === 400) {
        errorMessage = t("cannotDeleteAccountWithActiveOrders");
      } else if (error?.response?.status === 404) {
        errorMessage = t("accountNotFound");
      } else if (error?.response?.status === 403) {
        errorMessage = t("notAuthorizedToDeleteAccount");
      }

      Alert.alert(t("errorDeletingAccount"), errorMessage);
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountDialog(false);
    }
  };

  const header = (
    <Header
      title={t("settings")}
      subtitle={t("manageAccountPreferences")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView
        style={{ marginBottom: 4 * Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Appearance Settings */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("appearance")}
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <IconSymbol name="moon.fill" size={20} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("darkMode")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("switchBetweenThemes")}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + "40",
                }}
                thumbColor={isDark ? colors.primary : colors.textSecondary}
              />
            </View>
          </ResponsiveCard>

          {/* Language Settings */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("language")}
            </Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowLanguageModal(true)}
            >
              <View style={styles.settingInfo}>
                <IconSymbol name="globe" size={20} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("language")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {
                      languages.find((lang) => lang.code === language)
                        ?.nativeName
                    }
                  </Text>
                </View>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </ResponsiveCard>

          {/* Referral Program */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("referralProgram")}
            </Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowReferralModal(true)}
            >
              <View style={styles.settingInfo}>
                <IconSymbol name="gift.fill" size={20} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("referralProgram")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("earnCreditsByReferringFriends")}
                  </Text>
                </View>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </ResponsiveCard>

          {/* Notification Settings */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("notifications")}
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <IconSymbol name="bell.fill" size={20} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("pushNotifications")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("receiveNotificationsDesc")}
                  </Text>
                </View>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + "40",
                }}
                thumbColor={colors.primary}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <IconSymbol
                  name="envelope.fill"
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("emailNotifications")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("emailNotificationsDesc")}
                  </Text>
                </View>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + "40",
                }}
                thumbColor={colors.primary}
              />
            </View>
          </ResponsiveCard>

          {/* Privacy Settings */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("privacyAndSecurity")}
            </Text>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <IconSymbol name="lock.fill" size={20} color={colors.primary} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("changePassword")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("updateAccountPassword")}
                  </Text>
                </View>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <IconSymbol
                  name="eye.slash.fill"
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {t("privacySettings")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("controlWhoCanSeeProfile")}
                  </Text>
                </View>
              </View>
              <IconSymbol
                name="chevron.right"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </ResponsiveCard>

          {/* Guest User Section - Only for non-authenticated users */}
          {!isAuthenticated && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("getStarted")}
              </Text>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  // Show login modal
                  showLoginModal();
                }}
              >
                <View style={styles.settingInfo}>
                  <IconSymbol
                    name="person.badge.plus"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      {t("signUpToAccess")}
                    </Text>
                    <Text
                      style={[
                        styles.settingDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("signUpToAccessDescription")}
                    </Text>
                  </View>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </ResponsiveCard>
          )}

          {/* Account Actions - Only for authenticated users */}
          {isAuthenticated && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("account")}
              </Text>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <IconSymbol
                    name="square.and.arrow.down.fill"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>
                      {t("exportData")}
                    </Text>
                    <Text
                      style={[
                        styles.settingDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("downloadCopyOfData")}
                    </Text>
                  </View>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Development-only Translation Test Section */}
              {__DEV__ && (
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <IconSymbol name="globe" size={20} color="#9C27B0" />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: "#9C27B0" }]}>
                        🧪 Translation Test (Dev Only)
                      </Text>
                      <Text
                        style={[
                          styles.settingDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Test translations and cache
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ResponsiveCard>
          )}

          {/* Development Translation Test Component */}
          {__DEV__ && (
            <ResponsiveCard
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <View style={styles.devSection}>
                <TranslationExample />
              </View>
            </ResponsiveCard>
          )}

          {isAuthenticated && (
            <ResponsiveCard
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomWidth: 0 }]}
                onPress={() => setShowDeleteAccountDialog(true)}
                disabled={isDeletingAccount}
              >
                <View style={styles.settingInfo}>
                  <IconSymbol name="trash.fill" size={20} color="#FF3B30" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: "#FF3B30" }]}>
                      {t("deleteAccount")}
                    </Text>
                    <Text
                      style={[
                        styles.settingDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("permanentlyDeleteAccount")}
                    </Text>
                  </View>
                </View>
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            </ResponsiveCard>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("language")}
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.border },
                  language === lang.code && {
                    backgroundColor: colors.primary + "10",
                  },
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={[styles.languageName, { color: colors.text }]}>
                  {lang.nativeName}
                </Text>
                <Text
                  style={[styles.languageCode, { color: colors.textSecondary }]}
                >
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <IconSymbol
                    name="checkmark"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        visible={showDeleteAccountDialog}
        onClose={() => setShowDeleteAccountDialog(false)}
        onConfirm={handleDeleteAccount}
        userEmail={user?.email || undefined}
      />

      {/* Referral Modal */}
      <ReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  card: {
    marginBottom: 16,
  },
  devSection: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  languageCode: {
    fontSize: 14,
    marginRight: 8,
  },
});
