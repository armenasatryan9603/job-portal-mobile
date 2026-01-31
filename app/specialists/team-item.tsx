import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Spacing, ThemeColors } from "@/constants/styles";

import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { User } from "@/categories/api";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

export interface Team {
  id: number;
  name: string;
  createdBy: number;
  createdAt: string;
  isActive: boolean;
  Creator?: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  Members?: Array<{
    id: number;
    userId: number;
    role: string;
    status?: string;
    memberStatus?: string;
    isActive: boolean;
    User: User;
  }>;
}

interface TeamItemProps {
  team: Team;
  onPress: (teamId: number) => void;
  onHire: (team: Team) => void;
  onImageError: (userId: number) => void;
  teamImageErrors: Set<number>;
}

const getAcceptedMembers = (team: Team) => {
  return (
    team.Members?.filter(
      (m) =>
        m.status === "accepted" ||
        (m.memberStatus !== "pending" && !m.status && m.isActive)
    ) || []
  );
};

export const TeamItem: React.FC<TeamItemProps> = ({
  team,
  onPress,
  onHire,
  onImageError,
  teamImageErrors,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { user } = useAuth();

  const acceptedMembers = getAcceptedMembers(team);
  const memberCount = acceptedMembers.length;

  // Check if user is part of this team (creator or member)
  const isUserPartOfTeam =
    team.createdBy === user?.id ||
    acceptedMembers.some((member) => member.userId === user?.id);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(team.id)}
    >
      <ResponsiveCard padding={0}>
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.tint + "20" },
              ]}
            >
              <IconSymbol
                name="person.3.fill"
                size={32}
                color={colors.tint}
              />
            </View>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.text }]}>
                {team.name}
              </Text>
              <View style={styles.teamMeta}>
                <View style={styles.metaItem}>
                  <IconSymbol
                    name="person.fill"
                    size={14}
                    color={colors.tabIconDefault}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {memberCount} {t("members")}
                  </Text>
                </View>
                {team.Creator && (
                  <View style={styles.metaItem}>
                    <IconSymbol
                      name="person.circle.fill"
                      size={14}
                      color={colors.tabIconDefault}
                    />
                    <Text
                      style={[
                        styles.metaText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {team.Creator.name}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={colors.tabIconDefault}
            />
          </View>

          {acceptedMembers.length > 0 && (
            <View style={styles.membersContainer}>
              <Text
                style={[
                  styles.membersTitle,
                  { color: colors.tabIconDefault },
                ]}
              >
                {t("teamMembers")}
              </Text>
              <View style={styles.membersList}>
                {acceptedMembers.slice(0, 5).map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    {member.User?.avatarUrl &&
                    !teamImageErrors.has(member.User?.id || 0) ? (
                      <Image
                        source={{ uri: member.User?.avatarUrl }}
                        style={styles.avatar}
                        onError={() =>
                          onImageError(member.User?.id || 0)
                        }
                      />
                    ) : (
                      <View style={styles.defaultAvatar}>
                        <Text
                          style={[
                            styles.avatarInitials,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          {(member.User?.name || t("deletedUser"))
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {memberCount > 5 && (
                  <View
                    style={[
                      styles.memberAvatar,
                      styles.moreMembers,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.moreMembersText,
                        { color: colors.tint },
                      ]}
                    >
                      +{memberCount - 5}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.teamFooter}>
            {!isUserPartOfTeam && (
              <TouchableOpacity
                style={[
                  styles.hireButton,
                  {
                    backgroundColor: colors.tint,
                  },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onHire(team);
                }}
              >
                <Text
                  style={[
                    styles.hireButtonText,
                    { color: colors.background },
                  ]}
                >
                  {t("hire")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ResponsiveCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  teamCard: {
    padding: 20,
    borderRadius: 16,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 26,
  },
  teamMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  membersContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  membersList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: "600",
  },
  moreMembers: {
    borderWidth: 1,
    borderStyle: "dashed",
  },
  moreMembersText: {
    fontSize: 12,
    fontWeight: "600",
  },
  teamFooter: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  hireButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
  },
  hireButtonText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
});
