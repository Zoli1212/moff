/**
 * WMO weather codes, turned into the words that go in the diary.
 *
 * The diary is read by people and, through the e-napló export, filed with an authority,
 * so the description has to be plain language rather than a number. Point cc) asks
 * specifically about weather that held the work up, which is why the wording leans on
 * what a site would notice — rain, snow, fog — rather than meteorological precision.
 */

export type WeatherLocale = "hu" | "en";

interface CodeEntry {
  hu: string;
  en: string;
}

/**
 * Ranges rather than every code spelled out: the diary does not need to distinguish
 * "light drizzle" from "moderate drizzle", and a shorter table is easier to keep honest.
 */
const RANGES: { from: number; to: number; text: CodeEntry }[] = [
  { from: 0, to: 0, text: { hu: "derült", en: "clear" } },
  { from: 1, to: 1, text: { hu: "napos, kevés felhő", en: "mainly clear" } },
  { from: 2, to: 2, text: { hu: "időnként felhős", en: "partly cloudy" } },
  { from: 3, to: 3, text: { hu: "borult", en: "overcast" } },
  { from: 45, to: 48, text: { hu: "köd", en: "fog" } },
  { from: 51, to: 57, text: { hu: "szitálás", en: "drizzle" } },
  { from: 61, to: 65, text: { hu: "eső", en: "rain" } },
  { from: 66, to: 67, text: { hu: "ónos eső", en: "freezing rain" } },
  { from: 71, to: 75, text: { hu: "havazás", en: "snow" } },
  { from: 77, to: 77, text: { hu: "hószemcse", en: "snow grains" } },
  { from: 80, to: 82, text: { hu: "záporok", en: "showers" } },
  { from: 85, to: 86, text: { hu: "hózápor", en: "snow showers" } },
  { from: 95, to: 99, text: { hu: "zivatar", en: "thunderstorm" } },
];

/** The plain-language description, or an empty string for a code we do not recognise. */
export function describeWeatherCode(code: number | null | undefined, locale: WeatherLocale): string {
  if (typeof code !== "number" || !Number.isFinite(code)) return "";
  const entry = RANGES.find((range) => code >= range.from && code <= range.to);
  return entry ? entry.text[locale] : "";
}

/**
 * Whether the code describes weather that plausibly stops outdoor work.
 *
 * A hint, not a ruling: point cc) wants the obstruction and how long it lasted, and only
 * the person on site knows whether work actually stopped. This just saves them starting
 * from a blank field on a day when it clearly might have.
 */
export function mayObstructWork(code: number | null | undefined): boolean {
  if (typeof code !== "number" || !Number.isFinite(code)) return false;
  // Freezing rain, heavier rain and snow, storms. Drizzle and cloud are left out.
  return (
    (code >= 61 && code <= 67) ||
    (code >= 71 && code <= 77) ||
    (code >= 80 && code <= 86) ||
    (code >= 95 && code <= 99)
  );
}
