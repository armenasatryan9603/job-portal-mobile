import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { ThemeColors, Typography } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiService, UserProfile } from "@/categories/api";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState, useEffect } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { ResponsiveCard } from "@/components/ResponsiveContainer";

interface ContactInfoProps {
  profile: UserProfile;
  hasActiveChat: boolean;
  userId?: number;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export function ContactInfo({
  profile,
  hasActiveChat,
  userId,
  onProfileUpdate,
}: ContactInfoProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: profile.email || "",
    phone: profile.phone || "",
  });

  // Sync form data when profile changes
  useEffect(() => {
    setFormData({
      email: profile.email || "",
      phone: profile.phone || "",
    });
  }, [profile.email, profile.phone]);

  const handleStartEdit = () => {
    setFormData({
      email: profile.email || "",
      phone: profile.phone || "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      email: profile.email || "",
      phone: profile.phone || "",
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);

      // Update profile on backend
      const updatedProfile = await apiService.updateUserProfile({
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      // Update user in AuthContext
      await updateUser({
        email: updatedProfile.email,
        phone: updatedProfile.phone || undefined,
      });

      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating contact info:", error);
      Alert.alert(t("error"), t("failedToUpdateProfile"));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Show restricted message if viewing another user without active chat
  if (!hasActiveChat && userId) {
    return (
      <ResponsiveCard>
        <View style={styles.contactRestrictedContainer}>
          <IconSymbol name="lock.fill" size={48} color={colors.textSecondary} />
          <Text style={[styles.contactRestrictedTitle, { color: colors.text }]}>
            {t("contactInformationRestricted")}
          </Text>
          <Text
            style={[
              styles.contactRestrictedDescription,
              { color: colors.textSecondary },
            ]}
          >
            {t("contactInformationOnlyVisibleWithActiveChat")}
          </Text>
        </View>
      </ResponsiveCard>
    );
  }

  return (
    <ResponsiveCard>
      <View style={styles.contactInfoHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("contactInformation")}
        </Text>
        {!userId && !isEditing && (
          <Button
            onPress={handleStartEdit}
            title={t("edit")}
            variant="primary"
            icon="pencil"
            iconSize={14}
            backgroundColor={colors.primary}
          />
        )}
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              {t("email")}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={formData.email}
              onChangeText={(value) => updateField("email", value)}
              placeholder={t("enterYourEmail")}
              placeholderTextColor={colors.tabIconDefault}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              {t("phoneNumber")}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={formData.phone}
              onChangeText={(value) => updateField("phone", value)}
              placeholder={t("enterPhoneNumber")}
              placeholderTextColor={colors.tabIconDefault}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.editActions}>
            <Button
              variant="outline"
              icon="xmark"
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
              textColor={colors.textInverse}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </View>
      ) : (
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <IconSymbol name="envelope.fill" size={16} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>
              {t("email")}: {profile.email}
            </Text>
          </View>

          <View style={styles.contactItem}>
            <IconSymbol name="phone.fill" size={16} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]}>
              {t("phone")}: {profile.phone || t("notProvided")}
            </Text>
          </View>
        </View>
      )}
    </ResponsiveCard>
  );
}

const styles = StyleSheet.create({
  contactInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    flex: 1,
    flexShrink: 1,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 15,
    flex: 1,
  },
  editContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  contactRestrictedContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  contactRestrictedTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  contactRestrictedDescription: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
