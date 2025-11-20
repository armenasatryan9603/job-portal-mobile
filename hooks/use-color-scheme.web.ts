import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Web-specific color scheme hook
 *
 * We still rely on the ThemeContext to respect the user's manual
 * preference, but we also hydrate with the system value to avoid
 * flashing during SSR/static rendering.
 */
export function useColorScheme() {
  const { themeMode, isDark } = useTheme();
  const systemColorScheme = useRNColorScheme();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const themeColorScheme = isDark ? "dark" : "light";

  // Before hydration, use system preference when themeMode === "system"
  if (!hasHydrated && themeMode === "system") {
    return systemColorScheme ?? themeColorScheme;
  }

  if (themeMode === "system") {
    return systemColorScheme ?? themeColorScheme;
  }

  return themeColorScheme;
}
