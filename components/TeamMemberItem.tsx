import React, { memo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors } from "@/constants/styles";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { TeamMember } from "@/hooks/useTeamData";
import { UserAvatar } from "./UserAvatar";
import { RoleSelectorModal } from "./RoleSelectorModal";

interface BaseMember {
  id: number;
  userId: number;
  role: string;
  status?: string;
  memberStatus?: string;
  User: {
    id: number;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
}

interface MemberItemProps {
  member: BaseMember;
  canRemove: boolean;
  onRemove: (id: number) => void; // Changed to accept id (can be userId or memberId)
  canEditRole?: boolean;
  availableRoles?: Array<{ name: string; nameEn?: string; nameRu?: string; nameHy?: string }>;
  onRoleChange?: (memberId: number, newRole: string) => void;
  showLeadBadge?: boolean; // Optional: show lead badge for teams
  useMemberIdForRemove?: boolean; // If true, use member.id, otherwise use member.userId
}

export const TeamMemberItem = memo(
  ({ 
    member, 
    canRemove, 
    onRemove,
    canEditRole = false,
    availableRoles,
    onRoleChange,
    showLeadBadge = true,
    useMemberIdForRemove = false,
  }: MemberItemProps) => {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const colors = ThemeColors[isDark ? "dark" : "light"];
    const isLead = showLeadBadge && member.role === "lead";
    const isPending = member.status === "pending" || (member as any).memberStatus === "pending";
    const [showRoleModal, setShowRoleModal] = useState(false);

    const handleMemberPress = () => {
      router.push(`/profile/profile?userId=${member.User.id}` as any);
    };

    const handleRemovePress = (e: any) => {
      e.stopPropagation();
      const idToUse = useMemberIdForRemove ? member.id : member.userId;
      onRemove(idToUse);
    };

    const handleRolePress = (e: any) => {
      e.stopPropagation();
      if (!canEditRole || !availableRoles || availableRoles.length === 0) return;
      setShowRoleModal(true);
    };

    const handleRoleSelect = (selectedRole: any) => {
      if (!onRoleChange) return;
      
      // Extract role name from selected item
      let roleName: string;
      if (typeof selectedRole === "string") {
        roleName = selectedRole;
      } else if (selectedRole.roleName) {
        // Use the stored roleName property (the actual role identifier)
        roleName = selectedRole.roleName;
      } else if (selectedRole.name) {
        // Fallback: try to find role by matching the name
        const matchedRole = availableRoles?.find(
          (r) => r.name === selectedRole.name || 
                 r.nameEn === selectedRole.name ||
                 r.nameRu === selectedRole.name ||
                 r.nameHy === selectedRole.name
        );
        roleName = matchedRole?.name || selectedRole.name;
      } else {
        return;
      }
      
      onRoleChange(member.id, roleName);
      setShowRoleModal(false);
    };

    return (
      <>
        <ResponsiveCard
          padding={0}
          marginBlock={0}
          marginHorizontal={0}
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
            <TouchableOpacity
              style={styles.memberContent}
              onPress={handleMemberPress}
              activeOpacity={0.7}
            >
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
                      <Text
                        style={[styles.leadBadgeText, { color: colors.tint }]}
                      >
                        {t("lead")}
                      </Text>
                    </View>
                  )}
                  {isPending && (
                    <View style={styles.pendingBadge}>
                      <IconSymbol name="clock.fill" size={12} color="#FF9500" />
                      <Text style={styles.pendingBadgeText}>{t("pending")}</Text>
                    </View>
                  )}
                </View>
                {canEditRole && (
                  <TouchableOpacity
                    onPress={handleRolePress}
                    style={styles.roleButton}
                  >
                    <Text style={[styles.roleText, { color: colors.tint }]}>
                      {member.role}
                    </Text>
                    <IconSymbol name="chevron.down" size={14} color={colors.tint} />
                  </TouchableOpacity>
                )}
                {!canEditRole && member.role && member.role !== "lead" && (
                  <Text style={[styles.roleTextStatic, { color: colors.textSecondary }]}>
                    {member.role}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {canRemove && (
              <TouchableOpacity
                onPress={handleRemovePress}
                style={styles.removeButton}
              >
                <IconSymbol name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </ResponsiveCard>

        {/* Role Selector Modal */}
        {canEditRole && availableRoles && availableRoles.length > 0 && (
          <RoleSelectorModal
            visible={showRoleModal}
            onClose={() => setShowRoleModal(false)}
            onSelect={handleRoleSelect}
            availableRoles={availableRoles}
            currentRole={member.role}
            title={t("changeRole")}
          />
        )}
      </>
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
  memberContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
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
    alignSelf: "flex-start",
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
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  roleTextStatic: {
    fontSize: 13,
    fontWeight: "500",
  },
  removeButton: {
    padding: Spacing.sm,
  },
});
