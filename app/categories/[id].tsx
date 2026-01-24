import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { ServiceCard } from "@/components/ServiceCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CategoryDetailSkeleton } from "@/components/CategoryDetailSkeleton";
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
  Alert,
  Image,
  Keyboard,
} from "react-native";
import { apiService, Category } from "@/categories/api";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import AnalyticsService from "@/categories/AnalyticsService";
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
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryId = parseInt(id as string);

  // Dismiss keyboard when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Dismiss keyboard when navigating to this screen
      Keyboard.dismiss();
    }, [])
  );

  // Chunk child categories into rows of 3 for grid layout
  // This must be before any conditional returns to follow Rules of Hooks
  const childCategoryRows = useMemo(() => {
    if (!category?.Children || category.Children.length === 0) return [];
    const rows: Category[][] = [];
    for (let i = 0; i < category.Children.length; i += 3) {
      rows.push(category.Children.slice(i, i + 3));
    }
    return rows;
  }, [category]);

  const fetchCategoryDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const categoryData = await apiService.getCategoryById(
        categoryId,
        language
      );
      setCategory(categoryData);
      // Track category view
      AnalyticsService.getInstance().logServiceViewed(
        categoryId.toString(),
        categoryData.name
      );
    } catch (err) {
      console.error("Error fetching category details:", err);
      setError("Failed to load category details. Please try again.");
      Alert.alert(
        "Error",
        "Failed to load category details. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [categoryId, language]);

  // Fetch category details from API
  useEffect(() => {
    if (categoryId) {
      fetchCategoryDetails();
    }
  }, [categoryId, fetchCategoryDetails]);

  // Show loading state
  if (loading) {
    return (
      <CategoryDetailSkeleton
        header={
          <Header
            showBackButton
            title={t("loading")}
            onBackPress={() => router.back()}
          />
        }
      />
    );
  }

  // Show error state
  if (error || !category) {
    return (
      <Layout
        header={
          <Header
            showBackButton
            title={t("categoryNotFound")}
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
            onPress={fetchCategoryDetails}
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
      location: "category_detail",
      category_id: categoryId.toString(),
    });
    router.push(`/orders/create?serviceId=${categoryId}`);
  };

  const handleBrowseSpecialists = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "browse_specialists",
      location: "category_detail",
      category_id: categoryId.toString(),
    });
    router.push(`/specialists?categoryId=${categoryId}`);
  };

  const handleSubCategoryPress = (subCategoryId: number) => {
    AnalyticsService.getInstance().logEvent("category_clicked", {
      category_id: subCategoryId.toString(),
      location: "category_detail",
      parent_category_id: categoryId.toString(),
    });
    router.push(`/categories/${subCategoryId}`);
  };

  const handleBrowseOrders = () => {
    AnalyticsService.getInstance().logEvent("button_clicked", {
      button_name: "browse_orders",
      location: "category_detail",
      category_id: categoryId.toString(),
    });
    router.push(`/orders?categoryId=${categoryId}`);
  };

  // Render a category card for grid view (reusable for both parent and child categories)
  const renderCategoryCard = (category: Category) => {
    const childCount = category.Children?.length || 0;
    return (
      <ServiceCard
        key={category.id}
        service={category}
        onPress={handleSubCategoryPress}
        childCount={childCount}
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
        {row.map((childCategory) => renderCategoryCard(childCategory))}
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
      title={category.name}
      showBackButton={true}
      onBackPress={() => router.back()}
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  return (
    <Layout header={header}>
      <ScrollView
        style={{ flex: 1, marginBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Category Overview */}
          <ResponsiveCard padding={0}>
            {category.imageUrl && (
              <Image
                source={{ uri: category.imageUrl }}
                style={styles.serviceImage}
                resizeMode="contain"
              />
            )}
            <View style={{ padding: Spacing.lg }}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {category.name}
              </Text>
              <Text
                style={[
                  styles.serviceDescription,
                  { color: colors.tabIconDefault },
                ]}
              >
                {category.description}
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
                  {category.specialistCount} {t("specialists")}
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
                    category.minPrice,
                    category.maxPrice,
                    category.currency,
                    category.rateUnit,
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
                  {category.completionRate}% {t("successRate")}
                </Text>
              </View>
            </View>
          </ResponsiveCard>

          {/* Features */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("whatsIncluded")}
            </Text>
            {category.features.map((feature, index) => (
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
            <View style={styles.technologiesContainer}>
              {category.technologies.map((tech, index) => (
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

          {/* Sub-categories in 3-column grid */}
          {category.Children && category.Children.length > 0 && (
            <View style={styles.gridContainer}>
              {childCategoryRows.map((row, index) => (
                <View key={`row-${index}`}>
                  {renderCategoryRow({ item: row, index })}
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <ResponsiveCard>
            <View
              style={{
                gap: Spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: "wrap",
              }}
            >
              <Button
                onPress={handleBrowseOrders}
                variant="primary"
                iconSize={14}
                title={t("orders")}
                icon="list.bullet"
                backgroundColor={colors.primary}
                style={{ paddingHorizontal: Spacing.sm, width: '100%' }}
                textStyle={{ fontSize: 18 }}
              />
              <Button
                onPress={handleBrowseSpecialists}
                variant="primary"
                iconSize={14}
                title={t("specialists")}
                icon="person.2.fill"
                backgroundColor={colors.primary}
                style={{ paddingHorizontal: Spacing.sm, width: '100%' }}
                textStyle={{ fontSize: 18 }}
              />
              <Button
                onPress={handleCreateOrder}
                variant="primary"
                iconSize={14}
                title={t("postJob")}
                icon="plus.circle.fill"
                backgroundColor={colors.primary}
                style={{ paddingHorizontal: Spacing.sm, width: '100%' }}
                textStyle={{ fontSize: 18 }}
              />
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
    // Note: Should use colors.surface dynamically - consider inline style
    backgroundColor: "white",
  },
  overviewSection: {},
  serviceName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  serviceDescription: {
    fontSize: 16,
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
