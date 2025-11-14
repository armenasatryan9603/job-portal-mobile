// IMPORTANT: Background message handler must be imported FIRST
// This registers the handler before the app starts
import "./background-message-handler";

import React, { useEffect } from "react";
import * as Linking from "expo-linking";
import { AppState, AppStateStatus } from "react-native";
import { storeReferralCode } from "@/utils/referralStorage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";

// Firebase Messaging is auto-initialized by NotificationService when needed
// No explicit Firebase initialization needed here (FCM only, no other services)

// Initialize TanStack Query
import { queryClient } from "@/services/queryClient";

import { GlobalModals } from "@/components/GlobalModals";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditCardProvider } from "@/contexts/CreditCardContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { UnreadCountProvider } from "@/contexts/UnreadCountContext";

export const unstable_settings = {
  initialRouteName: "index",
};

function AppContent() {
  const { isDark } = useTheme();

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
        console.error("❌ Error getting initial URL:", error);
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
      const refCode = parsed.queryParams?.ref as string;

      if (refCode) {
        console.log(`🔗 Deep link detected with referral code: ${refCode}`);
        storeReferralCode(refCode);
      }
    } catch (error) {
      console.error("❌ Error parsing deep link:", error);
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
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TranslationProvider>
            <UnreadCountProvider>
              <AuthProvider>
                <CreditCardProvider>
                  <ModalProvider>
                    <NavigationProvider>
                      <AppContent />
                    </NavigationProvider>
                  </ModalProvider>
                </CreditCardProvider>
              </AuthProvider>
            </UnreadCountProvider>
          </TranslationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
