import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { apiService, Service } from "@/services/api";

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { isAuthenticated } = useAuth();
  const { showLoginModal } = useModal();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // API state management
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serviceId = parseInt(id as string);

  // Fetch service details from API
  useEffect(() => {
    if (serviceId) {
      fetchServiceDetails();
    }
  }, [serviceId]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const serviceData = await apiService.getServiceById(serviceId);
      setService(serviceData);
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
            title="Loading..."
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
    router.push(`/orders/create?serviceId=${serviceId}`);
  };

  const handleBrowseSpecialists = () => {
    router.push(`/specialists?serviceId=${serviceId}`);
  };

  const handleSubServicePress = (subServiceId: number) => {
    router.push(`/services/${subServiceId}`);
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
          <ResponsiveCard>
            <View style={styles.overviewSection}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {service.name}
              </Text>
              <Text style={[styles.serviceDescription, { color: colors.text }]}>
                {service.description}
              </Text>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <IconSymbol
                    name="person.2.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    {service.specialistCount} {t("specialists")}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <IconSymbol
                    name="dollarsign.circle.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    ${service.minPrice} - ${service.maxPrice}/hr
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    {service.completionRate}% {t("successRate")}
                  </Text>
                </View>
              </View>
            </View>
          </ResponsiveCard>

          {/* Features */}
          <ResponsiveCard>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 15 },
              ]}
            >
              {t("whatsIncluded")}
            </Text>
            <View style={styles.featuresContainer}>
              {service.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={18}
                    color={colors.tint}
                  />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Technologies */}
          <ResponsiveCard>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 15 },
              ]}
            >
              {t("technologiesUsed")}
            </Text>
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
                  <Text style={[styles.techText, { color: colors.text }]}>
                    {tech}
                  </Text>
                </View>
              ))}
            </View>
          </ResponsiveCard>

          {/* Sub-services */}
          {service.Children && service.Children.length > 0 && (
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("relatedServices")}
              </Text>
              <View style={styles.subServicesContainer}>
                {service.Children.map((subService) => (
                  <TouchableOpacity
                    key={subService.id}
                    onPress={() => handleSubServicePress(subService.id)}
                    style={[
                      styles.subServiceItem,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.subServiceInfo}>
                      <Text
                        style={[styles.subServiceName, { color: colors.text }]}
                      >
                        {subService.name}
                      </Text>
                      <Text
                        style={[
                          styles.subServiceStats,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {subService.specialistCount} {t("specialists")} •
                        {subService.averagePrice
                          ? ` $${subService.averagePrice}/hr avg`
                          : " Price varies"}
                      </Text>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ResponsiveCard>
          )}

          {/* Action Buttons */}
          <ResponsiveCard>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={handleCreateOrder}
              >
                <IconSymbol
                  name="plus.circle.fill"
                  size={20}
                  color={colors.background}
                />
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.background },
                  ]}
                >
                  {t("postJob")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.tint,
                    borderWidth: 1,
                  },
                ]}
                onPress={handleBrowseSpecialists}
              >
                <IconSymbol
                  name="person.2.fill"
                  size={20}
                  color={colors.tint}
                />
                <Text
                  style={[styles.secondaryButtonText, { color: colors.tint }]}
                >
                  {t("browseSpecialists")}
                </Text>
              </TouchableOpacity>
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
  overviewSection: {
    marginBottom: 20,
  },
  serviceName: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  serviceDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  statsContainer: {
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  technologiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  techTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  techText: {
    fontSize: 12,
    fontWeight: "500",
  },
  subServicesContainer: {
    gap: 8,
  },
  subServiceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  subServiceInfo: {
    flex: 1,
  },
  subServiceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  subServiceStats: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
