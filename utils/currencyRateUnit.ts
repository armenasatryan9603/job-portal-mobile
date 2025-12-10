import { RateUnit } from "@/hooks/useRateUnits";

/**
 * Get rate unit label for a specific language
 */
export const getRateUnitLabelForLanguage = (
  unit: RateUnit,
  language: string
): string => {
  switch (language) {
    case "ru":
      return unit.labelRu;
    case "hy":
      return unit.labelHy;
    case "en":
    default:
      return unit.labelEn;
  }
};

/**
 * Format rate unit label from value and language
 * Falls back to original value if unit not found
 */
export const formatRateUnitLabel = (
  value: string | null | undefined,
  rateUnits: RateUnit[],
  language: string,
  defaultValue: string = "per project"
): string => {
  if (!value) {
    // Find default from API options
    const defaultUnit = rateUnits.find((u) => u.value === defaultValue);
    if (defaultUnit) {
      return getRateUnitLabelForLanguage(defaultUnit, language);
    }
    return defaultValue;
  }

  // Find the rate unit in our options
  const unit = rateUnits.find(
    (u) => u.value.toLowerCase() === value.toLowerCase()
  );

  if (unit) {
    return getRateUnitLabelForLanguage(unit, language);
  }

  // For custom values not in the API, return the original value with proper formatting
  return value.replace(/_/g, " ").trim();
};

/**
 * Format price display with currency and rate unit
 */
export const formatPriceDisplay = (
  price: number | null | undefined,
  currency: string | null | undefined,
  rateUnit: string | null | undefined,
  rateUnits: RateUnit[],
  language: string,
  options?: {
    defaultCurrency?: string;
    defaultRateUnit?: string;
    showCurrency?: boolean;
    showRateUnit?: boolean;
  }
): string => {
  const {
    defaultCurrency = "USD",
    defaultRateUnit = "per project",
    showCurrency = true,
    showRateUnit = true,
  } = options || {};

  if (price === null || price === undefined) {
    return "";
  }

  const currencyCode = (currency || defaultCurrency).toUpperCase();
  const rateUnitLabel = formatRateUnitLabel(
    rateUnit || defaultRateUnit,
    rateUnits,
    language,
    defaultRateUnit
  );

  const formattedPrice = price.toLocaleString();

  if (showCurrency && showRateUnit) {
    return `${currencyCode} ${formattedPrice} • ${rateUnitLabel}`;
  } else if (showCurrency) {
    return `${currencyCode} ${formattedPrice}`;
  } else if (showRateUnit) {
    return `${formattedPrice} • ${rateUnitLabel}`;
  } else {
    return formattedPrice;
  }
};

/**
 * Format price range display with currency and rate unit
 */
export const formatPriceRangeDisplay = (
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
  currency: string | null | undefined,
  rateUnit: string | null | undefined,
  rateUnits: RateUnit[],
  language: string,
  options?: {
    defaultCurrency?: string;
    defaultRateUnit?: string;
    showCurrency?: boolean;
    showRateUnit?: boolean;
  }
): string => {
  const {
    defaultCurrency = "USD",
    defaultRateUnit = "per project",
    showCurrency = true,
    showRateUnit = true,
  } = options || {};

  if (minPrice === null || minPrice === undefined) {
    return "";
  }

  const currencyCode = (currency || defaultCurrency).toUpperCase();
  const rateUnitLabel = formatRateUnitLabel(
    rateUnit || defaultRateUnit,
    rateUnits,
    language,
    defaultRateUnit
  );

  const formattedMinPrice = minPrice.toLocaleString();
  const priceRange = maxPrice
    ? `${formattedMinPrice}-${maxPrice.toLocaleString()}`
    : `${formattedMinPrice}+`;

  if (showCurrency && showRateUnit) {
    return `${currencyCode} ${priceRange} • ${rateUnitLabel}`;
  } else if (showCurrency) {
    return `${currencyCode} ${priceRange}`;
  } else if (showRateUnit) {
    return `${priceRange} • ${rateUnitLabel}`;
  } else {
    return priceRange;
  }
};
