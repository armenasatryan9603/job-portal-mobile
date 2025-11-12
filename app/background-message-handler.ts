/**
 * Background Message Handler for React Native Firebase
 *
 * When the app is closed, we need to manually display notifications.
 * This handler uses expo-notifications to display them.
 */

import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";

// Register background message handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("🔔 [BACKGROUND] Message received:", remoteMessage);
  console.log("   Title:", remoteMessage.notification?.title);
  console.log("   Body:", remoteMessage.notification?.body);

  // Display the notification using expo-notifications
  if (remoteMessage.notification) {
    try {
      // Ensure channel exists
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default Channel",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });

      // Schedule notification to display immediately
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title || "Notification",
          body: remoteMessage.notification.body || "",
          data: remoteMessage.data || {},
          sound: true,
        },
        trigger: null, // Show immediately
      });

      console.log("✅ Notification scheduled via expo-notifications");
    } catch (error) {
      console.error("❌ Error displaying notification:", error);
      console.error(
        "   Error details:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
});
