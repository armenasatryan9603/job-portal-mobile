import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { ServiceCard } from "@/components/ServiceCard";
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
import { useInfinitePagination } from "@/hooks/useInfinitePagination";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { Service } from "@/services/api";
import { useServices, useRootServices } from "@/hooks/useApi";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatPriceDisplay } from "@/utils/currencyRateUnit";
import { useRateUnits, RateUnit } from "@/hooks/useRateUnits";

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
    Record<
      string,
      | string
      | string[]
      | { min: number; max: number }
      | { latitude: number; longitude: number; address: string; radius: number }
      | null
    >
  >({});
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits = (rateUnitsData || []) as RateUnit[];
  // Use TanStack Query for data fetching
  const [tempCurrentPage, setTempCurrentPage] = useState(1);
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
  } = useServices(
    tempCurrentPage,
    20,
    undefined,
    language,
    debouncedSearchQuery
  );

  const { data: rootServices } = useRootServices(language);

  const mainServices = rootServices || [];
  const pagination = activeData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Use infinite pagination hook
  const {
    allItems: services,
    currentPage,
    setCurrentPage,
    loadMore: loadMoreServices,
    onRefresh,
    isInitialLoading,
    isLoadingMore,
    flatListProps,
  } = useInfinitePagination({
    items: activeData?.services || [],
    pagination,
    isLoading: activeIsLoading,
    isFetching: activeIsFetching,
    resetDeps: [debouncedSearchQuery],
    enableScrollGate: true,
  });

  // Sync tempCurrentPage with currentPage from hook
  useEffect(() => {
    setTempCurrentPage(currentPage);
  }, [currentPage]);

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

  // Get parent services only (for main grid)
  const parentServices = useMemo(() => {
    return mainServices.filter((service) => {
      if (debouncedSearchQuery.trim()) {
        return service.name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());
      }
      return true;
    });
  }, [mainServices, debouncedSearchQuery]);

  // Chunk parent services into rows of 3 for grid layout
  const parentServiceRows = useMemo(() => {
    const rows: Service[][] = [];
    for (let i = 0; i < parentServices.length; i += 3) {
      rows.push(parentServices.slice(i, i + 3));
    }
    return rows;
  }, [parentServices]);

  // Get child services for a specific parent
  const getChildServices = useCallback(
    (parentId: number) => {
      return filteredServices.filter(
        (service) => service.parentId === parentId
      );
    },
    [filteredServices]
  );

  // Get child services for a specific child service (grandchildren)
  const getGrandchildServices = useCallback(
    (childId: number) => {
      return filteredServices.filter((service) => service.parentId === childId);
    },
    [filteredServices]
  );

  const handleServicePress = useCallback((serviceId: number) => {
    AnalyticsService.getInstance().logEvent("service_clicked", {
      service_id: serviceId.toString(),
      location: "services_list",
    });

    // Navigate to service details page
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
        title: t("categories"),
        key: "Categories",
        multiSelect: true,
        options: [
          { key: "all", label: t("allCategories") },
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
    value:
      | string
      | string[]
      | { min: number; max: number }
      | { latitude: number; longitude: number; address: string; radius: number }
      | null
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

  // Render a service card for grid view
  const renderServiceCard = (service: Service) => {
    const childServices = getChildServices(service.id);
    return (
      <ServiceCard
        key={service.id}
        service={service}
        onPress={wrappedHandleServicePress}
        childCount={childServices.length}
        colors={{
          surface: colors.surface,
          text: colors.text,
          tint: colors.tint,
        }}
      />
    );
  };

  // Render a row of up to 3 service cards
  const renderServiceRow = ({
    item: row,
    index,
  }: {
    item: Service[];
    index: number;
  }) => {
    return (
      <View key={`row-${index}`} style={styles.gridRow}>
        {row.map((service) => renderServiceCard(service))}
        {/* Add empty placeholders if row has less than 3 items */}
        {row.length < 3 &&
          Array.from({ length: 3 - row.length }).map((_, i) => (
            <View
              key={`placeholder-${i}`}
              style={{ flex: 1, marginHorizontal: Spacing.xs }}
            />
          ))}
      </View>
    );
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text
            style={[
              styles.loadingMoreText,
              { color: colors.text, marginLeft: 10 },
            ]}
          >
            {t("loadingMoreServices")}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEmptyComponent = () => {
    if (parentServices.length === 0) {
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
          <View
            style={{ flex: 1, marginTop: 100, paddingHorizontal: Spacing.sm }}
          >
            <FloatingSkeleton count={9} variant="grid" />
          </View>
        ) : (
          <FlatList
            style={{ marginTop: 100 }}
            data={parentServiceRows}
            renderItem={renderServiceRow}
            keyExtractor={(item, index) => `row-${index}`}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyComponent}
            {...flatListProps}
            refreshControl={
              <RefreshControl
                refreshing={activeIsLoading}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 6 * Spacing.lg,
              paddingHorizontal: Spacing.sm,
            }}
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
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
});

export default ServicesScreen;
