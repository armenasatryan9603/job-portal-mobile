#!/usr/bin/env node

// Script to clear test notifications from storage
// Run with: node scripts/clear-notifications.js

const AsyncStorage =
  require("@react-native-async-storage/async-storage").default;

async function clearNotifications() {
  try {
    console.log("🧹 Clearing all notifications from storage...");

    // Clear all notifications
    await AsyncStorage.removeItem("notifications");

    console.log("✅ All notifications cleared successfully!");
    console.log("📱 Restart your app to see the changes");
  } catch (error) {
    console.error("❌ Error clearing notifications:", error);
  }
}

clearNotifications();
