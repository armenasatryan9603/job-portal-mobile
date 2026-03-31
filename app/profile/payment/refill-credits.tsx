import { ActivityIndicator, Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal }
from "react-native";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useIsWeb } from "@/utils/isWeb";
import {
  BorderRadius,
  Shadows,
  Spacing,
  ThemeColors,
  Typography,
} from "@/constants/styles";
import React, { useCallback, useEffect, useState } from "react";

import { API_CONFIG } from "@/config/api";
import AnalyticsService from "@/categories/AnalyticsService";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Layout } from "@/components/Layout";
import { PaymentWebView } from "@/components/PaymentWebView";
import { apiService } from "@/categories/api";
import { router, useFocusEffect } from "expo-router";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditCard } from "@/contexts/CreditCardContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";

export default function RefillCreditsScreen() {
  useAnalytics("RefillCredits");
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const isDesktopWeb = useIsWeb();
  const { unreadNotificationsCount, unreadMessagesCount } = useUnreadCount();
  const { creditCards, isLoadingCards, syncCardsFromBank, refreshCards } = useCreditCard();
  const { updateUser } = useAuth();
  const colors = ThemeColors[isDark ? "dark" : "light"];

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardSelectionInitialised, setCardSelectionInitialised] = useState(false);
  const [loading, setLoading] = useState(false);
  const [baseBalance, setBaseBalance] = useState<number>(0); // Balance in USD (base currency)
  const [convertedBalance, setConvertedBalance] = useState<number>(0); // Balance in selected currency (for display)
  const [currency, setCurrency] = useState<string>("USD");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const currencyOptions = ["USD", "EUR", "AMD", "RUB"];
  const [conversionInfo, setConversionInfo] = useState<{
    currency: string;
    originalAmount: number;
    convertedAmount: number;
    exchangeRate: number;
    baseCurrency: string;
  } | null>(null);

  const header = (
    <Header
      title={t("refillCredits")}
      showBackButton={true}
      unreadNotificationsCount={unreadNotificationsCount}
      unreadMessagesCount={unreadMessagesCount}
      onBackPress={() => router.back()}
    />
  );

  // Refresh cards when screen comes into focus (e.g., after payment callback)
  useFocusEffect(
    useCallback(() => {
      refreshCards();
    }, [refreshCards])
  );

  // Auto-select the first saved card that has a valid bindingId once cards load
  useEffect(() => {
    if (!isLoadingCards && !cardSelectionInitialised) {
      const firstUsable = creditCards.find(
        (c) => c.bindingId && typeof c.bindingId === "string" && c.bindingId.trim().length > 0
      );
      if (firstUsable) setSelectedCardId(firstUsable.id);
      setCardSelectionInitialised(true);
    }
  }, [isLoadingCards, creditCards, cardSelectionInitialised]);

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
      const balanceInUSD = profile.creditBalance || 0;
      setBaseBalance(balanceInUSD);
      setCurrency(profile.currency || "USD");
      
      // Update AsyncStorage cache with full profile data
      await updateUser(profile);
      // Initial conversion will happen in useEffect when currency is set
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // Helper function to fetch exchange rate (similar to ApplyButton.tsx)
  const fetchConversionRate = async (
    from: string,
    to: string
  ): Promise<number | null> => {
    const fetchWithTimeout = async (url: string, timeout: number = 5000) => {
      return Promise.race([
        fetch(url),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), timeout)
        ) as Promise<Response>,
      ]);
    };

    const frankfurterBase =
      API_CONFIG.FRANKFURTER_API_URL || "https://api.frankfurter.app";
    const attempts = [
      `${frankfurterBase}/latest?from=${from}&to=${to}`,
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`,
    ];

    for (const url of attempts) {
      try {
        const response = await fetchWithTimeout(url);
        if (response.ok) {
          const data = await response.json();
          const rate =
            data?.rates?.[to] ?? data?.conversion_rates?.[to] ?? null;
          if (typeof rate === "number") {
            return rate;
          }
        }
      } catch {
        // Try next provider
      }
    }

    return null;
  };

  // Convert balance when currency changes
  useEffect(() => {
    const convertBalance = async () => {
      if (baseBalance === 0) return; // Wait for balance to load

      // If currency is USD, no conversion needed
      if (currency === "USD") {
        setConvertedBalance(baseBalance);
        setExchangeRate(1);
        return;
      }

      setIsLoadingRate(true);
      try {
        const rate = await fetchConversionRate("USD", currency);
        if (rate) {
          setExchangeRate(rate);
          setConvertedBalance(Math.round(baseBalance * rate * 100) / 100);
        } else {
          // Fallback: show USD if conversion fails
          setConvertedBalance(baseBalance);
          setExchangeRate(1);
        }
      } catch (error) {
        console.error("Error converting balance:", error);
        setConvertedBalance(baseBalance);
        setExchangeRate(1);
      } finally {
        setIsLoadingRate(false);
      }
    };

    convertBalance();
  }, [currency, baseBalance]);

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
      // If saved card is selected, use direct payment (no webview)
      if (selectedCardId) {
        // Verify the selected card has a bindingId
        const selectedCard = creditCards.find((card) => card.id === selectedCardId);
        if (!selectedCard || !selectedCard.bindingId) {
          Alert.alert( t("error"), t("cardNotSaved"));
          setLoading(false);
          return;
        }

        const screen = Dimensions.get("screen");
        const clientBrowserInfo = {
          screenWidth: Math.round(screen.width),
          screenHeight: Math.round(screen.height),
          browserLanguage:
            Intl.DateTimeFormat().resolvedOptions().locale ?? "en-US",
          browserTimeZoneOffset: new Date().getTimezoneOffset(),
        };

        const result = await apiService.refillWithSavedCard(
          amount,
          currency,
          selectedCardId,
          clientBrowserInfo
        );

        if (result.success) {
          // Track payment completed
          AnalyticsService.getInstance().logPaymentCompleted(
            result.orderId || `refill_${Date.now()}`,
            amount,
            currency
          );

          // Refresh balance
          await fetchCurrentBalance();

          // Build success message
          let successMessage = `${t("paymentSuccessMessage")} ${amount.toFixed(2)} ${currency}`;
          if (result.conversionInfo) {
            successMessage += ` (${result.conversionInfo.convertedAmount.toFixed(2)} ${result.conversionInfo.baseCurrency} credits)`;
          }
          successMessage += ".";

          Alert.alert(t("paymentSuccess"), successMessage, [
            {
              text: t("ok"),
              onPress: () => {
                // Reset form
                setSelectedAmount(null);
                setCustomAmount("");
              },
            },
          ]);
        } else if (result.requires3ds && result.challengeUrl && result.cReq) {
          // The ACS endpoint requires a POST with `creq` — open our backend
          // bridge that auto-submits the form so the WebView sees a normal page.
          const bridgeUrl =
            `${API_CONFIG.BASE_URL}/credit/3ds/challenge` +
            `?acsUrl=${encodeURIComponent(result.challengeUrl)}` +
            `&cReq=${encodeURIComponent(result.cReq)}`;
          setPendingAmount(amount);
          setPaymentUrl(bridgeUrl);
          setShowPaymentWebView(true);
        } else {
          Alert.alert(t("paymentFailed"), result.message || t("paymentFailedMessage"));
        }
        setLoading(false);
        return;
      }

      // New card payment - use webview flow
      const result = await apiService.initiateCreditRefill(
        amount,
        currency,
        undefined
      );

      // Extract payment URL from response
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
        currency
      );

      // Store payment details and show WebView
      setPaymentUrl(url || null);
      setPendingAmount(amount);
      setConversionInfo(result.conversionInfo || null);
      setShowPaymentWebView(true);
    } catch (error: any) {
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
      currency
    );

    // Refresh balance after successful payment
    await fetchCurrentBalance();
    
    // Sync cards to get updated binding info if card was saved
    await syncCardsFromBank();

    // Build success message with conversion info if available
    let successMessage = `${t("paymentSuccessMessage")} ${pendingAmount.toFixed(
      2
    )} ${currency}`;
    if (conversionInfo) {
      successMessage += ` (${conversionInfo.convertedAmount.toFixed(2)} ${
        conversionInfo.baseCurrency
      } credits)`;
    }
    successMessage += ".";

    Alert.alert(t("paymentSuccess"), successMessage, [
      {
        text: t("ok"),
        onPress: () => {
          setShowPaymentWebView(false);
          setPaymentUrl(null);
          setPendingAmount(0);
          setConversionInfo(null);
          // Optionally go back to previous screen
          // router.back();
        },
      },
    ]);
  };

  const handlePaymentFailure = (error: string) => {
    Alert.alert(t("paymentFailed"), error || t("paymentFailedMessage"), [
      {
        text: t("ok"),
        onPress: () => {
          setShowPaymentWebView(false);
          setPaymentUrl(null);
          setPendingAmount(0);
          setConversionInfo(null);
        },
      },
    ]);
  };

  const handlePaymentClose = () => {
    // Called only when the user manually closes the browser without completing payment.
    // Success/failure are handled exclusively by handlePaymentSuccess/handlePaymentFailure
    // via the deep-link callback, so no balance check is needed here.
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    setPendingAmount(0);
    setConversionInfo(null);
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
                        size={20}
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
                        {isLoadingRate ? (
                          <ActivityIndicator size="small" color={colors.tint} />
                        ) : (
                          `${convertedBalance.toFixed(2)} ${currency}`
                        )}
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

            {/* Card Selection Section */}
            {!isLoadingCards && creditCards.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, marginBottom: Spacing.sm },
                  ]}
                >
                  {t("selectPaymentMethod")}
                </Text>
                <View
                  style={[
                    styles.cardSelectionContainer,
                    { backgroundColor: colors.surface, borderColor: "transparent" },
                  ]}
                >
                  {/* New Card Option */}
                  <TouchableOpacity
                    style={[
                      styles.cardOption,
                      {
                        backgroundColor:
                          selectedCardId === null
                            ? colors.tint + "10"
                            : "transparent",
                        borderColor:
                          selectedCardId === null ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCardId(null)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardOptionContent}>
                      <IconSymbol
                        name="plus.circle.fill"
                        size={20}
                        color={selectedCardId === null ? colors.tint : colors.tabIconDefault}
                      />
                      <Text
                        style={[
                          styles.cardOptionText,
                          {
                            color:
                              selectedCardId === null
                                ? colors.tint
                                : colors.text,
                            fontWeight:
                              selectedCardId === null ? "600" : "400",
                          },
                        ]}
                      >
                        {t("newCard")}
                      </Text>
                    </View>
                    {selectedCardId === null && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={18}
                        color={colors.tint}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Saved Cards */}
                  {creditCards.map((card) => {
                    // Check if bindingId exists and is a non-empty string
                    const hasBindingId = card.bindingId && typeof card.bindingId === 'string' && card.bindingId.trim().length > 0;
                    const isSelected = selectedCardId === card.id;
                    const isDisabled = !hasBindingId;

                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.cardOption,
                          {
                            backgroundColor:
                              isSelected
                                ? colors.tint + "10"
                                : "transparent",
                            borderColor:
                              isSelected
                                ? colors.tint
                                : isDisabled
                                ? colors.border + "60"
                                : colors.border,
                            opacity: isDisabled ? 0.6 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (!isDisabled) {
                            setSelectedCardId(card.id);
                          }
                        }}
                        activeOpacity={isDisabled ? 1 : 0.7}
                        disabled={isDisabled}
                      >
                        <View style={styles.cardOptionContent}>
                          <IconSymbol
                            name="creditcard.fill"
                            size={20}
                            color={
                              isSelected
                                ? colors.tint
                                : isDisabled
                                ? colors.tabIconDefault + "80"
                                : colors.tabIconDefault
                            }
                          />
                          <View style={styles.cardInfo}>
                            <Text
                              style={[
                                styles.cardNumber,
                                {
                                  color:
                                    isSelected
                                      ? colors.tint
                                      : isDisabled
                                      ? colors.text + "80"
                                      : colors.text,
                                  fontWeight:
                                    isSelected ? "600" : "400",
                                },
                              ]}
                            >
                              {card.cardType.toUpperCase()} {card.cardNumber.slice(-4)}
                            </Text>
                            <Text
                              style={[
                                styles.cardExpiry,
                                { color: colors.tabIconDefault + (isDisabled ? "80" : "") },
                              ]}
                            >
                              {card.expiryMonth}/{card.expiryYear}
                              {card.isDefault && " • " + (t("default"))}
                              {!hasBindingId && " • " + (t("saveCardToUse"))}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={18}
                            color={colors.tint}
                          />
                        )}
                        {isDisabled && (
                          <IconSymbol
                            name="lock.fill"
                            size={16}
                            color={colors.tabIconDefault + "80"}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* No cards hint */}
            {!isLoadingCards && creditCards.length === 0 && (
              <View
                style={[
                  styles.section,
                  styles.noCardsSection,
                  { backgroundColor: colors.surface, borderColor: "transparent" },
                ]}
              >
                <View style={styles.noCardsHeader}>
                  <IconSymbol name="creditcard.fill" size={18} color={colors.tint} />
                  <Text style={[styles.noCardsSectionTitle, { color: colors.text }]}>
                    {t("payWithCard")}
                  </Text>
                </View>
                <Text style={[styles.noCardsDescription, { color: colors.tabIconDefault }]}>
                  {t("selectAmountAndProceed")}
                </Text>
              </View>
            )}

            {/* Amount Selection Section */}
            <View style={styles.section}>
              {/* Custom Amount Input */}
              <View style={styles.customAmountSection}>
                <View
                  style={[
                    styles.customAmountInputContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: customAmount ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <IconSymbol
                    name="pencil.circle.fill"
                    size={16}
                    color={colors.tabIconDefault}
                  />
                  <AppTextInput
                    style={[styles.customAmountInput, { color: colors.text }]}
                    placeholder={t("enterAmount")}
                    placeholderTextColor={colors.tabIconDefault}
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.currencyLabel, { color: colors.text }]}>
                    {/* {currency} */}
                    <TouchableOpacity
                      style={[styles.currencySelectorButton]}
                      onPress={() => setShowCurrencyModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.currencySelectorText,
                          { color: colors.text },
                        ]}
                      >
                        {currency}
                      </Text>
                      <IconSymbol
                        name="chevron.down"
                        size={14}
                        color={colors.tabIconDefault}
                      />
                    </TouchableOpacity>
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
                    size={16}
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
                      size={14}
                      color={colors.tabIconDefault}
                    />
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>
                      {t("amount")}
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {finalAmount.toFixed(2)} {currency}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <IconSymbol
                      name="creditcard.fill"
                      size={14}
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
                    {isLoadingRate ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.tabIconDefault}
                      />
                    ) : (
                      `${convertedBalance.toFixed(2)} ${currency}`
                    )}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <IconSymbol
                      name="plus.circle.fill"
                      size={14}
                      color={colors.tint}
                    />
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>
                      {t("newBalance")}
                    </Text>
                  </View>
                  <Text
                    style={[styles.summaryValueNew, { color: colors.tint }]}
                  >
                    {isLoadingRate ? (
                      <ActivityIndicator size="small" color={colors.tint} />
                    ) : (
                      `${(convertedBalance + finalAmount).toFixed(
                        2
                      )} ${currency}`
                    )}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Refill Button - Enhanced */}
            <View style={{ position: "relative", marginBottom: Spacing.md }}>
              <Button
                onPress={handleRefill}
                title={t("refillCredits")}
                icon="creditcard.fill"
                loading={loading}
                disabled={!finalAmount || finalAmount <= 0 || loading}
              />
              {finalAmount && finalAmount > 0 && (
                <View style={styles.refillButtonBadge}>
                  <Text style={styles.refillButtonBadgeText}>
                    {finalAmount.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>

            {/* Info Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: "transparent",
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
                    size={14}
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

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType={isDesktopWeb ? 'fade' : 'slide'}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.selectorModalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("selectCurrency")}
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <IconSymbol name="xmark" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            {currencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  {
                    backgroundColor:
                      currency === option ? colors.tint + "10" : "transparent",
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setCurrency(option);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>
                  {option}
                </Text>
                {currency === option && (
                  <IconSymbol name="checkmark" size={14} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: Spacing.xl,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  // Balance Card
  balanceCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
    ...Shadows.md,
  },
  balanceGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  balanceContent: {
    width: "100%",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: Typography.xs,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 2,
  },
  balanceCurrency: {
    fontSize: Typography.sm,
    fontWeight: "500",
  },
  // Section
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  // Card Selection
  cardSelectionContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.xs,
  },
  cardOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  cardOptionText: {
    fontSize: Typography.md,
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  cardNumber: {
    fontSize: Typography.md,
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: Typography.xs,
  },
  noCardsSection: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  noCardsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  noCardsSectionTitle: {
    fontSize: Typography.md,
    fontWeight: "600",
  },
  noCardsDescription: {
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  // Custom Amount
  customAmountSection: {
    marginTop: Spacing.sm,
  },
  customAmountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    minHeight: 44,
  },
  customAmountInput: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: "600",
    paddingVertical: Spacing.sm,
  },
  currencyLabel: {
    fontSize: Typography.md,
    fontWeight: "600",
  },
  // Summary Card
  summaryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontSize: Typography.xl,
    fontWeight: "700",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  summaryRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  summaryLabel: {
    fontSize: Typography.md,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: Typography.md,
    fontWeight: "600",
  },
  summaryValueNew: {
    fontSize: Typography.xl,
    fontWeight: "700",
  },
  refillButtonBadge: {
    position: "absolute",
    top: -6,
    right: 12,
    // Note: Should use colors.text dynamically - consider inline style
    backgroundColor: "black",
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  refillButtonBadgeText: {
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  // Info Card
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  infoIconContainer: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: Typography.md,
    fontWeight: "700",
  },
  infoText: {
    fontSize: Typography.xs,
    lineHeight: 16,
  },
  // Currency Selector
  currencySelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currencySelectorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  selectorModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginLeft: 10,
  },
});
