"use client";

import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale } from "./LocaleProvider";

/** The flag stands for the language, so the control needs no words of its own. */
const FLAGS: Record<Locale, string> = {
  hu: "🇭🇺",
  en: "🇬🇧",
};

/**
 * A single flag that toggles the language.
 *
 * With two languages a dropdown is more machinery than the choice deserves. The flag
 * shown is the language in use; the accessible label names the language a tap switches
 * to, so the button stays unambiguous to a screen reader despite carrying no text.
 */
export default function LocaleSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { locale, setLocale } = useLocale();

  const next: Locale = LOCALES.find((value) => value !== locale) ?? locale;

  return (
    <button
      type="button"
      // i18next re-renders every subscriber itself, and the choice is persisted to the
      // user record in the background.
      onClick={() => setLocale(next)}
      title={LOCALE_LABELS[next]}
      aria-label={LOCALE_LABELS[next]}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl leading-none transition-colors hover:bg-gray-100 ${className}`}
    >
      <span aria-hidden>{FLAGS[locale]}</span>
    </button>
  );
}
