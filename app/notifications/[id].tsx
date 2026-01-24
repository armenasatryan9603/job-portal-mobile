import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMarkNotificationAsRead, useNotifications } from "@/hooks/useApi";

import AnalyticsService from "@/categories/AnalyticsService";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { NotificationDetailSkeleton } from "@/components/NotificationDetailSkeleton";
import { ThemeColors } from "@/constants/styles";
import { formatTimestamp } from "@/utils/dateFormatting";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

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
        return colors.link;
      case "order":
      case "new_order":
        return colors.openNow;
      case "message":
        return colors.orange;
      case "system":
        return colors.iosGray;
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
    return <NotificationDetailSkeleton header={header} />;
  }

  // Only show "not found" after data has loaded
  if (!notification) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <IconSymbol
            name="exclamationmark.circle"
            size={32}
            color={colors.tabIconDefault}
          />
          <Text
            style={[styles.errorText, { color: colors.text, marginTop: 12 }]}
          >
            {t("notificationNotFound")}
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationIconContainer}>
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor:
                      getNotificationColor(notification.type) + "15",
                  },
                ]}
              >
                <IconSymbol
                  name={getNotificationIcon(notification.type) as any}
                  size={22}
                  color={getNotificationColor(notification.type)}
                />
              </View>
            </View>
            <View style={styles.notificationInfo}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>
                {notification.title}
              </Text>
              <Text
                style={[
                  styles.notificationTime,
                  { color: colors.textTertiary },
                ]}
              >
                {formatTimestamp(notification.timestamp, t, { includeSpace: true })}
              </Text>
            </View>
          </View>

          <View style={styles.contentSection}>
            <Text style={[styles.contentText, { color: colors.text }]}>
              {notification.fullContent}
            </Text>
          </View>

          {notification.relatedData && Object.keys(notification.relatedData).length > 1 && (
            <View style={styles.relatedDataSection}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {Object.entries(notification.relatedData)
                .filter(([key]) => key !== "type")
                .map(([key, value], index, array) => (
                  <View
                    key={key}
                    style={[
                      styles.relatedDataItem,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: index < array.length - 1 ? 0.5 : 0,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.relatedDataKey,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
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
                ))}
            </View>
          )}

          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleAction}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>{getActionButtonText()}</Text>
              <IconSymbol name="arrow.right" size={18} color={'#FFFFFF'} />
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
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
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
    marginBottom: 24,
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  notificationTime: {
    fontSize: 14,
    fontWeight: "400",
  },
  contentSection: {
    marginBottom: 32,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: -0.1,
  },
  divider: {
    height: 0.5,
    marginBottom: 20,
  },
  relatedDataSection: {
    marginBottom: 32,
  },
  relatedDataItem: {
    flexDirection: "row",
    paddingBottom: 16,
    marginBottom: 16,
  },
  relatedDataKey: {
    fontSize: 14,
    fontWeight: "500",
    width: 120,
    marginRight: 12,
  },
  relatedDataValue: {
    fontSize: 14,
    flex: 1,
    fontWeight: "400",
  },
  actionButtonContainer: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
