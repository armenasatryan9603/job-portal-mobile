import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextStyle } from "react-native";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRateUnits } from "@/hooks/useRateUnits";
import { formatRateUnitLabel } from "@/utils/currencyRateUnit";
import { API_CONFIG } from "@/config/api";

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
        const rate = data?.rates?.[to] ?? data?.conversion_rates?.[to] ?? null;
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

interface PriceCurrencyProps {
  price: number | null | undefined;
  currency?: string | null;
  rateUnit?: string | null;
  showOriginal?: boolean;
  showRateUnit?: boolean;
  style?: TextStyle;
  originalStyle?: TextStyle;
  convertCurrency?: boolean;
  separator?: string;
}

export const PriceCurrency: React.FC<PriceCurrencyProps> = ({
  price,
  currency,
  rateUnit,
  showOriginal = false,
  showRateUnit = true,
  style,
  originalStyle,
  convertCurrency = true,
  separator = " • ",
}) => {
  const { language } = useLanguage();
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits = rateUnitsData || [];

  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [convertedCurrency, setConvertedCurrency] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!price || !convertCurrency) {
      setConvertedPrice(price || null);
      setConvertedCurrency((currency || "USD").toUpperCase());
      return;
    }

    let isActive = true;

    const convertPrice = async () => {
      const sourceCurrency = (currency || "USD").toUpperCase();
      const targetCurrency = getCurrencyForLanguage(language).toUpperCase();

      if (sourceCurrency === targetCurrency) {
        setConvertedPrice(price);
        setConvertedCurrency(targetCurrency);
        return;
      }

      const rate = await fetchConversionRate(sourceCurrency, targetCurrency);
      if (!isActive) return;

      if (rate) {
        setConvertedPrice(price * rate);
        setConvertedCurrency(targetCurrency);
      } else {
        // Fallback to original currency if conversion fails
        setConvertedPrice(price);
        setConvertedCurrency(sourceCurrency);
      }
    };

    convertPrice();

    return () => {
      isActive = false;
    };
  }, [price, currency, language, convertCurrency]);

  if (price === null || price === undefined || convertedPrice === null) {
    return null;
  }

  const sourceCurrency = (currency || "USD").toUpperCase();
  const rateUnitLabel = showRateUnit
    ? formatRateUnitLabel(rateUnit || "per_project", rateUnits, language)
    : null;

  const formattedConvertedPrice = Math.round(convertedPrice).toLocaleString();
  const formattedOriginalPrice = Math.round(price).toLocaleString();

  const showOriginalPrice =
    showOriginal && convertedCurrency !== sourceCurrency && convertCurrency;

  return (
    <View style={styles.container}>
      <Text style={[styles.price, style]}>
        {convertedCurrency} {formattedConvertedPrice}
        {rateUnitLabel && `${separator}${rateUnitLabel}`}
      </Text>
      {showOriginalPrice && (
        <Text style={[styles.originalPrice, originalStyle]}>
          {sourceCurrency} {formattedOriginalPrice}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
  },
  originalPrice: {
    fontSize: 12,
    opacity: 0.6,
  },
});
