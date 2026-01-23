import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BorderRadius, Spacing, ThemeColors, Typography } from "@/constants/styles";
import { RateUnit, useRateUnits } from "@/hooks/useRateUnits";
import React, { useMemo, useState } from "react";

import { Category } from "@/categories/api";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatPriceDisplay } from "@/utils/currencyRateUnit";
import { useCategories } from "@/hooks/useApi";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

interface CategorySelectorProps {
  selectedService: Category | null;
  onServiceSelect: (category: Category | null) => void;
  error?: string;
  disabled?: boolean;
}

export const CategorySelectorComponent: React.FC<CategorySelectorProps> = ({
  selectedService,
  onServiceSelect,
  error,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const { language } = useLanguage();
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits = (rateUnitsData || []) as RateUnit[];

  // Use cached services hook - fetches with high limit to get all services
  const {
    data: servicesData,
    isLoading: isLoadingServices,
    error: servicesErrorData,
    refetch: refetchServices,
  } = useCategories(1, 100, undefined, language);

  // Extract categories from the cached response
  const categories = useMemo(() => {
    return servicesData?.categories || [];
  }, [servicesData]);

  const servicesError = servicesErrorData ? t("failedToLoadServices") : null;

  const [searchQuery, setSearchQuery] = useState("");

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    const searchLower = searchQuery.toLowerCase();
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchLower) ||
        category.Parent?.name.toLowerCase().includes(searchLower)
    );
  }, [categories, searchQuery]);

  // Get child categories (subcategories) only for selection
  const selectableCategories = useMemo(() => {
    return filteredCategories.filter((category) => category.parentId);
  }, [filteredCategories]);

  const [isExpanded, setIsExpanded] = useState(false);

  // Chunk categories into rows of 4 for grid layout
  const categoryRows = useMemo(() => {
    const rows: Category[][] = [];
    for (let i = 0; i < selectableCategories.length; i += 4) {
      rows.push(selectableCategories.slice(i, i + 4));
    }
    return rows;
  }, [selectableCategories]);

  // Calculate heights: image (40px) + content (minHeight 42px) + marginBottom (Spacing.xs) = ~90px per row
  const rowHeight = 40 + 42 + Spacing.xs;
  const collapsedHeight = rowHeight * 2.5; // 2.5 rows
  const expandedHeight = rowHeight * 7.5; // 7.5 rows

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("selectCategory")} *
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.tabIconDefault }]}>
        {t("selectCategoryDescription")}
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <IconSymbol
            name="magnifyingglass"
            size={20}
            color={colors.tabIconDefault}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("searchCategories")}
            placeholderTextColor={colors.tabIconDefault}
            editable={!disabled}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol
                name="xmark.circle.fill"
                size={18}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Categories Grid */}
      <View
        style={[
          styles.servicesContainer,
          { 
            backgroundColor: colors.background, 
            ...(error && {
              borderColor: "#ff4444",
              borderWidth: 1,
            }),
          },
        ]}
      >
        {/* Expand/Collapse Toggle */}
        {selectableCategories.length > 0 && (
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandButtonText, { color: colors.tint }]}>
              {isExpanded ? (t("showLess")) : (t("showMore"))}
            </Text>
            <IconSymbol
              name={isExpanded ? "chevron.up" : "chevron.down"}
              size={14}
              color={colors.tint}
            />
          </TouchableOpacity>
        )}
        {isLoadingServices ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t("loadingCategories")}
            </Text>
          </View>
        ) : servicesError ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: "#ff4444" }]}>
              {servicesError}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              onPress={() => {
                refetchServices();
              }}
            >
              <Text style={[styles.retryButtonText, { color: colors.text }]}>
                {t("retry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : selectableCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              name="magnifyingglass"
              size={48}
              color={colors.tabIconDefault}
            />
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              {t("noCategories")}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight: isExpanded ? expandedHeight : collapsedHeight }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {categoryRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {row.map((category) => {
                  const isSelected = selectedService?.id === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      activeOpacity={0.7}
                      onPress={() => !disabled && onServiceSelect(category)}
                      disabled={disabled}
                      style={[
                        styles.gridCard,
                        {
                          backgroundColor: isSelected
                            ? colors.tint + "15"
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.tint
                            : colors.border,
                          opacity: disabled ? 0.5 : 1,
                        },
                      ]}
                    >
                      {category.imageUrl && (
                        <Image
                          source={{ uri: category.imageUrl }}
                          style={styles.gridCardImage}
                          resizeMode="contain"
                        />
                      )}
                      <View style={styles.gridCardContent}>
                        <Text
                          style={[
                            styles.gridCardName,
                            {
                              color: isSelected ? colors.success : colors.text,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {category.name}
                        </Text>
                        {category.averagePrice && (
                          <Text
                            style={[
                              styles.gridCardPrice,
                              { color: colors.tabIconDefault },
                            ]}
                            numberOfLines={1}
                          >
                            {formatPriceDisplay(
                              category.averagePrice,
                              category.currency,
                              category.rateUnit,
                              rateUnits,
                              language
                            )}
                          </Text>
                        )}
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={14}
                              color={colors.success}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {/* Add empty placeholders if row has less than 4 items */}
                {row.length < 4 &&
                  Array.from({ length: 4 - row.length }).map((_, i) => (
                    <View key={`placeholder-${i}`} style={{ flex: 1 }} />
                  ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: "#ff4444", marginTop: 8 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    opacity: 0.7,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  servicesContainer: {
    gap: 2,
    padding: Spacing.sm, 
    borderRadius: BorderRadius.md,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
    gap: 6,
  },
  gridCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridCardImage: {
    width: "100%",
    height: 40,
    backgroundColor: "white",
  },
  gridCardContent: {
    padding: 4,
    position: "relative",
    minHeight: 42,
  },
  gridCardName: {
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 1,
    lineHeight: 11,
  },
  gridCardPrice: {
    fontSize: 7,
    fontWeight: "500",
  },
  selectedIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  errorContainer: {
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});

// Export with both names for compatibility
export const CategorySelector = CategorySelectorComponent;
