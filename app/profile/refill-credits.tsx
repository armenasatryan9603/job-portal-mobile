import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PaymentWebView } from "@/components/PaymentWebView";
import {
  BorderRadius,
  Spacing,
  ThemeColors,
  Typography,
  Shadows,
} from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { apiService } from "@/services/api";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
} from "react-native";

const PRESET_AMOUNTS = [10, 25, 50, 100, 200, 500];

export default function RefillCreditsScreen() {
  useAnalytics("RefillCredits");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const header = (
    <Header
      title={t("refillCredits")}
      showBackButton={true}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
      onBackPress={() => router.back()}
    />
  );

  // Fetch current balance and refresh translations
  useEffect(() => {
    fetchCurrentBalance();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCurrentBalance = async () => {
    try {
      const profile = await apiService.getUserProfile();
      setCurrentBalance(profile.creditBalance || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return; // Only one decimal point allowed
    if (parts[1] && parts[1].length > 2) return; // Max 2 decimal places

    setCustomAmount(cleaned);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number | null => {
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    if (customAmount) {
      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        return null;
      }
      return amount;
    }
    return null;
  };

  const handleRefill = async () => {
    const amount = getFinalAmount();

    if (!amount || amount <= 0) {
      Alert.alert(t("error"), t("pleaseSelectAmount"));
      return;
    }

    if (amount < 1) {
      Alert.alert(t("error"), t("minimumAmountIs1"));
      return;
    }

    setLoading(true);

    try {
      const result = await apiService.initiateCreditRefill(amount);

      // Log full response for debugging
      console.log("🔍 Full payment response:", JSON.stringify(result, null, 2));

      // Extract payment URL from response
      // The backend should return paymentUrl in the response
      const url =
        result.paymentUrl ||
        result.paymentData?.PaymentURL ||
        result.paymentData?.paymentURL ||
        result.paymentData?.PaymentUrl ||
        result.paymentData?.url ||
        result.paymentData?.URL ||
        result.paymentData?.redirectUrl ||
        result.paymentData?.RedirectURL ||
        result.paymentData?.redirect_url ||
        result.paymentData?.FormActionURL ||
        result.paymentData?.formActionURL ||
        result.paymentData?.action ||
        result.paymentData?.Action ||
        result.paymentData?.PaymentLink ||
        result.paymentData?.paymentLink ||
        result.paymentData?.Link ||
        result.paymentData?.link;

      if (!url && !result.paymentHtml) {
        // If no URL, check if paymentData contains HTML form or other data
        console.error("❌ Payment URL not found in response");
        console.error(
          "Response structure:",
          Object.keys(result.paymentData || {})
        );
        Alert.alert(
          t("error"),
          t("paymentUrlNotAvailable") ||
            "Payment URL not available. Please contact support. Check console for details."
        );
        setLoading(false);
        return;
      }

      // Track payment initiated
      AnalyticsService.getInstance().logPaymentInitiated(
        result.orderId || `refill_${Date.now()}`,
        amount,
        "USD"
      );

      // Store payment details and show WebView
      setPaymentUrl(url || null);
      setPendingAmount(amount);
      setShowPaymentWebView(true);
    } catch (error: any) {
      console.error("Error initiating credit refill:", error);
      Alert.alert(t("error"), error.message || t("failedToInitiatePayment"));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Track payment completed
    AnalyticsService.getInstance().logPaymentCompleted(
      `refill_${Date.now()}`,
      pendingAmount,
      "USD"
    );

    // Refresh balance after successful payment
    await fetchCurrentBalance();

    Alert.alert(
      t("paymentSuccess"),
      `${t("paymentSuccessMessage")} ${pendingAmount.toFixed(2)} ${t(
        "credits"
      )}.`,
      [
        {
          text: t("ok"),
          onPress: () => {
            setShowPaymentWebView(false);
            setPaymentUrl(null);
            setPendingAmount(0);
            // Optionally go back to previous screen
            // router.back();
          },
        },
      ]
    );
  };

  const handlePaymentFailure = (error: string) => {
    Alert.alert(t("paymentFailed"), error || t("paymentFailedMessage"), [
      {
        text: t("ok"),
        onPress: () => {
          setShowPaymentWebView(false);
          setPaymentUrl(null);
          setPendingAmount(0);
        },
      },
    ]);
  };

  const handlePaymentClose = () => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    setPendingAmount(0);
  };

  const finalAmount = getFinalAmount();

  return (
    <Layout header={header}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Balance Card - Premium Design */}
            <View
              style={[
                styles.balanceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.tint + "40",
                },
              ]}
            >
              <View
                style={[
                  styles.balanceGradient,
                  {
                    backgroundColor: isDark
                      ? colors.tint + "15"
                      : colors.tint + "10",
                  },
                ]}
              >
                <View style={styles.balanceContent}>
                  <View style={styles.balanceHeader}>
                    <View
                      style={[
                        styles.balanceIconContainer,
                        { backgroundColor: colors.tint + "25" },
                      ]}
                    >
                      <IconSymbol
                        name="creditcard.fill"
                        size={28}
                        color={colors.tint}
                      />
                    </View>
                    <View style={styles.balanceTextContainer}>
                      <Text
                        style={[
                          styles.balanceLabel,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("currentBalance")}
                      </Text>
                      <Text
                        style={[styles.balanceAmount, { color: colors.tint }]}
                      >
                        {currentBalance.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.balanceCurrency,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("credits")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Amount Selection Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  name="dollarsign.circle.fill"
                  size={20}
                  color={colors.tint}
                />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("selectAmount")}
                </Text>
              </View>

              {/* Preset Amounts Grid */}
              <View style={styles.presetAmountsContainer}>
                <View style={styles.presetAmounts}>
                  {PRESET_AMOUNTS.map((amount) => {
                    const isSelected = selectedAmount === amount;
                    return (
                      <TouchableOpacity
                        key={amount}
                        style={[
                          styles.amountButton,
                          {
                            backgroundColor: isSelected
                              ? colors.tint
                              : colors.background,
                            borderColor: isSelected
                              ? colors.tint
                              : colors.border,
                          },
                          isSelected && styles.amountButtonSelected,
                        ]}
                        onPress={() => handleAmountSelect(amount)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <View style={styles.checkmarkContainer}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={18}
                              color="black"
                            />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.amountButtonText,
                            {
                              color: isSelected ? "black" : colors.text,
                              fontWeight: isSelected ? "700" : "600",
                            },
                          ]}
                        >
                          {amount}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Divider - Only show between preset and custom */}
              <View style={styles.dividerWrapper}>
                <View style={styles.dividerContainer}>
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                  <Text
                    style={[
                      styles.dividerText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t("or")}
                  </Text>
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                </View>
              </View>

              {/* Custom Amount Input */}
              <View style={styles.customAmountSection}>
                <Text
                  style={[styles.customAmountLabel, { color: colors.text }]}
                >
                  {t("orEnterCustomAmount")}
                </Text>
                <View
                  style={[
                    styles.customAmountInputContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: customAmount ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <IconSymbol
                    name="pencil.circle.fill"
                    size={20}
                    color={colors.tabIconDefault}
                  />
                  <TextInput
                    style={[styles.customAmountInput, { color: colors.text }]}
                    placeholder={t("enterAmount")}
                    placeholderTextColor={colors.tabIconDefault}
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.currencyLabel, { color: colors.text }]}>
                    {t("credits")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Summary Card - Animated */}
            {finalAmount && (
              <Animated.View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.tint + "40",
                  },
                ]}
              >
                <View style={styles.summaryHeader}>
                  <IconSymbol
                    name="info.circle.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>
                    {t("paymentSummary")}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <IconSymbol
                      name="dollarsign.circle"
                      size={18}
                      color={colors.tabIconDefault}
                    />
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>
                      {t("amount")}
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {finalAmount.toFixed(2)} {t("credits")}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <IconSymbol
                      name="creditcard.fill"
                      size={18}
                      color={colors.tabIconDefault}
                    />
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>
                      {t("currentBalance")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {currentBalance.toFixed(2)} {t("credits")}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <IconSymbol
                      name="plus.circle.fill"
                      size={18}
                      color={colors.tint}
                    />
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>
                      {t("newBalance")}
                    </Text>
                  </View>
                  <Text
                    style={[styles.summaryValueNew, { color: colors.tint }]}
                  >
                    {(currentBalance + finalAmount).toFixed(2)} {t("credits")}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Refill Button - Enhanced */}
            <TouchableOpacity
              style={[
                styles.refillButton,
                {
                  backgroundColor:
                    finalAmount && finalAmount > 0
                      ? colors.tint
                      : colors.tabIconDefault,
                },
                (!finalAmount || finalAmount <= 0) &&
                  styles.refillButtonDisabled,
                finalAmount &&
                  finalAmount > 0 &&
                  !loading &&
                  (styles.refillButtonActive as any),
              ]}
              onPress={handleRefill}
              disabled={!finalAmount || finalAmount <= 0 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="black" size="small" />
              ) : (
                <>
                  <IconSymbol name="creditcard.fill" size={22} color="black" />
                  <Text style={styles.refillButtonText}>
                    {t("refillCredits")}
                  </Text>
                  {finalAmount && finalAmount > 0 && (
                    <View style={styles.refillButtonBadge}>
                      <Text style={styles.refillButtonBadgeText}>
                        {finalAmount.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Info Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.infoHeader}>
                <View
                  style={[
                    styles.infoIconContainer,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <IconSymbol
                    name="info.circle.fill"
                    size={18}
                    color={colors.tint}
                  />
                </View>
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  {t("important")}
                </Text>
              </View>
              <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
                {t("creditRefillInfo")}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Payment WebView Modal */}
      <PaymentWebView
        visible={showPaymentWebView}
        paymentUrl={paymentUrl}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 2 * Spacing.xxxl,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  // Balance Card
  balanceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: "hidden",
    ...Shadows.md,
  },
  balanceGradient: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  balanceContent: {
    width: "100%",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  balanceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: Typography.sm,
    fontWeight: "500",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
    marginBottom: Spacing.xs,
  },
  balanceCurrency: {
    fontSize: Typography.lg,
    fontWeight: "500",
  },
  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
  },
  // Preset Amounts Container
  presetAmountsContainer: {
    width: "100%",
    marginBottom: 0,
  },
  // Preset Amounts
  presetAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    width: "100%",
  },
  amountButton: {
    flex: 1,
    minWidth: "30%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    position: "relative",
  },
  amountButtonSelected: {
    ...Shadows.sm,
    transform: [{ scale: 1.02 }],
  },
  checkmarkContainer: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
  },
  amountButtonText: {
    fontSize: Typography.xxxl,
    fontWeight: "600",
  },
  // Divider
  dividerWrapper: {
    width: "100%",
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: 0,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: Spacing.sm,
  },
  divider: {
    flex: 1,
    height: 1,
    maxHeight: 1,
  },
  dividerText: {
    fontSize: Typography.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    paddingHorizontal: Spacing.sm,
    flexShrink: 0,
  },
  // Custom Amount
  customAmountSection: {
    marginTop: Spacing.md,
  },
  customAmountLabel: {
    fontSize: Typography.lg,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  customAmountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 56,
  },
  customAmountInput: {
    flex: 1,
    fontSize: Typography.lg,
    fontWeight: "600",
    paddingVertical: Spacing.md,
  },
  currencyLabel: {
    fontSize: Typography.lg,
    fontWeight: "600",
  },
  // Summary Card
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: Typography.xxxl,
    fontWeight: "700",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  summaryRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  summaryLabel: {
    fontSize: Typography.lg,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: Typography.lg,
    fontWeight: "600",
  },
  summaryValueNew: {
    fontSize: Typography.xxxl,
    fontWeight: "700",
  },
  // Refill Button
  refillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    minHeight: 56,
    position: "relative",
  },
  refillButtonActive: {
    ...Shadows.lg,
  },
  refillButtonDisabled: {
    opacity: 0.5,
  },
  refillButtonText: {
    fontSize: Typography.xxxl,
    fontWeight: "700",
    color: "black",
  },
  refillButtonBadge: {
    position: "absolute",
    top: -8,
    right: 16,
    backgroundColor: "black",
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  refillButtonBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  // Info Card
  infoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  infoText: {
    fontSize: Typography.sm,
    lineHeight: 20,
  },
});
