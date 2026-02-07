import { Platform } from "react-native";

// API Configuration
export const API_CONFIG = {
  // Use environment variable if set, otherwise fallback to localhost
  // For production, set EXPO_PUBLIC_API_URL to your Cloud Run URL
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080",
  // Platform.OS === "android"
  //   ? "http://10.0.2.2:8080"
  //   : "http://localhost:8080",

  // Currency conversion API
  // Use environment variable if set, otherwise fallback to Frankfurter API
  FRANKFURTER_API_URL: process.env.EXPO_PUBLIC_FRANKFURTER_API_URL,

  // Frontend URL for sharing links (web app URL or universal link)
  // Set EXPO_PUBLIC_FRONTEND_URL in .env file
  // This should match your backend domain for Universal Links/App Links
  FRONTEND_URL: process.env.EXPO_PUBLIC_FRONTEND_URL || "https://job-portal-backend-psi-ruddy.vercel.app/",

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

// Helper function to get the frontend URL for sharing
export const getFrontendUrl = (): string => {
  return API_CONFIG.FRONTEND_URL;
};

export default API_CONFIG;
