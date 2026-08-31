import { describe, expect, it } from "vitest";
import { describeWeatherCode, mayObstructWork } from "../lib/weather/codes";
import {
  geocodeCandidates,
  parseDailyResponse,
  pickEndpoint,
} from "../lib/weather/open-meteo";

describe("pickEndpoint", () => {
  it("uses the forecast series for today and the days around it", () => {
    expect(pickEndpoint("2026-08-28", "2026-08-28")).toBe("forecast");
    expect(pickEndpoint("2026-08-20", "2026-08-28")).toBe("forecast");
    expect(pickEndpoint("2026-09-05", "2026-08-28")).toBe("forecast");
  });

  it("falls back to the archive for dates well in the past", () => {
    expect(pickEndpoint("2026-01-10", "2026-08-28")).toBe("archive");
    expect(pickEndpoint("2019-03-02", "2026-08-28")).toBe("archive");
  });

  it("does not ask the forecast series for dates beyond its reach", () => {
    expect(pickEndpoint("2026-10-30", "2026-08-28")).toBe("archive");
  });

  it("prefers the archive over guessing when a date is unreadable", () => {
    expect(pickEndpoint("nonsense", "2026-08-28")).toBe("archive");
  });
});

describe("geocodeCandidates", () => {
  it("tries the town on its own when the address has parts", () => {
    expect(geocodeCandidates("Teszt utca 100, Szeged")).toEqual([
      "Teszt utca 100, Szeged",
      "Szeged",
      "Teszt utca 100",
    ]);
  });

  it("falls back to the city when a district is appended", () => {
    // A geocoder has no entry for "Budapest XI." but does for "Budapest".
    expect(geocodeCandidates("Budapest XI.")).toContain("Budapest");
  });

  it("does not repeat a candidate that is already the whole string", () => {
    expect(geocodeCandidates("Szeged")).toEqual(["Szeged"]);
  });

  it("returns nothing to try for a blank location", () => {
    expect(geocodeCandidates("   ")).toEqual([]);
  });
});

describe("parseDailyResponse", () => {
  const payload = {
    daily: {
      temperature_2m_max: [27.44],
      temperature_2m_min: [13.61],
      temperature_2m_mean: [20.12],
      weather_code: [61],
    },
  };

  it("reads the day's low, high and mean", () => {
    const day = parseDailyResponse(payload, "2026-08-20", "hu");
    expect(day).toEqual({
      date: "2026-08-20",
      temperature: 20.1,
      temperatureMin: 13.6,
      temperatureMax: 27.4,
      code: 61,
      description: "eső",
      mayObstruct: true,
    });
  });

  it("derives a mean when the series omits one", () => {
    const day = parseDailyResponse(
      { daily: { temperature_2m_max: [20], temperature_2m_min: [10], weather_code: [0] } },
      "2026-08-20",
      "hu"
    );
    expect(day?.temperature).toBe(15);
  });

  it("translates the description", () => {
    expect(parseDailyResponse(payload, "2026-08-20", "en")?.description).toBe("rain");
  });

  it("returns nothing rather than an empty day when the series carries no data", () => {
    expect(parseDailyResponse({ daily: {} }, "2026-08-20", "hu")).toBeNull();
    expect(parseDailyResponse({}, "2026-08-20", "hu")).toBeNull();
    expect(parseDailyResponse(null, "2026-08-20", "hu")).toBeNull();
  });
});

describe("describeWeatherCode", () => {
  it("covers the codes a Hungarian site actually sees", () => {
    expect(describeWeatherCode(0, "hu")).toBe("derült");
    expect(describeWeatherCode(3, "hu")).toBe("borult");
    expect(describeWeatherCode(45, "hu")).toBe("köd");
    expect(describeWeatherCode(73, "hu")).toBe("havazás");
    expect(describeWeatherCode(95, "hu")).toBe("zivatar");
  });

  it("says nothing rather than inventing a description", () => {
    expect(describeWeatherCode(999, "hu")).toBe("");
    expect(describeWeatherCode(null, "hu")).toBe("");
    expect(describeWeatherCode(undefined, "en")).toBe("");
  });
});

describe("mayObstructWork", () => {
  it("flags weather that plausibly stops outdoor work", () => {
    expect(mayObstructWork(65)).toBe(true); // heavy rain
    expect(mayObstructWork(73)).toBe(true); // snow
    expect(mayObstructWork(95)).toBe(true); // thunderstorm
    expect(mayObstructWork(67)).toBe(true); // freezing rain
  });

  it("leaves cloud and drizzle alone", () => {
    expect(mayObstructWork(0)).toBe(false);
    expect(mayObstructWork(3)).toBe(false);
    expect(mayObstructWork(51)).toBe(false);
    expect(mayObstructWork(null)).toBe(false);
  });
});
