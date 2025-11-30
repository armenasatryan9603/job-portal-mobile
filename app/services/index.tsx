import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, ViewStyles } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useKeyboardAwarePress } from "@/hooks/useKeyboardAwarePress";
import { router } from "expo-router";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { Service } from "@/services/api";
import { useServices, useRootServices } from "@/hooks/useApi";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";

const ServicesScreen = () => {
  useAnalytics("Services");
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string | string[] | { min: number; max: number }>
  >({});

  // Use TanStack Query for data fetching
  const [currentPage, setCurrentPage] = useState(1);
  const [allServices, setAllServices] = useState<Service[]>([]);

  // Use keyboard-aware press handler
  const { wrapPressHandler } = useKeyboardAwarePress();

  // Debounce search query to avoid API calls on every keystroke
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Use unified hook that handles both search and regular listing
  const {
    data: activeData,
    isLoading: activeIsLoading,
    isFetching: activeIsFetching,
    error: activeError,
    refetch: activeRefetch,
  } = useServices(currentPage, 20, undefined, language, debouncedSearchQuery);

  const { data: rootServices } = useRootServices(language);

  // Reset page when debounced search query changes
  useEffect(() => {
    setCurrentPage(1);
    setAllServices([]);
  }, [debouncedSearchQuery]);

  // Accumulate services from all pages
  useEffect(() => {
    if (activeData?.services) {
      if (currentPage === 1) {
        setAllServices(activeData.services);
      } else {
        setAllServices((prev) => [...prev, ...activeData.services]);
      }
    }
  }, [activeData, currentPage]);

  const services = allServices;
  const mainServices = rootServices || [];
  const pagination = activeData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Show loading only on initial load (page 1)
  const isInitialLoading = activeIsLoading && currentPage === 1;
  const isLoadingMore = activeIsFetching && currentPage > 1;

  const loadMoreServices = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const onRefresh = useCallback(async () => {
    await activeRefetch();
  }, [activeRefetch]);

  // Filter services based on category and services (search is handled by backend)
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const selectedCategories = selectedFilters["Categories"];
      const matchesCategory =
        !selectedCategories ||
        (Array.isArray(selectedCategories) &&
          selectedCategories.length === 0) ||
        (Array.isArray(selectedCategories) &&
          selectedCategories.includes("all")) ||
        (Array.isArray(selectedCategories) &&
          selectedCategories.includes(service?.parentId?.toString() || "")) ||
        (!service.parentId &&
          Array.isArray(selectedCategories) &&
          selectedCategories.includes("all"));

      const selectedServices = selectedFilters["services"];
      const matchesService =
        !selectedServices ||
        (Array.isArray(selectedServices) && selectedServices.length === 0) ||
        (Array.isArray(selectedServices) &&
          selectedServices.includes(service.id.toString()));

      return matchesCategory && matchesService;
    });
  }, [services, selectedFilters]);

  const handleServicePress = useCallback((serviceId: number) => {
    AnalyticsService.getInstance().logEvent("service_clicked", {
      service_id: serviceId.toString(),
      location: "services_list",
    });
    router.push(`/services/${serviceId}`);
  }, []);

  // Wrap the handler to dismiss keyboard first if visible
  const wrappedHandleServicePress = wrapPressHandler(handleServicePress);

  const handleCreateOrder = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "create_order",
      location: "services_screen",
    });
    router.push("/orders/create");
  };

  // Filter configuration
  const filterSections: FilterSection[] = useMemo(
    () => [
      {
        title: t("categories") || "Categories",
        key: "Categories",
        multiSelect: true,
        options: [
          { key: "all", label: t("allCategories") || "All Categories" },
          ...mainServices.map((service) => ({
            key: service.id.toString(),
            label: service.name,
          })),
        ],
      },
    ],
    [t, mainServices, services]
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Track search when user stops typing (debounced)
    if (text.trim().length > 0) {
      setTimeout(() => {
        AnalyticsService.getInstance().logSearch(text.trim(), {
          search_type: "services",
        });
      }, 500);
    }
  }, []);

  const handleFilterChange = (
    sectionKey: string,
    value: string | string[] | { min: number; max: number }
  ) => {
    AnalyticsService.getInstance().logEvent("filter_changed", {
      filter_type: sectionKey,
      location: "services_screen",
      has_value: value !== null && value !== undefined,
    });
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const header = (
    <Header
      title={t("services")}
      subtitle={t("findSpecialists")}
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  // Show error state
  if (activeError) {
    return (
      <Layout header={header}>
        <EmptyPage
          type="error"
          title={activeError.message || t("failedToLoadServices")}
          buttonText={t("retry")}
          onRetry={() => activeRefetch()}
        />
      </Layout>
    );
  }

  const renderServiceItem = ({ item: service }: { item: Service }) => (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => wrappedHandleServicePress(service.id)}
    >
      <ResponsiveCard padding={16}>
        {service.imageUrl && (
          <Image
            source={{ uri: service.imageUrl }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.serviceHeader}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {service.name}
          </Text>
          {service.parentId && (
            <View
              style={[styles.subServiceBadge, { backgroundColor: colors.tint }]}
            >
              <Text
                style={[styles.subServiceText, { color: colors.background }]}
              >
                {t("subService")}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.serviceDescription, { color: colors.tabIconDefault }]}
        >
          {service.description}
        </Text>

        <View style={styles.serviceStats}>
          <View style={styles.statItem}>
            <IconSymbol name="person.2.fill" size={16} color={colors.tint} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {service.specialistCount} {t("specialists")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              name="dollarsign.circle.fill"
              size={16}
              color={colors.tint}
            />
            <Text style={[styles.statText, { color: colors.text }]}>
              {service.averagePrice
                ? `$${service.averagePrice}/hr ${t("avg")}`
                : t("priceVaries")}
            </Text>
          </View>
        </View>
      </ResponsiveCard>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingMoreText, { color: colors.text }]}>
            {t("loadingMoreServices")}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEmptyComponent = () => {
    if (filteredServices.length === 0) {
      return (
        <EmptyPage
          type="empty"
          icon="wrench.and.screwdriver"
          title={t("noServices")}
          subtitle={
            searchQuery
              ? t("tryAdjustingSearchTerms")
              : t("noServicesAvailable")
          }
        />
      );
    }
    return null;
  };

  return (
    <Layout header={header}>
      <View style={{ flex: 1 }}>
        {/* Fixed Header with Filter */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            backgroundColor: colors.background,
          }}
        >
          <ResponsiveCard padding={Spacing.md}>
            <Filter
              searchPlaceholder={t("searchServices")}
              onSearchChange={handleSearchChange}
              filterSections={filterSections}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              loading={!!debouncedSearchQuery.trim() && activeIsLoading}
            />
          </ResponsiveCard>
        </View>

        {/* Show skeleton during initial load, otherwise show FlatList */}
        {isInitialLoading ? (
          <View style={{ flex: 1, marginTop: 100 }}>
            <FloatingSkeleton
              count={5}
              itemHeight={220}
              showImage={true}
              showTitle={true}
              showDescription={true}
              showDetails={true}
              showTags={false}
            />
          </View>
        ) : (
          <FlatList
            style={{ marginTop: 100 }}
            data={filteredServices}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item.id.toString()}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyComponent}
            onEndReached={loadMoreServices}
            onEndReachedThreshold={0.1}
            refreshControl={
              <RefreshControl
                refreshing={activeIsLoading}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 6 * Spacing.lg }}
            keyboardShouldPersistTaps="never"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
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
  serviceImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  serviceHeader: {
    ...ViewStyles.rowBetween,
    alignItems: "flex-start",
    ...ViewStyles.marginBottomMd,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    lineHeight: 24,
  },
  subServiceBadge: {
    ...ViewStyles.badge,
    marginLeft: Spacing.md,
  },
  subServiceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  serviceStats: {
    gap: Spacing.md,
  },
  statItem: {
    ...ViewStyles.row,
    gap: Spacing.sm,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default ServicesScreen;
