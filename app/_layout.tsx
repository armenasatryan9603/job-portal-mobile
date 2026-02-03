// IMPORTANT: Background message handler must be imported FIRST
// This registers the handler before the app starts
import "./background-message-handler";
import "react-native-reanimated";

import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";

import { AppState, AppStateStatus } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import React, { useEffect } from "react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

import AnalyticsService from "@/categories/AnalyticsService";
import { AuthProvider } from "@/contexts/AuthContext";
import CalendarNotificationService from "@/categories/CalendarNotificationService";
import { ChatReminderProvider } from "@/contexts/ChatReminderContext";
import { ChatReminderToast } from "@/components/ChatReminderToast";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import { CreditCardProvider } from "@/contexts/CreditCardContext";
import { GlobalModals } from "@/components/GlobalModals";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { UnreadCountProvider } from "@/contexts/UnreadCountContext";
// Initialize TanStack Query
import { queryClient } from "@/categories/queryClient";
import { router } from "expo-router";
import { storeReferralCode } from "@/utils/referralStorage";

// Firebase Messaging is auto-initialized by NotificationService when needed
// No explicit Firebase initialization needed here (FCM only, no other services)



// Firebase messaging import with fallback
let messaging: any = null;
try {
  messaging = require("@react-native-firebase/messaging").default;
} catch (error) {
  console.warn("Firebase messaging not available");
}

export const unstable_settings = {
  initialRouteName: "index",
};

// Initialize Analytics Service
const analytics = AnalyticsService.getInstance();

function AppContent() {
  const { isDark } = useTheme();

  // Initialize Calendar Notification Service
  useEffect(() => {
    const initializeCalendarNotifications = async () => {
      try {
        const calendarNotificationService =
          CalendarNotificationService.getInstance();
        await calendarNotificationService.initialize();
        await calendarNotificationService.requestPermissions();
      } catch (error) {
        console.error(
          "Error initializing calendar notification service:",
          error
        );
      }
    };

    initializeCalendarNotifications();
  }, []);

  // Helper function to navigate based on notification data
  const navigateFromNotification = (data: any) => {
    if (!data) {
      return;
    }

    // Extract values - Firebase data is always strings, so we need to handle that
    const type = String(data?.type || "").trim();
    const conversationId = String(data?.conversationId || "").trim();
    const notificationId = String(data?.notificationId || "").trim();
    const orderId = String(data?.orderId || "").trim();

    // Wait a bit for app to be ready, then navigate
    setTimeout(() => {
      try {
        // Handle calendar notifications
        if (type === "calendar_reminder" && orderId) {
          router.push(`/orders/${orderId}`);
          return;
        }

        // Handle chat messages - must check this first
        if (type === "chat_message" && conversationId) {
          router.push(`/chat/${conversationId}`);
          return;
        }

        // Handle other notifications - notificationId should be present for all non-chat notifications
        // Check if notificationId exists and is valid (not empty, not "undefined", not "null")
        if (
          notificationId &&
          notificationId !== "" &&
          notificationId !== "undefined" &&
          notificationId !== "null"
        ) {
          router.push(`/notifications/${notificationId}`);
          return;
        }

        // Fallback: navigate to notifications list
        router.push("/notifications");
      } catch (error) {
        console.error("Error navigating from notification tap:", error);
      }
    }, 500); // Small delay to ensure router is ready
  };

  // Handle notification taps from expo-notifications (works when app is in background)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        navigateFromNotification(data);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle Firebase notifications when app is opened from terminated/background state
  useEffect(() => {
    if (!messaging) return;

    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          navigateFromNotification(remoteMessage.data);
        }
      })
      .catch((error: any) => {
        console.error("Error getting initial notification:", error);
      });

    // Also handle when app is opened from background
    const unsubscribe = messaging().onNotificationOpenedApp(
      (remoteMessage: any) => {
        navigateFromNotification(remoteMessage.data);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle deep linking for referral codes
  useEffect(() => {
    // Handle initial URL (when app is opened via deep link)
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          handleDeepLink(url);
        }
      } catch (error) {
        console.error("Error getting initial URL:", error);
      }
    };

    handleInitialURL();

    // Handle URL changes (when app is already open)
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    // Check for URL when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground, check for pending deep link
        handleInitialURL();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      // Handle both HTTPS URLs and custom scheme URLs
      // For custom scheme: jobportalmobile://profile/refill-credits
      // For HTTPS: https://domain.com/profile/refill-credits
      const path = parsed.path || "";
      
      // Handle referral codes
      const refCode = parsed.queryParams?.ref as string;
      if (refCode) {
        storeReferralCode(refCode);
        return;
      }
      
      // Handle order links: /orders/{id}
      if (path.startsWith("/orders/")) {
        const orderId = path.split("/orders/")[1];
        if (orderId) {
          router.push(`/orders/${orderId}`);
        }
        return;
      }
      
      // Handle payment callback redirect: /profile/refill-credits
      // Check both path formats (with and without leading slash)
      if (
        path === "/profile/refill-credits" ||
        path === "profile/refill-credits" ||
        path.startsWith("/profile/refill-credits") ||
        path.startsWith("profile/refill-credits")
      ) {
        router.push("/profile/refill-credits");
        return;
      }
      
      // Handle other routes as needed
    } catch (error) {
      console.error("Error parsing deep link:", error);
    }
  };

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="proposals" />
        <Stack.Screen name="services" />
        <Stack.Screen name="specialists" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
      <GlobalModals />
      <ChatReminderToast />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TranslationProvider>
            <AuthProvider>
              <UnreadCountProvider>
                <ConversationsProvider>
                  <CreditCardProvider>
                    <ModalProvider>
                      <NavigationProvider>
                        <ChatReminderProvider>
                          <AppContent />
                        </ChatReminderProvider>
                      </NavigationProvider>
                    </ModalProvider>
                  </CreditCardProvider>
                </ConversationsProvider>
              </UnreadCountProvider>
            </AuthProvider>
          </TranslationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
