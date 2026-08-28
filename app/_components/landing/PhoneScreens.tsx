"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { PhoneTabBar } from "./PhoneMockup";

/**
 * The screens shown inside the phone frames.
 *
 * Composed from the same shapes the product uses — a work with priced items and a
 * progress bar, a Kanban board, a day in the site diary — so the landing shows what is
 * actually being sold rather than a generic dashboard. The figures are illustrative.
 */

/** Work detail: what a contractor opens most often. */
export function WorkScreen() {
  const { t } = useLocale();

  const items = [
    { name: t("landing.previewItem1"), value: "1 240 000", done: true },
    { name: t("landing.previewItem2"), value: "486 000", done: true },
    { name: t("landing.previewItem3"), value: "312 500", done: false },
  ];

  return (
    <div className="flex h-full flex-col bg-stone-50 pt-9">
      <div className="px-4 pb-3">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-400">
          {t("landing.screenWorkLabel")}
        </p>
        <p className="mt-0.5 text-[13px] font-bold leading-tight text-stone-900">
          {t("landing.previewProject")}
        </p>
      </div>

      <div className="mx-4 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] font-semibold text-stone-500">
            {t("landing.previewProgress")}
          </span>
          <span className="text-[13px] font-bold text-stone-900">62%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div className="h-full w-[62%] rounded-full bg-orange-500" />
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-1.5 overflow-hidden px-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-sm"
          >
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full ${
                item.done ? "bg-emerald-500" : "border-2 border-stone-200"
              }`}
            />
            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-stone-700">
              {item.name}
            </span>
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-stone-900">
              {item.value}
            </span>
          </div>
        ))}

        <div className="!mt-3 flex items-center justify-between rounded-lg bg-stone-900 px-2.5 py-2">
          <span className="text-[9px] font-semibold text-stone-300">
            {t("landing.previewTotal")}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-white">2 038 500 Ft</span>
        </div>
      </div>

      <PhoneTabBar active="work" />
    </div>
  );
}

/** The Kanban board, which is the answer to "where does the job stand". */
export function BoardScreen() {
  const { t } = useLocale();

  const columns = [
    { label: t("landing.colTodo"), cards: 2, tone: "bg-stone-200" },
    { label: t("landing.colDoing"), cards: 3, tone: "bg-orange-400" },
    { label: t("landing.colReview"), cards: 1, tone: "bg-amber-300" },
    { label: t("landing.colDone"), cards: 4, tone: "bg-emerald-400" },
  ];

  return (
    <div className="flex h-full flex-col bg-stone-50 pt-9">
      <div className="px-3 pb-2">
        <p className="text-[11px] font-bold text-stone-900">{t("landing.screenBoardLabel")}</p>
      </div>

      {/* Four columns at once, which is how the board is built for a phone. */}
      <div className="grid flex-1 grid-cols-4 gap-1 px-2">
        {columns.map((column) => (
          <div key={column.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${column.tone}`} />
              <span className="truncate text-[6px] font-bold uppercase tracking-wide text-stone-500">
                {column.label}
              </span>
            </div>
            {Array.from({ length: column.cards }).map((_, index) => (
              <div key={index} className="rounded-md bg-white p-1 shadow-sm">
                <div className="h-1 w-full rounded-full bg-stone-200" />
                <div className="mt-1 h-1 w-2/3 rounded-full bg-stone-100" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <PhoneTabBar active="work" />
    </div>
  );
}

/** A day in the site diary, the record the whole build is judged on. */
export function DiaryScreen() {
  const { t } = useLocale();

  return (
    <div className="flex h-full flex-col bg-stone-50 pt-9">
      <div className="px-4 pb-2">
        <p className="text-[11px] font-bold text-stone-900">{t("landing.screenDiaryLabel")}</p>
        <p className="text-[8px] text-stone-500">2026-08-20</p>
      </div>

      <div className="flex-1 space-y-1.5 px-3">
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-[7px] font-bold uppercase tracking-wide text-stone-400">
            {t("landing.diaryWeather")}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold text-stone-800">24,5 °C</p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-[7px] font-bold uppercase tracking-wide text-stone-400">
            {t("landing.diaryHeadcount")}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold text-stone-800">
            3 {t("landing.diaryPeople")}
          </p>
          <div className="mt-1.5 flex -space-x-1">
            {["bg-orange-400", "bg-stone-700", "bg-amber-500"].map((tone) => (
              <span
                key={tone}
                className={`h-3.5 w-3.5 rounded-full border border-white ${tone}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-sm">
          <p className="text-[7px] font-bold uppercase tracking-wide text-stone-400">
            {t("landing.diaryOutput")}
          </p>
          <p className="mt-0.5 text-[8px] leading-snug text-stone-700">
            {t("landing.diaryOutputText")}
          </p>
        </div>
      </div>

      <PhoneTabBar active="diary" />
    </div>
  );
}
