import { OTPVerification } from "@/components/OTPVerification";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import {
  BorderRadius,
  ComponentSizes,
  Shadows,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React, { useState } from "react";
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

interface SignupModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({
  visible,
  onClose,
  onSwitchToLogin,
}: SignupModalProps) {
  const [step, setStep] = useState<"phone" | "name" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const { login, sendOTP, resetOTP, isLoading } = useAuth();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const handlePhoneNumberSubmit = async (phone: string) => {
    setPhoneNumber(phone);

    try {
      const success = await sendOTP(phone);
      if (success) {
        setStep("name");
      } else {
        Alert.alert(t("error"), t("failedToSendOTP"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleNameSubmit = () => {
    if (name.trim().length < 2) {
      Alert.alert(t("invalidName"), t("pleaseEnterValidName"));
      return;
    }
    setStep("otp");
  };

  const handleOTPSubmit = async (otp: string) => {
    try {
      const success = await login(phoneNumber, otp);
      if (success) {
        onClose();
        router.replace("/");
      } else {
        Alert.alert(t("invalidOTP"), t("verificationCodeIncorrect"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const handleResendOTP = async () => {
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

  const handleBack = () => {
    if (step === "otp") {
      setStep("name");
    } else if (step === "name") {
      setStep("phone");
      setPhoneNumber("");
    }
  };

  const handleClose = () => {
    setStep("phone");
    setPhoneNumber("");
    setName("");
    onClose();
  };

  const renderNameInput = () => (
    <View style={styles.nameInputContainer}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("whatsYourName")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
        {t("helpEmployersRecognize")}
      </Text>
      <View style={[styles.inputContainer, { borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={t("fullName")}
          placeholderTextColor={colors.tabIconDefault}
          value={name}
          onChangeText={setName}
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
        onPress={handleNameSubmit}
        disabled={isLoading || name.trim().length < 2}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          {t("continue")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleBack} style={styles.nameBackButton}>
        <Text style={[styles.backButtonText, { color: colors.tint }]}>
          {t("changePhoneNumber")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
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
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={18} color={colors.text} />
            </TouchableOpacity>
            {step !== "phone" && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <IconSymbol
                  name="chevron.left"
                  size={18}
                  color={colors.textInverse}
                />
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                {step === "phone"
                  ? t("signUp")
                  : step === "name"
                  ? t("yourName")
                  : t("verifyPhone")}
              </Text>
              <Text style={styles.headerSubtitle}>
                {step === "phone"
                  ? t("createYourAccount")
                  : step === "name"
                  ? t("tellUsYourName")
                  : t("enterVerificationCode")}
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
            {step === "phone" && (
              <PhoneNumberInput
                onPhoneNumberSubmit={handlePhoneNumberSubmit}
                isLoading={isLoading}
                buttonText={t("sendOTP")}
                showTitle={false}
              />
            )}

            {step === "name" && renderNameInput()}

            {step === "otp" && (
              <OTPVerification
                phoneNumber={phoneNumber}
                onOTPSubmit={handleOTPSubmit}
                onResendOTP={handleResendOTP}
                isLoading={isLoading}
                showTitle={false}
              />
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
  // Name input specific styles
  nameInputContainer: {
    // No flex: 1 to prevent expansion issues
  },
  title: {
    fontSize: Typography.xxxxxl,
    fontWeight: Typography.bold,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.lg,
    textAlign: "center",
    marginBottom: Spacing.xxl,
    lineHeight: Typography.lineHeightNormal * Typography.lg,
    opacity: 0.7,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: ThemeColors.light.backgroundSecondary,
    minHeight: ComponentSizes.input.lg,
    justifyContent: "center",
  },
  input: {
    fontSize: Typography.xl,
    paddingVertical: Spacing.md,
    fontWeight: Typography.medium,
  },
  button: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
    minHeight: ComponentSizes.button.lg,
    ...Shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
  },
  nameBackButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    fontSize: Typography.lg,
    fontWeight: Typography.medium,
  },
});
