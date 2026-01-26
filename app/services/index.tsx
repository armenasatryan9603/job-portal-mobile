import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BorderRadius, Shadows, Spacing, ThemeColors } from "@/constants/styles";
import { Filter, FilterSection } from "@/components/FilterComponent";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@/components/ui/button";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { LocationFilterModal } from "@/components/LocationFilterModal";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { ServiceItem } from "@/components/ServiceItem";
import { apiService } from "@/categories/api";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useInfinitePagination } from "@/hooks/useInfinitePagination";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/hooks/useTranslation";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

export default function ServicesScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { myServices } = useLocalSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<
      string,
      | string
      | string[]
      | { min: number; max: number }
      | { latitude: number; longitude: number; address: string; radius: number }
      | null
    >
  >({
    verified: "all", // all, true, false
    sortBy: "relevance", // relevance, date_desc, date_asc, name_asc, name_desc
    location: null,
  });
  const [locationFilterVisible, setLocationFilterVisible] = useState(false);
  const [filterModalHiddenForLocation, setFilterModalHiddenForLocation] =
    useState(false);

  const filterStorageKey = useMemo(
    () => `servicesFilters:${myServices === "true" ? "myServices" : "all"}`,
    [myServices]
  );
  const searchStorageKey = useMemo(
    () => `servicesSearch:${myServices === "true" ? "myServices" : "all"}`,
    [myServices]
  );

  // Load saved filters/search from local storage
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFiltersString = await AsyncStorage.getItem(filterStorageKey);
        const savedSearch = await AsyncStorage.getItem(searchStorageKey);

        if (savedFiltersString) {
          const parsed = JSON.parse(savedFiltersString);
          setSelectedFilters((prev) => ({
            ...prev,
            ...parsed,
          }));
        }

        if (savedSearch !== null) {
          setSearchQuery(savedSearch);
        }
      } catch (error) {
        console.error("Error loading saved filters:", error);
      }
    };
    loadSavedFilters();
  }, [filterStorageKey, searchStorageKey]);

  // Persist filters to local storage
  useEffect(() => {
    const saveFilters = async () => {
      try {
        await AsyncStorage.setItem(
          filterStorageKey,
          JSON.stringify(selectedFilters)
        );
      } catch (error) {
        console.error("Error saving filters:", error);
      }
    };
    saveFilters();
  }, [selectedFilters, filterStorageKey]);

  // Persist search query to local storage
  useEffect(() => {
    const saveSearch = async () => {
      try {
        await AsyncStorage.setItem(searchStorageKey, searchQuery);
      } catch (error) {
        console.error("Error saving search query:", error);
      }
    };
    saveSearch();
  }, [searchQuery, searchStorageKey]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilters, searchQuery]);

  const filters = useMemo(() => {
    const baseFilters: any = {
      page: currentPage,
      limit: 10,
    };

    // If viewing "My Services", don't filter by status (show all statuses)
    // The backend will filter by createdBy instead
    if (myServices === "true" && user?.id) {
      baseFilters.myServices = true;
      // Don't set status filter - backend will handle showing all statuses for own services
    } else {
      // Default: only show active services
      baseFilters.status = "active";
    }

    // Add search filter
    if (searchQuery.trim()) {
      baseFilters.search = searchQuery.trim();
    }

    // Add location filter
    const locationFilter = selectedFilters.location;
    if (
      locationFilter &&
      typeof locationFilter === "object" &&
      "address" in locationFilter
    ) {
      baseFilters.location = locationFilter.address;
    }

    // Add verified filter
    const verifiedFilter = selectedFilters.verified;
    if (verifiedFilter && verifiedFilter !== "all") {
      baseFilters.verified = verifiedFilter === "true";
    }

    return baseFilters;
  }, [
    currentPage,
    myServices,
    user?.id,
    searchQuery,
    selectedFilters.location,
    selectedFilters.verified,
  ]);

  const { data: marketsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "markets",
      currentPage,
      myServices,
      searchQuery,
      selectedFilters.location,
      selectedFilters.verified,
    ],
    queryFn: () => apiService.getMarkets(filters),
    enabled: true,
  });

  const markets = marketsData?.markets || [];
  const pagination = marketsData
    ? {
        page: marketsData.page,
        hasNextPage: marketsData.page < marketsData.totalPages,
      }
    : {
        page: 1,
        hasNextPage: false,
      };

  const {
    allItems: allMarkets,
    loadMore: loadMoreMarkets,
    onRefresh: handlePaginationRefresh,
    isInitialLoading: isPaginationInitialLoading,
    isLoadingMore: isPaginationLoadingMore,
    flatListProps: paginationFlatListProps,
  } = useInfinitePagination({
    items: markets,
    pagination,
    isLoading,
    isFetching,
    resetDeps: [selectedFilters, searchQuery],
    enableScrollGate: true,
    onRefreshCallback: () => {
      setCurrentPage(1);
      refetch();
    },
  });

  // Filter sections configuration
  const filterSections = useMemo<FilterSection[]>(() => {
    const sections: FilterSection[] = [
      {
        key: "sortBy",
        title: t("sortBy"),
        options: [
          { key: "relevance", label: t("relevance") },
          { key: "date_desc", label: t("newestFirst") },
          { key: "date_asc", label: t("oldestFirst") },
          { key: "name_asc", label: t("nameAsc") },
          { key: "name_desc", label: t("nameDesc") },
        ],
      },
      {
        key: "verified",
        title: t("verified") || "Verified",
        options: [
          { key: "all", label: t("all") },
          { key: "true", label: t("verified") },
          { key: "false", label: t("notVerified") },
        ],
      },
      {
        key: "location",
        title: t("location"),
        type: "location",
        onLocationPress: () => {
          // Hide filter modal temporarily when opening location modal
          setFilterModalHiddenForLocation(true);
          setLocationFilterVisible(true);
        },
      },
    ];

    return sections;
  }, [t]);

  // Apply client-side sorting
  const sortedMarkets = useMemo(() => {
    const sortBy = (selectedFilters.sortBy as string) || "relevance";
    const marketsToSort = [...allMarkets];

    switch (sortBy) {
      case "date_desc":
        return marketsToSort.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "date_asc":
        return marketsToSort.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "name_asc":
        return marketsToSort.sort((a, b) => {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";
          return nameA.localeCompare(nameB);
        });
      case "name_desc":
        return marketsToSort.sort((a, b) => {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";
          return nameB.localeCompare(nameA);
        });
      case "relevance":
      default:
        // For relevance, keep original order (already sorted by backend)
        return marketsToSort;
    }
  }, [allMarkets, selectedFilters.sortBy]);

  const handleFilterChange = (
    sectionKey: string,
    value:
      | string
      | string[]
      | { min: number; max: number }
      | {
          latitude: number;
          longitude: number;
          address: string;
          radius: number;
        }
      | null
  ) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const handleSearchChange = useCallback(
    (text: string) => {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search
      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery(text);
      }, 300);
    },
    []
  );

  const filterLoading = isFetching && currentPage === 1;

  const renderMarketItem = useCallback(
    ({ item }: { item: any }) => {
      const isOwner = !!(user && item.createdBy === user.id);
      
      return (
        <ServiceItem
          service={item}
          isOwner={isOwner}
        />
      );
    },
    [user]
  );

  const header = (
    <Header
      title={
        myServices === "true" ? t("myServices") : t("services")
      }
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  return (
    <Layout header={header}>
      <View style={{ backgroundColor: colors.background }}>
        <ResponsiveCard>
          <Filter
            searchPlaceholder={t("searchServices")}
            initialSearchValue={searchQuery}
            onSearchChange={handleSearchChange}
            filterSections={filterSections}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            loading={filterLoading}
            hideModalForLocation={filterModalHiddenForLocation}
          />
        </ResponsiveCard>
      </View>
      {isPaginationInitialLoading ? (
          <View style={{ marginTop: 84, flex: 1 }}>
            <FloatingSkeleton
              count={6}
              variant="grid2"
            />
          </View>
      ) : sortedMarkets.length === 0 ? (
        <View style={[styles.emptyContainer, { paddingTop: 100 }]}>
          <IconSymbol
            name="building.2"
            size={64}
            color={colors.tabIconDefault}
          />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            {t("noMarketsFound")}
          </Text>
          {!searchQuery.trim() && !selectedFilters.location && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push("/services/create")}
            >
              <Text style={[styles.createButtonText, { color: colors.background }]}>
                {t("createMarket")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          style={{ top: -8 }}
          data={sortedMarkets}
          renderItem={renderMarketItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && currentPage === 1}
              onRefresh={handlePaginationRefresh}
              tintColor={colors.tint}
            />
          }
          {...paginationFlatListProps}
          ListFooterComponent={
            isPaginationLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
        />
      )}

      {/* Floating Action Button - Only show for authenticated users */}
      {isAuthenticated && (
        <Button
          style={[styles.fab, { bottom: 70 + insets.bottom }]}
          onPress={() => router.push("/services/create")}
          icon="plus"
          iconSize={24}
          title={t("createMarket")}
          variant="primary"
        />  
      )}

      <LocationFilterModal
        visible={locationFilterVisible}
        onClose={() => {
          setLocationFilterVisible(false);
          // Show filter modal again when location modal closes
          setFilterModalHiddenForLocation(false);
        }}
        onConfirm={(locationData) => {
          setSelectedFilters((prev) => ({
            ...prev,
            location: locationData,
          }));
          setLocationFilterVisible(false);
          // Show filter modal again when location is confirmed
          setFilterModalHiddenForLocation(false);
        }}
        initialLocation={
          selectedFilters.location &&
          typeof selectedFilters.location === "object" &&
          "latitude" in selectedFilters.location &&
          "longitude" in selectedFilters.location &&
          "address" in selectedFilters.location &&
          "radius" in selectedFilters.location
            ? (selectedFilters.location as {
                latitude: number;
                longitude: number;
                address: string;
                radius: number;
              })
            : undefined
        }
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: Spacing.sm,
  },
  row: {
    justifyContent: "space-between",
  },
  marketCard: {
    marginBottom: 16,
    overflow: "hidden",
    ...Shadows.md,
  },
  bannerContainer: {
    height: 120,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerPlaceholder: {
    fontSize: 12,
    color: "#999",
  },
  marketInfo: {
    padding: 16,
  },
  marketName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  marketDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  marketMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "500",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  fab: {
    bottom: 20,
    borderRadius: BorderRadius.round,
    position: 'absolute',
    right: Spacing.md,
  },
});
