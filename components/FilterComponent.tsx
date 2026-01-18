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
  PanResponder,
} from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";
import { CountBadge } from "@/components/CountBadge";

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
  type?: "options" | "range" | "text" | "stars" | "location";
  rangeConfig?: {
    min: number;
    max: number;
    step: number;
  };
  onLocationPress?: () => void; // Callback for location filter button
}

export interface FilterProps {
  searchPlaceholder?: string;
  initialSearchValue?: string;
  onSearchChange: (value: string) => void;
  filterSections: FilterSection[];
  selectedFilters: Record<
    string,
    | string
    | string[]
    | { min: number; max: number }
    | { latitude: number; longitude: number; address: string; radius: number }
    | null
  >;
  onFilterChange: (
    sectionKey: string,
    value:
      | string
      | string[]
      | { min: number; max: number }
      | { latitude: number; longitude: number; address: string; radius: number }
      | null
  ) => void;
  loading?: boolean;
  hideModalForLocation?: boolean; // Hide filter modal when location modal is open
}

export const Filter: React.FC<FilterProps> = ({
  searchPlaceholder = "Search...",
  initialSearchValue = "",
  onSearchChange,
  filterSections,
  selectedFilters,
  onFilterChange,
  loading = false,
  hideModalForLocation = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const textInputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchValue || "");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const lastGestureY = useRef(0);

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

  useEffect(() => {
    setSearchQuery(initialSearchValue || "");
  }, [initialSearchValue]);

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

    // If no value, return 0
    if (currentValue === undefined || currentValue === null) {
      return 0;
    }

    // Handle arrays (multi-select filters)
    if (Array.isArray(currentValue)) {
      return currentValue.length;
    }

    // Handle location filter (object with latitude, longitude, address, radius)
    if (
      typeof currentValue === "object" &&
      "latitude" in currentValue &&
      "longitude" in currentValue &&
      "radius" in currentValue
    ) {
      return 1;
    }

    // Handle range filters (objects with min/max)
    if (
      typeof currentValue === "object" &&
      "min" in currentValue &&
      "max" in currentValue
    ) {
      // Find the section to get default values
      const section = filterSections.find(
        (s) => (s.key || s.title) === sectionKey
      );

      // If section not found or not a range filter, return 0
      if (!section || section.type !== "range" || !section.rangeConfig) {
        return 0;
      }

      // Check if values differ from defaults
      const defaultMin = section.rangeConfig.min;
      const defaultMax = section.rangeConfig.max;
      const isDifferentFromDefault =
        Number(currentValue.min) !== Number(defaultMin) ||
        Number(currentValue.max) !== Number(defaultMax);

      return isDifferentFromDefault ? 1 : 0;
    }

    // Handle string values (single-select filters)
    // Only count if it's a non-empty string
    if (typeof currentValue === "string") {
      return currentValue.trim().length > 0 ? 1 : 0;
    }

    return 0;
  };

  const clearFilter = (sectionKey: string) => {
    const section = filterSections.find(
      (s) => (s.key || s.title) === sectionKey
    );
    if (section?.multiSelect) {
      onFilterChange(sectionKey, []);
    } else if (section?.type === "range") {
      const defaultMin = section.rangeConfig?.min || 0;
      const defaultMax = section.rangeConfig?.max || 10000000;
      onFilterChange(sectionKey, { min: defaultMin, max: defaultMax });
    } else if (section?.type === "stars") {
      onFilterChange(sectionKey, []);
    } else if (section?.type === "location") {
      onFilterChange(sectionKey, null);
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

  const isSectionExpanded = (sectionKey: string, inModal: boolean = false) => {
    // In modal, expand all sections by default for better UX
    if (inModal) {
      return expandedSections[sectionKey] ?? true;
    }
    // Auto-expand if section has active filters, otherwise check state
    const hasFilters = getSelectedCount(sectionKey) > 0;
    return expandedSections[sectionKey] ?? hasFilters;
  };

  const toggleSection = (sectionKey: string, inModal: boolean = false) => {
    setExpandedSections((prev) => {
      // Get the current expanded state (using the same logic as isSectionExpanded)
      const currentlyExpanded = inModal
        ? prev[sectionKey] ?? true
        : prev[sectionKey] ?? getSelectedCount(sectionKey) > 0;

      return {
        ...prev,
        [sectionKey]: !currentlyExpanded,
      };
    });
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
      panY.setValue(0);
    });
  };

  // Animate modal content when it opens
  useEffect(() => {
    if (filterModalVisible) {
      // Reset pan gesture
      panY.setValue(0);
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
      panY.setValue(0);
    }
  }, [filterModalVisible, slideAnim, panY]);

  const modalContentTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, 0],
  });

  // PanResponder for swipe-down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        lastGestureY.current = 0;
        panY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
          lastGestureY.current = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const screenHeight = Dimensions.get("window").height;
        const threshold = screenHeight * 0.2; // Close if swiped down more than 20% of screen height
        const velocity = gestureState.vy;

        // Close if swiped down enough or with sufficient velocity
        if (gestureState.dy > threshold || velocity > 0.5) {
          // Animate both panY to 0 and slideAnim to 0 simultaneously
          Animated.parallel([
            Animated.timing(panY, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setFilterModalVisible(false);
            panY.setValue(0);
          });
        } else {
          // Spring back to original position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Combine slide animation with pan gesture
  const combinedTranslateY = Animated.add(
    slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [Dimensions.get("window").height, 0],
    }),
    panY
  );

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
            blurOnSubmit={false}
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
        visible={filterModalVisible && !hideModalForLocation}
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
                transform: [{ translateY: combinedTranslateY }],
              },
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <View
                {...panResponder.panHandlers}
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
                              onPress={() => toggleSection(sectionKey, true)}
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
                              <CountBadge
                                count={selectedCount}
                                color={colors.background}
                                backgroundColor={colors.tint}
                              />
                              <TouchableOpacity
                                onPress={() => toggleSection(sectionKey, true)}
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
                                    {sectionKey === "priceRange" && (
                                      <Text
                                        style={[
                                          styles.pricePrefix,
                                          { color: colors.tabIconDefault },
                                        ]}
                                      >
                                        $
                                      </Text>
                                    )}
                                    {sectionKey === "radius" && (
                                      <Text
                                        style={[
                                          styles.pricePrefix,
                                          { color: colors.tabIconDefault },
                                        ]}
                                      >
                                        km
                                      </Text>
                                    )}
                                    {sectionKey === "rating" && (
                                      <Text
                                        style={[
                                          styles.pricePrefix,
                                          { color: colors.tabIconDefault },
                                        ]}
                                      >
                                        ⭐
                                      </Text>
                                    )}
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
                                    {sectionKey === "priceRange" && (
                                      <Text
                                        style={[
                                          styles.pricePrefix,
                                          { color: colors.tabIconDefault },
                                        ]}
                                      >
                                        $
                                      </Text>
                                    )}
                                    {sectionKey === "radius" && (
                                      <Text
                                        style={[
                                          styles.pricePrefix,
                                          { color: colors.tabIconDefault },
                                        ]}
                                      >
                                        km
                                      </Text>
                                    )}
                                    {sectionKey === "rating" && (
                                      <Text
                                        style={[
                                          styles.pricePrefix,
                                          { color: colors.tabIconDefault },
                                        ]}
                                      >
                                        ⭐
                                      </Text>
                                    )}
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

                    // Handle star rating sections
                    if (section.type === "stars") {
                      const isExpanded = isSectionExpanded(sectionKey, true);
                      const ratingFilterValue = selectedFilters[sectionKey];
                      const selectedRatings: number[] = Array.isArray(
                        ratingFilterValue
                      )
                        ? ratingFilterValue
                            .map((r) =>
                              typeof r === "number"
                                ? r
                                : typeof r === "string"
                                ? parseInt(r, 10)
                                : null
                            )
                            .filter((r): r is number => r !== null && !isNaN(r))
                        : ratingFilterValue &&
                          typeof ratingFilterValue === "number"
                        ? [ratingFilterValue]
                        : ratingFilterValue &&
                          typeof ratingFilterValue === "string"
                        ? [parseInt(ratingFilterValue, 10)].filter(
                            (r) => !isNaN(r)
                          )
                        : [];
                      const hasValue = selectedRatings.length > 0;

                      const toggleRating = (rating: number) => {
                        const currentRatingValue = selectedFilters[sectionKey];
                        const currentRatings: number[] = Array.isArray(
                          currentRatingValue
                        )
                          ? currentRatingValue
                              .map((r) =>
                                typeof r === "number"
                                  ? r
                                  : typeof r === "string"
                                  ? parseInt(r, 10)
                                  : null
                              )
                              .filter(
                                (r): r is number => r !== null && !isNaN(r)
                              )
                          : currentRatingValue &&
                            typeof currentRatingValue === "number"
                          ? [currentRatingValue]
                          : currentRatingValue &&
                            typeof currentRatingValue === "string"
                          ? [parseInt(currentRatingValue, 10)].filter(
                              (r) => !isNaN(r)
                            )
                          : [];

                        if (currentRatings.includes(rating)) {
                          // Remove rating if already selected
                          const newRatings = currentRatings.filter(
                            (r) => r !== rating
                          );
                          onFilterChange(
                            sectionKey,
                            newRatings.length > 0 ? (newRatings as any) : []
                          );
                        } else {
                          // Add rating if not selected
                          const newRatings = [...currentRatings, rating].sort(
                            (a, b) => a - b
                          );
                          onFilterChange(sectionKey, newRatings as any);
                        }
                      };

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
                              onPress={() => toggleSection(sectionKey, true)}
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
                              {hasValue && (
                                <>
                                  <CountBadge
                                    count={selectedRatings.length}
                                    color={colors.background}
                                    backgroundColor={colors.tint}
                                    style={styles.badge}
                                    textStyle={styles.badgeText}
                                  />
                                  <TouchableOpacity
                                    onPress={() =>
                                      onFilterChange(sectionKey, [])
                                    }
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
                                onPress={() => toggleSection(sectionKey, true)}
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
                            <View style={styles.starsContainer}>
                              <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const isSelected =
                                    selectedRatings.includes(star);
                                  return (
                                    <TouchableOpacity
                                      key={star}
                                      onPress={() => toggleRating(star)}
                                      style={styles.starButton}
                                      activeOpacity={0.7}
                                      disabled={loading}
                                    >
                                      <IconSymbol
                                        name={isSelected ? "star.fill" : "star"}
                                        size={32}
                                        color={
                                          isSelected ? "#FFD700" : colors.border
                                        }
                                      />
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                              {hasValue && (
                                <Text
                                  style={[
                                    styles.starsLabel,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {t("selectedRatings")}:{" "}
                                  {selectedRatings.join(", ")}{" "}
                                  {selectedRatings.length === 1
                                    ? t("star") || "star"
                                    : t("stars") || "stars"}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    }

                    // Handle location filter (map-based)
                    if (section.type === "location") {
                      const isExpanded = isSectionExpanded(sectionKey, true);
                      const locationData = selectedFilters[sectionKey] as
                        | {
                            latitude: number;
                            longitude: number;
                            address: string;
                            radius: number;
                          }
                        | null
                        | undefined;
                      const hasValue =
                        locationData !== null && locationData !== undefined;

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
                              onPress={() => toggleSection(sectionKey, true)}
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
                              {hasValue && (
                                <>
                                  <CountBadge
                                    count={1}
                                    color={colors.background}
                                    backgroundColor={colors.tint}
                                    style={styles.badge}
                                    textStyle={styles.badgeText}
                                  />
                                  <TouchableOpacity
                                    onPress={() =>
                                      onFilterChange(sectionKey, null)
                                    }
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
                                onPress={() => toggleSection(sectionKey, true)}
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
                            <View style={styles.locationFilterContainer}>
                              {hasValue && (
                                <View style={styles.locationInfo}>
                                  <IconSymbol
                                    name="mappin.circle.fill"
                                    size={16}
                                    color={colors.primary}
                                  />
                                  <Text
                                    style={[
                                      styles.locationInfoText,
                                      { color: colors.text },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {locationData.address}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.locationRadiusText,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    {locationData.radius} km
                                  </Text>
                                </View>
                              )}
                              <TouchableOpacity
                                style={[
                                  styles.openMapButton,
                                  {
                                    backgroundColor: colors.primary,
                                    borderColor: colors.primary,
                                  },
                                ]}
                                onPress={() => {
                                  console.log(
                                    "Location button pressed, section.onLocationPress:",
                                    !!section.onLocationPress
                                  );
                                  // Don't close the filter modal - keep it open behind the location modal
                                  // Add a small delay to ensure the location modal renders properly on top
                                  const onLocationPress =
                                    section.onLocationPress;
                                  if (onLocationPress) {
                                    console.log(
                                      "Calling onLocationPress callback"
                                    );
                                    // Call directly - the parent will hide the filter modal
                                    onLocationPress();
                                  } else {
                                    console.warn(
                                      "onLocationPress callback is not defined"
                                    );
                                  }
                                }}
                              >
                                <IconSymbol
                                  name="map"
                                  size={16}
                                  color="white"
                                />
                                <Text
                                  style={[
                                    styles.openMapButtonText,
                                    { color: "white" },
                                  ]}
                                >
                                  {hasValue
                                    ? t("changeLocation")
                                    : t("selectLocationOnMap")}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    }

                    // Handle text input sections
                    if (section.type === "text") {
                      const isExpanded = isSectionExpanded(sectionKey, true);
                      const currentValue =
                        (selectedFilters[sectionKey] as string) || "";
                      const hasValue = currentValue.trim().length > 0;

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
                              onPress={() => toggleSection(sectionKey, true)}
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
                              {hasValue && (
                                <>
                                  <CountBadge
                                    count={1}
                                    color={colors.background}
                                    backgroundColor={colors.tint}
                                    style={styles.badge}
                                    textStyle={styles.badgeText}
                                  />
                                  <TouchableOpacity
                                    onPress={() =>
                                      onFilterChange(sectionKey, "")
                                    }
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
                                onPress={() => toggleSection(sectionKey, true)}
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
                            <View style={styles.textInputContainer}>
                              <TextInput
                                style={[
                                  styles.textInput,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                  },
                                ]}
                                placeholder={
                                  t("enterLocation")
                                }
                                placeholderTextColor={colors.tabIconDefault}
                                value={currentValue}
                                onChangeText={(text) =>
                                  onFilterChange(sectionKey, text)
                                }
                                editable={!loading}
                              />
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
                            onPress={() => toggleSection(sectionKey, true)}
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
                                  <CountBadge
                                    count={selectedCount}
                                    color={colors.background}
                                    backgroundColor={colors.tint}
                                    style={styles.badge}
                                    textStyle={styles.badgeText}
                                  />
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
                              onPress={() => toggleSection(sectionKey, true)}
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
    lineHeight: 20,
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
    fontSize: 12,
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
  textInputContainer: {
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  starsContainer: {
    marginTop: 8,
    width: "100%",
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  starButton: {
    padding: 4,
  },
  starsLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  locationFilterContainer: {
    marginTop: 8,
    gap: 12,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  locationInfoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  locationRadiusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  openMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  openMapButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
