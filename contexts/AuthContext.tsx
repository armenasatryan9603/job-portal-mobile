import * as Device from "expo-device";

import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { UserLanguage, UserProfile, apiService } from "@/categories/api";

import AnalyticsService from "@/categories/AnalyticsService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CalendarNotificationService from "@/categories/CalendarNotificationService";
import NotificationService from "@/categories/NotificationService";
import PhoneVerificationService from "@/categories/PhoneVerificationService";
import { getAndClearReferralCode } from "@/utils/referralStorage";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasIncompleteProfile: boolean;
  justSignedUp: boolean;
  setUser: (user: UserProfile | null) => void;
  updateUser: (userData: Partial<UserProfile>) => Promise<void>;
  setHasIncompleteProfile: (incomplete: boolean) => void;
  login: (phone: string, countryCode: string, otp: string, name?: string) => Promise<boolean>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: string
  ) => Promise<boolean>;
  sendOTP: (phone: string, countryCode: string) => Promise<boolean>;
  resetOTP: (phone: string, countryCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Authentication service using backend API

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const storedToken = await AsyncStorage.getItem("auth_token");

      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        
        setUser(userData);
        setIsAuthenticated(true);

        // Check if user has incomplete profile (no name or empty name)
        const isIncomplete = !userData.name || userData.name.trim() === "";
        setHasIncompleteProfile(isIncomplete);

        // Send FCM token to backend if user is already logged in
        try {
          await NotificationService.getInstance().ensureFCMTokenSent();
        } catch (error) {
          console.error("Error sending FCM token on app start:", error);
        }

        // Schedule calendar notifications for accepted jobs
        try {
          const calendarService = CalendarNotificationService.getInstance();
          await calendarService.scheduleAllNotificationsForUser(userData.id);
        } catch (error) {
          console.error(
            "Error scheduling calendar notifications on app start:",
            error
          );
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setHasIncompleteProfile(false);
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
      setUser(null);
      setIsAuthenticated(false);
      setHasIncompleteProfile(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    phone: string,
    countryCode: string,
    otp: string,
    name?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Format phone with country code for verification check
      const fullPhone = phone.startsWith("+") ? phone : `${countryCode}${phone}`;
      
      // Check phone verification before login
      const phoneVerification = PhoneVerificationService.getInstance();
      const phoneCheck = await phoneVerification.checkPhoneNumber(fullPhone);

      console.log("📱 Phone verification result:", phoneCheck);

      // Show user information about their phone verification status
      if (phoneCheck.isReturningUser) {
        if (phoneCheck.creditsEligible) {
          console.log("🎉 Welcome back! You're eligible for credits.");
        } else {
          console.log("👋 Welcome back! No credits this time (used recently).");
        }
      } else {
        console.log("🆕 New user - you'll get welcome credits!");
      }

      // Check if running on simulator
      const isSimulator = !Device.isDevice;

      // Get referral code if available (and clear it after use)
      const referralCode = await getAndClearReferralCode();
      if (referralCode) {
        console.log(`🎁 Applying referral code: ${referralCode}`);
      }

      const result = await apiService.post<{ access_token: string; user: any }>(
        "/auth/verify-otp",
        { phone, countryCode, otp, name, isSimulator, referralCode }
      );

      if (result.access_token && result.user) {
        // Track phone number for new account
        await phoneVerification.trackNewAccount(fullPhone);

        // Store token and user data
        await apiService.setAuthToken(result.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
        setIsAuthenticated(true);

        // Check if user has incomplete profile
        const isIncomplete =
          !result.user.name || result.user.name.trim() === "";
        setHasIncompleteProfile(isIncomplete);

        // Track if this is a new signup (when name is provided)
        if (name) {
          setJustSignedUp(true);
          // Reset after 10 seconds to allow modal to show
          setTimeout(() => {
            setJustSignedUp(false);
          }, 10000);
          // Track signup event
          await AnalyticsService.getInstance().logSignUp("phone");
          await AnalyticsService.getInstance().setUserId(
            result.user.id.toString()
          );
          await AnalyticsService.getInstance().setUserProperties({
            user_role: result.user.role,
            user_verified: result.user.verified ? "true" : "false",
          });
        } else {
          // Track login event
          await AnalyticsService.getInstance().logLogin("phone");
          await AnalyticsService.getInstance().setUserId(
            result.user.id.toString()
          );
        }

        // Send FCM token to backend after login
        try {
          await NotificationService.getInstance().ensureFCMTokenSent();
        } catch (error) {
          console.error("Error sending FCM token after login:", error);
        }

        // Schedule calendar notifications for accepted jobs
        try {
          const calendarService = CalendarNotificationService.getInstance();
          await calendarService.scheduleAllNotificationsForUser(result.user.id);
        } catch (error) {
          console.error(
            "Error scheduling calendar notifications after login:",
            error
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error during OTP verification:", error);
      // Re-throw the error so the calling component can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await apiService.signup({ name, email, password, role });

      if (result.access_token && result.user) {
        // Store token and user data
        await apiService.setAuthToken(result.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
        setIsAuthenticated(true);

        // Track that user just signed up
        setJustSignedUp(true);
        // Reset after 10 seconds to allow modal to show
        setTimeout(() => {
          setJustSignedUp(false);
        }, 10000);

        // Track signup event
        await AnalyticsService.getInstance().logSignUp("email");
        await AnalyticsService.getInstance().setUserId(
          result.user.id.toString()
        );
        await AnalyticsService.getInstance().setUserProperties({
          user_role: result.user.role,
          user_verified: result.user.verified ? "true" : "false",
        });

        // Send FCM token to backend after signup
        try {
          await NotificationService.getInstance().ensureFCMTokenSent();
        } catch (error) {
          console.error("Error sending FCM token after signup:", error);
        }

        // Schedule calendar notifications for accepted jobs (if any)
        try {
          const calendarService = CalendarNotificationService.getInstance();
          await calendarService.scheduleAllNotificationsForUser(result.user.id);
        } catch (error) {
          console.error(
            "Error scheduling calendar notifications after signup:",
            error
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error during signup:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string, countryCode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Check if running on simulator
      const isSimulator = !Device.isDevice;
      const response = await apiService.post<{
        success: boolean;
        message: string;
        otp?: string;
      }>("/auth/send-otp", { phone, countryCode, isSimulator });
      if (response.success) {
        if (isSimulator && response.otp) {
          console.log(`🧪 [SIMULATOR] OTP for ${phone}: ${response.otp}`);
        } else {
          console.log("OTP sent successfully:", response);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error sending OTP:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetOTP = async (phone: string, countryCode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Check if running on simulator
      const isSimulator = !Device.isDevice;
      const response = await apiService.post<{
        success: boolean;
        message: string;
        otp?: string;
      }>("/auth/reset-otp", { phone, countryCode, isSimulator });
      if (response.success) {
        if (isSimulator && response.otp) {
          console.log(`🧪 [SIMULATOR] Reset OTP for ${phone}: ${response.otp}`);
        } else {
          console.log("OTP reset successfully:", response);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error resetting OTP:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<UserProfile>): Promise<void> => {
    if (!user) {
      console.warn("Cannot update user: no user is currently logged in");
      return;
    }

    try {
      // Merge the new data with the existing user data
      // This preserves all fields including portfolio, currency, rateUnit, etc.
      const updatedUser = {
        ...user,
        ...userData,
      } as UserProfile;

      // Update AsyncStorage with full user data including all fields
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

      // Update the state
      setUser(updatedUser);

      // Check if user has incomplete profile (no name or empty name)
      const isIncomplete = !updatedUser.name || updatedUser.name.trim() === "";
      setHasIncompleteProfile(isIncomplete);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout endpoint if user is authenticated
      if (isAuthenticated) {
        try {
          await apiService.post("/auth/logout", {}, true);
        } catch (error) {
          console.error("Error calling logout endpoint:", error);
          // Continue with local logout even if backend call fails
        }
      }

      // Reset analytics data on logout
      await AnalyticsService.getInstance().resetAnalyticsData();
      await AnalyticsService.getInstance().setUserId(null);

      // Clear local state and storage
      setUser(null);
      setIsAuthenticated(false);
      setHasIncompleteProfile(false);
      setJustSignedUp(false);
      await AsyncStorage.removeItem("user");
      await apiService.clearAuthToken();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    hasIncompleteProfile,
    justSignedUp,
    setUser,
    updateUser,
    setHasIncompleteProfile,
    login,
    signup,
    sendOTP,
    resetOTP,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
