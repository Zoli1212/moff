"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
  type Currency,
  type Locale,
  formatMoney,
} from "@/lib/i18n/config";
import { translate, type MessageKey } from "@/lib/i18n/messages";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Formats an amount in its own currency, using the active locale for digits. */
  money: (amount: number | null | undefined, currency?: Currency) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Holds the active locale for the client tree.
 *
 * The locale is persisted in a plain cookie rather than in the URL, so no route has to
 * move under a /[locale] segment. Every existing link and bookmark keeps working.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveLocale(initialLocale)
  );

  /**
   * The cookie is read after mount rather than on the server. Calling cookies() in the
   * root layout would opt the entire application into dynamic rendering, losing the
   * static generation several pages rely on today. The cost is one frame in the default
   * language before the stored choice applies; the alternative was slowing every page.
   */
  useEffect(() => {
    const stored = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
      ?.split("=")[1];

    if (stored) {
      const resolved = resolveLocale(stored);
      setLocaleState((current) => (current === resolved ? current : resolved));
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // One year, site-wide. No sensitive content, so no need for anything stricter.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      money: (amount, currency) => formatMoney(amount, currency, locale),
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * Falls back to Hungarian defaults when no provider is above it, so a component can be
 * rendered outside the provider - in a test, or on a page not yet wired up - without
 * throwing.
 */
export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context) return context;

  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, params) => translate(DEFAULT_LOCALE, key, params),
    money: (amount, currency) => formatMoney(amount, currency, DEFAULT_LOCALE),
  };
}
