import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors, Spacing } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Image,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { apiService, SpecialistProfile } from "@/services/api";
import { useSpecialists, useServices, useMyOrders } from "@/hooks/useApi";
import { HiringDialog } from "@/components/HiringDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useModal } from "@/contexts/ModalContext";

export default function SpecialistsScreen() {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { showLoginModal } = useModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string | string[] | { min: number; max: number }>
  >({
    priceRange: { min: 0, max: 200 },
    services: [],
  });
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Hiring dialog state
  const [hiringDialogVisible, setHiringDialogVisible] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] =
    useState<SpecialistProfile | null>(null);
  const [hiringLoading, setHiringLoading] = useState(false);

  // Use TanStack Query for data fetching
  const [currentPage, setCurrentPage] = useState(1);
  const [allSpecialists, setAllSpecialists] = useState<SpecialistProfile[]>([]);
  const {
    data: specialistsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useSpecialists(currentPage, 20);
  const { data: servicesData } = useServices(1, 100); // Get all services for filtering
  const { data: ordersData } = useMyOrders();

  // Accumulate specialists from all pages
  useEffect(() => {
    if (specialistsData?.data) {
      if (currentPage === 1) {
        setAllSpecialists(specialistsData.data);
      } else {
        setAllSpecialists((prev) => [...prev, ...specialistsData.data]);
      }
    }
  }, [specialistsData, currentPage]);

  const specialists = allSpecialists;
  const services = servicesData?.services || [];
  const userOrders = ordersData?.orders || [];
  const pagination = specialistsData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Show loading only on initial load (page 1)
  const isInitialLoading = isLoading && currentPage === 1;
  const isLoadingMore = isFetching && currentPage > 1;

  const loadMoreSpecialists = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Get service names and IDs from fetched services
  const serviceOptions = useMemo(
    () =>
      services.map((service) => ({
        id: service.id,
        name: service.name,
      })),
    [services]
  );

  const handleFilterChange = (
    sectionKey: string,
    value: string | string[] | { min: number; max: number }
  ) => {
    // alert("handleFilterChange");
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  // Filter specialists based on search and filters
  const filteredSpecialists = useMemo(
    () =>
      specialists.filter((specialist) => {
        // Search filter
        const matchesSearch =
          !searchQuery ||
          specialist.User.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          specialist.User.bio
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());

        // Service filter - compare by service ID
        const serviceFilter = selectedFilters.services;
        const specialistServiceId = `${specialist.Service?.id}`;
        const matchesService =
          Array.isArray(serviceFilter) &&
          (serviceFilter.length === 0 ||
            serviceFilter.includes(specialistServiceId));

        // Price filter
        const priceFilter = selectedFilters.priceRange;
        const matchesPrice =
          typeof priceFilter === "object" &&
          priceFilter !== null &&
          "min" in priceFilter
            ? (specialist.priceMin || 0) >= priceFilter.min &&
              (specialist.priceMin || 0) <= priceFilter.max
            : true;

        return matchesSearch && matchesService && matchesPrice;
      }),
    [specialists, searchQuery, selectedFilters]
  );

  // Filter configuration
  const filterSections: FilterSection[] = useMemo(
    () => [
      {
        title: t("priceRange"),
        key: "priceRange",
        type: "range",
        rangeConfig: {
          min: 0,
          max: 200,
          step: 5,
        },
      },
      {
        title: t("services"),
        key: "services",
        multiSelect: true,
        options: serviceOptions.map((service) => ({
          key: service.id.toString(),
          label: service.name,
        })),
      },
    ],
    [t, serviceOptions]
  );

  const handleSpecialistPress = (specialistId: number) => {
    router.push(`/specialists/${specialistId}`);
  };

  const handleHireSpecialist = (specialist: SpecialistProfile) => {
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
      setHiringDialogVisible(true);
    } else {
      // User has no orders, redirect to create order page
      router.push(`/orders/create?specialistId=${specialist.id}`);
    }
  };

  const handleHiringSubmit = async (message: string, orderId: number) => {
    if (!selectedSpecialist) return;

    try {
      setHiringLoading(true);
      const result = await apiService.hireSpecialist({
        specialistId: selectedSpecialist.id,
        message,
        orderId,
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
  };

  const handleHiringClose = () => {
    setHiringDialogVisible(false);
    setSelectedSpecialist(null);
  };

  const handleImageError = (specialistId: number) => {
    setImageErrors((prev) => new Set(prev).add(specialistId));
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <IconSymbol key={i} name="star.fill" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <IconSymbol
          key="half"
          name="star.leadinghalf.filled"
          size={14}
          color="#FFD700"
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <IconSymbol key={`empty-${i}`} name="star" size={14} color="#E0E0E0" />
      );
    }

    return stars;
  };

  const header = useMemo(
    () => (
      <Header
        title={t("specialists")}
        subtitle={t("findSpecialistsDesc")}
        showNotificationsButton={isAuthenticated}
        showChatButton={isAuthenticated}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
    ),
    [t, isAuthenticated, unreadNotificationsCount, unreadMessagesCount]
  );

  const renderSpecialistItem = useCallback(
    ({ item: specialist }: { item: SpecialistProfile }) => (
      <TouchableOpacity onPress={() => handleSpecialistPress(specialist.id)}>
        <ResponsiveCard padding={0}>
          <View style={styles.specialistCard}>
            <View style={styles.specialistHeader}>
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: colors.border },
                ]}
              >
                {specialist.User.avatarUrl &&
                !imageErrors.has(specialist.id) ? (
                  <Image
                    source={{ uri: specialist.User.avatarUrl }}
                    style={styles.avatar}
                    onError={() => handleImageError(specialist.id)}
                  />
                ) : (
                  <View style={styles.defaultAvatar}>
                    <IconSymbol
                      name="person.fill"
                      size={30}
                      color={colors.tabIconDefault}
                    />
                  </View>
                )}
              </View>
              <View style={styles.specialistInfo}>
                <Text style={[styles.specialistName, { color: colors.text }]}>
                  {specialist.User.name}
                </Text>
                <Text style={[styles.specialistTitle, { color: colors.tint }]}>
                  {specialist.Service?.name || t("specialist")}
                </Text>
                <View style={styles.ratingContainer}>
                  {specialist.averageRating && specialist.averageRating > 0 ? (
                    <>
                      <View style={styles.stars}>
                        {renderStars(specialist.averageRating)}
                      </View>
                      <Text style={[styles.ratingText, { color: colors.text }]}>
                        {specialist.averageRating.toFixed(1)} (
                        {specialist.reviewCount || 0})
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.ratingText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("notRatedYet")}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.availabilityBadge}>
                <View
                  style={[
                    styles.availabilityDot,
                    {
                      backgroundColor: specialist.User.verified
                        ? "#4CAF50"
                        : "#FFA500",
                    },
                  ]}
                />
                <Text style={[styles.availabilityText, { color: colors.text }]}>
                  {specialist.User.verified ? t("verified") : t("unverified")}
                </Text>
              </View>
            </View>

            <Text style={[styles.bio, { color: colors.tabIconDefault }]}>
              {specialist.User.bio || t("defaultSpecialistBio")}
            </Text>

            <View style={styles.specialistDetails}>
              <View style={styles.detailItem}>
                <IconSymbol
                  name="dollarsign.circle.fill"
                  size={16}
                  color={colors.tint}
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {specialist.priceMin && specialist.priceMax
                    ? `$${specialist.priceMin}-${specialist.priceMax}/hr`
                    : t("priceNegotiable")}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <IconSymbol
                  name="location.fill"
                  size={16}
                  color={colors.tint}
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {specialist.location || t("remote")}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <IconSymbol
                  name="briefcase.fill"
                  size={16}
                  color={colors.tint}
                />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {specialist.experienceYears || 0} {t("yearsExp")}
                </Text>
              </View>
            </View>

            <View style={styles.skillsContainer}>
              {specialist.Service?.technologies
                ?.slice(0, 5)
                .map((skill, index) => (
                  <View
                    key={index}
                    style={[
                      styles.skillTag,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.skillText, { color: colors.text }]}>
                      {skill}
                    </Text>
                  </View>
                )) || (
                <Text
                  style={[styles.skillText, { color: colors.tabIconDefault }]}
                >
                  {t("noSkillsListed")}
                </Text>
              )}
              {(specialist.Service?.technologies?.length || 0) > 5 && (
                <Text
                  style={[
                    styles.moreSkillsText,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  +{(specialist.Service?.technologies?.length || 0) - 5}{" "}
                  {t("more")}
                </Text>
              )}
            </View>

            <View style={styles.specialistFooter}>
              <View style={styles.statsContainer}>
                <Text style={[styles.statText, { color: colors.text }]}>
                  {specialist._count?.Proposals || 0} {t("proposalsSent")}
                </Text>
                <Text style={[styles.statText, { color: colors.text }]}>
                  {specialist.experienceYears || 0} {t("yearsExperience")}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.hireButton,
                  {
                    backgroundColor: colors.tint,
                  },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleHireSpecialist(specialist);
                }}
              >
                <Text
                  style={[styles.hireButtonText, { color: colors.background }]}
                >
                  {t("hire")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ResponsiveCard>
      </TouchableOpacity>
    ),
    [
      colors,
      t,
      handleSpecialistPress,
      handleHireSpecialist,
      handleImageError,
      imageErrors,
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

  const renderHeader = () => null;

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

  // Show loading state
  if (isInitialLoading) {
    return (
      <Layout header={header}>
        <EmptyPage type="loading" title={t("loadingSpecialists")} />
      </Layout>
    );
  }

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
      <View style={styles.container}>
        <ResponsiveCard style={[styles.filterCard, styles.filterContainer]}>
          <Filter
            searchPlaceholder={t("searchSpecialistsSkills")}
            onSearchChange={setSearchQuery}
            filterSections={filterSections}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
          />
        </ResponsiveCard>

        <FlatList
          style={{ marginTop: 100 }}
          data={filteredSpecialists}
          renderItem={renderSpecialistItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyComponent}
          onEndReached={loadMoreSpecialists}
          onEndReachedThreshold={0.1}
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
      </View>

      <HiringDialog
        visible={hiringDialogVisible}
        onClose={handleHiringClose}
        onSubmit={handleHiringSubmit}
        specialistName={selectedSpecialist?.User.name || ""}
        specialistId={selectedSpecialist?.id || 0}
        userOrders={userOrders}
        loading={hiringLoading}
      />
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
  specialistCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  specialistHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  defaultAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  specialistInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 26,
  },
  specialistTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stars: {
    flexDirection: "row",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  specialistDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  skillTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  moreSkillsText: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.7,
  },
  specialistFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  statsContainer: {
    flex: 1,
  },
  statText: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 2,
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
