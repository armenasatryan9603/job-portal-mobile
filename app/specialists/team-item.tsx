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
  bannerUrl?: string | null;
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

  const isUserPartOfTeam =
    team.createdBy === user?.id ||
    acceptedMembers.some((member) => member.userId === user?.id);

  const hasBanner = !!(team.bannerUrl?.trim?.());
  const [bannerError, setBannerError] = React.useState(false);
  const showBannerImage = hasBanner && !bannerError;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(team.id)}
    >
      <ResponsiveCard padding={0}>
        <View style={styles.teamCard}>
          {/* Banner - full width, replaces profile circle */}
          <View style={styles.bannerContainer}>
            {showBannerImage && team.bannerUrl ? (
              <Image
                source={{ uri: team.bannerUrl.trim() }}
                style={styles.bannerImage}
                resizeMode="cover"
                onError={() => setBannerError(true)}
              />
            ) : (
              <View
                style={[
                  styles.bannerPlaceholder,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <IconSymbol
                  name="person.3.fill"
                  size={40}
                  color={colors.tint}
                />
              </View>
            )}
          </View>

          <View style={styles.teamHeader}>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                {team.name}
              </Text>
              <View style={styles.teamMetaRow}>
                <Text style={[styles.teamSubtitle, { color: colors.tabIconDefault }]}>
                  {t("team")} • {memberCount} {t("members")}
                </Text>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: team.isActive ? colors.success : colors.warning },
                  ]}
                />
                <Text style={[styles.statusText, { color: colors.tabIconDefault }]}>
                  {team.isActive ? t("active") : t("inactive")}
                </Text>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.tabIconDefault} />
          </View>

          {acceptedMembers.length > 0 && (
            <View style={styles.membersRow}>
              {acceptedMembers.slice(0, 5).map((member) => (
                <View
                  key={member.id}
                  style={[styles.memberAvatar, { backgroundColor: colors.border }]}
                >
                  {member.User?.avatarUrl &&
                  !teamImageErrors.has(member.User?.id || 0) ? (
                    <Image
                      source={{ uri: member.User?.avatarUrl }}
                      style={styles.memberAvatarImg}
                      onError={() => onImageError(member.User?.id || 0)}
                    />
                  ) : (
                    <Text
                      style={[styles.memberInitials, { color: colors.tabIconDefault }]}
                    >
                      {(member.User?.name || t("deletedUser"))
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  )}
                </View>
              ))}
              {memberCount > 5 && (
                <View style={[styles.memberAvatar, styles.moreAvatar, { backgroundColor: colors.background }]}>
                  <Text style={[styles.moreMembersText, { color: colors.tint }]}>
                    +{memberCount - 5}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.teamFooter}>
            <View style={styles.statsContainer}>
              {team.Creator && (
                <Text style={[styles.creatorText, { color: colors.tabIconDefault }]} numberOfLines={1}>
                  {t("ledBy")} {team.Creator.name}
                </Text>
              )}
            </View>
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
    borderRadius: 16,
    overflow: "hidden",
  },
  bannerContainer: {
    width: "100%",
    height: 96,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  teamInfo: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  teamMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  memberInitials: {
    fontSize: 12,
    fontWeight: "600",
  },
  moreAvatar: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.2)",
  },
  moreMembersText: {
    fontSize: 12,
    fontWeight: "600",
  },
  teamFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  statsContainer: {
    flex: 1,
    minWidth: 0,
  },
  creatorText: {
    fontSize: 13,
    opacity: 0.8,
  },
  hireButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 64,
  },
  hireButtonText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
});
