"use server";

/**
 * Weather lookup for a diary day.
 *
 * Read-only: it fetches from Open-Meteo and hands the numbers back for the form to show.
 * Nothing is written here — the values are saved only if the user keeps them and submits
 * the diary entry, so a lookup can never quietly alter a record.
 *
 * Only async functions may be exported from a "use server" module; the parsing and the
 * endpoint rules live in lib/weather/.
 */

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import { fetchDailyWeather, geocode, type DailyWeather } from "@/lib/weather/open-meteo";
import type { WeatherLocale } from "@/lib/weather/codes";

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Today in Hungary, which is the reference point for choosing an endpoint. */
function budapestToday(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getWeatherForWork(
  workId: number,
  date: string,
  locale?: string
): Promise<{
  success: boolean;
  error?: string;
  weather?: DailyWeather;
  /** Which place the reading is for, so the user can tell if the address was misread. */
  locationLabel?: string;
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    if (!isIsoDate(date)) {
      return { success: false, error: "Hibás dátum." };
    }

    // Scoped to the tenant: a work id from another account must not resolve.
    const work = await prisma.work.findFirst({
      where: { id: workId, tenantEmail },
      select: { location: true },
    });

    if (!work) {
      return { success: false, error: "A munka nem található." };
    }

    const location = work.location?.trim();
    if (!location) {
      return {
        success: false,
        error: "A munkához nincs megadva helyszín, ezért az időjárás nem kérhető le.",
      };
    }

    const point = await geocode(location);
    if (!point) {
      return {
        success: false,
        error: `A helyszín nem azonosítható: „${location}”. Írd be a települést, és próbáld újra.`,
      };
    }

    const resolvedLocale: WeatherLocale = locale === "en" ? "en" : "hu";
    const weather = await fetchDailyWeather(point, date, budapestToday(), resolvedLocale);

    if (!weather) {
      return {
        success: false,
        error: "Erre a napra nem érhető el időjárási adat.",
      };
    }

    return { success: true, weather, locationLabel: point.label };
  } catch (error) {
    console.error("[weather] lookup failed:", error);
    return { success: false, error: "Az időjárás lekérése nem sikerült. Próbáld újra." };
  }
}
