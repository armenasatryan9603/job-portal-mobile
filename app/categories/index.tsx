import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard, ResponsiveContainer } from "@/components/ResponsiveContainer";
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
import { Category } from "@/categories/api";
import { useCategories, useRootCategories } from "@/hooks/useApi";
import AnalyticsService from "@/categories/AnalyticsService";
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
  } = useCategories(
    tempCurrentPage,
    20,
    undefined,
    language,
    debouncedSearchQuery
  );

  const { data: rootCategories } = useRootCategories(language);

  const mainCategories = rootCategories || [];
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
    allItems: categories,
    currentPage,
    setCurrentPage,
    loadMore: loadMoreCategories,
    onRefresh,
    isInitialLoading,
    isLoadingMore,
    flatListProps,
  } = useInfinitePagination({
    items: activeData?.categories || [],
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

  // Filter categories based on category and categories (search is handled by backend)
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const selectedCategories = selectedFilters["Categories"];
      const matchesCategory =
        !selectedCategories ||
        (Array.isArray(selectedCategories) &&
          selectedCategories.length === 0) ||
        (Array.isArray(selectedCategories) &&
          selectedCategories.includes("all")) ||
        (Array.isArray(selectedCategories) &&
          selectedCategories.includes(category?.parentId?.toString() || "")) ||
        (!category.parentId &&
          Array.isArray(selectedCategories) &&
          selectedCategories.includes("all"));

      const selectedCategoriesFilter = selectedFilters["categories"];
      const matchesCategoryFilter =
        !selectedCategoriesFilter ||
        (Array.isArray(selectedCategoriesFilter) &&
          selectedCategoriesFilter.length === 0) ||
        (Array.isArray(selectedCategoriesFilter) &&
          selectedCategoriesFilter.includes(category.id.toString()));

      return matchesCategory && matchesCategoryFilter;
    });
  }, [categories, selectedFilters]);

  // Get parent categories only (for main grid)
  const parentCategories = useMemo(() => {
    return mainCategories.filter((category) => {
      if (debouncedSearchQuery.trim()) {
        return category.name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());
      }
      return true;
    });
  }, [mainCategories, debouncedSearchQuery]);

  // Chunk parent categories into rows of 3 for grid layout
  const parentCategoryRows = useMemo(() => {
    const rows: Category[][] = [];
    for (let i = 0; i < parentCategories.length; i += 3) {
      rows.push(parentCategories.slice(i, i + 3));
    }
    return rows;
  }, [parentCategories]);

  // Get child categories for a specific parent
  const getChildCategories = useCallback(
    (parentId: number) => {
      return filteredCategories.filter(
        (category) => category.parentId === parentId
      );
    },
    [filteredCategories]
  );

  // Get child categories for a specific child category (grandchildren)
  const getGrandchildCategories = useCallback(
    (childId: number) => {
      return filteredCategories.filter(
        (category) => category.parentId === childId
      );
    },
    [filteredCategories]
  );

  const handleCategoryPress = useCallback((categoryId: number) => {
    AnalyticsService.getInstance().logEvent("category_clicked", {
      category_id: categoryId.toString(),
      location: "categories_list",
    });

    // Navigate to category details page
    router.push(`/categories/${categoryId}`);
  }, []);

  // Wrap the handler to dismiss keyboard first if visible
  const wrappedHandleCategoryPress = wrapPressHandler(handleCategoryPress);

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
          ...mainCategories.map((category) => ({
            key: category.id.toString(),
            label: category.name,
          })),
        ],
      },
    ],
    [t, mainCategories, categories]
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Track search when user stops typing (debounced)
    if (text.trim().length > 0) {
      setTimeout(() => {
        AnalyticsService.getInstance().logSearch(text.trim(), {
          search_type: "categories",
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
      title={t("categories")}
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

  // Render a category card for grid view
  const renderCategoryCard = (category: Category) => {
    const childCategories = getChildCategories(category.id);
    return (
      <ServiceCard
        key={category.id}
        service={category}
        onPress={wrappedHandleCategoryPress}
        childCount={childCategories.length}
        colors={{
          surface: colors.surface,
          text: colors.text,
          tint: colors.tint,
        }}
      />
    );
  };

  // Render a row of up to 3 category cards
  const renderCategoryRow = ({
    item: row,
    index,
  }: {
    item: Category[];
    index: number;
  }) => {
    return (
      <View key={`row-${index}`} style={styles.gridRow}>
        {row.map((category) => renderCategoryCard(category))}
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
    if (parentCategories.length === 0) {
      return (
        <EmptyPage
          type="empty"
          icon="wrench.and.screwdriver"
          title={t("noCategories")}
          subtitle={
            searchQuery ? t("tryAdjustingSearchTerms") : t("noCategories")
          }
        />
      );
    }
    return null;
  };

  return (
    <Layout header={header}>
      
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
              searchPlaceholder={t("searchCategories")}
              onSearchChange={handleSearchChange}
              filterSections={filterSections}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              loading={!!debouncedSearchQuery.trim() && activeIsLoading}
            />
          </ResponsiveCard>
        </View>

        <ResponsiveContainer padding={Spacing.xs} scrollable={false}>
        {/* Show skeleton during initial load, otherwise show FlatList */}
        {isInitialLoading ? (
          <View
            style={{ flex: 1, marginTop: 80, paddingHorizontal: Spacing.sm }}
          >
            <FloatingSkeleton count={9} variant="grid" />
          </View>
        ) : (
          <FlatList
            style={{ marginTop: 80 }}
            data={parentCategoryRows}
            renderItem={renderCategoryRow}
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
      </ResponsiveContainer>
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
