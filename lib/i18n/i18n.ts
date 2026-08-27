/**
 * The i18next instance.
 *
 * No language detector is configured on purpose. The detector plugin reads cookies and
 * local storage, and the language here belongs to the account instead - it is read from
 * the user's record on the server and handed to the provider.
 */

import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, LOCALES } from "./config";
import { messages } from "./messages";

let instance: I18nInstance | null = null;

export function getI18n(initialLocale: string = DEFAULT_LOCALE): I18nInstance {
  if (instance) return instance;

  const client = i18next.createInstance();
  void client.use(initReactI18next).init({
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    // One namespace: the dictionary is a flat key list, and splitting it would only add
    // a prefix to every lookup.
    defaultNS: "translation",
    resources: Object.fromEntries(
      LOCALES.map((locale) => [locale, { translation: messages[locale] }])
    ),
    interpolation: {
      // React escapes for us; letting i18next escape as well double-encodes anything
      // with an apostrophe or an ampersand in it.
      escapeValue: false,
    },
    // Keys hold dots as part of their name - "offers.list.untitled" is one key, not a
    // path into nested objects.
    keySeparator: false,
    nsSeparator: false,
    react: { useSuspense: false },
  });

  instance = client;
  return client;
}
