"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  DEFAULT_LOCALE,
  formatMoney,
  resolveLocale,
  type Currency,
  type Locale,
} from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  getUserLanguage,
  setUserLanguage,
} from "@/actions/user-language-actions";

/**
 * Puts the app under react-i18next and keeps the chosen language on the user's record.
 *
 * The language is deliberately not kept in a cookie or in local storage. It is read from
 * the account after mount and written back when it changes, so the choice follows the
 * person rather than the browser, and nothing has to be read during rendering - which
 * would have forced every page into dynamic rendering.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string;
  children: ReactNode;
}) {
  const [i18n] = useState(() => getI18n(resolveLocale(initialLocale)));

  useEffect(() => {
    let cancelled = false;
    void getUserLanguage().then(({ locale }) => {
      if (!cancelled && locale !== i18n.language) {
        void i18n.changeLanguage(locale);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Formats an amount in its own currency, using the active locale for digits. */
  money: (amount: number | null | undefined, currency?: Currency) => string;
}

/**
 * The same shape the rest of the app already consumes.
 *
 * Kept identical when the engine changed from a hand-rolled dictionary to i18next, so
 * that swapping the implementation touched no component.
 */
export function useLocale(): LocaleContextValue {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  const setLocale = useCallback(
    (next: Locale) => {
      void i18n.changeLanguage(next);
      // Persisted in the background: the interface should not wait on a round trip to
      // show the new language.
      void setUserLanguage(next);
    },
    [i18n]
  );

  return useMemo(
    () => ({
      locale,
      setLocale,
      t: (key, params) => t(key, params ?? {}) as string,
      money: (amount, currency) => formatMoney(amount, currency, locale),
    }),
    [t, locale, setLocale]
  );
}

/** Fallback for anything rendered outside the provider, such as a test. */
export const FALLBACK_LOCALE = DEFAULT_LOCALE;
