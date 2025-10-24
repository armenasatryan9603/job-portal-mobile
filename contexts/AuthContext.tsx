import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiService } from "@/services/api";
import PhoneVerificationService from "@/services/PhoneVerificationService";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  creditBalance: number;
  verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasIncompleteProfile: boolean;
  setUser: (user: User | null) => void;
  setHasIncompleteProfile: (incomplete: boolean) => void;
  login: (phone: string, otp: string, name?: string) => Promise<boolean>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: string
  ) => Promise<boolean>;
  sendOTP: (phone: string) => Promise<boolean>;
  resetOTP: (phone: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Authentication service using backend API

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false);

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
    otp: string,
    name?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Check phone verification before login
      const phoneVerification = PhoneVerificationService.getInstance();
      const phoneCheck = await phoneVerification.checkPhoneNumber(phone);

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

      const result = await apiService.post<{ access_token: string; user: any }>(
        "/auth/verify-otp",
        { phone, otp, name }
      );

      if (result.access_token && result.user) {
        // Track phone number for new account
        await phoneVerification.trackNewAccount(phone);

        // Store token and user data
        await apiService.setAuthToken(result.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
        setIsAuthenticated(true);

        // Check if user has incomplete profile
        const isIncomplete =
          !result.user.name || result.user.name.trim() === "";
        setHasIncompleteProfile(isIncomplete);

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error during OTP verification:", error);
      return false;
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

  const sendOTP = async (phone: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.post<{
        success: boolean;
        message: string;
        otp?: string;
      }>("/auth/send-otp", { phone });
      if (response.success) {
        console.log("OTP sent successfully:", response);
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

  const resetOTP = async (phone: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.post<{
        success: boolean;
        message: string;
        otp?: string;
      }>("/auth/reset-otp", { phone });
      if (response.success) {
        console.log("OTP reset successfully:", response);
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

      // Clear local state and storage
      setUser(null);
      setIsAuthenticated(false);
      setHasIncompleteProfile(false);
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
    setUser,
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
