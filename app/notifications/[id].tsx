import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useMemo } from "react";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNotifications, useMarkNotificationAsRead } from "@/hooks/useApi";

interface NotificationDetail {
  id: string;
  title: string;
  message: string;
  fullContent: string;
  timestamp: string;
  isRead: boolean;
  type:
    | "order"
    | "new_order"
    | "proposal"
    | "message"
    | "system"
    | "chat_message";
  relatedData?: any;
}

export default function NotificationDetailScreen() {
  useAnalytics("NotificationDetail");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();
  const { id: idParam } = useLocalSearchParams();
  const notificationId = Array.isArray(idParam) ? idParam[0] : idParam;

  // Use TanStack Query to get notifications
  const { data: notificationsData, isLoading, isFetching } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();

  // Find the notification from TanStack Query cache
  const notificationData = useMemo(() => {
    if (!notificationId || !notificationsData?.notifications) return null;
    return notificationsData.notifications.find((n) => n.id === notificationId);
  }, [notificationId, notificationsData]);

  // Check if we're still loading (only show loading when we have no data at all)
  // isFetching alone means we're refetching but have cached data, so don't show loading
  const isLoadingNotification = isLoading;

  // Mark as read when screen is focused and notification is unread
  useFocusEffect(
    React.useCallback(() => {
      if (notificationData && !notificationData.isRead && notificationId) {
        // Only mark as read if mutation is not already in progress
        if (!markAsReadMutation.isPending) {
          markAsReadMutation.mutate(notificationId);
        }
      }
    }, [notificationData?.isRead, notificationId, markAsReadMutation])
  );

  // Convert to detail format
  const notification: NotificationDetail | null = useMemo(() => {
    if (!notificationData) return null;
    return {
      id: notificationData.id,
      title: notificationData.title,
      message: notificationData.message,
      fullContent: notificationData.message,
      timestamp: notificationData.timestamp,
      isRead: true, // Mark as read since we're viewing it
      type: notificationData.type as any,
      relatedData: {
        type: notificationData.type,
      },
    };
  }, [notificationData]);

  const header = (
    <Header
      title={t("notificationDetails")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "proposal":
        return "doc.text.fill";
      case "order":
      case "new_order":
        return "briefcase.fill";
      case "message":
        return "message.fill";
      case "system":
        return "gear.circle.fill";
      default:
        return "bell.fill";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "proposal":
        return "#007AFF";
      case "order":
      case "new_order":
        return "#34C759";
      case "message":
        return "#FF9500";
      case "system":
        return "#8E8E93";
      default:
        return colors.primary;
    }
  };

  const handleAction = () => {
    if (!notification) return;

    // Track notification action
    AnalyticsService.getInstance().logEvent("notification_action_clicked", {
      notification_id: notification.id,
      notification_type: notification.type,
      action_type: notification.type,
    });

    switch (notification.type) {
      case "proposal":
        router.push(
          `/orders/${notification.relatedData?.projectId || "1"}/proposals`
        );
        break;
      case "order":
      case "new_order":
        // For new_order notifications, use orderId from relatedData
        const orderId = notification.relatedData?.orderId || notification.id;
        router.push(`/orders/${orderId}`);
        break;
      case "message":
        router.push("/chat");
        break;
      case "system":
        // Navigate to profile or home
        router.back();
        break;
    }
  };

  const getActionButtonText = () => {
    if (!notification) return t("viewDetails");

    switch (notification.type) {
      case "proposal":
        return t("viewProposal");
      case "order":
      case "new_order":
        return t("viewOrder");
      case "message":
        return t("replyMessage");
      case "system":
        return t("learnMore");
      default:
        return t("viewDetails");
    }
  };

  // Show loading state while fetching
  if (isLoadingNotification) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <IconSymbol name="hourglass" size={32} color={colors.tabIconDefault} />
          <Text style={[styles.errorText, { color: colors.textSecondary, marginTop: 12 }]}>
            {t("loading") || "Loading..."}
          </Text>
        </View>
      </Layout>
    );
  }

  // Only show "not found" after data has loaded
  if (!notification) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.circle" size={32} color={colors.tabIconDefault} />
          <Text style={[styles.errorText, { color: colors.text, marginTop: 12 }]}>
            {t("notificationNotFound")}
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ResponsiveCard>
          <View style={styles.notificationHeader}>
            <View
              style={[
                styles.notificationIcon,
                {
                  backgroundColor:
                    getNotificationColor(notification.type) + "20",
                },
              ]}
            >
              <IconSymbol
                name={getNotificationIcon(notification.type) as any}
                size={24}
                color={getNotificationColor(notification.type)}
              />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>
                {notification.title}
              </Text>
              <Text
                style={[
                  styles.notificationTime,
                  { color: colors.tabIconDefault },
                ]}
              >
                {notification.timestamp}
              </Text>
            </View>
          </View>

          <View style={styles.contentSection}>
            <Text style={[styles.contentTitle, { color: colors.text }]}>
              {t("message")}
            </Text>
            <Text style={[styles.contentText, { color: colors.textSecondary }]}>
              {notification.fullContent}
            </Text>
          </View>

          {notification.relatedData && (
            <View style={styles.relatedDataSection}>
              <Text style={[styles.relatedDataTitle, { color: colors.text }]}>
                {t("relatedInformation")}
              </Text>
              <View style={styles.relatedDataContent}>
                {Object.entries(notification.relatedData).map(
                  ([key, value]) => (
                    <View key={key} style={styles.relatedDataItem}>
                      <Text
                        style={[
                          styles.relatedDataKey,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                        :
                      </Text>
                      <Text
                        style={[
                          styles.relatedDataValue,
                          { color: colors.text },
                        ]}
                      >
                        {Array.isArray(value)
                          ? value.join(", ")
                          : String(value ?? "")}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleAction}
          >
            <Text style={styles.actionButtonText}>{getActionButtonText()}</Text>
            <IconSymbol name="arrow.right" size={16} color="white" />
          </TouchableOpacity>
        </ResponsiveCard>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 14,
  },
  contentSection: {
    marginBottom: 24,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  relatedDataSection: {
    marginBottom: 24,
  },
  relatedDataTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  relatedDataContent: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 16,
  },
  relatedDataItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  relatedDataKey: {
    fontSize: 14,
    fontWeight: "500",
    width: 120,
  },
  relatedDataValue: {
    fontSize: 14,
    flex: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
