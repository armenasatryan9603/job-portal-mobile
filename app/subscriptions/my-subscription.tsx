import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BorderRadius, ThemeColors } from "@/constants/styles";
import React, { useEffect, useState } from "react";
import { useCancelSubscription, useMySubscription, useRenewSubscription } from "@/hooks/useApi";

import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import type { UserSubscription } from "@/categories/api";
import { router } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

export default function MySubscriptionScreen() {
  useAnalytics("MySubscription");
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const {
    data: subscriptionData,
    isLoading: loading,
    error: subscriptionError,
  } = useMySubscription();
  const cancelMutation = useCancelSubscription();
  const renewMutation = useRenewSubscription();

  const subscription = subscriptionData as UserSubscription | null | undefined;

  useEffect(() => {
    if (
      subscriptionError &&
      (subscriptionError as any)?.message &&
      !(subscriptionError as any)?.message.includes("end of input")
    ) {
      Alert.alert(
        t("error"),
        (subscriptionError as any)?.message || t("failedToLoadSubscription")
      );
    }
  }, [subscriptionError]);

  const handleCancel = () => {
    if (!subscription) return;

    Alert.alert(
      t("cancelSubscription") || "Cancel Subscription",
      t("cancelSubscriptionConfirm") ||
        "Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.",
      [
        {
          text: t("no") || "No",
          style: "cancel",
        },
        {
          text: t("yes") || "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync(subscription.id);
              Alert.alert(
                t("success") || "Success",
                t("subscriptionCancelled") ||
                  "Your subscription has been cancelled.",
                [
                  {
                    text: t("ok") || "OK",
                  },
                ]
              );
            } catch (error: any) {
              console.error("Error cancelling subscription:", error);
              Alert.alert(
                t("error"),
                error.message || t("failedToCancelSubscription")
              );
            }
          },
        },
      ]
    );
  };

  const handleRenew = async () => {
    if (!subscription) return;

    const endDate = new Date(subscription.endDate);
    const daysRemaining = Math.ceil(
      (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let confirmMessage = "";
    if (daysRemaining > 0) {
      confirmMessage = `Renew your subscription now? It will be extended by ${subscription.Plan?.durationDays || 30} days from the current end date (${endDate.toLocaleDateString()}).`;
    } else {
      confirmMessage = `Renew your expired subscription? It will be activated for ${subscription.Plan?.durationDays || 30} days from today.`;
    }

    Alert.alert(
      t("renewSubscription") || "Renew Subscription",
      confirmMessage,
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("renew") || "Renew",
          onPress: async () => {
            try {
              const result = await renewMutation.mutateAsync({
                subscriptionId: subscription.id,
              });
              Alert.alert(
                t("success") || "Success",
                t("subscriptionRenewed") ||
                  `Your subscription has been renewed! It will now expire on ${new Date(result.subscription?.endDate || subscription.endDate).toLocaleDateString()}.`,
                [
                  {
                    text: t("ok") || "OK",
                  },
                ]
              );
            } catch (error: any) {
              console.error("Error renewing subscription:", error);
              let errorMessage = error.message || t("failedToRenewSubscription");
              
              // Handle insufficient credits error
              if (error.code === "INSUFFICIENT_CREDITS" || errorMessage.includes("credits")) {
                errorMessage = `${errorMessage}\n\nRequired: ${error.required || 0} credits\nAvailable: ${error.available || 0} credits`;
                Alert.alert(
                  t("insufficientCredits") || "Insufficient Credits",
                  errorMessage,
                  [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("addCredits") || "Add Credits",
                      onPress: () => router.push("/profile/add-credits" as any),
                    },
                  ]
                );
              } else {
                Alert.alert(t("error"), errorMessage);
              }
            }
          },
        },
      ]
    );
  };

  const header = (
    <Header
      title={t("mySubscription") || "My Subscription"}
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
      <Layout showFooterTabs={false}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  if (!subscription) {
    return (
      <Layout header={header} showFooterTabs={false}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <IconSymbol name="star.fill" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("noActiveSubscription") || "No Active Subscription"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("noActiveSubscriptionDescription") ||
                "You don't have an active subscription. Browse our plans to get started."}
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => router.push("/subscriptions")}
            >
              <Text
                style={[styles.primaryButtonText, { color: colors.background }]}
              >
                {t("browsePlans") || "Browse Plans"}
              </Text>
              <IconSymbol
                name="chevron.right"
                size={14}
                color={colors.background}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Layout>
    );
  }

  const endDate = new Date(subscription.endDate);
  const startDate = new Date(subscription.startDate);
  const isActive = subscription.status === "active";
  const daysRemaining = Math.ceil(
    (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

  const features = subscription.Plan?.features || {};
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
        {/* Compact Header */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.planHeader}>
              <Badge
                text={isActive ? t("active") : subscription.status}
                variant={isActive ? "success" : "warning"}
                size="md"
              />
              <Text style={[styles.planName, { color: colors.text }]}>
                {subscription.Plan?.name || ""}
              </Text>
            </View>
            {isExpiringSoon && (
              <View
                style={[
                  styles.expiringBadge,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text style={[styles.expiringText, { color: colors.primary }]}>
                  {daysRemaining}d
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Compact Info Row */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <IconSymbol
                name="calendar"
                size={14}
                color={colors.textSecondary}
              />
              <View style={styles.infoText}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  {t("startDate") || "Start"}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {startDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.infoItem}>
              <IconSymbol
                name="calendar"
                size={14}
                color={colors.textSecondary}
              />
              <View style={styles.infoText}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  {t("endDate") || "End"}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {endDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>

            {isActive && (
              <>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <View style={styles.infoItem}>
                  <IconSymbol
                    name="clock.fill"
                    size={14}
                    color={colors.primary}
                  />
                  <View style={styles.infoText}>
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t("daysRemaining") || "Left"}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.primary }]}>
                      {daysRemaining}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Compact Features */}
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
            <View style={styles.featuresGrid}>
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
          </View>
        )}

        {/* Expiring Banner */}
        {isExpiringSoon && (
          <TouchableOpacity
            style={[
              styles.expiringBanner,
              { backgroundColor: colors.primary + "15" },
            ]}
            onPress={() => {
              router.push({
                pathname: "/subscriptions/[id]",
                params: { id: subscription.planId.toString() },
              });
            }}
          >
            <IconSymbol
              name="info.circle.fill"
              size={14}
              color={colors.primary}
            />
            <Text
              style={[styles.expiringBannerText, { color: colors.primary }]}
            >
              {t("subscriptionExpiringSoon")
                ? t("subscriptionExpiringSoon").replace(
                    "{days}",
                    daysRemaining.toString()
                  )
                : `Expires in ${daysRemaining} days`}
            </Text>
            <IconSymbol name="chevron.right" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Compact Actions */}
        <View style={styles.actionsContainer}>
          {(isActive && isExpiringSoon) || (subscription && (subscription.status === "expired" || new Date(subscription.endDate) < new Date())) ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleRenew}
              disabled={renewMutation.isPending}
            >
              {renewMutation.isPending ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text
                  style={[styles.primaryButtonText, { color: colors.background }]}
                >
                  {t("renewNow") || "Renew Now"}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          <View style={styles.actionRow}>
            {isActive && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border, flex: 1 },
                ]}
                onPress={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator color={colors.errorVariant} size="small" />
                ) : (
                  <>
                    <IconSymbol name="xmark" size={14} color={colors.errorVariant} />
                    <Text
                      style={[styles.secondaryButtonText, { color: colors.errorVariant }]}
                    >
                      {t("cancelSubscription") || "Cancel"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: colors.border, flex: 1 },
              ]}
              onPress={() => router.push("/subscriptions")}
            >
              <IconSymbol name="star.fill" size={14} color={colors.primary} />
              <Text
                style={[styles.secondaryButtonText, { color: colors.primary }]}
              >
                {t("browseOtherPlans") || "Browse"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.round,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
    paddingHorizontal: 24,
  },
  headerCard: {
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planHeader: {
    flex: 1,
  },
  expiringBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  expiringText: {
    fontSize: 11,
    fontWeight: "700",
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoCard: {
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  featuresCard: {
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    minWidth: "48%",
  },
  featureText: {
    fontSize: 11,
    flex: 1,
  },
  expiringBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  expiringBannerText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  actionsContainer: {
    gap: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
