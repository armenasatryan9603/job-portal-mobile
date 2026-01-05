import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { ServiceCard } from "@/components/ServiceCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors, Typography } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRateUnits, RateUnit } from "@/hooks/useRateUnits";
import { formatPriceRangeDisplay } from "@/utils/currencyRateUnit";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
} from "react-native";
import { apiService, Service } from "@/services/api";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import AnalyticsService from "@/services/AnalyticsService";
import { Spacing } from "@/constants/styles";

export default function ServiceDetailScreen() {
  useAnalytics("ServiceDetail");
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { isAuthenticated } = useAuth();
  const { showLoginModal } = useModal();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits = (rateUnitsData || []) as RateUnit[];

  // API state management
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serviceId = parseInt(id as string);

  // Dismiss keyboard when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Dismiss keyboard when navigating to this screen
      Keyboard.dismiss();
    }, [])
  );

  // Fetch service details from API
  useEffect(() => {
    if (serviceId) {
      fetchServiceDetails();
    }
  }, [serviceId]);

  // Chunk child services into rows of 3 for grid layout
  // This must be before any conditional returns to follow Rules of Hooks
  const childServiceRows = useMemo(() => {
    if (!service?.Children || service.Children.length === 0) return [];
    const rows: Service[][] = [];
    for (let i = 0; i < service.Children.length; i += 3) {
      rows.push(service.Children.slice(i, i + 3));
    }
    return rows;
  }, [service]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const serviceData = await apiService.getServiceById(serviceId);
      setService(serviceData);
      // Track service view
      AnalyticsService.getInstance().logServiceViewed(
        serviceId.toString(),
        serviceData.name
      );
    } catch (err) {
      console.error("Error fetching service details:", err);
      setError("Failed to load service details. Please try again.");
      Alert.alert(
        "Error",
        "Failed to load service details. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Layout
        header={
          <Header
            showBackButton
            title={t("loading")}
            onBackPress={() => router.back()}
          />
        }
        footer={null}
      >
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading service details...
          </Text>
        </View>
      </Layout>
    );
  }

  // Show error state
  if (error || !service) {
    return (
      <Layout
        header={
          <Header
            showBackButton
            title={t("serviceNotFound")}
            onBackPress={() => router.back()}
          />
        }
        footer={null}
      >
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || t("serviceNotFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchServiceDetails}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.background }]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  const handleCreateOrder = () => {
    if (!isAuthenticated) {
      showLoginModal();
      return;
    }
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "create_order",
      location: "service_detail",
      service_id: serviceId.toString(),
    });
    router.push(`/orders/create?serviceId=${serviceId}`);
  };

  const handleBrowseSpecialists = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "browse_specialists",
      location: "service_detail",
      service_id: serviceId.toString(),
    });
    router.push(`/specialists?serviceId=${serviceId}`);
  };

  const handleSubServicePress = (subServiceId: number) => {
    AnalyticsService.getInstance().logEvent("service_clicked", {
      service_id: subServiceId.toString(),
      location: "service_detail",
      parent_service_id: serviceId.toString(),
    });
    router.push(`/services/${subServiceId}`);
  };

  const handleBrowseOrders = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "browse_orders",
      location: "service_detail",
      service_id: serviceId.toString(),
    });
    router.push(`/orders?serviceId=${serviceId}`);
  };

  // Render a service card for grid view (reusable for both parent and child services)
  const renderServiceCard = (service: Service) => {
    const childCount = service.Children?.length || 0;
    return (
      <ServiceCard
        key={service.id}
        service={service}
        onPress={handleSubServicePress}
        childCount={childCount}
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
        {row.map((childService) => renderServiceCard(childService))}
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

  const header = (
    <Header
      title={service.name}
      subtitle={t("serviceDetails")}
      showBackButton={true}
      onBackPress={() => router.back()}
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  const footer = null;

  return (
    <Layout header={header} footer={footer}>
      <ScrollView
        style={{ flex: 1, marginBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Service Overview */}
          <ResponsiveCard padding={0}>
            {service.imageUrl && (
              <Image
                source={{ uri: service.imageUrl }}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            )}
            <View style={{ padding: Spacing.lg }}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {service.name}
              </Text>
              <Text
                style={[
                  styles.serviceDescription,
                  { color: colors.tabIconDefault },
                ]}
              >
                {service.description}
              </Text>

              <View style={styles.statItem}>
                <IconSymbol
                  name="person.2.fill"
                  size={14}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[
                    styles.statLabel,
                    { color: colors.tabIconDefault, marginLeft: 6 },
                  ]}
                >
                  {service.specialistCount} {t("specialists")}
                </Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol
                  name="dollarsign.circle.fill"
                  size={14}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[
                    styles.statLabel,
                    { color: colors.tabIconDefault, marginLeft: 6 },
                  ]}
                >
                  {formatPriceRangeDisplay(
                    service.minPrice,
                    service.maxPrice,
                    service.currency,
                    service.rateUnit,
                    rateUnits,
                    language
                  )}
                </Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={14}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[
                    styles.statLabel,
                    { color: colors.tabIconDefault, marginLeft: 6 },
                  ]}
                >
                  {service.completionRate}% {t("successRate")}
                </Text>
              </View>
            </View>
          </ResponsiveCard>

          {/* Features */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("whatsIncluded")}
            </Text>
            {service.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={14}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[
                    styles.featureText,
                    { color: colors.tabIconDefault, marginLeft: 8 },
                  ]}
                >
                  {feature.name}
                </Text>
              </View>
            ))}
          </ResponsiveCard>
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("technologiesUsed")}
            </Text>
            {service.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={14}
                  color={colors.tabIconDefault}
                />
                <Text
                  style={[
                    styles.featureText,
                    { color: colors.tabIconDefault, marginLeft: 8 },
                  ]}
                >
                  {feature.name}
                </Text>
              </View>
            ))}
            <View style={styles.technologiesContainer}>
              {service.technologies.map((tech, index) => (
                <View
                  key={index}
                  style={[
                    styles.techTag,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.techText, { color: colors.tabIconDefault }]}
                  >
                    {tech.name}
                  </Text>
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Sub-services in 3-column grid */}
          {service.Children && service.Children.length > 0 && (
            <View style={styles.gridContainer}>
              {childServiceRows.map((row, index) => (
                <View key={`row-${index}`}>
                  {renderServiceRow({ item: row, index })}
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <ResponsiveCard>
            <View
              style={{
                flexDirection: "row",
                gap: Spacing.sm,
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              {/* <View> */}
              <Button
                onPress={handleCreateOrder}
                variant="primary"
                iconSize={14}
                title={t("postJob")}
                icon="plus.circle.fill"
                backgroundColor={colors.primary}
                style={{ paddingHorizontal: Spacing.sm }}
                textStyle={{ fontSize: 12 }}
              />
              {/* </View> */}
              {/* <View> */}
              <Button
                onPress={handleBrowseSpecialists}
                variant="primary"
                iconSize={14}
                title={t("specialists")}
                icon="person.2.fill"
                backgroundColor={colors.primary}
                style={{ paddingHorizontal: Spacing.sm }}
                textStyle={{ fontSize: 12 }}
              />
              {/* </View>
              <View> */}
              <Button
                onPress={handleBrowseOrders}
                variant="primary"
                iconSize={14}
                title={t("orders")}
                icon="list.bullet"
                backgroundColor={colors.primary}
                style={{ paddingHorizontal: Spacing.sm }}
                textStyle={{ fontSize: 12 }}
              />
              {/* </View> */}
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  serviceImage: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  overviewSection: {},
  serviceName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "400",
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  technologiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
  },
  techTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  techText: {
    fontSize: 11,
    fontWeight: "400",
  },
  gridContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    minHeight: 44,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    minHeight: 44,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tertiaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    minHeight: 44,
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
