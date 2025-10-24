import { ThemeColors } from "@/constants/styles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PhoneNumberInputProps {
  onPhoneNumberSubmit: (phoneNumber: string) => void;
  isLoading?: boolean;
  buttonText?: string;
  showTitle?: boolean;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  onPhoneNumberSubmit,
  isLoading = false,
  buttonText = "Send OTP",
  showTitle = true,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic phone number validation (10-15 digits)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, "");

    // If it doesn't start with +, add +1 for US numbers
    if (!cleaned.startsWith("+")) {
      return "+1" + cleaned;
    }

    return cleaned;
  };

  const handleSubmit = () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!validatePhoneNumber(formattedPhone)) {
      Alert.alert(t("invalidPhoneNumber"), t("pleaseEnterValidPhone"));
      return;
    }

    onPhoneNumberSubmit(formattedPhone);
  };

  return (
    <View style={styles.container}>
      {showTitle && (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("enterPhoneNumber")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {t("sendVerificationCode")}
          </Text>
        </>
      )}

      <View style={[styles.inputContainer, { borderColor: colors.border }]}>
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

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.tint },
          isLoading && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          {isLoading ? t("sending") : buttonText}
        </Text>
      </TouchableOpacity>
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
});
