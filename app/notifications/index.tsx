import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Spacing, ThemeColors } from "@/constants/styles";
import { router, useFocusEffect } from "expo-router";
import {
  useClearAllNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/useApi";

import AnalyticsService from "@/categories/AnalyticsService";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { NotificationSkeleton } from "@/components/NotificationSkeleton";
import React from "react";
import { formatTimestamp } from "@/utils/dateFormatting";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

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

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: "order" | "new_order" | "proposal" | "message" | "system";
}

export default function NotificationsScreen() {
  useAnalytics("Notifications");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();

  // Use TanStack Query hooks
  const {
    data: notificationsData,
    isLoading: loading,
    refetch,
  } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const clearAllMutation = useClearAllNotifications();

  const notifications = notificationsData?.notifications || [];

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

  // Refetch notifications when screen is focused to get new notifications
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const header = (
    <Header
      title={t("notifications")}
      subtitle={`${unreadCount} ${t("unreadNotifications")}`}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const handleNotificationPress = async (notification: Notification) => {
    // Track notification view
    AnalyticsService.getInstance().logEvent("notification_viewed", {
      notification_id: notification.id,
      notification_type: notification.type,
    });

    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id, {
        onSuccess: () => {
          AnalyticsService.getInstance().logEvent("notification_marked_read", {
            notification_id: notification.id,
          });
        },
      });
    }

    // Navigate to notification detail
    router.push(`/notifications/${notification.id}`);
  };

  const markAllAsRead = () => {
    AnalyticsService.getInstance().logEvent("notifications_marked_all_read");
    markAllAsReadMutation.mutate(undefined);
  };

  const clearAllNotifications = () => {
    AnalyticsService.getInstance().logEvent("notifications_cleared_all");
    clearAllMutation.mutate(undefined);
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconColor = getNotificationColor(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            borderBottomColor: colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationIconContainer}>
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: iconColor + "15",
                },
              ]}
            >
              <IconSymbol
                name={getNotificationIcon(item.type) as any}
                size={22}
                color={iconColor}
              />
            </View>
            {isUnread && (
              <View
                style={[
                  styles.unreadDot,
                  {
                    backgroundColor: iconColor,
                    borderColor: isDark ? colors.background : "#FFFFFF",
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.notificationTextContainer}>
            <View style={styles.notificationHeader}>
              <Text
                style={[
                  styles.notificationTitle,
                  { color: colors.text },
                  isUnread && styles.unreadText,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title}
              </Text>
              <Text
                style={[styles.notificationTime, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {formatTimestamp(item.timestamp, t, { includeSpace: true })}
              </Text>
            </View>
            <Text
              style={[
                styles.notificationMessage,
                {
                  color: isUnread ? colors.text : colors.textTertiary,
                },
                isUnread && styles.unreadMessage,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.message}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading state with skeleton loaders
  if (loading) {
    return <NotificationSkeleton header={header} />;
  }

  // Show empty state
  if (notifications.length === 0) {
    return (
      <Layout header={header}>
        <View
          style={[
            styles.emptyContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <IconSymbol name="bell" size={48} color={colors.tabIconDefault} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t("noNotifications")}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.tabIconDefault }]}>
            {t("noNotificationsDesc")}
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <View style={styles.container}>
        {notifications.length > 0 && (
          <View style={styles.markAllContainer}>
            <TouchableOpacity
              style={[styles.markAllButton, { borderColor: colors.border }]}
              onPress={markAllAsRead}
            >
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                {t("markAllAsRead")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.markAllButton,
                { borderColor: colors.border, marginLeft: 10 },
              ]}
              onPress={clearAllNotifications}
            >
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                {t("clearAll")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 80,
  },
  markAllContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 24,
  },
  notificationItem: {
    borderBottomWidth: 0.5,
    paddingVertical: 0,
    marginHorizontal: Spacing.md,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  notificationIconContainer: {
    position: "relative",
    marginRight: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "transparent",
  },
  notificationTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.2,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: -0.1,
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 13,
    fontWeight: "400",
    marginLeft: 8,
  },
  unreadText: {
    fontWeight: "700",
  },
  unreadMessage: {
    fontWeight: "500",
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    minWidth: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
});
