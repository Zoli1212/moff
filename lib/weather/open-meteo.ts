/**
 * Weather for a diary day, from Open-Meteo.
 *
 * Chosen over the better-known services because it needs no API key and no account: there
 * is no secret to keep out of the repository, no per-call billing, and no quota paperwork
 * for something a site foreman triggers a handful of times a day.
 *
 * The pure parts — which endpoint a date belongs to, how a free-text location becomes
 * search terms, how a response becomes a day — are separated from the fetching so they
 * can be tested without a network.
 */

import { describeWeatherCode, mayObstructWork, type WeatherLocale } from "./codes";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const TIMEZONE = "Europe/Budapest";

export interface DailyWeather {
  date: string;
  /** The day's mean, which is what the single existing temperature field should hold. */
  temperature: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  code: number | null;
  description: string;
  /** True when the conditions plausibly stopped outdoor work; a prompt, not a verdict. */
  mayObstruct: boolean;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Which Open-Meteo endpoint serves a given date.
 *
 * The forecast API covers a window around today and the archive API everything older.
 * Asking the wrong one returns an empty series rather than an error, which would look
 * like "no weather" instead of "wrong endpoint" — hence a rule rather than a guess.
 */
export function pickEndpoint(date: string, today: string): "forecast" | "archive" {
  const day = Date.parse(`${date}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(day) || Number.isNaN(now)) return "archive";
  const daysApart = Math.round((day - now) / 86_400_000);
  // The forecast endpoint reaches ~92 days back and 16 forward; stay well inside both.
  return daysApart >= -60 && daysApart <= 14 ? "forecast" : "archive";
}

/**
 * Search terms to try for a free-text site address, most specific first.
 *
 * Work locations are typed by hand — "Budapest XI.", "Teszt utca 100, Szeged" — and a
 * geocoder given the whole string often finds nothing. Trying progressively coarser
 * fragments finds the town, which is accurate enough for a day's weather.
 */
export function geocodeCandidates(location: string): string[] {
  const cleaned = location.trim();
  if (cleaned === "") return [];

  const candidates = [cleaned];

  // "Teszt utca 100, Szeged" -> "Szeged"; the town is usually the last part.
  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    candidates.push(parts[parts.length - 1]);
    candidates.push(parts[0]);
  } else {
    // "Budapest XI." -> "Budapest"; a district is not a geocoder entry but the city is.
    //
    // Only without a comma. In "Teszt utca 100, Szeged" the first word is a street name,
    // and offering it to a geocoder invites a confident answer about the wrong place.
    const firstWord = cleaned.split(/\s+/)[0];
    if (firstWord && firstWord.length > 2) candidates.push(firstWord);
  }

  return [...new Set(candidates)];
}

function firstNumber(values: unknown): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const value = values[0];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Turns a daily series response into the one day we asked for. */
export function parseDailyResponse(
  payload: unknown,
  date: string,
  locale: WeatherLocale
): DailyWeather | null {
  if (typeof payload !== "object" || payload === null) return null;
  const daily = (payload as { daily?: Record<string, unknown> }).daily;
  if (!daily) return null;

  const code = firstNumber(daily.weather_code);
  const min = firstNumber(daily.temperature_2m_min);
  const max = firstNumber(daily.temperature_2m_max);
  const mean = firstNumber(daily.temperature_2m_mean);

  // A day with no temperature at all is not worth returning as if it were data.
  if (min === null && max === null && mean === null && code === null) return null;

  const round = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

  return {
    date,
    temperature: round(mean ?? (min !== null && max !== null ? (min + max) / 2 : null)),
    temperatureMin: round(min),
    temperatureMax: round(max),
    code,
    description: describeWeatherCode(code, locale),
    mayObstruct: mayObstructWork(code),
  };
}

/** Resolves a free-text location to a point, trying coarser terms until one lands. */
export async function geocode(location: string): Promise<GeoPoint | null> {
  for (const term of geocodeCandidates(location)) {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(term)}&count=1&language=hu&format=json`;
    try {
      const response = await fetch(url, { next: { revalidate: 86_400 } });
      if (!response.ok) continue;
      const data = (await response.json()) as {
        results?: { latitude: number; longitude: number; name: string }[];
      };
      const hit = data.results?.[0];
      if (hit) {
        return { latitude: hit.latitude, longitude: hit.longitude, label: hit.name };
      }
    } catch {
      // Try the next, coarser candidate rather than failing the whole lookup.
    }
  }
  return null;
}

/** Fetches one day's weather for a point. */
export async function fetchDailyWeather(
  point: GeoPoint,
  date: string,
  today: string,
  locale: WeatherLocale
): Promise<DailyWeather | null> {
  const base = pickEndpoint(date, today) === "forecast" ? FORECAST_URL : ARCHIVE_URL;
  const url =
    `${base}?latitude=${point.latitude}&longitude=${point.longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,weather_code` +
    `&timezone=${encodeURIComponent(TIMEZONE)}&start_date=${date}&end_date=${date}`;

  try {
    // A past day's weather never changes; today's is stable enough for an hour.
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return parseDailyResponse(await response.json(), date, locale);
  } catch {
    return null;
  }
}
