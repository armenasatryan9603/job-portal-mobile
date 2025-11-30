import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import NotificationService from "@/services/NotificationService";

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
  const { refreshNotificationCount } = useUnreadCount();

  // Real notifications data from Firebase
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const stored =
        await NotificationService.getInstance().getStoredNotifications();
      setNotifications(stored);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const header = (
    <Header
      title={t("notifications")}
      subtitle={`${unreadCount} ${t("unreadNotifications")}`}
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

  const handleNotificationPress = async (notification: Notification) => {
    // Track notification view
    AnalyticsService.getInstance().logEvent("notification_viewed", {
      notification_id: notification.id,
      notification_type: notification.type,
    });

    // Mark as read if unread
    if (!notification.isRead) {
      await NotificationService.getInstance().markAsRead(notification.id);
      AnalyticsService.getInstance().logEvent("notification_marked_read", {
        notification_id: notification.id,
      });
      await loadNotifications(); // Refresh the list
      await refreshNotificationCount(); // Refresh the badge count
    }

    // Navigate to notification detail
    router.push(`/notifications/${notification.id}`);
  };

  const markAllAsRead = async () => {
    AnalyticsService.getInstance().logEvent("notifications_marked_all_read");
    await NotificationService.getInstance().markAllAsRead();
    await loadNotifications(); // Refresh the list
    await refreshNotificationCount(); // Refresh the badge count
  };

  const clearAllNotifications = async () => {
    AnalyticsService.getInstance().logEvent("notifications_cleared_all");
    await NotificationService.getInstance().clearAllNotifications();
    await loadNotifications(); // Refresh the list
    await refreshNotificationCount(); // Refresh the badge count
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconColor = getNotificationColor(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: colors.surface,
            borderLeftColor: isUnread ? iconColor : "transparent",
            shadowColor: "#000",
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.6}
      >
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.notificationIconContainer,
              {
                backgroundColor: iconColor + (isUnread ? "20" : "10"),
                borderWidth: isUnread ? 2 : 0,
                borderColor: iconColor + "40",
              },
            ]}
          >
            <IconSymbol
              name={getNotificationIcon(item.type) as any}
              size={24}
              color={iconColor}
            />
          </View>
          <View style={styles.notificationTextContainer}>
            <View style={styles.notificationHeader}>
              <View style={styles.titleContainer}>
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
                {isUnread && (
                  <View
                    style={[styles.unreadBadge, { backgroundColor: iconColor }]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.notificationTime,
                  { color: colors.tabIconDefault },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.timestamp}
              </Text>
            </View>
            <Text
              style={[
                styles.notificationMessage,
                { color: colors.textSecondary },
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

  // Show loading state
  if (loading) {
    return (
      <Layout header={header}>
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loadingNotifications")}
          </Text>
        </View>
      </Layout>
    );
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  notificationItem: {
    marginBottom: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    paddingLeft: 16,
  },
  notificationIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  notificationTextContainer: {
    flex: 1,
    paddingRight: 4,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 24,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  notificationMessage: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.75,
    letterSpacing: -0.1,
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "500",
    letterSpacing: 0.1,
    textAlign: "right",
    minWidth: 60,
  },
  unreadText: {
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    minWidth: 8,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
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
