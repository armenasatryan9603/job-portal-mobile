import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { RateUnit, useRateUnits } from "@/hooks/useRateUnits";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { SpecialistProfile, apiService } from "@/categories/api";
import { Team, TeamItem } from "./team-item";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCategories, useMyOrders, useSemanticSpecialistsFeed, useSpecialists } from "@/hooks/useApi";

import AnalyticsService from "@/categories/AnalyticsService";
import { Button } from "@/components/ui/button";
import { EmptyPage } from "@/components/EmptyPage";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { Header } from "@/components/Header";
import { HiringDialog } from "@/components/HiringDialog";
import { Layout } from "@/components/Layout";
import { ResponsiveContainer } from "@/components/ResponsiveContainer";
import { SpecialistItem } from "./specialist-item";
import { TopTabs } from "@/components/TopTabs";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useGuestCountry } from "@/contexts/GuestLocationContext";
import { useInfinitePagination } from "@/hooks/useInfinitePagination";
import { useIsWeb } from "@/utils/isWeb";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModal } from "@/contexts/ModalContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

export default function SpecialistsScreen() {
  useAnalytics("Specialists");
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { guestCountryIso, requestLocationAndStore } = useGuestCountry();
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits = (rateUnitsData || []) as RateUnit[];
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { showLoginModal } = useModal();
  const params = useLocalSearchParams<{ tab?: string }>();
  const isDesktopWeb = useIsWeb();

  // Tab state - initialize from URL params
  const [activeTab, setActiveTab] = useState<"individuals" | "teams">(
    (params.tab === "teams" ? "teams" : "individuals") as
      | "individuals"
      | "teams"
  );

  // Update tab when URL params change
  useEffect(() => {
    if (params.tab === "teams") {
      setActiveTab("teams");
    } else if (params.tab === "individuals" || !params.tab) {
      setActiveTab("individuals");
    }
  }, [params.tab]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"basic" | "ai">("basic");
  type SpecialistFilterValue =
    | string
    | string[]
    | { min: number; max: number }
    | { latitude: number; longitude: number; address: string; radius: number }
    | null;

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, SpecialistFilterValue>
  >({
    priceRange: { min: 0, max: 10000000 },
    categories: [],
  });
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [teamImageErrors, setTeamImageErrors] = useState<Set<number>>(
    new Set()
  );

  // Hiring dialog state
  const [hiringDialogVisible, setHiringDialogVisible] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] =
    useState<SpecialistProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [hiringLoading, setHiringLoading] = useState(false);

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsRefreshing, setTeamsRefreshing] = useState(false);

  // Use TanStack Query for data fetching (country always from frontend: user.country when logged in, guest when not)
  const [tempCurrentPage, setTempCurrentPage] = useState(1);
  const countryFilter = (user?.country ?? guestCountryIso) ?? undefined;
  const {
    data: specialistsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useSpecialists(tempCurrentPage, 20, countryFilter);
  // AI semantic search query
  const selectedCategoryId = useMemo(() => {
    const cats = selectedFilters.categories;
    if (Array.isArray(cats) && cats.length > 0) return parseInt(cats[0]);
    return undefined;
  }, [selectedFilters.categories]);

  const priceFilter = selectedFilters.priceRange as { min: number; max: number } | null;

  const {
    data: semanticSpecialistsData,
    error: semanticError,
  } = useSemanticSpecialistsFeed(1, 20, {
    searchQuery,
    categoryId: selectedCategoryId,
    country: countryFilter,
    priceMin: priceFilter?.min,
    priceMax: priceFilter?.max,
    enabled: searchMode === "ai" && isAuthenticated && activeTab === "individuals",
  });

  const { data: categoriesData } = useCategories(1, 100, undefined, language); // Get all categories for filtering with correct language
  const { data: ordersData } = useMyOrders();

  const categories = categoriesData?.categories || [];
  const userOrders = ordersData?.orders || [];
  const pagination = specialistsData?.pagination || {
    page: 1,
    limit: 40,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Use infinite pagination hook
  const {
    allItems: specialists,
    currentPage,
    setCurrentPage,
    loadMore: loadMoreSpecialists,
    onRefresh,
    isInitialLoading,
    isLoadingMore,
    flatListProps,
  } = useInfinitePagination({
    items: specialistsData?.data || [],
    pagination,
    isLoading,
    isFetching,
    enableScrollGate: true,
  });

  // Sync tempCurrentPage with currentPage from hook
  useEffect(() => {
    setTempCurrentPage(currentPage);
  }, [currentPage]);

  // Load teams
  const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      const teamsData = await apiService.getTeams();
      if (Array.isArray(teamsData)) {
        setTeams(teamsData);
      } else if (teamsData && typeof teamsData === "object") {
        const anyData = teamsData as any;
        const teamsArray = Array.isArray(anyData.data)
          ? anyData.data
          : Array.isArray(anyData.teams)
          ? anyData.teams
          : [];
        setTeams(teamsArray);
      } else {
        setTeams([]);
      }
    } catch (error: any) {
      console.error("Error loading teams:", error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "teams") {
      loadTeams();
    }
  }, [activeTab, loadTeams]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated && !guestCountryIso) requestLocationAndStore();
    }, [isAuthenticated, guestCountryIso, requestLocationAndStore])
  );

  const onTeamsRefresh = useCallback(async () => {
    setTeamsRefreshing(true);
    await loadTeams();
    setTeamsRefreshing(false);
  }, [loadTeams]);

  // Get category names and IDs from fetched categories
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    [categories]
  );

  const handleFilterChange = (
    sectionKey: string,
    value:
      | string
      | string[]
      | { min: number; max: number }
      | { latitude: number; longitude: number; address: string; radius: number }
      | null
  ) => {
    AnalyticsService.getInstance().logEvent("filter_changed", {
      filter_type: sectionKey,
      location: "specialists_screen",
      has_value: value !== null && value !== undefined,
    });
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Track search when user stops typing (debounced)
    if (text.trim().length > 0) {
      setTimeout(() => {
        AnalyticsService.getInstance().logSearch(text.trim(), {
          search_type: "specialists",
        });
      }, 500);
    }
  }, []);

  const handleSearchModeToggle = useCallback(
    (mode: "basic" | "ai") => {
      if (mode === "ai") {
        if (!isAuthenticated) {
          showLoginModal();
          return;
        }
      }
      setSearchMode(mode);
    },
    [isAuthenticated, showLoginModal]
  );

  // Handle AI search credit errors
  const semanticErrorAny = semanticError as any;
  useEffect(() => {
    if (
      semanticErrorAny &&
      (semanticErrorAny?.message?.includes("Insufficient credit balance") ||
        semanticErrorAny?.message?.includes("insufficient credit"))
    ) {
      Alert.alert(
        t("insufficientCredits") || "Insufficient Credits",
        t("notEnoughCreditsForSearch") ||
          "You don't have enough credits for AI search. Refill your credits or use Basic Search.",
        [
          { text: t("useBasicSearch") || "Use Basic Search", onPress: () => setSearchMode("basic") },
          {
            text: t("refillCredits") || "Refill Credits",
            onPress: () => router.push("/profile/payment/refill-credits"),
          },
        ]
      );
    }
  }, [semanticErrorAny]);

  // When in AI mode with a query, use semantic results; otherwise use basic client-side filter
  const filteredSpecialists = useMemo(() => {
    if (searchMode === "ai" && searchQuery.trim() && semanticSpecialistsData?.specialists) {
      return semanticSpecialistsData.specialists as any[];
    }
    return specialists.filter((specialist) => {
        // Search filter
        const matchesSearch =
          !searchQuery ||
          specialist.User.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          specialist.User.bio
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());

        // Category filter - compare by category ID
        const categoryFilter = selectedFilters.categories;
        const specialistCategoryId = `${specialist.Category?.id}`;
        const matchesCategory =
          Array.isArray(categoryFilter) &&
          (categoryFilter.length === 0 ||
            categoryFilter.includes(specialistCategoryId));

        // Price filter
        const priceFilterVal = selectedFilters.priceRange;
        const matchesPrice =
          typeof priceFilterVal === "object" &&
          priceFilterVal !== null &&
          "min" in priceFilterVal
            ? (specialist.priceMin || 0) >= priceFilterVal.min &&
              (specialist.priceMin || 0) <= priceFilterVal.max
            : true;

        return matchesSearch && matchesCategory && matchesPrice;
      });
  }, [specialists, searchQuery, selectedFilters, searchMode, semanticSpecialistsData]);

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        !searchQuery ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.Members?.some((member) =>
          member.User?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesSearch;
    });
  }, [teams, searchQuery]);

  // Filter configuration
  const filterSections: FilterSection[] = useMemo(
    () => [
      {
        title: t("priceRange"),
        key: "priceRange",
        type: "range",
        rangeConfig: {
          min: 0,
          max: 10000000,
          step: 5,
        },
      },
      {
        title: t("categories"),
        key: "categories",
        multiSelect: true,
        options: categoryOptions.map((category) => ({
          key: category.id.toString(),
          label: category.name,
        })),
      },
    ],
    [t, categoryOptions]
  );

  const handleSpecialistPress = (specialistId: number) => {
    AnalyticsService.getInstance().logEvent("specialist_clicked", {
      specialist_id: specialistId.toString(),
      location: "specialists_list",
    });
    router.push(`/specialists/${specialistId}`);
  };

  const handleHireSpecialist = (specialist: SpecialistProfile) => {
    // Track hire specialist action
    AnalyticsService.getInstance().logEvent("hire_specialist_initiated", {
      specialist_id: specialist.id.toString(),
    });

    // Check if user is authenticated
    if (!isAuthenticated) {
      // User is not logged in, show login modal
      showLoginModal();
      return;
    }

    // Check if user has existing orders
    if (userOrders.length > 0) {
      // User has orders, show hiring dialog
      setSelectedSpecialist(specialist);
      setSelectedTeam(null);
      setHiringDialogVisible(true);
    } else {
      // User has no orders, redirect to create order page
      router.push(`/orders/create?specialistId=${specialist.id}`);
    }
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

    // Check if user has existing orders
    if (userOrders.length > 0) {
      // User has orders, show hiring dialog
      setSelectedTeam(team);
      setSelectedSpecialist(null);
      setHiringDialogVisible(true);
    } else {
      // User has no orders, redirect to create order page
      router.push(`/orders/create?teamId=${team.id}`);
    }
  };

  const handleTeamPress = (teamId: number) => {
    router.push(`/teams/${teamId}` as any);
  };

  const handleTeamImageError = (userId: number) => {
    setTeamImageErrors((prev) => new Set(prev).add(userId));
  };

  const handleHiringSubmit = async (message: string, orderId: number) => {
    if (selectedSpecialist) {
      try {
        setHiringLoading(true);
        const result = await apiService.hireSpecialist({
          specialistId: selectedSpecialist.id,
          message,
          orderId,
        });

        // Track successful hiring
        AnalyticsService.getInstance().logEvent("specialist_hired", {
          specialist_id: selectedSpecialist.id.toString(),
          order_id: orderId.toString(),
        });

        // Navigate to the conversation after successful hiring
        if (result.conversation?.id) {
          router.push(`/chat/${result.conversation.id}`);
        } else {
          Alert.alert(t("success"), t("hiringRequestSent"));
        }

        setHiringDialogVisible(false);
        setSelectedSpecialist(null);
      } catch (error) {
        console.error("Error hiring specialist:", error);
        Alert.alert(t("error"), t("failedToSendHiringRequest"));
      } finally {
        setHiringLoading(false);
      }
    } else if (selectedTeam) {
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
    }
  };

  const handleHiringClose = () => {
    setHiringDialogVisible(false);
    setSelectedSpecialist(null);
    setSelectedTeam(null);
  };

  const handleImageError = (specialistId: number) => {
    setImageErrors((prev) => new Set(prev).add(specialistId));
  };

  const header = useMemo(
    () => (
      <Header
        title={t("specialists")}
        showNotificationsButton={isAuthenticated}
        showChatButton={isAuthenticated}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
    ),
    [t, isAuthenticated, unreadNotificationsCount, unreadMessagesCount]
  );

  const tabs = useMemo(
    () => [
      { key: "individuals", label: t("individuals") },
      { key: "teams", label: t("teams") },
    ],
    [t]
  );

  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey as "individuals" | "teams");
    AnalyticsService.getInstance().logEvent("tab_changed", {
      tab: tabKey,
      location: "specialists_screen",
    });
  }, []);

  const renderTeamItem = useCallback(
    ({ item: team }: { item: Team }) => (
      <TeamItem
        team={team}
        onPress={handleTeamPress}
        onHire={handleHireTeam}
        onImageError={handleTeamImageError}
        teamImageErrors={teamImageErrors}
      />
    ),
    [handleTeamPress, handleHireTeam, handleTeamImageError, teamImageErrors]
  );

  const renderTeamsEmptyComponent = useCallback(() => {
    if (filteredTeams.length === 0 && !teamsLoading) {
      return (
        <EmptyPage
          type="empty"
          icon="person.3"
          title={t("noTeams")}
          subtitle={
            searchQuery ? t("tryAdjustingSearchTerms") : t("noTeamsAvailable")
          }
        />
      );
    }
    return null;
  }, [filteredTeams.length, searchQuery, teamsLoading, t]);

  const renderSpecialistItem = useCallback(
    ({ item: specialist }: { item: SpecialistProfile }) => (
      <SpecialistItem
        specialist={specialist}
        onPress={handleSpecialistPress}
        onHire={handleHireSpecialist}
        onImageError={handleImageError}
        imageErrors={imageErrors}
        rateUnits={rateUnits}
      />
    ),
    [
      handleSpecialistPress,
      handleHireSpecialist,
      handleImageError,
      imageErrors,
      rateUnits,
    ]
  );

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingMoreText, { color: colors.text }]}>
            {t("loadingMoreSpecialists")}
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, colors, t]);

  const renderEmptyComponent = useCallback(() => {
    if (filteredSpecialists.length === 0) {
      return (
        <EmptyPage
          type="empty"
          icon="person.2"
          title={t("noSpecialists")}
          subtitle={
            searchQuery
              ? t("tryAdjustingSearchTerms")
              : t("noSpecialistsAvailable")
          }
        />
      );
    }
    return null;
  }, [filteredSpecialists.length, searchQuery, t]);

  // Show error state
  if (error) {
    return (
      <Layout header={header}>
        <EmptyPage
          type="error"
          title={error.message || t("failedToLoadSpecialists")}
          buttonText={t("retry")}
          onRetry={() => refetch()}
        />
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <ResponsiveContainer scrollable={false}>
      {!isDesktopWeb && !isAuthenticated && !guestCountryIso && (
        <View style={[styles.locationBanner, { backgroundColor: colors.tint + "20" }]}>
          <Text style={[styles.locationBannerText, { color: colors.text }]} numberOfLines={2}>
            {t("setLocationToSeeRelevant")}
          </Text>
          <Button title={t("openSettings")} icon="globe" iconSize={16} variant="outline" onPress={() => Linking.openSettings()} style={styles.locationBannerBtn}/>
        </View>
      )}
      <TopTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <View style={styles.container}>
        <Filter
          searchPlaceholder={
            activeTab === "teams"
              ? t("searchTeams")
              : t("searchSpecialistsSkills")
          }
          onSearchChange={handleSearchChange}
          filterSections={filterSections}
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          priceRangeCurrency={user?.currency ?? "USD"}
          aiMode={searchMode === "ai" && activeTab === "individuals"}
          onAiModeToggle={activeTab === "individuals" && isAuthenticated ? () => handleSearchModeToggle(searchMode === "ai" ? "basic" : "ai") : undefined}
        />

        {/* Show content based on active tab */}
        {activeTab === "individuals" ? (
          <>
            {/* Show skeleton during initial load, otherwise show FlatList */}
            {isInitialLoading ? (
              <View style={{ flex: 1 }}>
                <FloatingSkeleton
                  count={5}
                  itemHeight={300}
                  showImage={false}
                  showAvatar={true}
                  showTitle={false}
                  showDescription={true}
                  showDetails={true}
                  showTags={true}
                  showFooter={true}
                />
              </View>
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={filteredSpecialists}
                renderItem={renderSpecialistItem}
                keyExtractor={(item) => item.id.toString()}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmptyComponent}
                {...flatListProps}
                refreshControl={
                  <RefreshControl
                    refreshing={isLoading}
                    onRefresh={onRefresh}
                    tintColor={colors.tint}
                  />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 6 * Spacing.lg }}
              />
            )}
          </>
        ) : (
          <>
            {/* Teams tab */}
            {teamsLoading ? (
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
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={filteredTeams}
                renderItem={renderTeamItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                  <RefreshControl
                    refreshing={teamsRefreshing}
                    onRefresh={onTeamsRefresh}
                    tintColor={colors.tint}
                  />
                }
                ListEmptyComponent={renderTeamsEmptyComponent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 6 * Spacing.lg }}
              />
            )}
          </>
        )}
      </View>

      <HiringDialog
        visible={hiringDialogVisible}
        onClose={handleHiringClose}
        onSubmit={handleHiringSubmit}
        specialistName={
          selectedSpecialist?.User.name || selectedTeam?.name || ""
        }
        specialistId={selectedSpecialist?.id || selectedTeam?.id || 0}
        userOrders={userOrders}
        loading={hiringLoading}
      />
      </ResponsiveContainer>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  filterCard: {
    marginBottom: 0,
    borderWidth: 1,
  },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  locationBannerText: { flex: 1, fontSize: 13 },
  locationBannerBtn: { paddingVertical: 4, paddingHorizontal: 8 },
});
