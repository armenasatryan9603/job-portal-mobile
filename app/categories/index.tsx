import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { RateUnit, useRateUnits } from "@/hooks/useRateUnits";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Spacing, ThemeColors } from "@/constants/styles";

import AnalyticsService from "@/categories/AnalyticsService";
import { Category } from "@/categories/api";
import { CategoryCard } from "@/components/CategoryCard";
import { EmptyPage } from "@/components/EmptyPage";
import { FloatingSkeleton } from "@/components/FloatingSkeleton";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveContainer } from "@/components/ResponsiveContainer";
import { router } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useCategoriesList } from "@/hooks/useCategoriesList";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useKeyboardAwarePress } from "@/hooks/useKeyboardAwarePress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

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
  const { wrapPressHandler } = useKeyboardAwarePress();

  // Debounce search query to avoid API calls on every keystroke
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const {
    items,
    rootsForFilter,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    onRefresh,
    error: listError,
    refetch,
  } = useCategoriesList(language, debouncedSearchQuery);

  // Filter categories by selected filters (Categories + categories)
  const filteredCategories = useMemo(() => {
    return items.filter((category) => {
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
  }, [items, selectedFilters]);

  const isSearchMode = !!debouncedSearchQuery.trim();

  // Grid rows: roots when no search, search results (chunked by 3) when searching
  const parentCategoryRows = useMemo(() => {
    const source = isSearchMode ? filteredCategories : rootsForFilter;
    const rows: Category[][] = [];
    for (let i = 0; i < source.length; i += 3) {
      rows.push(source.slice(i, i + 3));
    }
    return rows;
  }, [rootsForFilter, isSearchMode, filteredCategories]);

  // Get child categories for a specific parent
  const getChildCategories = useCallback(
    (parentId: number) => {
      return filteredCategories.filter(
        (category) => category.parentId === parentId
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

  // Filter configuration
  const filterSections: FilterSection[] = useMemo(
    () => [
      {
        title: t("categories"),
        key: "Categories",
        multiSelect: true,
        options: [
          { key: "all", label: t("allCategories") },
          ...rootsForFilter.map((category) => ({
            key: category.id.toString(),
            label: category.name,
          })),
        ],
      },
    ],
    [t, rootsForFilter]
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
  if (listError) {
    return (
      <Layout header={header}>
        <EmptyPage
          type="error"
          title={listError.message || t("failedToLoadServices")}
          buttonText={t("retry")}
          onRetry={() => refetch()}
        />
      </Layout>
    );
  }

  // Render a category card for grid view
  const renderCategoryCard = (category: Category) => {
    const childCategories = getChildCategories(category.id);
    return (
      <CategoryCard
        key={category.id}
        category={category}
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
    // Don't show empty while loading (neither for initial list nor during search)
    if (isInitialLoading) return null;
    if (parentCategoryRows.length === 0) {
      return (
        <EmptyPage
          type="empty"
          icon="wrench.and.screwdriver"
          title={t("noCategories")}
          subtitle={
            isSearchMode ? t("tryAdjustingSearchTerms") : t("noCategories")
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
          <Filter
            searchPlaceholder={t("searchCategories")}
            onSearchChange={handleSearchChange}
            filterSections={filterSections}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            loading={!!debouncedSearchQuery.trim() && isInitialLoading}
          />
        </View>

        <ResponsiveContainer padding={Spacing.xs} scrollable={false}>
        {/* Show skeleton only on first load (no search); never on search typing */}
        {!isSearchMode && isInitialLoading ? (
          <View
            style={{ flex: 1, marginTop: 80, paddingHorizontal: Spacing.sm }}
          >
            <FloatingSkeleton count={9} variant="grid" />
          </View>
        ) : (
          <FlatList<Category[]>
            style={{ marginTop: 68 }}
            data={parentCategoryRows}
            renderItem={renderCategoryRow}
            keyExtractor={(_, index) => `row-${index}`}
            ListFooterComponent={isSearchMode ? null : renderFooter}
            ListEmptyComponent={renderEmptyComponent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isInitialLoading && !isSearchMode}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 6 * Spacing.lg,
              paddingHorizontal: Spacing.xs,
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
