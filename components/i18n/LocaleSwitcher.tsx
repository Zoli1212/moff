"use client";

import { Globe } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale } from "./LocaleProvider";

export default function LocaleSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { locale, setLocale } = useLocale();

  return (
    <label
      className={`flex items-center gap-1.5 text-sm text-gray-600 ${className}`}
    >
      <Globe className="h-4 w-4 text-gray-400" aria-hidden />
      <span className="sr-only">{LOCALE_LABELS[locale]}</span>
      <select
        value={locale}
        // i18next re-renders every subscriber itself, and the choice is persisted to
        // the user record in the background.
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {LOCALE_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
