import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  BorderRadius,
  ComponentSizes,
  Shadows,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import { useCreditCard } from "@/contexts/CreditCardContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { CreditCardErrors, CreditCardForm } from "@/types/creditCard";
import {
  formatCardNumber,
  validateCreditCardForm,
} from "@/utils/creditCardValidation";
import { router } from "expo-router";
import React, { useState } from "react";
import AnalyticsService from "@/categories/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button } from "@/components/ui/button";

export default function AddCreditCardScreen() {
  useAnalytics("AddCreditCard");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { addCreditCard, isLoading } = useCreditCard();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [form, setForm] = useState<CreditCardForm>({
    cardNumber: "",
    cardholderName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  });

  const [errors, setErrors] = useState<CreditCardErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const header = (
    <Header
      title={t("addCreditCard")}
      showBackButton={true}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
      onBackPress={() => router.back()}
    />
  );

  const handleInputChange = (field: keyof CreditCardForm, value: string) => {
    let formattedValue = value;

    // Format card number with spaces
    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value.replace(/\s/g, "").slice(0, 16));
    }

    // Limit expiry month to 2 digits
    if (field === "expiryMonth") {
      formattedValue = value.replace(/\D/g, "").slice(0, 2);
    }

    // Limit expiry year to 4 digits
    if (field === "expiryYear") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }

    // Limit CVV to 4 digits (Amex) or 3 digits (others)
    if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }

    // Format cardholder name (letters and spaces only)
    if (field === "cardholderName") {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, "");
    }

    setForm((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleInputBlur = (field: keyof CreditCardForm) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Validate individual field on blur
    const { errors: validationErrors } = validateCreditCardForm(form);
    if (validationErrors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validationErrors[field],
      }));
    }
  };

  const handleSubmit = async () => {
    // Mark all fields as touched
    setTouched({
      cardNumber: true,
      cardholderName: true,
      expiryMonth: true,
      expiryYear: true,
      cvv: true,
    });

    const { isValid, errors: validationErrors } = validateCreditCardForm(form);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    try {
      const success = await addCreditCard({
        cardNumber: form.cardNumber.replace(/\s/g, ""),
        cardholderName: form.cardholderName.trim(),
        expiryMonth: form.expiryMonth,
        expiryYear: form.expiryYear,
        cvv: form.cvv,
        cardType: "auto-detect", // Will be detected in context
      });

      if (success) {
        // Track credit card added
        AnalyticsService.getInstance().logEvent("credit_card_added", {
          card_type: "credit_card",
        });
        // Credit card added successfully
        router.back();
      } else {
        Alert.alert(t("error"), t("failedToAddCreditCard"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("somethingWentWrong"));
    }
  };

  const getCardType = () => {
    const cleanNumber = form.cardNumber.replace(/\s/g, "");
    if (/^4/.test(cleanNumber)) return "visa";
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber))
      return "mastercard";
    if (/^3[47]/.test(cleanNumber)) return "amex";
    if (/^6(?:011|5)/.test(cleanNumber)) return "discover";
    return "unknown";
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );

  return (
    <Layout header={header}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1, marginBottom: 4 * Spacing.xxl }}
          contentContainerStyle={{ padding: Spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View
            style={[styles.cardPreview, { backgroundColor: colors.primary }]}
          >
            <View style={styles.cardHeader}>
              <IconSymbol name="creditcard.fill" size={32} color="white" />
              <ThemedText style={styles.cardBrand}>
                {getCardType().toUpperCase()}
              </ThemedText>
            </View>

            <ThemedText style={styles.cardNumber}>
              {form.cardNumber || "**** **** **** ****"}
            </ThemedText>

            <View style={styles.cardFooter}>
              <View>
                <ThemedText style={styles.cardLabel}>
                  {t("cardholder")}
                </ThemedText>
                <ThemedText style={styles.cardValue}>
                  {form.cardholderName.toUpperCase() || t("yourName")}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={styles.cardLabel}>{t("expires")}</ThemedText>
                <ThemedText style={styles.cardValue}>
                  {form.expiryMonth && form.expiryYear
                    ? `${form.expiryMonth.padStart(
                        2,
                        "0"
                      )}/${form.expiryYear.slice(-2)}`
                    : "MM/YY"}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.formTitle, { color: colors.text }]}>
              {t("cardInformation")}
            </ThemedText>

            {/* Card Number */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.text }]}>
                {t("cardNumber")} *
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: errors.cardNumber
                      ? colors.error
                      : colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={form.cardNumber}
                  onChangeText={(value) =>
                    handleInputChange("cardNumber", value)
                  }
                  onBlur={() => handleInputBlur("cardNumber")}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={19}
                />
                <IconSymbol
                  name="creditcard.fill"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              {touched.cardNumber && errors.cardNumber && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {errors.cardNumber}
                </ThemedText>
              )}
            </View>

            {/* Cardholder Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.text }]}>
                {t("cardholderName")} *
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.inputContainer,
                  {
                    color: colors.text,
                    borderColor: errors.cardholderName
                      ? colors.error
                      : colors.border,
                  },
                ]}
                value={form.cardholderName}
                onChangeText={(value) =>
                  handleInputChange("cardholderName", value)
                }
                onBlur={() => handleInputBlur("cardholderName")}
                placeholder={t("johnDoe")}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
              {touched.cardholderName && errors.cardholderName && (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {errors.cardholderName}
                </ThemedText>
              )}
            </View>

            {/* Expiry Date and CVV */}
            <View style={styles.row}>
              <View
                style={[
                  styles.inputGroup,
                  { flex: 1, marginRight: Spacing.md },
                ]}
              >
                <ThemedText style={[styles.label, { color: colors.text }]}>
                  {t("expiryMonth")} *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputContainer,
                    {
                      color: colors.text,
                      borderColor: errors.expiryMonth
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                  value={form.expiryMonth}
                  onChangeText={(value) =>
                    handleInputChange("expiryMonth", value)
                  }
                  onBlur={() => handleInputBlur("expiryMonth")}
                  placeholder={t("mm")}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={2}
                />
                {touched.expiryMonth && errors.expiryMonth && (
                  <ThemedText
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {errors.expiryMonth}
                  </ThemedText>
                )}
              </View>

              <View
                style={[
                  styles.inputGroup,
                  { flex: 1, marginRight: Spacing.md },
                ]}
              >
                <ThemedText style={[styles.label, { color: colors.text }]}>
                  {t("expiryYear")} *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputContainer,
                    {
                      color: colors.text,
                      borderColor: errors.expiryYear
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                  value={form.expiryYear}
                  onChangeText={(value) =>
                    handleInputChange("expiryYear", value)
                  }
                  onBlur={() => handleInputBlur("expiryYear")}
                  placeholder={t("yyyy")}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                />
                {touched.expiryYear && errors.expiryYear && (
                  <ThemedText
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {errors.expiryYear}
                  </ThemedText>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={[styles.label, { color: colors.text }]}>
                  {t("cvv")} *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputContainer,
                    {
                      color: colors.text,
                      borderColor: errors.cvv ? colors.error : colors.border,
                    },
                  ]}
                  value={form.cvv}
                  onChangeText={(value) => handleInputChange("cvv", value)}
                  onBlur={() => handleInputBlur("cvv")}
                  placeholder="123"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  maxLength={getCardType() === "amex" ? 4 : 3}
                  secureTextEntry
                />
                {touched.cvv && errors.cvv && (
                  <ThemedText
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {errors.cvv}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Security Note */}
            <View
              style={[
                styles.securityNote,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <IconSymbol
                name="lock.shield"
                size={20}
                color={colors.textSecondary}
              />
              <ThemedText
                style={[styles.securityText, { color: colors.textSecondary }]}
              >
                {t("securityNote")}
              </ThemedText>
            </View>

            {/* Submit Button */}
            <Button
              title={isLoading ? t("addingCard") : t("addCreditCard")}
              variant="primary"
              icon="plus"
              iconSize={14}
              style={{ paddingBlock: 16 }}
              onPress={handleSubmit}
              disabled={isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  cardPreview: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    minHeight: 160,
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardBrand: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: "white",
  },
  cardNumber: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: "white",
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: Typography.xs,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: Spacing.xs,
  },
  cardValue: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: "white",
  },
  form: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  formTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: ComponentSizes.input.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.lg,
    fontWeight: Typography.medium,
  },
  row: {
    flexDirection: "row",
  },
  errorText: {
    fontSize: Typography.sm,
    marginTop: Spacing.xs,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  securityText: {
    fontSize: Typography.sm,
    marginLeft: Spacing.md,
    flex: 1,
    lineHeight: Typography.lineHeightRelaxed * Typography.sm,
  },
  submitButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    ...Shadows.md,
  },
  submitButtonText: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
  },
});
