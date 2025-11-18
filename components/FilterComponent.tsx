import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

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
  const { t } = useTranslation();
  const textInputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearchChange(text);
  };

  const handleFilterSelect = (
    sectionKey: string,
    option: FilterOption,
    multiSelect: boolean = false
  ) => {
    const currentValue = selectedFilters[sectionKey];

    if (multiSelect) {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      const newValue = currentArray.includes(option.key)
        ? currentArray.filter((item) => item !== option.key)
        : [...currentArray, option.key];
      onFilterChange(sectionKey, newValue);
    } else {
      // For single select, toggle if already selected
      const newValue = currentValue === option.key ? "" : option.key;
      onFilterChange(sectionKey, newValue);
    }
  };

  const isFilterSelected = (
    sectionKey: string,
    optionKey: string,
    multiSelect: boolean = false
  ) => {
    const currentValue = selectedFilters[sectionKey];

    if (multiSelect) {
      return Array.isArray(currentValue) && currentValue.includes(optionKey);
    } else {
      return currentValue === optionKey;
    }
  };

  const getSelectedCount = (sectionKey: string) => {
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

  const clearFilter = (sectionKey: string) => {
    const section = filterSections.find(
      (s) => (s.key || s.title) === sectionKey
    );
    if (section?.multiSelect) {
      onFilterChange(sectionKey, []);
    } else if (section?.type === "range") {
      const defaultMin = section.rangeConfig?.min || 0;
      const defaultMax = section.rangeConfig?.max || 1000;
      onFilterChange(sectionKey, { min: defaultMin, max: defaultMax });
    } else {
      onFilterChange(sectionKey, "");
    }
  };

  const hasActiveFilters = () => {
    return filterSections.some((section) => {
      const sectionKey = section.key || section.title;
      return getSelectedCount(sectionKey) > 0;
    });
  };

  const getTotalSelectedCount = () => {
    return filterSections.reduce((total, section) => {
      const sectionKey = section.key || section.title;
      return total + getSelectedCount(sectionKey);
    }, 0);
  };

  const clearAllFilters = () => {
    filterSections.forEach((section) => {
      const sectionKey = section.key || section.title;
      clearFilter(sectionKey);
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const isSectionExpanded = (sectionKey: string, inModal: boolean = false) => {
    // In modal, expand all sections by default for better UX
    if (inModal) {
      return expandedSections[sectionKey] ?? true;
    }
    // Auto-expand if section has active filters, otherwise check state
    const hasFilters = getSelectedCount(sectionKey) > 0;
    return expandedSections[sectionKey] ?? hasFilters;
  };

  const totalFilterCount = getTotalSelectedCount();

  // Handle modal close with animation
  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setFilterModalVisible(false);
    });
  };

  // Animate modal content when it opens
  useEffect(() => {
    if (filterModalVisible) {
      // Animate in
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Reset animation
      slideAnim.setValue(0);
    }
  }, [filterModalVisible, slideAnim]);

  const modalContentTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, 0],
  });

  return (
    <View style={styles.container}>
      {/* Compact Search Bar with Filter Button */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchContainer,
            { borderColor: colors.border, flex: 1 },
          ]}
        >
          <IconSymbol
            name="magnifyingglass"
            size={18}
            color={colors.tabIconDefault}
          />
          <TextInput
            ref={textInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            editable={!loading}
          />
          {loading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => handleSearchChange("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={16}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters()
                ? colors.tint
                : colors.background,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="slider.horizontal.3"
            size={18}
            color={
              hasActiveFilters() ? colors.background : colors.tabIconDefault
            }
          />
          {totalFilterCount > 0 && (
            <View
              style={[
                styles.filterButtonBadge,
                {
                  backgroundColor: hasActiveFilters()
                    ? colors.background
                    : colors.tint,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterButtonBadgeText,
                  {
                    color: hasActiveFilters() ? colors.tint : colors.background,
                  },
                ]}
              >
                {totalFilterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                transform: [{ translateY: modalContentTranslateY }],
              },
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Filters
                </Text>
                <View style={styles.modalHeaderRight}>
                  {hasActiveFilters() && (
                    <TouchableOpacity
                      onPress={clearAllFilters}
                      style={styles.modalClearButton}
                    >
                      <Text
                        style={[styles.modalClearText, { color: colors.tint }]}
                      >
                        {t("clearAll")}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={closeModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol
                      name="xmark.circle.fill"
                      size={24}
                      color={colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filter Sections in Modal */}
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.modalFiltersContainer}>
                  {filterSections.map((section) => {
                    const sectionKey = section.key || section.title;
                    const selectedCount = getSelectedCount(sectionKey);

                    // Handle range sections
                    if (section.type === "range" && section.rangeConfig) {
                      const rangeConfig = section.rangeConfig; // Store to help TypeScript
                      const isExpanded = isSectionExpanded(sectionKey, true);
                      return (
                        <View
                          key={sectionKey}
                          style={[
                            styles.filterSection,
                            {
                              backgroundColor:
                                (colors as any).surface || colors.background,
                            },
                          ]}
                        >
                          <View style={styles.sectionHeader}>
                            <TouchableOpacity
                              style={styles.sectionHeaderLeft}
                              onPress={() => toggleSection(sectionKey)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.sectionTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {section.title}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.sectionHeaderRight}>
                              {selectedCount > 0 && (
                                <View
                                  style={[
                                    styles.badge,
                                    { backgroundColor: colors.tint },
                                  ]}
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
                              <TouchableOpacity
                                onPress={() => toggleSection(sectionKey)}
                                hitSlop={{
                                  top: 5,
                                  bottom: 5,
                                  left: 5,
                                  right: 5,
                                }}
                              >
                                <IconSymbol
                                  name={
                                    isExpanded ? "chevron.up" : "chevron.down"
                                  }
                                  size={14}
                                  color={colors.tabIconDefault}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {isExpanded && (
                            <View style={styles.rangeContainer}>
                              <View style={styles.priceInputsContainer}>
                                <View style={styles.priceInputWrapper}>
                                  <Text
                                    style={[
                                      styles.priceLabel,
                                      { color: colors.tabIconDefault },
                                    ]}
                                  >
                                    Min
                                  </Text>
                                  <View
                                    style={[
                                      styles.priceInputContainer,
                                      {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.pricePrefix,
                                        { color: colors.tabIconDefault },
                                      ]}
                                    >
                                      $
                                    </Text>
                                    <TextInput
                                      style={[
                                        styles.priceInput,
                                        { color: colors.text },
                                      ]}
                                      placeholder={`${rangeConfig.min}`}
                                      placeholderTextColor={
                                        colors.tabIconDefault
                                      }
                                      keyboardType="numeric"
                                      value={
                                        getRangeValues(
                                          selectedFilters[sectionKey],
                                          rangeConfig.min,
                                          rangeConfig.max
                                        ).min === rangeConfig.min
                                          ? ""
                                          : getRangeValues(
                                              selectedFilters[sectionKey],
                                              rangeConfig.min,
                                              rangeConfig.max
                                            ).min.toString()
                                      }
                                      onChangeText={(text) => {
                                        if (text === "") {
                                          // If empty, reset to default min
                                          const max = getRangeValues(
                                            selectedFilters[sectionKey],
                                            rangeConfig.min,
                                            rangeConfig.max
                                          ).max;
                                          onFilterChange(sectionKey, {
                                            min: rangeConfig.min,
                                            max,
                                          });
                                          return;
                                        }
                                        const numValue = parseInt(text);
                                        if (isNaN(numValue)) return;

                                        const min = Math.max(
                                          rangeConfig.min,
                                          numValue
                                        );
                                        const max = getRangeValues(
                                          selectedFilters[sectionKey],
                                          rangeConfig.min,
                                          rangeConfig.max
                                        ).max;
                                        onFilterChange(sectionKey, {
                                          min: Math.min(min, max),
                                          max,
                                        });
                                      }}
                                      editable={!loading}
                                    />
                                  </View>
                                </View>
                                <View style={styles.priceSeparator}>
                                  <Text
                                    style={[
                                      styles.priceSeparatorText,
                                      { color: colors.tabIconDefault },
                                    ]}
                                  >
                                    to
                                  </Text>
                                </View>
                                <View style={styles.priceInputWrapper}>
                                  <Text
                                    style={[
                                      styles.priceLabel,
                                      { color: colors.tabIconDefault },
                                    ]}
                                  >
                                    Max
                                  </Text>
                                  <View
                                    style={[
                                      styles.priceInputContainer,
                                      {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.pricePrefix,
                                        { color: colors.tabIconDefault },
                                      ]}
                                    >
                                      $
                                    </Text>
                                    <TextInput
                                      style={[
                                        styles.priceInput,
                                        { color: colors.text },
                                      ]}
                                      placeholder={`${rangeConfig.max}`}
                                      placeholderTextColor={
                                        colors.tabIconDefault
                                      }
                                      keyboardType="numeric"
                                      value={
                                        getRangeValues(
                                          selectedFilters[sectionKey],
                                          rangeConfig.min,
                                          rangeConfig.max
                                        ).max === rangeConfig.max
                                          ? ""
                                          : getRangeValues(
                                              selectedFilters[sectionKey],
                                              rangeConfig.min,
                                              rangeConfig.max
                                            ).max.toString()
                                      }
                                      onChangeText={(text) => {
                                        if (text === "") {
                                          // If empty, reset to default max
                                          const min = getRangeValues(
                                            selectedFilters[sectionKey],
                                            rangeConfig.min,
                                            rangeConfig.max
                                          ).min;
                                          onFilterChange(sectionKey, {
                                            min,
                                            max: rangeConfig.max,
                                          });
                                          return;
                                        }
                                        const numValue = parseInt(text);
                                        if (isNaN(numValue)) return;

                                        const min = getRangeValues(
                                          selectedFilters[sectionKey],
                                          rangeConfig.min,
                                          rangeConfig.max
                                        ).min;
                                        const max = Math.min(
                                          rangeConfig.max,
                                          numValue
                                        );
                                        onFilterChange(sectionKey, {
                                          min,
                                          max: Math.max(max, min),
                                        });
                                      }}
                                      editable={!loading}
                                    />
                                  </View>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    }

                    // Handle option sections
                    if (!section.options || section.options.length === 0) {
                      return null;
                    }

                    const isExpanded = isSectionExpanded(sectionKey, true);

                    return (
                      <View
                        key={sectionKey}
                        style={[
                          styles.filterSection,
                          {
                            backgroundColor:
                              (colors as any).surface || colors.background,
                          },
                        ]}
                      >
                        <View style={styles.sectionHeader}>
                          <TouchableOpacity
                            style={styles.sectionHeaderLeft}
                            onPress={() => toggleSection(sectionKey)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.sectionTitle,
                                { color: colors.text },
                              ]}
                            >
                              {section.title}
                            </Text>
                          </TouchableOpacity>
                          <View style={styles.sectionHeaderRight}>
                            {selectedCount > 0 && (
                              <>
                                <View
                                  style={[
                                    styles.badge,
                                    { backgroundColor: colors.tint },
                                  ]}
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
                                <TouchableOpacity
                                  onPress={() => clearFilter(sectionKey)}
                                  hitSlop={{
                                    top: 5,
                                    bottom: 5,
                                    left: 5,
                                    right: 5,
                                  }}
                                  style={styles.clearButton}
                                >
                                  <IconSymbol
                                    name="xmark.circle.fill"
                                    size={14}
                                    color={colors.tabIconDefault}
                                  />
                                </TouchableOpacity>
                              </>
                            )}
                            <TouchableOpacity
                              onPress={() => toggleSection(sectionKey)}
                              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                            >
                              <IconSymbol
                                name={
                                  isExpanded ? "chevron.up" : "chevron.down"
                                }
                                size={14}
                                color={colors.tabIconDefault}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {isExpanded && (
                          <View style={styles.filterOptions}>
                            {section.options.map((option) => {
                              const isSelected = isFilterSelected(
                                sectionKey,
                                option.key,
                                section.multiSelect
                              );

                              return (
                                <TouchableOpacity
                                  key={option.key}
                                  style={[
                                    styles.filterChip,
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
                                      sectionKey,
                                      option,
                                      section.multiSelect
                                    )
                                  }
                                  disabled={loading}
                                  activeOpacity={0.7}
                                >
                                  {section.multiSelect && (
                                    <View
                                      style={[
                                        styles.checkbox,
                                        {
                                          backgroundColor: isSelected
                                            ? colors.background
                                            : "transparent",
                                          borderColor: isSelected
                                            ? colors.background
                                            : colors.border,
                                        },
                                      ]}
                                    >
                                      {isSelected && (
                                        <IconSymbol
                                          name="checkmark"
                                          size={12}
                                          color={colors.tint}
                                        />
                                      )}
                                    </View>
                                  )}
                                  <Text
                                    style={[
                                      styles.filterChipText,
                                      {
                                        color: isSelected
                                          ? colors.background
                                          : colors.text,
                                      },
                                    ]}
                                  >
                                    {option.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterButtonBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterButtonBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  activeFiltersScroll: {
    marginTop: 4,
  },
  activeFiltersContent: {
    gap: 6,
    paddingRight: 12,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipIcon: {
    marginLeft: 2,
  },
  clearAllChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get("window").height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalClearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalClearText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalScroll: {
    flex: 1,
  },
  modalFiltersContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  filterSection: {
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  clearButton: {
    padding: 2,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 36,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rangeContainer: {
    paddingVertical: 6,
    paddingTop: 8,
  },
  priceInputsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
    gap: 6,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  pricePrefix: {
    fontSize: 15,
    fontWeight: "600",
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 0,
  },
  priceSeparator: {
    paddingBottom: 8,
    justifyContent: "center",
  },
  priceSeparatorText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
