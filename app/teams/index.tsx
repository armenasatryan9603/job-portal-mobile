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
  Alert,
} from "react-native";
import { apiService, User } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { HiringDialog } from "@/components/HiringDialog";
import { useModal } from "@/contexts/ModalContext";
import { useMyOrders } from "@/hooks/useApi";
import AnalyticsService from "@/services/AnalyticsService";

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
  const { showLoginModal } = useModal();
  const { data: ordersData } = useMyOrders();

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

  // Hiring dialog state
  const [hiringDialogVisible, setHiringDialogVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [hiringLoading, setHiringLoading] = useState(false);

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

  const handleHireTeam = (team: Team) => {
    // Track hire team action
    AnalyticsService.getInstance().logEvent("hire_team_initiated", {
      team_id: team.id.toString(),
    });

    // Check if user is authenticated
    if (!isAuthenticated) {
      // User is not logged in, show login modal
      showLoginModal();
      return;
    }

    const userOrders = ordersData?.orders || [];
    // Check if user has existing orders
    if (userOrders.length > 0) {
      // User has orders, show hiring dialog
      setSelectedTeam(team);
      setHiringDialogVisible(true);
    } else {
      // User has no orders, redirect to create order page
      router.push(`/orders/create?teamId=${team.id}`);
    }
  };

  const handleHiringSubmit = async (message: string, orderId: number) => {
    if (!selectedTeam) return;

    try {
      setHiringLoading(true);
      const result = await apiService.hireTeam({
        teamId: selectedTeam.id,
        message,
        orderId,
      });

      // Track successful hiring
      AnalyticsService.getInstance().logEvent("team_hired", {
        team_id: selectedTeam.id.toString(),
        order_id: orderId.toString(),
      });

      // Navigate to the conversation after successful hiring
      if (result.conversation?.id) {
        router.push(`/chat/${result.conversation.id}`);
      } else {
        Alert.alert(t("success"), t("hiringRequestSent"));
      }

      setHiringDialogVisible(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error("Error hiring team:", error);
      Alert.alert(t("error"), t("failedToSendHiringRequest"));
    } finally {
      setHiringLoading(false);
    }
  };

  const handleHiringClose = () => {
    setHiringDialogVisible(false);
    setSelectedTeam(null);
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

      // Check if user is part of this team (creator or member)
      const isUserPartOfTeam =
        team.createdBy === user?.id ||
        acceptedMembers.some((member) => member.userId === user?.id);

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
                      handleHireTeam(team);
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
    },
    [
      colors,
      t,
      user,
      handleTeamPress,
      handleHireTeam,
      handleImageError,
      imageErrors,
    ]
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
            itemHeight={220}
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

      <HiringDialog
        visible={hiringDialogVisible}
        onClose={handleHiringClose}
        onSubmit={handleHiringSubmit}
        specialistName={selectedTeam?.name || ""}
        specialistId={selectedTeam?.id || 0}
        userOrders={ordersData?.orders || []}
        loading={hiringLoading}
      />
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
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  hireButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
