import { apiService } from "./api";

interface PhoneVerificationResult {
  success: boolean;
  message: string;
  canUse: boolean;
  isReturningUser?: boolean;
  creditsEligible?: boolean;
  lastSignupDate?: Date;
}

class PhoneVerificationService {
  private static instance: PhoneVerificationService;

  private constructor() {}

  public static getInstance(): PhoneVerificationService {
    if (!PhoneVerificationService.instance) {
      PhoneVerificationService.instance = new PhoneVerificationService();
    }
    return PhoneVerificationService.instance;
  }

  /**
   * Check if phone number has been used before and if user is eligible for credits
   */
  async checkPhoneNumber(
    phoneNumber: string
  ): Promise<PhoneVerificationResult> {
    try {
      console.log("📱 Checking phone number:", phoneNumber);

      const response = await apiService.get<{
        success: boolean;
        data: {
          hasSignedUpBefore: boolean;
          lastSignupDate?: string;
          creditsEligible: boolean;
        };
      }>(`/phone-verification/check/${encodeURIComponent(phoneNumber)}`);

      if (response.success && response.data) {
        const { hasSignedUpBefore, lastSignupDate, creditsEligible } =
          response.data;

        return {
          success: true,
          message: hasSignedUpBefore
            ? creditsEligible
              ? "Welcome back! You're eligible for credits."
              : "Welcome back! No credits this time."
            : "New user - you'll get welcome credits!",
          canUse: true,
          isReturningUser: hasSignedUpBefore,
          creditsEligible,
          lastSignupDate: lastSignupDate ? new Date(lastSignupDate) : undefined,
        };
      }

      return {
        success: false,
        message: "Failed to check phone number",
        canUse: false,
      };
    } catch (error) {
      console.error("Error checking phone number:", error);
      return {
        success: false,
        message: "Error checking phone number",
        canUse: false,
      };
    }
  }

  /**
   * Track phone number for new account registration
   */
  async trackNewAccount(phoneNumber: string): Promise<boolean> {
    try {
      console.log("📱 Tracking phone number for new account:", phoneNumber);

      const response = await apiService.post<{
        success: boolean;
        message?: string;
      }>("/phone-verification/track", {
        phoneNumber: phoneNumber,
      });

      if (response.success) {
        console.log("✅ Phone number tracked successfully");
        return true;
      }

      console.error("❌ Failed to track phone number");
      return false;
    } catch (error) {
      console.error("Error tracking phone number:", error);
      return false;
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Basic formatting - you might want to use a library like libphonenumber
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(
        3,
        6
      )}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): {
    isValid: boolean;
    message?: string;
  } {
    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.length < 10) {
      return { isValid: false, message: "Phone number is too short" };
    }

    if (cleaned.length > 15) {
      return { isValid: false, message: "Phone number is too long" };
    }

    // Check for suspicious patterns
    if (/^(\d)\1{4,}$/.test(cleaned)) {
      return {
        isValid: false,
        message: "Phone number contains too many repeated digits",
      };
    }

    return { isValid: true };
  }
}

export default PhoneVerificationService;
