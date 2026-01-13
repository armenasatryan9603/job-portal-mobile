import { useEffect } from "react";
import { router, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors } from "@/constants/styles";

export default function TeamsScreen() {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const pathname = usePathname();

  useEffect(() => {
    // Redirect to specialists page with teams tab active
    router.replace("/specialists?tab=teams" as any);
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
