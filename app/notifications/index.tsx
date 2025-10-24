import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
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
  type: "order" | "proposal" | "message" | "system";
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useLanguage();
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
    // Mark as read if unread
    if (!notification.isRead) {
      await NotificationService.getInstance().markAsRead(notification.id);
      await loadNotifications(); // Refresh the list
      await refreshNotificationCount(); // Refresh the badge count
    }

    // Navigate to notification detail
    router.push(`/notifications/${notification.id}`);
  };

  const markAllAsRead = async () => {
    await NotificationService.getInstance().markAllAsRead();
    await loadNotifications(); // Refresh the list
    await refreshNotificationCount(); // Refresh the badge count
  };

  const clearAllNotifications = async () => {
    await NotificationService.getInstance().clearAllNotifications();
    await loadNotifications(); // Refresh the list
    await refreshNotificationCount(); // Refresh the badge count
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        !item.isRead && {
          backgroundColor: colors.primary + "10",
        },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: getNotificationColor(item.type) + "20" },
          ]}
        >
          <IconSymbol
            name={getNotificationIcon(item.type) as any}
            size={20}
            color={getNotificationColor(item.type)}
          />
        </View>
        <View style={styles.notificationText}>
          <Text
            style={[
              styles.notificationTitle,
              { color: colors.text },
              !item.isRead && styles.unreadText,
            ]}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.notificationMessage,
              { color: colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text
            style={[styles.notificationTime, { color: colors.tabIconDefault }]}
          >
            {item.timestamp}
          </Text>
        </View>
        {!item.isRead && (
          <View
            style={[styles.unreadDot, { backgroundColor: colors.primary }]}
          />
        )}
      </View>
    </TouchableOpacity>
  );

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-end",
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
    paddingBottom: 20,
  },
  notificationItem: {
    borderBottomWidth: 1,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadText: {
    fontWeight: "600",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
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
