import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: (failureCount, error) => {
        // Don't retry if offline or network error
        if (
          error?.message?.includes("Network request failed") ||
          error?.message?.includes("fetch")
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // Don't retry mutations automatically
    },
  },
});

// Cache TTL configurations for different data types
export const CACHE_TTL = {
  STATIC: 24 * 60 * 60 * 1000, // 24 hours (services, reasons)
  USER_DATA: 5 * 60 * 1000, // 5 minutes (profile, orders)
  DYNAMIC: 2 * 60 * 1000, // 2 minutes (specialists, notifications)
  REAL_TIME: 30 * 1000, // 30 seconds (chat, live data)
};

export default queryClient;
