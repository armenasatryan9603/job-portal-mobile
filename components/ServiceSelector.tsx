import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  UIManager,
  Image,
  ScrollView,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Service } from "@/services/api";
import { useServices } from "@/hooks/useApi";
import { useTranslation } from "@/hooks/useTranslation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRateUnits, RateUnit } from "@/hooks/useRateUnits";
import { formatPriceDisplay } from "@/utils/currencyRateUnit";

interface ServiceSelectorProps {
  selectedService: Service | null;
  onServiceSelect: (service: Service | null) => void;
  error?: string;
  disabled?: boolean;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
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
  } = useServices(1, 100, undefined, language);

  // Extract services from the cached response
  const services = useMemo(() => {
    return servicesData?.services || [];
  }, [servicesData]);

  const servicesError = servicesErrorData ? t("failedToLoadServices") : null;

  const [searchQuery, setSearchQuery] = useState("");

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  // Organize services by category
  const getServicesByCategory = () => {
    const categories = services.filter((service) => !service.parentId);
    const subServices = services.filter((service) => service.parentId);

    if (!searchQuery.trim()) {
      // No search - show all categories with all their sub-services
      return categories.map((category) => ({
        ...category,
        subServices: subServices.filter((sub) => sub.parentId === category.id),
      }));
    }

    // Search is active - filter both categories and sub-services
    const searchLower = searchQuery.toLowerCase();

    // Find matching sub-services
    const matchingSubServices = subServices.filter(
      (service) =>
        service.name.toLowerCase().includes(searchLower) ||
        service.Parent?.name.toLowerCase().includes(searchLower)
    );

    // Find categories that match or have matching sub-services
    const matchingCategoryIds = new Set<number>();
    matchingSubServices.forEach((service) => {
      if (service.parentId) {
        matchingCategoryIds.add(service.parentId);
      }
    });

    // Get categories that match search or have matching sub-services
    const relevantCategories = categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchLower) ||
        matchingCategoryIds.has(cat.id)
    );

    // Group matching sub-services by their parent category
    return relevantCategories
      .map((category) => {
        const categoryMatches = category.name
          .toLowerCase()
          .includes(searchLower);
        const categorySubServices = matchingSubServices.filter(
          (sub) => sub.parentId === category.id
        );

        // If category name matches, show all sub-services
        // Otherwise, only show matching sub-services
        return {
          ...category,
          subServices: categoryMatches
            ? subServices.filter((sub) => sub.parentId === category.id)
            : categorySubServices,
        };
      })
      .filter((category) => category.subServices.length > 0);
  };

  const handleServiceSelect = (service: Service) => {
    onServiceSelect(service);
  };

  const servicesByCategory = getServicesByCategory();

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("selectService")} *
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.tabIconDefault }]}>
        {t("selectServiceDescription")}
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
            placeholder={t("searchServices")}
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

      {/* Selected Service Display */}
      {selectedService && (
        <View
          style={[
            styles.selectedServiceCard,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary,
            },
          ]}
        >
          {selectedService.imageUrl && (
            <Image
              source={{ uri: selectedService.imageUrl }}
              style={styles.selectedServiceImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.selectedServiceInfo}>
            <Text style={[styles.selectedServiceName, { color: colors.text }]}>
              {selectedService.name}
            </Text>
            {selectedService.averagePrice && (
              <Text
                style={[styles.selectedServicePrice, { color: colors.primary }]}
              >
                {formatPriceDisplay(
                  selectedService.averagePrice,
                  selectedService.currency,
                  selectedService.rateUnit,
                  rateUnits,
                  language
                )}
              </Text>
            )}
          </View>
          {!disabled && (
            <TouchableOpacity
              onPress={() => onServiceSelect(null)}
              style={styles.removeButton}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={18}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Services Grid */}
      <View
        style={[
          styles.servicesContainer,
          error
            ? {
                borderColor: "#ff4444",
                borderWidth: 1,
                borderRadius: 12,
                padding: 8,
              }
            : {},
        ]}
      >
        {isLoadingServices ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t("loadingServices")}
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
        ) : servicesByCategory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              name="magnifyingglass"
              size={48}
              color={colors.tabIconDefault}
            />
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              {t("noServicesFound") || "No services found"}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.categoriesScrollView}
            contentContainerStyle={styles.categoriesContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {servicesByCategory.map((category) => (
              <View key={category.id} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  {category.imageUrl && (
                    <Image
                      source={{ uri: category.imageUrl }}
                      style={styles.categoryHeaderImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    {category.name}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCount,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {category.subServices.length}{" "}
                    {category.subServices.length === 1
                      ? t("service") || "service"
                      : t("services") || "services"}
                  </Text>
                </View>
                <View style={styles.servicesList}>
                  {category.subServices.map((service) => {
                    const isSelected = selectedService?.id === service.id;
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceListItem,
                          {
                            backgroundColor: isSelected
                              ? colors.primary + "15"
                              : colors.background,
                            borderLeftColor: isSelected
                              ? colors.primary
                              : "transparent",
                            opacity: disabled ? 0.5 : 1,
                          },
                        ]}
                        onPress={() =>
                          !disabled && handleServiceSelect(service)
                        }
                        activeOpacity={0.7}
                        disabled={disabled}
                      >
                        {service.imageUrl ? (
                          <Image
                            source={{ uri: service.imageUrl }}
                            style={styles.serviceListItemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.serviceListItemImagePlaceholder,
                              {
                                backgroundColor: colors.border + "40",
                              },
                            ]}
                          >
                            <IconSymbol
                              name="gearshape.fill"
                              size={16}
                              color={colors.tabIconDefault}
                            />
                          </View>
                        )}
                        <View style={styles.serviceListItemContent}>
                          <Text
                            style={[
                              styles.serviceListItemName,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {service.name}
                          </Text>
                          {service.averagePrice && (
                            <Text
                              style={[
                                styles.serviceListItemPrice,
                                {
                                  color: colors.tabIconDefault,
                                },
                              ]}
                            >
                              {formatPriceDisplay(
                                service.averagePrice,
                                service.currency,
                                service.rateUnit,
                                rateUnits,
                                language
                              )}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
    fontSize: 20,
    fontWeight: "700",
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
    gap: 16,
  },
  categoriesScrollView: {
    maxHeight: 400,
  },
  categoriesContainer: {
    gap: 16,
  },
  categorySection: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  categoryHeaderImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  servicesList: {
    gap: 4,
  },
  serviceListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    gap: 8,
  },
  serviceListItemImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  serviceListItemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceListItemContent: {
    flex: 1,
    gap: 2,
  },
  serviceListItemName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  serviceListItemPrice: {
    fontSize: 11,
    fontWeight: "500",
  },
  selectedServiceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 8,
    gap: 8,
  },
  selectedServiceImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  selectedServiceInfo: {
    flex: 1,
  },
  selectedServiceName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  selectedServicePrice: {
    fontSize: 11,
    fontWeight: "600",
  },
  removeButton: {
    padding: 4,
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
