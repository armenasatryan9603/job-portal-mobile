import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Order, apiService } from "@/services/api";
import { API_CONFIG } from "@/config/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors } from "@/constants/styles";

interface ApplyButtonProps {
  order: Order;
  hasAppliedToOrder?: (orderId: number) => boolean;
  onApply: (order: Order) => void;
  style?: any;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
  en: "USD",
  ru: "RUB",
  hy: "AMD",
};

const getCurrencyForLanguage = (language: string) =>
  LANGUAGE_CURRENCY_MAP[language] || LANGUAGE_CURRENCY_MAP.en;

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
          data?.rates?.[to] ??
          data?.conversion_rates?.[to] ?? // exchangerate-api format
          null;
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

export const ApplyButton: React.FC<ApplyButtonProps> = ({
  order,
  hasAppliedToOrder = () => false,
  onApply,
  style,
  variant = "primary",
}) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  // Determine text color based on variant
  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "#fff";
      case "secondary":
        return colors.textInverse || "#fff";
      case "outline":
      case "ghost":
        return colors.tint;
      default:
        return "#fff";
    }
  };

  const textColor = getTextColor();
  const secondaryTextColor =
    variant === "primary" || variant === "secondary"
      ? "rgba(255, 255, 255, 0.7)"
      : `${colors.tabIconDefault}CC`;

  const [convertedBudget, setConvertedBudget] = useState<number | null>(null);
  const [convertedCurrency, setConvertedCurrency] = useState<string | null>(
    null
  );

  // Convert budget to language currency when different
  useEffect(() => {
    let isActive = true;

    const convertBudget = async () => {
      if (order.budget === null || order.budget === undefined) {
        setConvertedBudget(null);
        setConvertedCurrency(null);
        return;
      }

      const sourceCurrency = (order.currency || "USD").toUpperCase();
      const targetCurrency = getCurrencyForLanguage(language).toUpperCase();

      if (sourceCurrency === targetCurrency) {
        setConvertedBudget(null);
        setConvertedCurrency(null);
        return;
      }

      const rate = await fetchConversionRate(sourceCurrency, targetCurrency);
      if (!isActive) return;

      if (rate) {
        setConvertedBudget(order.budget * rate);
        setConvertedCurrency(targetCurrency);
      } else {
        setConvertedBudget(null);
        setConvertedCurrency(null);
      }
    };

    convertBudget();

    return () => {
      isActive = false;
    };
  }, [order.budget, order.currency, language]);

  const formatAmount = (amount: number, currencyCode: string) =>
    `${currencyCode.toUpperCase()} ${amount.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;

  const baseBudgetLabel =
    order.budget !== null && order.budget !== undefined
      ? formatAmount(order.budget, order.currency || "USD")
      : null;

  const convertedBudgetLabel =
    convertedBudget !== null && convertedCurrency
      ? formatAmount(convertedBudget, convertedCurrency)
      : null;

  // Don't show button if:
  // - Order is not open
  // - User has already applied
  // - User is the order owner
  // - No credit cost (though we're using currency now, so this might not apply)
  if (
    order.status !== "open" ||
    hasAppliedToOrder(order.id) ||
    user?.id === order.clientId
  ) {
    // Show "Applied" button if user has applied
    if (
      hasAppliedToOrder(order.id) &&
      user?.id !== order.clientId &&
      order.status === "open"
    ) {
      return (
        <Button
          style={style}
          onPress={() => {}}
          variant={variant}
          icon="checkmark.circle.fill"
          iconSize={16}
          iconPosition="left"
          disabled={true}
        >
          <Text style={[styles.appliedButtonText, { color: textColor }]}>
            {t("applied")}
          </Text>
        </Button>
      );
    }
    return null;
  }

  return (
    <Button
      style={style}
      onPress={() => onApply(order)}
      icon="paperplane.fill"
      variant={variant}
    >
      <View style={styles.applyButtonContent}>
        <Text
          style={[styles.applyButtonText, { color: textColor }]}
          numberOfLines={1}
        >
          {t("apply") || "Apply"}
        </Text>
        {baseBudgetLabel && (
          <View style={styles.applyButtonPriceContainer}>
            <Text
              style={[styles.applyButtonPrice, { color: textColor }]}
              numberOfLines={1}
            >
              {baseBudgetLabel}
            </Text>
            {convertedBudgetLabel && (
              <Text
                style={[
                  styles.applyButtonPriceConverted,
                  { color: secondaryTextColor },
                ]}
                numberOfLines={1}
              >
                {convertedBudgetLabel}
              </Text>
            )}
          </View>
        )}
      </View>
    </Button>
  );
};

const styles = StyleSheet.create({
  applyButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  applyButtonPriceContainer: {
    alignItems: "center",
    gap: 1,
  },
  applyButtonPrice: {
    fontSize: 11,
    fontWeight: "600",
  },
  applyButtonPriceConverted: {
    fontSize: 9,
    fontWeight: "500",
  },
  appliedButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
