import { Platform } from "react-native";

// API Configuration
export const API_CONFIG = {
  // Use environment variable if set, otherwise fallback to localhost
  // For production, set EXPO_PUBLIC_API_URL to your Cloud Run URL
  BASE_URL:
    Platform.OS === "android"
      ? "http://10.0.2.2:8080"
      : "http://localhost:8080",

  // Request timeouts
  TIMEOUT: 10000, // 10 seconds

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Export API_BASE_URL for direct import
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Helper function to get the API base URL
export const getApiBaseUrl = (): string => {
  return API_CONFIG.BASE_URL;
};

export default API_CONFIG;
