import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/config/api";
import * as Notifications from "expo-notifications";

/**
 * NotificationService - Firebase Cloud Messaging (FCM) Only
 *
 * This service uses ONLY Firebase Cloud Messaging for push notifications.
 * Other Firebase services (Storage, Database, Analytics) are NOT used to reduce costs.
 *
 * Firebase Messaging auto-initializes when this module is imported.
 * No explicit Firebase app initialization is needed.
 */
// Firebase messaging import with fallback for development
let messaging: any = null;
try {
  messaging = require("@react-native-firebase/messaging").default;
  console.log("✅ Firebase messaging loaded successfully (FCM only)");
} catch (error) {
  // @ts-ignore
  console.warn("❌ Firebase messaging not available:", error.message);
  console.warn("Using local storage only");
}

export type NotificationType =
  | "order"
  | "new_order"
  | "proposal"
  | "message"
  | "system";

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
      console.log("🔧 Initializing NotificationService...");

      if (!messaging) {
        console.error("❌ Firebase messaging not available!");
        console.error(
          "   - Check if @react-native-firebase/messaging is installed"
        );
        console.error("   - Verify Firebase configuration files exist");
        console.error("   - Rebuild the app: npx expo prebuild --clean");
        console.warn(
          "⚠️ Using local storage only - push notifications won't work"
        );
        return;
      }

      console.log("✅ Firebase messaging module loaded");

      // Auto-registration is enabled in firebase.json, no manual registration needed
      console.log("✅ Remote message registration handled automatically");

      // Request expo-notifications permissions (separate from Firebase permissions)
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log("📱 Expo notifications permission status:", status);
        if (status === "granted") {
          console.log("✅ Expo notifications permission granted");
        } else {
          console.warn("⚠️ Expo notifications permission not granted:", status);
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not request expo notifications permissions:",
          error
        );
      }

      // Ensure Android notification channel exists
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Channel",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
        });
        console.log("✅ Android notification channel created");
      } catch (error) {
        console.warn("⚠️ Could not create notification channel:", error);
      }

      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        console.warn(
          "⚠️ Notification permissions not granted - FCM token may not be available"
        );
      }

      this.configureNotificationHandlers();

      // Try to get FCM token (will work if APNS token is already available)
      // If not available, onTokenRefresh callback will handle it automatically
      console.log("🔍 Attempting to get FCM token...");
      const token = await this.getFCMToken();

      if (token) {
        console.log("═══════════════════════════════════════════════════════");
        console.log("🔔 FCM TOKEN OBTAINED (for testing):");
        console.log("═══════════════════════════════════════════════════════");
        console.log(token);
        console.log("═══════════════════════════════════════════════════════");
        await this.sendFCMTokenToBackend(token);
      } else {
        console.log("ℹ️  FCM token not immediately available");
        console.log(
          "   Will be automatically retrieved when APNS token is ready"
        );
        console.log("   Watch for 'FCM Token refreshed' message in logs");
      }

      console.log("NotificationService initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing NotificationService:", error);
      console.error(
        "Stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (!messaging) {
        console.error(
          "❌ Cannot request permissions - messaging not available"
        );
        return false;
      }

      console.log("🔐 Requesting notification permissions...");
      const authStatus = await messaging().requestPermission();

      console.log("📱 Permission status:", authStatus);
      console.log("   AUTHORIZED =", messaging.AuthorizationStatus.AUTHORIZED);
      console.log(
        "   PROVISIONAL =",
        messaging.AuthorizationStatus.PROVISIONAL
      );
      console.log("   DENIED =", messaging.AuthorizationStatus.DENIED);
      console.log(
        "   NOT_DETERMINED =",
        messaging.AuthorizationStatus.NOT_DETERMINED
      );

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log("✅ Notification permission granted");
      } else {
        console.error("❌ Notification permission denied or not determined");
        console.error("   Status code:", authStatus);
      }

      return enabled;
    } catch (error) {
      console.error("❌ Error requesting notification permissions:", error);
      console.error(
        "   Error details:",
        error instanceof Error ? error.message : String(error)
      );
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

    // Note: Background message handler is registered in app/background-message-handler.ts
    // It must be at the top level, not inside a class

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

    // Listen for FCM token refresh (fires when APNS token becomes available on iOS)
    // This is the primary way to get FCM token on iOS SDK 10.4.0+
    messaging().onTokenRefresh(async (fcmToken: string) => {
      console.log("═══════════════════════════════════════════════════════");
      console.log("🔄 FCM Token refreshed (APNS token now available):");
      console.log("═══════════════════════════════════════════════════════");
      console.log(fcmToken);
      console.log("═══════════════════════════════════════════════════════");
      await this.sendFCMTokenToBackend(fcmToken);
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
      const apiUrl = getApiBaseUrl();
      const url = `${apiUrl}/notifications/fcm-token`;
      const authToken = await this.getAuthToken();

      if (!authToken) {
        console.warn(
          "⚠️  No auth token available - FCM token not sent to backend"
        );
        console.warn("   Token will be sent after user logs in");
        return;
      }

      console.log(`📤 Sending FCM token to: ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcmToken: token }),
      });

      if (response.ok) {
        console.log("✅ FCM token sent to backend successfully");
        console.log("   Token:", token.substring(0, 50) + "...");
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          "❌ Failed to send FCM token to backend:",
          response.status,
          errorText
        );
        console.error("   URL:", url);
        console.error("   Token (for manual testing):", token);
      }
    } catch (error: any) {
      console.error("❌ Error sending FCM token to backend:", error);
      console.error("   Error message:", error?.message);
      console.error("   API URL:", getApiBaseUrl());
      console.error("   Make sure backend is running and accessible");
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

  // Method to get FCM token
  async getFCMToken(): Promise<string | null> {
    try {
      if (!messaging) {
        console.error("❌ Firebase messaging not available in getFCMToken()");
        return null;
      }

      // First ensure device is registered for remote messages
      try {
        await messaging().registerDeviceForRemoteMessages();
      } catch (regError: any) {
        // If registration fails due to APS environment, provide helpful message
        if (
          regError.code === "messaging/unknown" &&
          regError.message?.includes("aps-environment")
        ) {
          console.error("⚠️  iOS Push notifications not properly configured");
          console.error("   - Rebuild your app after updating entitlements");
          return null;
        }
        // For other registration errors, log but continue
        console.warn("⚠️ Registration warning:", regError.message);
      }

      // Try to get the FCM token
      try {
        const token = await messaging().getToken();

        if (token && token.length > 0) {
          console.log(
            "═══════════════════════════════════════════════════════"
          );
          console.log("🔔 FCM TOKEN (raw):", token);
          console.log(
            "═══════════════════════════════════════════════════════"
          );
          return token;
        } else {
          console.error("❌ FCM token is empty or invalid");
          return null;
        }
      } catch (tokenError: any) {
        // Check if error is about APNS token (iOS Simulator limitation)
        if (
          tokenError.message?.includes("APNS token") ||
          tokenError.message?.includes("No APNS token")
        ) {
          console.log(
            "ℹ️  APNS token not ready - token will be retrieved automatically"
          );
          console.log("   Note: iOS Simulator may not support APNS tokens");
          console.log(
            "   Test on a real iOS device for reliable push notifications"
          );
          return null;
        }

        // Check for Android-specific errors (Google Play Services)
        if (
          tokenError.message?.includes("Google Play Services") ||
          tokenError.message?.includes("SERVICE_NOT_AVAILABLE")
        ) {
          console.log("ℹ️  Google Play Services not available");
          console.log("   Note: Android emulator needs Google Play Services");
          console.log(
            "   Use an emulator with Google Play or test on a real device"
          );
          return null;
        }

        console.error("❌ Error getting FCM token:", tokenError.message);
        return null;
      }
    } catch (error) {
      console.error("❌ Unexpected error in getFCMToken():", error);
      return null;
    }
  }

  /**
   * Manually trigger FCM token retrieval
   * Useful for testing or when APNS token becomes available later
   * Call this method if you need to manually get the token
   */
  async manuallyGetFCMToken(): Promise<string | null> {
    console.log("🔧 Manually requesting FCM token...");
    const token = await this.getFCMToken();
    if (token) {
      console.log("═══════════════════════════════════════════════════════");
      console.log("🔔 FCM TOKEN OBTAINED (manual request):");
      console.log("═══════════════════════════════════════════════════════");
      console.log(token);
      console.log("═══════════════════════════════════════════════════════");
      await this.sendFCMTokenToBackend(token);
    }
    return token;
  }

  /**
   * Ensure FCM token is sent to backend after user logs in
   * This should be called after authentication is complete
   */
  async ensureFCMTokenSent(): Promise<void> {
    try {
      console.log("🔍 Checking FCM token status after login...");
      const authToken = await this.getAuthToken();
      
      if (!authToken) {
        console.warn("⚠️  No auth token available - cannot send FCM token");
        return;
      }

      const fcmToken = await this.getFCMToken();
      if (fcmToken) {
        console.log("✅ FCM token available, sending to backend...");
        await this.sendFCMTokenToBackend(fcmToken);
      } else {
        console.log("⏳ FCM token not ready yet");
        console.log("   - For iOS: Token will be sent when APNS token is available");
        console.log("   - For Android: Check notification permissions");
        console.log("   - Token will be sent automatically when available via onTokenRefresh");
      }
    } catch (error) {
      console.error("❌ Error ensuring FCM token is sent:", error);
    }
  }
}

export default NotificationService;
