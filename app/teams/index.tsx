import { ActivityIndicator, View } from "react-native";
import { router, usePathname } from "expo-router";

import { ThemeColors } from "@/constants/styles";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect } from "react";

export default function TeamsScreen() {
  useAnalytics("Teams");
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const pathname = usePathname();

  useEffect(() => {
    // Redirect to specialists page with teams tab active
    router.replace("/specialists?tab=teams");
  }, [pathname]);

  // Show loading indicator while redirecting
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );
}
