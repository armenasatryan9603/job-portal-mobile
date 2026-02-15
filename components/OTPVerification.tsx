import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";

import { ThemeColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/hooks/useTranslation";

interface OTPVerificationProps {
  phoneNumber: string;
  onOTPSubmit: (otp: string) => void;
  onResendOTP: () => void;
  isLoading?: boolean;
  showTitle?: boolean;
  error?: string | null;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  phoneNumber,
  onOTPSubmit,
  onResendOTP,
  isLoading = false,
  showTitle = true,
  error,
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<TextInput[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle error: clear OTP and trigger shake animation
  useEffect(() => {
    if (error) {
      // Clear OTP inputs
      setOtp(["", "", "", "", "", ""]);
      // Focus first input
      inputRefs.current[0]?.focus();

      // Trigger shake animation
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error, shakeAnimation]);

  const handleOTPChange = (value: string, index: number) => {
    // Check if user pasted a code (value length > 1 indicates paste)
    if (value.length > 1) {
      // Extract only digits from the pasted value
      const digits = value.replace(/\D/g, "").slice(0, 6);

      if (digits.length > 0) {
        // Always fill from the first input, regardless of which input received the paste
        const newOtp = [...otp];
        for (let i = 0; i < digits.length && i < 6; i++) {
          newOtp[i] = digits[i];
        }
        setOtp(newOtp);

        // Focus the next empty input or the last one
        const nextIndex = Math.min(digits.length, 5);
        inputRefs.current[nextIndex]?.focus();

        // Auto-submit if we have 6 digits
        if (digits.length === 6) {
          setTimeout(() => {
            onOTPSubmit(digits);
          }, 100);
        }
        return;
      }
    }

    // Normal single character input
    const newOtp = [...otp];
    // Only take the first character for normal typing
    newOtp[index] = value.charAt(0);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5) {
      const otpString = newOtp.join("");
      if (otpString.length === 6) {
        // Small delay to ensure the last digit is set
        setTimeout(() => {
          onOTPSubmit(otpString);
        }, 100);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer === 0) {
      setResendTimer(60);
      onResendOTP();
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    // Format phone number for display (e.g., +1 (555) 123-4567)
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(
        4,
        7
      )}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <View style={styles.container}>
      {showTitle && (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("verifyYourPhoneNumber")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {t("weSentCodeTo")}
            {"\n"}
            <Text style={[styles.phoneNumber, { color: colors.tint }]}>
              {formatPhoneNumber(phoneNumber)}
            </Text>
          </Text>
        </>
      )}

      {!showTitle && (
        <Text style={[styles.phoneInfo, { color: colors.text }]}>
          {t("weSentCodeTo")}{" "}
          <Text style={[styles.phoneNumber, { color: colors.tint }]}>
            {formatPhoneNumber(phoneNumber)}
          </Text>
        </Text>
      )}

      <Animated.View
        style={[
          styles.otpContainer,
          {
            transform: [{ translateX: shakeAnimation }],
          },
        ]}
      >
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              {
                borderColor: error
                  ? "#EF4444"
                  : digit
                  ? colors.tint
                  : colors.border,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={digit}
            onChangeText={(value) => handleOTPChange(value, index)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(nativeEvent.key, index)
            }
            keyboardType="numeric"
            maxLength={6}
            textAlign="center"
            editable={!isLoading}
          />
        ))}
      </Animated.View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.resendContainer}
        onPress={handleResend}
        disabled={resendTimer > 0 || isLoading}
      >
        <Text style={[styles.resendText, { color: colors.text }]}>
          {t("didntReceiveCode")}{" "}
        </Text>
        <Text
          style={[
            styles.resendButton,
            { color: colors.tint },
            (resendTimer > 0 || isLoading) && { opacity: 0.5 },
          ]}
        >
          {resendTimer > 0 ? `${t("resendIn")} ${resendTimer}s` : t("resend")}
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <View
          style={styles.loadingOverlay}
        >
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    opacity: 0.7,
    lineHeight: 22,
  },
  phoneInfo: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    opacity: 0.8,
    lineHeight: 22,
  },
  phoneNumber: {
    fontWeight: "600",
  },
  otpContainer: {
    gap: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  otpInput: {
    width: 44,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: "600",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontSize: 15,
    opacity: 0.7,
  },
  resendButton: {
    fontSize: 15,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
