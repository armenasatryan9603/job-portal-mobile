import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Service } from "@/services/api";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";

type ThemeColorsType = typeof ThemeColors;

interface SkillsSectionProps {
  userServices: Service[];
  servicesLoading: boolean;
  servicesError: string | null;
  userId?: string;
  colors: ThemeColorsType["light"] | ThemeColorsType["dark"];
  onEditSkills: () => void;
  onRemoveSkill: (service: Service) => void;
  onRetry: () => void;
  onToggleNotification?: (service: Service) => void;
  serviceNotifications?: { [serviceId: number]: boolean };
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  userServices,
  servicesLoading,
  servicesError,
  userId,
  colors,
  onEditSkills,
  onRemoveSkill,
  onRetry,
  onToggleNotification,
  serviceNotifications = {},
}) => {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("skillsAndServices")}
        </Text>
        {!userId && (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={onEditSkills}
          >
            <IconSymbol name="pencil" size={14} color="white" />
            <Text style={[styles.editButtonText, { color: "white" }]}>
              {t("edit")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {servicesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingSkills")}
          </Text>
        </View>
      ) : servicesError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {servicesError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.textInverse }]}
            >
              {t("retry")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : userServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            name="wrench.and.screwdriver"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t("noSkillsSelected")}
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            {!userId
              ? t("addSkillsToHelpClients")
              : t("thisUserHasntAddedSkills")}
          </Text>
          {!userId && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={onEditSkills}
            >
              <IconSymbol name="plus" size={16} color="white" />
              <Text style={[styles.addButtonText, { color: "white" }]}>
                {t("addSkills")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.skillsList}>
          {userServices.map((service) => (
            <View
              key={service.id}
              style={[
                styles.skillItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.skillInfo}>
                <Text style={[styles.skillName, { color: colors.text }]}>
                  {service.name}
                </Text>
                {service.description && (
                  <Text
                    style={[
                      styles.skillDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {service.description}
                  </Text>
                )}
                {service.averagePrice && (
                  <Text style={[styles.skillPrice, { color: colors.primary }]}>
                    ${service.averagePrice}
                    {t("perHour")}
                  </Text>
                )}
              </View>
              <View style={styles.skillActions}>
                {!userId && onToggleNotification && (
                  <TouchableOpacity
                    style={[
                      styles.notificationButton,
                      {
                        backgroundColor: serviceNotifications[service.id]
                          ? colors.primary + "20"
                          : colors.surface,
                        borderColor: serviceNotifications[service.id]
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => onToggleNotification(service)}
                    accessibilityLabel={
                      serviceNotifications[service.id]
                        ? t("notificationsEnabled")
                        : t("notificationsDisabled")
                    }
                    accessibilityHint={t("toggleNotifications")}
                  >
                    <IconSymbol
                      name="bell"
                      size={16}
                      color={
                        serviceNotifications[service.id]
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                )}
                {!userId && (
                  <TouchableOpacity
                    style={[
                      styles.removeButton,
                      { backgroundColor: colors.error + "20" },
                    ]}
                    onPress={() => onRemoveSkill(service)}
                  >
                    <IconSymbol name="xmark" size={14} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flex: 1,
    minHeight: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    flexShrink: 1,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flexShrink: 0,
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  skillsList: {
    gap: 12,
  },
  skillItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  skillDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  skillPrice: {
    fontSize: 13,
    fontWeight: "500",
  },
  skillActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
