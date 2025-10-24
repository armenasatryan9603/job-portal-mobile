import { ThemeColors } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup =
      segments[0] === "services" ||
      segments[0] === "orders" ||
      segments[0] === "specialists";

    if (!isAuthenticated && inTabsGroup) {
      // User is not authenticated and trying to access protected screens, redirect to home
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
