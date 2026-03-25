/**
 * Background Message Handler for React Native Firebase
 *
 * When the app is closed (terminated), Firebase automatically displays notifications with a notification payload.
 * This handler is for when the app is in the background (not terminated).
 * When terminated, Firebase handles notification display automatically.
 */

import { Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";

// Register background message handler
// This only runs when app is in background, NOT when terminated
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("═══════════════════════════════════════════════════════");
  console.log("🔔 [BACKGROUND] Message received");
  console.log("═══════════════════════════════════════════════════════");
  console.log("Message ID:", remoteMessage.messageId);
  console.log("Title:", remoteMessage.notification?.title);
  console.log("Body:", remoteMessage.notification?.body);
  console.log("Data:", JSON.stringify(remoteMessage.data, null, 2));
  console.log("Has notification payload:", !!remoteMessage.notification);
  console.log("Platform:", Platform.OS);
  console.log("═══════════════════════════════════════════════════════");

  // When app is in background, Firebase should display the notification automatically
  // But we can also use expo-notifications as a fallback
  if (remoteMessage.notification) {
    try {
      // For Android, ensure channel exists
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Channel",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
        console.log("✅ Android notification channel ensured");
      }

      // Schedule notification to display immediately (fallback)
      // Note: Firebase should already display it, but this ensures it shows
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title || "Notification",
          body: remoteMessage.notification.body || "",
          data: remoteMessage.data || {},
          sound: true,
          badge: 1,
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
      console.error(
        "   Stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
    }
  } else {
    // Data-only message - we need to display it manually
    console.log("📦 Data-only message received (no notification payload)");
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Channel",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "New Message",
          body: "You have a new message",
          data: remoteMessage.data || {},
          sound: true,
        },
        trigger: null,
      });
      console.log("✅ Data-only notification scheduled");
    } catch (error) {
      console.error("❌ Error displaying data-only notification:", error);
    }
  }
});
