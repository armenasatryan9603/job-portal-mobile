import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { Filter, FilterSection } from "@/components/FilterComponent";
import { EmptyPage } from "@/components/EmptyPage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing, ThemeColors, ViewStyles } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Service } from "@/services/api";
import { useServices, useRootServices } from "@/hooks/useApi";

const ServicesScreen = () => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useLanguage();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string | string[] | { min: number; max: number }>
  >({});

  // Use TanStack Query for data fetching
  const [currentPage, setCurrentPage] = useState(1);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const {
    data: servicesData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useServices(currentPage, 20);
  const { data: rootServices } = useRootServices();

  // Accumulate services from all pages
  useEffect(() => {
    if (servicesData?.services) {
      if (currentPage === 1) {
        setAllServices(servicesData.services);
      } else {
        setAllServices((prev) => [...prev, ...servicesData.services]);
      }
    }
  }, [servicesData, currentPage]);

  const services = allServices;
  const mainServices = rootServices || [];
  const pagination = servicesData?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Show loading only on initial load (page 1)
  const isInitialLoading = isLoading && currentPage === 1;
  const isLoadingMore = isFetching && currentPage > 1;

  const loadMoreServices = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Filter services based on search and category
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      !searchQuery ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description &&
        service.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const selectedCategories = selectedFilters["Categories"];
    const matchesCategory =
      !selectedCategories ||
      (Array.isArray(selectedCategories) && selectedCategories.length === 0) ||
      (Array.isArray(selectedCategories) &&
        selectedCategories.includes("all")) ||
      (Array.isArray(selectedCategories) &&
        selectedCategories.includes(service?.parentId?.toString() || "")) ||
      (!service.parentId &&
        Array.isArray(selectedCategories) &&
        selectedCategories.includes("all"));

    return matchesSearch && matchesCategory;
  });

  const handleServicePress = (serviceId: number) => {
    router.push(`/services/${serviceId}`);
  };

  const handleCreateOrder = () => {
    router.push("/orders/create");
  };

  // Filter configuration
  const filterSections: FilterSection[] = [
    {
      title: "Categories",
      multiSelect: true,
      options: [
        { key: "all", label: "All Categories" },
        ...mainServices.map((service) => ({
          key: service.id.toString(),
          label: service.name,
        })),
      ],
    },
  ];

  const handleFilterChange = (
    sectionKey: string,
    value: string | string[] | { min: number; max: number }
  ) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const header = (
    <Header
      title={t("services")}
      subtitle={t("findSpecialists")}
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  // Show loading state only on initial load
  if (isInitialLoading) {
    return (
      <Layout header={header}>
        <EmptyPage type="loading" title={t("loadingServices")} />
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout header={header}>
        <EmptyPage
          type="error"
          title={error.message || t("failedToLoadServices")}
          buttonText={t("retry")}
          onRetry={() => refetch()}
        />
      </Layout>
    );
  }

  const renderServiceItem = ({ item: service }: { item: Service }) => (
    <TouchableOpacity onPress={() => handleServicePress(service.id)}>
      <ResponsiveCard padding={16}>
        <View style={styles.serviceHeader}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {service.name}
          </Text>
          {service.parentId && (
            <View
              style={[styles.subServiceBadge, { backgroundColor: colors.tint }]}
            >
              <Text
                style={[styles.subServiceText, { color: colors.background }]}
              >
                {t("subService")}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.serviceDescription, { color: colors.tabIconDefault }]}
        >
          {service.description}
        </Text>

        <View style={styles.serviceStats}>
          <View style={styles.statItem}>
            <IconSymbol name="person.2.fill" size={16} color={colors.tint} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {service.specialistCount} {t("specialists")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              name="dollarsign.circle.fill"
              size={16}
              color={colors.tint}
            />
            <Text style={[styles.statText, { color: colors.text }]}>
              {service.averagePrice
                ? `$${service.averagePrice}/hr ${t("avg")}`
                : t("priceVaries")}
            </Text>
          </View>
        </View>
      </ResponsiveCard>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingMoreText, { color: colors.text }]}>
            {t("loadingMoreServices")}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderEmptyComponent = () => {
    if (filteredServices.length === 0) {
      return (
        <EmptyPage
          type="empty"
          icon="wrench.and.screwdriver"
          title={t("noServices")}
          subtitle={
            searchQuery
              ? t("tryAdjustingSearchTerms")
              : t("noServicesAvailable")
          }
        />
      );
    }
    return null;
  };

  return (
    <Layout header={header}>
      <View style={{ flex: 1 }}>
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
          <ResponsiveCard style={{ marginBottom: 0 }}>
            <Filter
              searchPlaceholder={t("searchServices")}
              onSearchChange={setSearchQuery}
              filterSections={filterSections}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              loading={isLoading}
            />
          </ResponsiveCard>
        </View>

        {/* FlatList with top padding to account for fixed header */}
        <FlatList
          style={{ marginTop: 100 }}
          data={filteredServices}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id.toString()}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyComponent}
          onEndReached={loadMoreServices}
          onEndReachedThreshold={0.1}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 6 * Spacing.lg }}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  serviceHeader: {
    ...ViewStyles.rowBetween,
    alignItems: "flex-start",
    ...ViewStyles.marginBottomMd,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    lineHeight: 24,
  },
  subServiceBadge: {
    ...ViewStyles.badge,
    marginLeft: Spacing.md,
  },
  subServiceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  serviceStats: {
    gap: Spacing.md,
  },
  statItem: {
    ...ViewStyles.row,
    gap: Spacing.sm,
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default ServicesScreen;
