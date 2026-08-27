/**
 * Locale and currency primitives.
 *
 * The locale lives on the user's record, not in the URL and not in the browser. Routing
 * by locale would move every path under /[locale]/..., and a cookie or local storage
 * would tie the choice to a machine rather than to the person.
 */

export const LOCALES = ["hu", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "hu";

export const LOCALE_LABELS: Record<Locale, string> = {
  hu: "Magyar",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/* -------------------------------------------------------------------------- */
/* Currency                                                                    */
/* -------------------------------------------------------------------------- */

export const CURRENCIES = ["HUF", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "HUF";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function resolveCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}

/**
 * Decimal places by currency. Forint amounts are quoted whole - showing "1 250 000,00 Ft"
 * is noise - while euro amounts need the cents.
 */
const FRACTION_DIGITS: Record<Currency, number> = { HUF: 0, EUR: 2 };

const CURRENCY_SUFFIX: Record<Currency, string> = { HUF: "Ft", EUR: "€" };

/**
 * Formats an amount in its own currency.
 *
 * The number formatting follows the locale (Hungarian and English group and separate
 * digits differently), while the currency suffix follows the money, not the reader:
 * a euro quote reads "€" whichever language the screen is in.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: Currency = DEFAULT_CURRENCY,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (amount == null || !Number.isFinite(amount)) return "–";

  const digits = FRACTION_DIGITS[currency];
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : "hu-HU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);

  return `${formatted} ${CURRENCY_SUFFIX[currency]}`;
}

/**
 * Converts a HUF amount into the offer's currency using the rate captured on that offer.
 *
 * Returns the amount untouched when no conversion applies, so a caller never has to
 * branch on currency before formatting.
 */
export function convertFromHuf(
  amountHuf: number | null | undefined,
  currency: Currency,
  exchangeRate: number | null | undefined
): number | null {
  if (amountHuf == null || !Number.isFinite(amountHuf)) return null;
  if (currency === "HUF") return amountHuf;
  if (!exchangeRate || exchangeRate <= 0) return null;
  return amountHuf / exchangeRate;
}
