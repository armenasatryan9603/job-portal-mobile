import { OTPVerification } from "@/components/OTPVerification";
import {
  BorderRadius,
  ComponentSizes,
  Shadows,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiService } from "@/services/api";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { useTranslation } from "@/hooks/useTranslation";
import { ReferralCodeInput } from "./ReferralCodeInput";

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
  onSuccess?: () => void;
}

export function LoginModal({
  visible,
  onClose,
  onSwitchToSignup,
  onSuccess,
}: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const {
    login,
    sendOTP,
    resetOTP,
    isLoading,
    user,
    hasIncompleteProfile,
    setUser,
    setHasIncompleteProfile,
    logout,
  } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // Watch for user state changes after login
  useEffect(() => {
    if (user && step === "otp") {
      // User just logged in, check if they have a name
      if (!user.name || user.name.trim() === "") {
        // User has no name, show name input
        setIsNewUser(true);
        setStep("name");
      } else {
        // User has a name, login is complete
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }
    }
  }, [user, step, onClose, onSuccess]);

  // Auto-set step to "name" if user has incomplete profile
  useEffect(() => {
    if (visible && hasIncompleteProfile && user) {
      setStep("name");
      setIsNewUser(true);
      setPhoneNumber(user.phone || "");
    }
  }, [visible, hasIncompleteProfile, user]);

  const handlePhoneSubmit = async (phone: string) => {
    setPhoneNumber(phone);
    setOtpError(null); // Clear any previous errors

    try {
      const success = await sendOTP(phone);
      if (success) {
        setStep("otp");
      } else {
        Alert.alert(t("error"), t("failedToSendOTP"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleOTPSubmit = async (otp: string) => {
    setOtpError(null); // Clear previous errors

    try {
      // Try to login with the OTP
      const success = await login(phoneNumber, otp);
      if (success) {
        // The useEffect will handle checking if user has a name
        // and transitioning to the appropriate step
        setOtpError(null); // Clear error on success
        return;
      }
    } catch (error) {
      console.log("Login error:", error);

      // Parse error message to determine the type
      let errorMessage: string | null = null;

      if (error instanceof Error && error.message) {
        let errorMsg = error.message;

        // Remove HTTP error prefix if present
        errorMsg = errorMsg.replace(/^HTTP error! status: \d+, message: /, "");

        // Try to extract JSON error message if present
        try {
          // Check if error message is JSON or contains JSON
          if (errorMsg.trim().startsWith("{")) {
            const errorJson = JSON.parse(errorMsg);
            errorMsg = errorJson.message || errorJson.error || errorMsg;
          } else {
            // Check if error message contains JSON
            const jsonMatch = errorMsg.match(/\{.*\}/);
            if (jsonMatch) {
              const errorJson = JSON.parse(jsonMatch[0]);
              errorMsg = errorJson.message || errorJson.error || errorMsg;
            }
          }
        } catch (e) {
          // Not JSON, use original message
        }

        const errorMsgLower = errorMsg.toLowerCase();

        // Check for specific error types
        if (
          errorMsgLower.includes("invalid otp") ||
          (errorMsgLower.includes("otp") && !errorMsgLower.includes("phone"))
        ) {
          // Wrong OTP code
          errorMessage = t("wrongOTP");
        } else if (
          errorMsgLower.includes("invalid phone number") ||
          errorMsgLower.includes("phone number") ||
          errorMsgLower.includes("otp not requested")
        ) {
          // Wrong phone number or OTP not requested for this number
          errorMessage = t("wrongPhoneNumber");
        } else if (errorMsgLower.includes("expired")) {
          // OTP expired
          errorMessage = t("otpExpired");
        } else if (
          errorMsgLower.includes("internal server error") ||
          errorMsgLower.includes("500")
        ) {
          // Server error - show generic message
          errorMessage = t("somethingWentWrong");
        } else {
          // Use the actual error message or fallback to generic
          errorMessage = errorMsg || t("verificationCodeIncorrect");
        }
      } else {
        // Default error
        errorMessage = t("verificationCodeIncorrect");
      }

      setOtpError(errorMessage);
    }
  };

  const handleNameSubmit = async (name: string) => {
    setUserName(name);

    try {
      // If user is already logged in (incomplete profile), update their profile
      if (hasIncompleteProfile && user) {
        // Update the user's name via the profile update API
        await apiService.updateUserProfile({ name: name.trim() });

        // Update the local user state
        const updatedUser = { ...user, name: name.trim() };
        setUser(updatedUser);
        setHasIncompleteProfile(false);

        // Store updated user data
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Normal flow for new users
        const success = await login(phoneNumber, "", name);
        if (success) {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        } else {
          Alert.alert(t("error"), t("failedToCompleteRegistration"));
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleResendOTP = async () => {
    setOtpError(null); // Clear error when resending
    try {
      const success = await sendOTP(phoneNumber);
      if (!success) {
        Alert.alert(t("error"), t("failedToResendOTP"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleResetOTP = async () => {
    try {
      const success = await resetOTP(phoneNumber);
      if (!success) {
        Alert.alert(t("error"), t("failedToResetOTP"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setPhoneNumber("");
    setUserName("");
    setIsNewUser(false);
    setOtpError(null); // Clear error when going back
  };

  const handleBackToOTP = () => {
    setStep("otp");
  };

  const handleBackFromName = async () => {
    // Go all the way back to phone step and reset everything
    // Logout to fully restart the login/signup process
    try {
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
      // Continue with reset even if logout fails
    }

    setStep("phone");
    setPhoneNumber("");
    setUserName("");
    setIsNewUser(false);
    setOtpError(null);
    setHasIncompleteProfile(false);
  };

  const handleClose = () => {
    // Don't allow closing if user is in name step (incomplete profile)
    if (step === "name") {
      return;
    }

    setStep("phone");
    setPhoneNumber("");
    setUserName("");
    setIsNewUser(false);
    setOtpError(null); // Clear error on close
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={step === "name" ? undefined : handleClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Header - Fixed */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            {step !== "name" && (
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <IconSymbol name="xmark" size={18} color={colors.text} />
              </TouchableOpacity>
            )}
            {(step === "otp" || step === "name") && (
              <TouchableOpacity
                onPress={
                  step === "otp" ? handleBackToPhone : handleBackFromName
                }
                style={styles.backButton}
              >
                <IconSymbol name="chevron.left" size={18} color={colors.text} />
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                {step === "phone"
                  ? t("login")
                  : step === "otp"
                  ? t("verify")
                  : t("completeProfile")}
              </Text>
              <Text style={styles.headerSubtitle}>
                {step === "phone"
                  ? t("enterYourPhoneNumber")
                  : step === "otp"
                  ? t("enterVerificationCode")
                  : t("enterYourName")}
              </Text>
            </View>
          </View>

          {/* Scrollable Content - Flexible */}
          <ScrollView
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === "phone" ? (
              <View>
                {/* Phone Input Only */}
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t("phoneNumber")}
                    placeholderTextColor={colors.tabIconDefault}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    editable={!isLoading}
                    autoFocus
                  />
                </View>
                <View style={styles.referralCodeWrapper}>
                  <ReferralCodeInput showStatus={true} />
                </View>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.tint },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={() => handlePhoneSubmit(phoneNumber)}
                  disabled={isLoading}
                >
                  <Text
                    style={[styles.buttonText, { color: colors.background }]}
                  >
                    {isLoading ? t("sending") : t("sendOTP")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : step === "otp" ? (
              <OTPVerification
                phoneNumber={phoneNumber}
                onOTPSubmit={handleOTPSubmit}
                onResendOTP={handleResendOTP}
                isLoading={isLoading}
                showTitle={false}
                error={otpError}
              />
            ) : (
              <View>
                {/* Name Input for New Users */}
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t("name")}
                    placeholderTextColor={colors.tabIconDefault}
                    value={userName}
                    onChangeText={setUserName}
                    keyboardType="default"
                    autoComplete="name"
                    textContentType="name"
                    editable={!isLoading}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.tint },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={() => handleNameSubmit(userName)}
                  disabled={isLoading}
                >
                  <Text
                    style={[styles.buttonText, { color: colors.background }]}
                  >
                    {isLoading ? t("completing") : t("complete")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xxl,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    height: 420,
    borderRadius: BorderRadius.xxl,
    ...Shadows.xl,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: "center",
    position: "relative",
    height: 100,
    flexShrink: 0,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.lg,
    width: ComponentSizes.icon.xxl + Spacing.md,
    height: ComponentSizes.icon.xxl + Spacing.md,
    borderRadius: BorderRadius.round,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  backButton: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.lg,
    width: ComponentSizes.icon.xxl + Spacing.md,
    height: ComponentSizes.icon.xxl + Spacing.md,
    borderRadius: BorderRadius.round,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  headerContent: {
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.xxxxxl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
    textAlign: "center",
    color: ThemeColors.light.textInverse,
  },
  headerSubtitle: {
    fontSize: Typography.lg,
    textAlign: "center",
    opacity: 0.9,
    lineHeight: Typography.lineHeightNormal * Typography.lg,
    color: ThemeColors.light.textInverse,
  },
  contentScrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    justifyContent: "center",
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    minHeight: 56,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    paddingVertical: 16,
    fontWeight: "500",
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 54,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  referralCodeWrapper: {
    marginBottom: Spacing.lg,
  },
});
