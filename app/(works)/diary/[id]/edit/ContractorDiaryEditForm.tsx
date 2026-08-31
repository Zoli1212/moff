"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CloudSun, Loader2 } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getWeatherForWork } from "@/actions/weather-actions";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

interface ContractorDiaryEditFormProps {
  diary: WorkDiaryWithItem;
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
}

/** The Hungarian calendar day, which is the day the weather is asked for. */
function budapestDayKey(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function ContractorDiaryEditForm({ diary, onSave, onCancel }: ContractorDiaryEditFormProps) {
  const { t, locale } = useLocale();

  const [description, setDescription] = useState(diary.description || "");
  const [weather, setWeather] = useState(diary.weather || "");
  const [temperature, setTemperature] = useState(diary.temperature ?? "");
  const [temperatureMin, setTemperatureMin] = useState(diary.temperatureMin ?? "");
  const [temperatureMax, setTemperatureMax] = useState(diary.temperatureMax ?? "");
  const [quantity, setQuantity] = useState(diary.quantity ?? "");
  const [issues, setIssues] = useState(diary.issues || "");
  const [notes, setNotes] = useState(diary.notes || "");
  const [unit, setUnit] = useState(diary.unit || "");
  const [workHours, setWorkHours] = useState(diary.workHours ?? "");

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherPlace, setWeatherPlace] = useState<string | null>(null);

  const dayKey = budapestDayKey(diary.date);

  const loadWeather = useCallback(async () => {
    if (!diary.workId || !dayKey) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const result = await getWeatherForWork(diary.workId, dayKey, locale);
      if (result.success && result.weather) {
        // A manual reading is never overwritten silently; the fetch only fills.
        if (result.weather.description) setWeather(result.weather.description);
        if (result.weather.temperature !== null) setTemperature(result.weather.temperature);
        if (result.weather.temperatureMin !== null) setTemperatureMin(result.weather.temperatureMin);
        if (result.weather.temperatureMax !== null) setTemperatureMax(result.weather.temperatureMax);
        setWeatherPlace(result.locationLabel ?? null);
      } else {
        setWeatherError(result.error ?? t("weather.failed"));
      }
    } catch {
      setWeatherError(t("weather.failed"));
    } finally {
      setWeatherLoading(false);
    }
  }, [diary.workId, dayKey, locale, t]);

  // Fill an untouched entry once. A day already carrying weather is left exactly as the
  // person on site recorded it — they were there and the forecast was not.
  const autoFilled = useRef(false);
  useEffect(() => {
    if (autoFilled.current) return;
    if (weather.trim() !== "" || temperature !== "") return;
    autoFilled.current = true;
    void loadWeather();
    // Deliberately keyed on the fetch alone: this is a one-shot fill, not a subscription
    // that would undo the user's typing on every keystroke.
  }, [loadWeather, weather, temperature]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...diary,
      description,
      weather,
      temperature: temperature === "" ? null : Number(temperature),
      temperatureMin: temperatureMin === "" ? null : Number(temperatureMin),
      temperatureMax: temperatureMax === "" ? null : Number(temperatureMax),
      quantity: quantity === "" ? null : Number(quantity),
      issues,
      notes,
      unit: unit || null,
      workHours: workHours === "" ? null : Number(workHours),
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium">{t("od.description")}</label>
        <textarea className="w-full border rounded p-2" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label className="block font-medium">{t("x.weather")}</label>
          <button
            type="button"
            onClick={() => void loadWeather()}
            disabled={weatherLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {weatherLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudSun className="h-3.5 w-3.5" />
            )}
            {t("weather.fetch")}
          </button>
        </div>
        <input className="w-full border rounded p-2" value={weather} onChange={e => setWeather(e.target.value)} />
        {weatherPlace && !weatherError && (
          <p className="mt-1 text-xs text-gray-500">
            {t("weather.source", { place: weatherPlace })}
          </p>
        )}
        {weatherError && <p className="mt-1 text-xs text-amber-700">{weatherError}</p>}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-medium">{t("x.temperature")}</label>
          <input type="number" className="w-full border rounded p-2" value={temperature} onChange={e => setTemperature(e.target.value)} />
        </div>
        <div>
        <label className="block font-medium">{t("od.quantity")}</label>
        <input type="number" className="w-full border rounded p-2" value={quantity} onChange={e => setQuantity(e.target.value)} min={0} step={0.01} />
      </div>
      </div>

      {/* Point cb) of the daily report wants the day's low alongside a reading. */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-medium">{t("weather.tempMin")}</label>
          <input type="number" step={0.1} className="w-full border rounded p-2" value={temperatureMin} onChange={e => setTemperatureMin(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="block font-medium">{t("weather.tempMax")}</label>
          <input type="number" step={0.1} className="w-full border rounded p-2" value={temperatureMax} onChange={e => setTemperatureMax(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block font-medium">{t("diary.unit")}</label>
        <input className="w-full border rounded p-2" value={unit} onChange={e => setUnit(e.target.value)} placeholder="pl. m², fm, db" />
      </div>
      <div>
        <label className="block font-medium">{t("diary.workHours")}</label>
        <input type="number" className="w-full border rounded p-2" value={workHours} onChange={e => setWorkHours(e.target.value)} min={0} step={0.1} />
      </div>
      <div>
        <label className="block font-medium">{t("x.issues")}</label>
        <textarea className="w-full border rounded p-2" value={issues} onChange={e => setIssues(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="block font-medium">Jegyzetek</label>
        <textarea className="w-full border rounded p-2" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex gap-4 mt-6">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{t("common.save")}</button>
        <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400" onClick={onCancel}>{t("diary.cancel")}</button>
      </div>
    </form>
  );
}
