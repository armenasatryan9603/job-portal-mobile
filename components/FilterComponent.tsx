import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PriceRangeSlider } from "./PriceRangeSlider";

export interface FilterOption {
  key: string;
  label: string;
  value?: any;
}

export interface FilterSection {
  title: string;
  key?: string;
  options?: FilterOption[];
  multiSelect?: boolean;
  type?: "options" | "range";
  rangeConfig?: {
    min: number;
    max: number;
    step: number;
  };
}

export interface FilterProps {
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  filterSections: FilterSection[];
  selectedFilters: Record<
    string,
    string | string[] | { min: number; max: number }
  >;
  onFilterChange: (
    sectionKey: string,
    value: string | string[] | { min: number; max: number }
  ) => void;
  loading?: boolean;
}

export const Filter: React.FC<FilterProps> = ({
  searchPlaceholder = "Search...",
  onSearchChange,
  filterSections,
  selectedFilters,
  onFilterChange,
  loading = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const textInputRef = useRef<TextInput>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [sectionAnimations] = useState<Record<string, Animated.Value>>(
    filterSections.reduce((acc, section) => {
      acc[section.title] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );
  const [filterAnimation] = useState(new Animated.Value(0));

  // Helper function to get range values
  const getRangeValues = (
    value: any,
    defaultMin: number,
    defaultMax: number
  ) => {
    if (
      typeof value === "object" &&
      value !== null &&
      "min" in value &&
      "max" in value
    ) {
      return { min: value.min, max: value.max };
    }
    return { min: defaultMin, max: defaultMax };
  };

  const toggleFilter = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // Animate the filter container
    Animated.timing(filterAnimation, {
      toValue: newExpandedState ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleSection = (sectionTitle: string) => {
    const isExpanded = expandedSections[sectionTitle];
    const newExpandedState = !isExpanded;

    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: newExpandedState,
    }));

    // Animate the section
    Animated.timing(sectionAnimations[sectionTitle], {
      toValue: newExpandedState ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleFilterSelect = (
    sectionTitle: string,
    option: FilterOption,
    multiSelect: boolean = false
  ) => {
    const sectionKey =
      filterSections.find((s) => s.title === sectionTitle)?.key || sectionTitle;
    const currentValue = selectedFilters[sectionKey];

    if (multiSelect) {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      const newValue = currentArray.includes(option.key)
        ? currentArray.filter((item) => item !== option.key)
        : [...currentArray, option.key];
      onFilterChange(sectionKey, newValue);
    } else {
      onFilterChange(sectionKey, option.key);
      toggleSection(sectionTitle);
    }
  };

  const isFilterSelected = (
    sectionTitle: string,
    optionKey: string,
    multiSelect: boolean = false
  ) => {
    const sectionKey =
      filterSections.find((s) => s.title === sectionTitle)?.key || sectionTitle;
    const currentValue = selectedFilters[sectionKey];

    if (multiSelect) {
      return Array.isArray(currentValue) && currentValue.includes(optionKey);
    } else {
      return currentValue === optionKey;
    }
  };

  const getSelectedCount = (sectionTitle: string) => {
    const sectionKey =
      filterSections.find((s) => s.title === sectionTitle)?.key || sectionTitle;
    const currentValue = selectedFilters[sectionKey];
    if (Array.isArray(currentValue)) {
      return currentValue.length;
    }
    if (
      typeof currentValue === "object" &&
      currentValue !== null &&
      "min" in currentValue
    ) {
      return 1; // Range is selected
    }
    return currentValue ? 1 : 0;
  };

  const getTotalSelectedCount = () => {
    return filterSections.reduce((total, section) => {
      return total + getSelectedCount(section.title);
    }, 0);
  };

  return (
    <View style={styles.container}>
      {/* Filter Toggle Button - Compact */}
      <TouchableOpacity
        style={[
          styles.filterToggle,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
        onPress={toggleFilter}
        activeOpacity={0.7}
      >
        <View style={styles.filterToggleContent}>
          <IconSymbol
            name="line.3.horizontal.decrease"
            size={16}
            color={colors.tabIconDefault}
          />
          <Text style={[styles.filterToggleText, { color: colors.text }]}>
            Filters
          </Text>
          {getTotalSelectedCount() > 0 && (
            <View
              style={[styles.filterBadge, { backgroundColor: colors.tint }]}
            >
              <Text
                style={[styles.filterBadgeText, { color: colors.background }]}
              >
                {getTotalSelectedCount()}
              </Text>
            </View>
          )}
        </View>
        <IconSymbol
          name={isExpanded ? "chevron.up" : "chevron.down"}
          size={14}
          color={colors.tabIconDefault}
        />
      </TouchableOpacity>

      {/* Search & Filter Sections - Animated */}
      <Animated.View
        style={[
          styles.searchAndFiltersContainer,
          {
            maxHeight: filterAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000], // Adjust based on content
            }),
            opacity: filterAnimation,
          },
        ]}
      >
        {/* Search Bar */}
        <View style={[styles.searchContainer, { borderColor: colors.border }]}>
          <IconSymbol
            name="magnifyingglass"
            size={20}
            color={colors.tabIconDefault}
          />
          <TextInput
            ref={textInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.tabIconDefault}
            onChangeText={onSearchChange}
            returnKeyType="search"
            selectTextOnFocus={true}
          />
          {loading && (
            <IconSymbol
              name="arrow.clockwise"
              size={16}
              color={colors.tint}
              style={styles.loadingIcon}
            />
          )}
        </View>

        {/* Filter Sections */}
        <View style={styles.filtersContainer}>
          {filterSections.map((section) => {
            // Handle range sections differently - always visible, no expand/collapse
            if (section.type === "range" && section.rangeConfig) {
              return (
                <View key={section.title} style={styles.filterSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {section.title}
                  </Text>

                  {/* Range Content - Always visible */}
                  <View style={styles.sectionContent}>
                    <View style={styles.rangeContainer}>
                      <PriceRangeSlider
                        minValue={
                          getRangeValues(
                            selectedFilters[section.key || section.title],
                            section.rangeConfig.min,
                            section.rangeConfig.max
                          ).min
                        }
                        maxValue={
                          getRangeValues(
                            selectedFilters[section.key || section.title],
                            section.rangeConfig.min,
                            section.rangeConfig.max
                          ).max
                        }
                        onValueChange={(low, high) => {
                          const sectionKey = section.key || section.title;
                          onFilterChange(sectionKey, { min: low, max: high });
                        }}
                        disabled={loading}
                      />
                    </View>
                  </View>
                </View>
              );
            }

            // Handle regular sections with expand/collapse functionality
            const isExpanded = expandedSections[section.title];
            const selectedCount = getSelectedCount(section.title);

            return (
              <View key={section.title} style={styles.filterSection}>
                {/* Section Header */}
                <TouchableOpacity
                  style={[
                    styles.sectionHeader,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => toggleSection(section.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionHeaderContent}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {section.title}
                    </Text>
                    {selectedCount > 0 && (
                      <View
                        style={[styles.badge, { backgroundColor: colors.tint }]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: colors.background },
                          ]}
                        >
                          {selectedCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <IconSymbol
                    name={isExpanded ? "chevron.up" : "chevron.down"}
                    size={16}
                    color={colors.tabIconDefault}
                  />
                </TouchableOpacity>

                {/* Section Content */}
                <Animated.View
                  style={[
                    styles.sectionContent,
                    {
                      maxHeight: sectionAnimations[section.title].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 300], // Increased height for better scrolling
                      }),
                      opacity: sectionAnimations[section.title],
                    },
                  ]}
                >
                  <ScrollView
                    style={styles.scrollContainer}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <View style={styles.filterOptions}>
                      {section.options?.map((option) => {
                        const isSelected = isFilterSelected(
                          section.title,
                          option.key,
                          section.multiSelect
                        );

                        return (
                          <TouchableOpacity
                            key={option.key}
                            style={[
                              styles.filterOption,
                              {
                                backgroundColor: isSelected
                                  ? colors.tint
                                  : colors.background,
                                borderColor: isSelected
                                  ? colors.tint
                                  : colors.border,
                              },
                            ]}
                            onPress={() =>
                              handleFilterSelect(
                                section.title,
                                option,
                                section.multiSelect
                              )
                            }
                            disabled={loading}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.filterOptionText,
                                {
                                  color: isSelected
                                    ? colors.background
                                    : colors.text,
                                },
                              ]}
                            >
                              {option.label}
                            </Text>
                            {section.multiSelect && isSelected && (
                              <IconSymbol
                                name="checkmark"
                                size={14}
                                color={colors.background}
                                style={styles.checkIcon}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </Animated.View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBlock: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  filterToggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 16,
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  searchAndFiltersContainer: {
    overflow: "hidden",
  },
  filtersContainer: {
    gap: 10,
  },
  filterSection: {
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionContent: {
    overflow: "hidden",
  },
  scrollContainer: {
    maxHeight: 300,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkIcon: {
    marginLeft: 4,
  },
  rangeContainer: {
    paddingVertical: 8,
  },
});
