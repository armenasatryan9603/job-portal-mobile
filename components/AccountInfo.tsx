import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiService, UserProfile } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState, useEffect } from "react";
import { Alert, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { ResponsiveCard } from "@/components/ResponsiveContainer";

interface AccountInfoProps {
  profile: UserProfile;
  userId?: number;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export function AccountInfo({
  profile,
  userId,
  onProfileUpdate,
}: AccountInfoProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(
    profile.role || "client"
  );

  // Sync selected role when profile changes
  useEffect(() => {
    setSelectedRole(profile.role || "client");
  }, [profile.role]);

  const handleStartEdit = () => {
    setSelectedRole(profile.role || "client");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelectedRole(profile.role || "client");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);

      // Update profile on backend
      const updatedProfile = await apiService.updateUserProfile({
        role: selectedRole,
      });

      // Update user in AuthContext
      await updateUser({
        role: updatedProfile.role,
      });

      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating account info:", error);
      Alert.alert(t("error"), t("failedToUpdateProfile"));
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = [
    { value: "client", label: t("client") || "Client" },
    { value: "specialist", label: t("specialist") },
  ];

  return (
    <ResponsiveCard>
      <View style={styles.accountInfoHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("accountInformation")}
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
          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              {t("role")}
            </Text>
            <View style={styles.roleOptionsContainer}>
              {roleOptions.map((option) => {
                const isSelected = selectedRole === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.roleOption,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.background,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedRole(option.value)}
                    disabled={saving}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        {
                          color: isSelected ? "white" : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <IconSymbol name="checkmark" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
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
              textColor="white"
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </View>
      ) : (
        <View style={styles.accountInfo}>
          <View style={styles.accountItem}>
            <IconSymbol
              name="person.badge.shield.checkmark.fill"
              size={16}
              color={profile.verified ? "#4CAF50" : colors.textSecondary}
            />
            <Text style={[styles.accountText, { color: colors.text }]}>
              {t("verificationStatus")}{" "}
              {profile.verified ? t("verified") : t("unverified")}
            </Text>
          </View>
          <View style={styles.accountItem}>
            <IconSymbol name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.accountText, { color: colors.text }]}>
              {t("joined")}: {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {!userId && (
            <View style={styles.accountItem}>
              <IconSymbol
                name="dollarsign.circle.fill"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.accountText, { color: colors.text }]}>
                {t("creditBalance")}: {(profile.creditBalance || 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.accountItem}>
            <IconSymbol name="person.fill" size={16} color={colors.primary} />
            <Text style={[styles.accountText, { color: colors.text }]}>
              {t("role")}:{" "}
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </Text>
          </View>
        </View>
      )}
    </ResponsiveCard>
  );
}

const styles = StyleSheet.create({
  accountInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    flexShrink: 1,
  },
  accountInfo: {
    gap: 12,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountText: {
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
  roleOptionsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});
