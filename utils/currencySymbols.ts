/**
 * Prefix/symbol for price inputs (specialist profile, etc.).
 * Unknown ISO codes fall back to the code + space.
 */
export function getCurrencySymbol(code: string | null | undefined): string {
  const c = (code || "AMD").toUpperCase();
  switch (c) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "RUB":
      return "₽";
    case "AMD":
      return "֏";
    case "JPY":
    case "CNY":
      return "¥";
    default:
      return `${c} `;
  }
}
