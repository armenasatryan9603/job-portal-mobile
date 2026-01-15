import { useEffect } from "react";
import { usePathname } from "expo-router";
import AnalyticsService from "@/categories/AnalyticsService";

/**
 * Hook to automatically track screen views when route changes
 * Usage: Add `useAnalytics()` to any screen component
 */
export function useAnalytics(screenName?: string) {
  const pathname = usePathname();
  const analytics = AnalyticsService.getInstance();

  useEffect(() => {
    // Use provided screenName or derive from pathname
    const screen = screenName || pathname || "unknown";
    analytics.logEvent(screen);
  }, [pathname, screenName]);
}

/**
 * Hook to get analytics service instance
 * Usage: const analytics = useAnalyticsService();
 */
export function useAnalyticsService() {
  return AnalyticsService.getInstance();
}
