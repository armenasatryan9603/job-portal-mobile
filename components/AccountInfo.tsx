import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { ThemeColors, Typography } from "@/constants/styles";
import { UserProfile, apiService } from "@/categories/api";

import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";

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
  const [experienceYears, setExperienceYears] = useState<string>(
    profile.experienceYears?.toString() || ""
  );

  // Sync form data when profile changes
  useEffect(() => {
    setSelectedRole(profile.role || "client");
    setExperienceYears(profile.experienceYears?.toString() || "");
  }, [profile.role, profile.experienceYears]);

  const handleStartEdit = () => {
    setSelectedRole(profile.role || "client");
    setExperienceYears(profile.experienceYears?.toString() || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelectedRole(profile.role || "client");
    setExperienceYears(profile.experienceYears?.toString() || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);

      // If user is trying to become a specialist, require profile photo first
      const isBecomingSpecialist =
        selectedRole === "specialist" && profile.role !== "specialist";
      const hasAvatar = !!(profile.avatarUrl || user.avatarUrl);

      if (isBecomingSpecialist && !hasAvatar) {
        Alert.alert(
          t(
            "pleaseUploadProfilePhoto",
            "Please upload a profile photo in your profile before becoming a specialist."
          )
        );
        return;
      }

      // If user is trying to switch from specialist to client, block if they have a permanent order (as client)
      const isSwitchingToClient =
        selectedRole === "client" && profile.role === "specialist";
      if (isSwitchingToClient) {
        const { pagination } = await apiService.getAllOrders(
          1,
          1,
          undefined,
          undefined,
          undefined,
          user.id,
          "permanent"
        );
        if (pagination.total > 0) {
          setSaving(false);
          Alert.alert(
            t(""),
            t("cannotSwitchToClientPermanentOrder")
          );
          return;
        }
      }

      // Parse experienceYears
      const experienceYearsNum = experienceYears.trim()
        ? parseInt(experienceYears.trim(), 10)
        : undefined;

      if (
        experienceYears.trim() &&
        (isNaN(experienceYearsNum!) || experienceYearsNum! < 0)
      ) {
        Alert.alert(t("error"), t("pleaseEnterValidExperienceYears"));
        return;
      }

      // Update profile on backend
      const updatedProfile = await apiService.updateUserProfile({
        role: selectedRole,
        experienceYears: experienceYearsNum,
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
    { value: "client", label: t("client") },
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
                  <Button
                    key={option.value}
                    style={styles.roleOption}
                    variant={isSelected ? "primary" : "outline"}
                    title={option.label}
                    onPress={() => setSelectedRole(option.value)}
                    disabled={saving}
                  />
                );
              })}
            </View>
          </View>

          {/* Experience Years Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              {t("yearsOfExperience")}
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
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder={t("enterYearsOfExperience")}
              placeholderTextColor={colors.tabIconDefault}
              keyboardType="numeric"
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
              color={profile.verified ? colors.success : colors.textSecondary}
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
                {t("creditBalance")}: {(profile.creditBalance || 0).toFixed(2)}{" "}
                {profile.currency}
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
          <View style={styles.accountItem}>
            <IconSymbol
              name="briefcase.fill"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.accountText, { color: colors.text }]}>
              {t("yearsOfExperience")}:{" "}
              {profile.experienceYears
                ? `${profile.experienceYears} ${t("years")}`
                : t("notProvided")}
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
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
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
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
