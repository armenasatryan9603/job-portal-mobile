import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import NotificationService from "@/services/NotificationService";

interface NotificationDetail {
  id: string;
  title: string;
  message: string;
  fullContent: string;
  timestamp: string;
  isRead: boolean;
  type: "order" | "new_order" | "proposal" | "message" | "system";
  relatedData?: any;
}

export default function NotificationDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const { t } = useTranslation();
  const { refreshNotificationCount } = useUnreadCount();
  const { id } = useLocalSearchParams();

  const [notification, setNotification] = useState<NotificationDetail | null>(
    null
  );

  // Load real notification data
  useEffect(() => {
    const loadNotification = async () => {
      try {
        const notifications =
          await NotificationService.getInstance().getStoredNotifications();
        const notificationData = notifications.find((n) => n.id === id);

        if (notificationData) {
          // Mark as read if not already read
          if (!notificationData.isRead) {
            await NotificationService.getInstance().markAsRead(
              notificationData.id
            );
            await refreshNotificationCount(); // Refresh the badge count
          }

          // Convert to detail format
          const detailNotification: NotificationDetail = {
            id: notificationData.id,
            title: notificationData.title,
            message: notificationData.message,
            fullContent: notificationData.message, // Use message as full content for now
            timestamp: notificationData.timestamp,
            isRead: true, // Mark as read since we just read it
            type: notificationData.type,
            relatedData: {
              // Add any related data based on type
              type: notificationData.type,
            },
          };

          setNotification(detailNotification);
        }
      } catch (error) {
        console.error("Error loading notification:", error);
      }
    };

    if (id) {
      loadNotification();
    }
  }, [id, refreshNotificationCount]);

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

  if (!notification) {
    return (
      <Layout header={header}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
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
