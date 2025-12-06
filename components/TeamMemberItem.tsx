import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { TeamMember } from "@/hooks/useTeamData";
import { UserAvatar } from "./UserAvatar";

interface MemberItemProps {
  member: TeamMember;
  canRemove: boolean;
  onRemove: (userId: number) => void;
}

export const TeamMemberItem = memo(
  ({ member, canRemove, onRemove }: MemberItemProps) => {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const colors = ThemeColors[isDark ? "dark" : "light"];
    const isLead = member.role === "lead";
    const isPending = (member as any).memberStatus === "pending";

    return (
      <ResponsiveCard
        padding={0}
        margin={0}
        style={[
          { marginBottom: Spacing.lg },
          isPending && {
            borderLeftWidth: 4,
            borderLeftColor: "#FF9500",
            backgroundColor: isDark ? "#FF950010" : "#FF950008",
          },
        ]}
      >
        <View style={styles.memberItem}>
          <UserAvatar user={member.User} size={50} />
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {member.User.name}
              </Text>
              {isLead && (
                <View
                  style={[
                    styles.leadBadge,
                    { backgroundColor: colors.tint + "20" },
                  ]}
                >
                  <Text style={[styles.leadBadgeText, { color: colors.tint }]}>
                    {t("lead")}
                  </Text>
                </View>
              )}
              {isPending && (
                <View style={styles.pendingBadge}>
                  <IconSymbol name="clock.fill" size={12} color="#FF9500" />
                  <Text style={styles.pendingBadgeText}>
                    {t("pending") || "Pending"}
                  </Text>
                </View>
              )}
            </View>
            {member.User.email && (
              <Text
                style={[styles.memberEmail, { color: colors.tabIconDefault }]}
              >
                {member.User.email}
              </Text>
            )}
          </View>
          {canRemove && (
            <TouchableOpacity
              onPress={() => onRemove(member.userId)}
              style={styles.removeButton}
            >
              <IconSymbol name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </ResponsiveCard>
    );
  }
);

TeamMemberItem.displayName = "TeamMemberItem";

const styles = StyleSheet.create({
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  leadBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FF950020",
    borderWidth: 1,
    borderColor: "#FF9500",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF9500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    padding: Spacing.sm,
  },
});
