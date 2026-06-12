/**
 * Currency and number formatting utilities.
 * Uses locale-appropriate number systems: en-IN for INR (lakhs/crores),
 * en-US for all other currencies.
 */

const LOCALE_MAP: Record<string, string> = {
  INR: "en-IN",
};

export function getLocale(currency: string): string {
  return LOCALE_MAP[currency] ?? "en-US";
}

/**
 * Format a monetary value with the correct currency symbol and locale.
 *
 * Examples:
 *   formatCurrency(406182, "INR")              → "₹4,06,182"
 *   formatCurrency(54.6, "INR", { decimals: 2 }) → "₹54.60"
 *   formatCurrency(4835, "USD")                → "$4,835"
 */
export function formatCurrency(
  value: number,
  currency = "USD",
  options: { decimals?: number } = {}
): string {
  const decimals = options.decimals ?? 0;
  return new Intl.NumberFormat(getLocale(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a plain number using locale-appropriate separators.
 * Pass compact: true for abbreviated display (e.g. 454K, 4.5L).
 *
 * Examples:
 *   formatNumber(454000, "INR", { compact: true }) → "4.5L"
 *   formatNumber(454000, "USD", { compact: true }) → "454K"
 *   formatNumber(454000, "INR")                    → "4,54,000"
 */
export function formatNumber(
  value: number,
  currency = "USD",
  options: { compact?: boolean } = {}
): string {
  if (options.compact) {
    return new Intl.NumberFormat(getLocale(currency), {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(getLocale(currency)).format(value);
}
