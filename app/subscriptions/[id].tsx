import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors, BorderRadius } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { useSubscriptionPlan, usePurchaseSubscription } from "@/hooks/useApi";
import type { SubscriptionPlan } from "@/services/api";

export default function SubscriptionDetailScreen() {
  useAnalytics("SubscriptionDetail");
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const planId = id ? parseInt(id as string, 10) : null;
  const {
    data: planData,
    isLoading: loading,
    error: planError,
  } = useSubscriptionPlan(planId);
  const purchaseMutation = usePurchaseSubscription();

  useEffect(() => {
    if (planError) {
      Alert.alert(
        t("error"),
        (planError as any)?.message || t("failedToLoadPlan")
      );
      router.back();
    }
  }, [planError]);

  const handlePurchase = async () => {
    if (!planData) return;
    const plan = planData as unknown as SubscriptionPlan;

    try {
      const result = await purchaseMutation.mutateAsync({
        planId: plan.id,
      });

      // If successful, subscription is already activated (credits deducted)
      if (result.success) {
        Alert.alert(
          t("success"),
          t("subscriptionActivated") || "Subscription activated successfully",
          [
            {
              text: t("ok"),
              onPress: () => router.replace("/subscriptions/my-subscription"),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Error purchasing subscription:", error);

      // Check if it's an insufficient credits error
      if (
        error?.response?.data?.code === "INSUFFICIENT_CREDITS" ||
        error?.code === "INSUFFICIENT_CREDITS"
      ) {
        Alert.alert(t("insufficientCredits"), t("pleaseRefillCredits"), [
          {
            text: t("cancel") || "Cancel",
            style: "cancel",
          },
          {
            text: t("refill") || "Refill Credits",
            onPress: () => router.push("/profile/refill-credits"),
          },
        ]);
      } else {
        // Other errors
        Alert.alert(
          t("error"),
          error?.response?.data?.message ||
            error?.message ||
            t("failedToPurchaseSubscription")
        );
      }
    }
  };

  const header = (
    <Header
      title={
        (planData as SubscriptionPlan | undefined)?.name || t("subscription")
      }
      showBackButton
      onBackPress={() => router.back()}
      showNotificationsButton={isAuthenticated}
      showChatButton={isAuthenticated}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  );

  if (loading) {
    return (
      <Layout header={header} showFooterTabs={false}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  if (!planData) {
    return null;
  }

  const plan = planData as unknown as SubscriptionPlan;
  const isMonthly = plan.durationDays === 30;
  const isYearly = plan.durationDays === 365;
  const features = plan.features || {};
  const featureList = [
    features.unlimitedApplications && t("unlimitedApplications"),
    features.prioritySupport && t("prioritySupport"),
    features.advancedFilters && t("advancedFilters"),
    features.featuredProfile && t("featuredProfile"),
  ].filter(Boolean);

  return (
    <Layout header={header} showFooterTabs={false}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Header */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.planName, { color: colors.text }]}>
            {plan.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {plan.price.toLocaleString()} {plan.currency}
            </Text>
            <Text style={[styles.duration, { color: colors.textSecondary }]}>
              {isMonthly
                ? t("perMonth")
                : isYearly
                ? t("perYear")
                : `/${plan.durationDays} ${t("days")}`}
            </Text>
          </View>
          {plan.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {plan.description}
            </Text>
          ) : null}
        </View>

        {/* Features */}
        {featureList.length > 0 && (
          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("features")}
            </Text>
            <View style={styles.featuresList}>
              {featureList.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info Note */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.primary + "08",
              borderColor: colors.primary + "20",
            },
          ]}
        >
          <IconSymbol
            name="info.circle.fill"
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t("manualRenewalNote")}
          </Text>
        </View>

        {/* Purchase Button */}
        <Button
          variant="primary"
          icon="star.fill"
          iconSize={14}
          backgroundColor={colors.primary}
          onPress={handlePurchase}
          disabled={purchaseMutation.isPending}
          loading={purchaseMutation.isPending}
          title={`${t("purchase")} - ${plan.price.toLocaleString()} ${
            plan.currency
          }`}
        />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  planCard: {
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
  },
  duration: {
    fontSize: 13,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
  featuresCard: {
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: BorderRadius.md,
    marginTop: 4,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  purchaseButtonPrice: {
    fontSize: 13,
    opacity: 0.9,
  },
});
