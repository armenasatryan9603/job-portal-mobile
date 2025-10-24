import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase messaging import with fallback for development
let messaging: any = null;
try {
  messaging = require("@react-native-firebase/messaging").default;
  console.log("✅ Firebase messaging loaded successfully");
} catch (error) {
  // @ts-ignore
  console.warn("❌ Firebase messaging not available:", error.message);
  console.warn("Using local storage only");
}

export type NotificationType = "order" | "proposal" | "message" | "system";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: NotificationType;
}

interface RemoteMessage {
  messageId?: string;
  notification?: {
    title?: string;
    body?: string;
  };
  data?: {
    type?: NotificationType;
    relatedId?: string;
  };
}

class NotificationService {
  private static instance: NotificationService;
  private readonly STORAGE_KEY = "notifications";
  private readonly MAX_NOTIFICATIONS = 100;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      if (!messaging) {
        console.warn(
          "Firebase messaging not available, using local storage only"
        );
        return;
      }

      // Auto-registration is enabled in firebase.json, no manual registration needed
      console.log("✅ Remote message registration handled automatically");

      await this.requestPermissions();
      this.configureNotificationHandlers();

      // Get FCM token and send to backend
      const token = await this.getFCMToken();
      if (token) {
        console.log("🔔 FCM Token obtained:", token);
        // Send token to backend
        await this.sendFCMTokenToBackend(token);
      }

      console.log("NotificationService initialized successfully");
    } catch (error) {
      console.error("Error initializing NotificationService:", error);
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (!messaging) return false;

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log("Notification permission granted");
      } else {
        console.log("Notification permission denied");
      }

      return enabled;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  }

  private configureNotificationHandlers(): void {
    if (!messaging) return;

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage: RemoteMessage) => {
      console.log("Foreground message received:", remoteMessage);
      await this.handleNotification(remoteMessage);
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(
      async (remoteMessage: RemoteMessage) => {
        console.log("Background message received:", remoteMessage);
        await this.handleNotification(remoteMessage);
      }
    );

    // Handle notification taps when app is in background
    messaging().onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
      console.log("Notification opened app:", remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Handle app launch from notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage: RemoteMessage | null) => {
        if (remoteMessage) {
          console.log("App launched from notification:", remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });
  }

  private async handleNotification(
    remoteMessage: RemoteMessage
  ): Promise<void> {
    try {
      const notification: Notification = {
        id: remoteMessage.messageId || `local_${Date.now()}`,
        title: remoteMessage.notification?.title || "New Notification",
        message: remoteMessage.notification?.body || "",
        timestamp: new Date().toLocaleString(),
        isRead: false,
        type: remoteMessage.data?.type || "system",
      };

      await this.saveNotification(notification);
      console.log("Notification saved:", notification);
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  }

  async saveNotification(notification: Notification): Promise<void> {
    try {
      const existing = await this.getStoredNotifications();
      const updated = [notification, ...existing].slice(
        0,
        this.MAX_NOTIFICATIONS
      );
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      console.log("Notification saved to storage");
    } catch (error) {
      console.error("Error saving notification:", error);
    }
  }

  async getStoredNotifications(): Promise<Notification[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const notifications = stored ? JSON.parse(stored) : [];
      console.log(
        `Retrieved ${notifications.length} notifications from storage`
      );
      return notifications;
    } catch (error) {
      console.error("Error getting stored notifications:", error);
      return [];
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      console.log(`Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      console.log("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      console.log(`Unread notifications count: ${unreadCount}`);
      return unreadCount;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.filter((n) => n.id !== notificationId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      console.log(`Notification ${notificationId} deleted`);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log("All notifications cleared");
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }

  // Method to clear only test/sample notifications
  async clearTestNotifications(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const filtered = notifications.filter(
        (n) => !n.id.startsWith("sample_") && !n.id.startsWith("test_")
      );
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log("Test notifications cleared");
    } catch (error) {
      console.error("Error clearing test notifications:", error);
    }
  }

  private handleNotificationTap(remoteMessage: RemoteMessage): void {
    // Handle navigation based on notification type
    const type = remoteMessage.data?.type;
    const relatedId = remoteMessage.data?.relatedId;

    console.log("Handling notification tap:", { type, relatedId });

    // Add your navigation logic here based on notification type
    switch (type) {
      case "order":
        // Navigate to order details
        console.log("Navigate to order:", relatedId);
        break;
      case "proposal":
        // Navigate to proposal details
        console.log("Navigate to proposal:", relatedId);
        break;
      case "message":
        // Navigate to chat
        console.log("Navigate to chat:", relatedId);
        break;
      default:
        // Navigate to notifications list
        console.log("Navigate to notifications list");
        break;
    }
  }

  // Method to get current unread count (for testing)
  async getCurrentUnreadCount(): Promise<number> {
    return await this.getUnreadCount();
  }

  // Send FCM token to backend
  async sendFCMTokenToBackend(token: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/notifications/fcm-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await this.getAuthToken()}`,
          },
          body: JSON.stringify({ fcmToken: token }),
        }
      );

      if (response.ok) {
        console.log("✅ FCM token sent to backend successfully");
      } else {
        console.error(
          "❌ Failed to send FCM token to backend:",
          response.status
        );
      }
    } catch (error) {
      console.error("❌ Error sending FCM token to backend:", error);
    }
  }

  // Get auth token for API requests
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem("authToken");
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  // Method to get FCM token for testing
  async getFCMToken(): Promise<string | null> {
    try {
      if (!messaging) {
        console.warn("Firebase messaging not available");
        return null;
      }

      // First ensure device is registered for remote messages
      try {
        await messaging().registerDeviceForRemoteMessages();
        console.log("✅ Device registered for remote messages");
      } catch (regError: any) {
        // If registration fails due to APS environment, provide helpful message
        if (
          regError.code === "messaging/unknown" &&
          regError.message?.includes("aps-environment")
        ) {
          console.warn("⚠️  Push notifications not properly configured:");
          console.warn(
            "   - Make sure you have the correct aps-environment entitlement"
          );
          console.warn(
            "   - For development: aps-environment should be 'development'"
          );
          console.warn(
            "   - For production: aps-environment should be 'production'"
          );
          console.warn("   - Rebuild your app after updating entitlements");
          return null;
        }
        // For other registration errors, log but continue
        console.warn("Registration warning:", regError.message);
      }

      // Now try to get the token
      try {
        const token = await messaging().getToken();
        console.log("FCM Token:", token);
        return token;
      } catch (tokenError: any) {
        console.error(
          "Error getting FCM token after registration:",
          tokenError
        );
        return null;
      }
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }
}

export default NotificationService;
