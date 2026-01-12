import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors, BorderRadius } from "@/constants/styles";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscriptionPlans, useMySubscription } from "@/hooks/useApi";
import type { SubscriptionPlan, UserSubscription } from "@/services/api";

export default function SubscriptionsScreen() {
  useAnalytics("Subscriptions");
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const {
    data: plansData,
    isLoading: plansLoading,
    error: plansError,
  } = useSubscriptionPlans();
  const { data: mySubscription, isLoading: subscriptionLoading } =
    useMySubscription();

  const plans: SubscriptionPlan[] = Array.isArray(plansData) ? plansData : [];
  const loading = plansLoading || subscriptionLoading;
  const subscription = mySubscription as UserSubscription | null | undefined;

  useEffect(() => {
    if (plansError) {
      Alert.alert(
        t("error"),
        (plansError as any)?.message || t("failedToLoadPlans")
      );
    }
  }, [plansError]);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    router.push({
      pathname: "/subscriptions/[id]",
      params: { id: plan.id.toString() },
    });
  };

  const renderPlan = ({ item }: { item: SubscriptionPlan }) => {
    const isActive =
      subscription?.planId === item.id && subscription?.status === "active";
    const isMonthly = item.durationDays === 30;
    const isYearly = item.durationDays === 365;
    const features = item.features || {};
    const featureList = [
      features.unlimitedApplications && t("unlimitedApplications"),
      features.prioritySupport && t("prioritySupport"),
      features.advancedFilters && t("advancedFilters"),
      features.featuredProfile && t("featuredProfile"),
    ].filter(Boolean);

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          {
            backgroundColor: colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
            borderWidth: isActive ? 2 : 1,
          },
        ]}
        onPress={() => handleSelectPlan(item)}
        disabled={isActive}
        activeOpacity={0.7}
      >
        {isActive && (
          <View
            style={[styles.activeBadge, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[styles.activeBadgeText, { color: colors.background }]}
            >
              {t("active")}
            </Text>
          </View>
        )}
        <View style={styles.planHeader}>
          <Text style={[styles.planName, { color: colors.text }]}>
            {item.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {item.price.toLocaleString()} {item.currency}
            </Text>
            <Text style={[styles.duration, { color: colors.textSecondary }]}>
              {isMonthly
                ? t("perMonth")
                : isYearly
                ? t("perYear")
                : `/${item.durationDays} ${t("days")}`}
            </Text>
          </View>
        </View>
        {item.description ? (
          <Text
            style={[styles.planDescription, { color: colors.textSecondary }]}
          >
            {item.description}
          </Text>
        ) : null}
        {featureList.length > 0 && (
          <View style={styles.featuresContainer}>
            {featureList.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={12}
                  color={colors.primary}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={[styles.viewDetails, { color: colors.primary }]}>
            {t("viewDetails")}
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <Header
      title={t("subscriptions")}
      showBackButton
      onBackPress={() => router.back()}
    />
  );

  return (
    <Layout header={header} showFooterTabs={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {mySubscription && (
              <View
                style={[
                  styles.currentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary + "40",
                  },
                ]}
              >
                <View style={styles.currentHeader}>
                  <View style={styles.currentInfo}>
                    <View
                      style={[
                        styles.currentBadge,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={12}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.currentBadgeText,
                          { color: colors.primary },
                        ]}
                      >
                        {t("active")}
                      </Text>
                    </View>
                    <Text style={[styles.currentPlan, { color: colors.text }]}>
                      {(subscription as UserSubscription)?.Plan?.name || ""}
                    </Text>
                    <Text
                      style={[
                        styles.currentDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("expiresOn")}{" "}
                      {new Date(
                        (subscription as UserSubscription).endDate
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.manageButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() =>
                      router.push("/subscriptions/my-subscription")
                    }
                  >
                    <Text
                      style={[
                        styles.manageButtonText,
                        { color: colors.background },
                      ]}
                    >
                      {t("manage")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <FlatList
              data={plans}
              renderItem={renderPlan}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <IconSymbol
                    name="star.fill"
                    size={40}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    {t("noPlansAvailable")}
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 12,
  },
  currentCard: {
    margin: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  currentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  currentInfo: {
    flex: 1,
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  currentPlan: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  currentDate: {
    fontSize: 11,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  planCard: {
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    position: "relative",
  },
  activeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  planHeader: {
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
  duration: {
    fontSize: 12,
  },
  planDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  featuresContainer: {
    marginBottom: 8,
    gap: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  viewDetails: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
});
