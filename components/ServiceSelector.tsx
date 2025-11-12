import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from "react-native";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Service } from "@/services/api";
import { useServices } from "@/hooks/useApi";
import { useTranslation } from "@/hooks/useTranslation";

interface ServiceSelectorProps {
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
  error?: string;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedService,
  onServiceSelect,
  error,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const { language } = useLanguage();

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

  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllServices, setShowAllServices] = useState(false);
  const [isServiceSelectorCollapsed, setIsServiceSelectorCollapsed] =
    useState(false);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  // Organize services by categories with search and filter
  const organizeServicesByCategory = () => {
    let filteredServices = services;

    if (searchQuery.trim()) {
      filteredServices = services.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const categories = filteredServices.filter((service) => !service.parentId);
    const subServices = filteredServices.filter((service) => service.parentId);

    return categories.map((category) => ({
      ...category,
      subServices: subServices.filter((sub) => sub.parentId === category.id),
    }));
  };

  // Get all services for flat view
  const getAllServicesFlat = () => {
    let filteredServices = services;

    if (searchQuery.trim()) {
      filteredServices = services.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredServices.filter((service) => service.parentId);
  };

  const handleServiceSelect = (service: Service) => {
    onServiceSelect(service);

    // Collapse service selector with animation
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    setIsServiceSelectorCollapsed(true);
  };

  const handleReselectService = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    setIsServiceSelectorCollapsed(false);
  };

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("selectService")} *
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.tabIconDefault }]}>
        {t("selectServiceDescription")}
      </Text>

      {/* Selected Service Display */}
      {selectedService && isServiceSelectorCollapsed ? (
        <View
          style={[
            styles.selectedServiceCard,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.selectedServiceInfo}>
            <Text style={[styles.selectedServiceName, { color: colors.text }]}>
              {selectedService.name}
            </Text>
            {selectedService.averagePrice && (
              <Text
                style={[styles.selectedServicePrice, { color: colors.tint }]}
              >
                ${selectedService.averagePrice}/hr
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.changeServiceButton,
              { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={handleReselectService}
          >
            <Text
              style={[styles.changeServiceText, { color: colors.background }]}
            >
              {t("change")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("searchServices")}
              placeholderTextColor={colors.tabIconDefault}
            />
          </View>

          {/* View Toggle */}
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                {
                  backgroundColor: !showAllServices
                    ? colors.tint
                    : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowAllServices(false)}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  {
                    color: !showAllServices ? colors.background : colors.text,
                  },
                ]}
              >
                {t("byCategory")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                {
                  backgroundColor: showAllServices
                    ? colors.tint
                    : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowAllServices(true)}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  {
                    color: showAllServices ? colors.background : colors.text,
                  },
                ]}
              >
                {t("allServices")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View
        style={[
          styles.servicesContainer,
          error
            ? {
                borderColor: "#ff4444",
                borderWidth: 1,
                borderRadius: 8,
                padding: 8,
              }
            : {},
        ]}
      >
        {!isServiceSelectorCollapsed && (
          <>
            {isLoadingServices ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
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
                  style={[styles.retryButton, { borderColor: colors.border }]}
                  onPress={() => {
                    refetchServices();
                  }}
                >
                  <Text
                    style={[styles.retryButtonText, { color: colors.text }]}
                  >
                    {t("retry")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : showAllServices ? (
              // Flat view - all services in a grid
              <View style={styles.allServicesGrid}>
                {getAllServicesFlat().map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceCard,
                      {
                        backgroundColor:
                          selectedService?.id === service.id
                            ? colors.tint
                            : colors.background,
                        borderColor:
                          selectedService?.id === service.id
                            ? colors.tint
                            : colors.border,
                      },
                    ]}
                    onPress={() => handleServiceSelect(service)}
                  >
                    {service.imageUrl && (
                      <Image
                        source={{ uri: service.imageUrl }}
                        style={styles.serviceCardImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text
                      style={[
                        styles.serviceCardName,
                        {
                          color:
                            selectedService?.id === service.id
                              ? colors.background
                              : colors.text,
                        },
                      ]}
                    >
                      {service.name}
                    </Text>
                    {service.averagePrice && (
                      <Text
                        style={[
                          styles.serviceCardPrice,
                          {
                            color:
                              selectedService?.id === service.id
                                ? colors.background
                                : colors.tint,
                          },
                        ]}
                      >
                        ${service.averagePrice}/hr
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Category view
              <View style={styles.servicesGrid}>
                {organizeServicesByCategory().map((category) => (
                  <View key={category.id} style={styles.categoryCard}>
                    <TouchableOpacity
                      style={[
                        styles.categoryCardHeader,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() =>
                        setExpandedCategory(
                          expandedCategory === category.id ? null : category.id
                        )
                      }
                    >
                      <View style={styles.categoryInfo}>
                        <Text
                          style={[styles.categoryTitle, { color: colors.text }]}
                        >
                          {category.name}
                        </Text>
                        <Text
                          style={[
                            styles.categorySubtext,
                            { color: colors.tabIconDefault },
                          ]}
                        >
                          {category.subServices.length} {t("services")}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.expandButton,
                          {
                            backgroundColor: colors.tint,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.expandIcon,
                            { color: colors.background },
                          ]}
                        >
                          {expandedCategory === category.id ? "−" : "+"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {expandedCategory === category.id && (
                      <View style={styles.subServicesGrid}>
                        {category.subServices.map((subService) => (
                          <TouchableOpacity
                            key={subService.id}
                            style={[
                              styles.subServiceCard,
                              {
                                backgroundColor:
                                  selectedService?.id === subService.id
                                    ? colors.tint
                                    : colors.background,
                                borderColor:
                                  selectedService?.id === subService.id
                                    ? colors.tint
                                    : colors.border,
                              },
                            ]}
                            onPress={() => handleServiceSelect(subService)}
                          >
                            <Text
                              style={[
                                styles.subServiceName,
                                {
                                  color:
                                    selectedService?.id === subService.id
                                      ? colors.background
                                      : colors.text,
                                },
                              ]}
                            >
                              {subService.name}
                            </Text>
                            {subService.averagePrice && (
                              <Text
                                style={[
                                  styles.subServicePrice,
                                  {
                                    color:
                                      selectedService?.id === subService.id
                                        ? colors.background
                                        : colors.tint,
                                  },
                                ]}
                              >
                                ${subService.averagePrice}/hr
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: "#ff4444", marginTop: 8 }]}>
          {error}
        </Text>
      ) : null}

      {/* Selected Service Info */}
      {selectedService && (
        <View style={styles.selectedServiceInfo}>
          <Text style={[styles.selectedServiceTitle, { color: colors.text }]}>
            {t("selectedService")}: {selectedService.name}
          </Text>
          {selectedService.description && (
            <Text
              style={[
                styles.selectedServiceDescription,
                { color: colors.tabIconDefault },
              ]}
            >
              {selectedService.description}
            </Text>
          )}
          {selectedService.averagePrice && (
            <View style={styles.priceInfo}>
              <Text style={[styles.priceLabel, { color: colors.text }]}>
                {t("suggestedBudget")}:
              </Text>
              <Text style={[styles.priceValue, { color: colors.tint }]}>
                ${selectedService.minPrice} - ${selectedService.maxPrice}{" "}
                {t("perHour")}
              </Text>
              <Text
                style={[styles.priceAverage, { color: colors.tabIconDefault }]}
              >
                ({t("average")}: ${selectedService.averagePrice}/hr)
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  servicesContainer: {
    gap: 8,
  },
  servicesGrid: {
    gap: 8,
  },
  categoryCard: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  categorySubtext: {
    fontSize: 12,
    fontWeight: "400",
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: "bold",
  },
  subServicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 6,
  },
  subServiceCard: {
    flex: 1,
    minWidth: "45%",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  subServiceName: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  subServicePrice: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  viewToggleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  allServicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceCard: {
    flex: 1,
    minWidth: "30%",
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  serviceCardImage: {
    width: "100%",
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceCardName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  serviceCardPrice: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  selectedServiceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  selectedServiceInfo: {
    flex: 1,
  },
  selectedServiceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  selectedServicePrice: {
    fontSize: 14,
    fontWeight: "500",
  },
  changeServiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeServiceText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  selectedServiceTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  selectedServiceDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  priceInfo: {
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  priceAverage: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
