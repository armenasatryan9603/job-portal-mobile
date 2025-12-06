import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { EmptyPage } from "@/components/EmptyPage";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors, Spacing } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Image,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { apiService, User } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Team {
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

export default function TeamsScreen() {
  useAnalytics("Teams");
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();

  // Debug: Log authentication state
  useEffect(() => {
    console.log("🔐 Auth state check:", {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
    });
  }, [isAuthenticated, user]);
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const teamsData = await apiService.getTeams();
      if (Array.isArray(teamsData)) {
        console.log("Setting teams, count:", teamsData.length);
        console.log("First team sample:", teamsData[0]);
        setTeams(teamsData);
      } else if (teamsData && typeof teamsData === "object") {
        // Handle case where response might be wrapped
        console.log("Teams data is object, checking structure:", teamsData);
        const anyData = teamsData as any;
        const teamsArray = Array.isArray(anyData.data)
          ? anyData.data
          : Array.isArray(anyData.teams)
          ? anyData.teams
          : [];
        console.log("Extracted teams array, count:", teamsArray.length);
        setTeams(teamsArray);
      } else {
        console.log("Teams data is not an array, setting empty array");
        setTeams([]);
      }
    } catch (error: any) {
      console.error("Error loading teams:", error);
      console.error("Error details:", error?.message, error?.response);
      // Set empty array on any error
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams, isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTeams();
    setIsRefreshing(false);
  }, [loadTeams]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    console.log(
      "Filtering teams. Total teams:",
      teams.length,
      "Search query:",
      searchQuery
    );
    const filtered = teams.filter((team) => {
      const matchesSearch =
        !searchQuery ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.Members?.some((member) =>
          member.User.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

      return matchesSearch;
    });
    console.log("Filtered teams count:", filtered.length);
    return filtered;
  }, [teams, searchQuery]);

  const handleTeamPress = (teamId: number) => {
    router.push(`/teams/${teamId}` as any);
  };

  const handleImageError = (userId: number) => {
    setImageErrors((prev) => new Set(prev).add(userId));
  };

  const header = useMemo(
    () => (
      <Header
        title={isAuthenticated ? t("myTeams") : t("teams") || "Teams"}
        subtitle={t("findTeamsDesc")}
        showNotificationsButton={isAuthenticated}
        showChatButton={isAuthenticated}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
    ),
    [t, isAuthenticated, unreadNotificationsCount, unreadMessagesCount]
  );

  const getAcceptedMembers = (team: Team) => {
    return (
      team.Members?.filter(
        (m) =>
          m.status === "accepted" ||
          (m.memberStatus !== "pending" && !m.status && m.isActive)
      ) || []
    );
  };

  const renderTeamItem = useCallback(
    ({ item: team }: { item: Team }) => {
      const acceptedMembers = getAcceptedMembers(team);
      const memberCount = acceptedMembers.length;

      return (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleTeamPress(team.id)}
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
                        {memberCount} {t("members") || "members"}
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
                        {member.User.avatarUrl &&
                        !imageErrors.has(member.User.id) ? (
                          <Image
                            source={{ uri: member.User.avatarUrl }}
                            style={styles.avatar}
                            onError={() => handleImageError(member.User.id)}
                          />
                        ) : (
                          <View style={styles.defaultAvatar}>
                            <Text
                              style={[
                                styles.avatarInitials,
                                { color: colors.tabIconDefault },
                              ]}
                            >
                              {member.User.name
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
                <TouchableOpacity
                  style={[
                    styles.viewButton,
                    {
                      backgroundColor: colors.tint,
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleTeamPress(team.id);
                  }}
                >
                  <Text
                    style={[
                      styles.viewButtonText,
                      { color: colors.background },
                    ]}
                  >
                    {t("viewTeam")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ResponsiveCard>
        </TouchableOpacity>
      );
    },
    [colors, t, handleTeamPress, handleImageError, imageErrors]
  );

  const renderEmptyComponent = useCallback(() => {
    if (filteredTeams.length === 0 && !isLoading) {
      return (
        <EmptyPage
          type="empty"
          icon="person.3"
          title={!isAuthenticated ? t("loginToViewTeams") : t("noTeams")}
          subtitle={
            !isAuthenticated
              ? t("loginToViewTeamsDesc")
              : searchQuery
              ? t("tryAdjustingSearchTerms")
              : t("noTeamsAvailable")
          }
        />
      );
    }
    return null;
  }, [filteredTeams.length, searchQuery, isLoading, isAuthenticated, t]);

  return (
    <Layout header={header}>
      <View>
        <ResponsiveCard padding={Spacing.md}>
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={20}
                color={colors.tabIconDefault}
              />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                placeholder={t("searchTeams")}
                placeholderTextColor={colors.tabIconDefault}
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
            </View>
          </View>
        </ResponsiveCard>

        {/* Show skeleton during initial load, otherwise show FlatList */}
        {isLoading ? (
          <FloatingSkeleton
            count={5}
            itemHeight={200}
            showImage={false}
            showAvatar={true}
            showTitle={true}
            showDescription={false}
            showDetails={true}
            showTags={false}
            showFooter={true}
          />
        ) : filteredTeams.length > 0 ? (
          <FlatList
            data={filteredTeams}
            renderItem={renderTeamItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmptyComponent()
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInputText: {
    flex: 1,
    fontSize: 15,
  },
  teamCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
    marginBottom: 16,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  viewButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
