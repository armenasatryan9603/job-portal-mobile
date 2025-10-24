import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";

// Initialize Firebase
import "@/config/firebase";

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
