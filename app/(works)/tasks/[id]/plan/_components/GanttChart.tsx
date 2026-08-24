"use client";

import { useMemo } from "react";
import {
  addDays,
  daysBetween,
  startOfUtcDay,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";

const DAY_WIDTH = 28;
const ROW_HEIGHT = 34;

/**
 * Stable colour per trade. Derived from the name rather than assigned by position, so a
 * trade keeps its colour when tasks are reordered or the plan is regenerated.
 */
const TRADE_COLORS = [
  "#FE9C00",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#0EA5E9",
  "#84CC16",
  "#F43F5E",
];

function tradeColor(trade: string): string {
  let hash = 0;
  for (let index = 0; index < trade.length; index += 1) {
    hash = (hash * 31 + trade.charCodeAt(index)) | 0;
  }
  return TRADE_COLORS[Math.abs(hash) % TRADE_COLORS.length];
}

const dayFormatter = new Intl.DateTimeFormat("hu-HU", {
  day: "numeric",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("hu-HU", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

interface GanttRow {
  task: WorkTaskDto;
  depth: number;
}

function flattenRows(tasks: WorkTaskDto[]): GanttRow[] {
  const rows: GanttRow[] = [];
  for (const task of tasks) {
    rows.push({ task, depth: 0 });
    for (const child of task.children) {
      rows.push({ task: child, depth: 1 });
    }
  }
  return rows;
}

interface Props {
  tasks: WorkTaskDto[];
  baseDate: string | null;
  onSelect: (task: WorkTaskDto) => void;
}

export default function GanttChart({ tasks, baseDate, onSelect }: Props) {
  const rows = useMemo(() => flattenRows(tasks), [tasks]);

  const range = useMemo(() => {
    const stamps: number[] = [];
    for (const { task } of rows) {
      if (task.startDate) stamps.push(new Date(task.startDate).getTime());
      if (task.endDate) stamps.push(new Date(task.endDate).getTime());
    }
    if (baseDate) stamps.push(new Date(baseDate).getTime());
    if (!stamps.length) return null;

    // A day of padding on each side keeps the first and last bars off the edge.
    const start = addDays(startOfUtcDay(new Date(Math.min(...stamps))), -1);
    const end = addDays(startOfUtcDay(new Date(Math.max(...stamps))), 1);
    return { start, totalDays: daysBetween(start, end) + 1 };
  }, [rows, baseDate]);

  if (!range) {
    return (
      <div className="mx-4 mt-8 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
        <p className="text-sm text-gray-500">
          Egyik feladatnak sincs dátuma, ezért nincs mit ábrázolni az idővonalon.
          Adj meg kezdő és befejező dátumot a feladatoknál.
        </p>
      </div>
    );
  }

  const days = Array.from({ length: range.totalDays }, (_, index) =>
    addDays(range.start, index)
  );

  const todayOffset = daysBetween(range.start, new Date());
  const todayVisible = todayOffset >= 0 && todayOffset < range.totalDays;

  // Month bands are built by counting consecutive days per month rather than by
  // assuming fixed month lengths, so a range crossing a month boundary stays aligned.
  const monthBands: Array<{ label: string; days: number }> = [];
  for (const day of days) {
    const label = monthFormatter.format(day);
    const last = monthBands[monthBands.length - 1];
    if (last && last.label === label) last.days += 1;
    else monthBands.push({ label, days: 1 });
  }

  const gridWidth = range.totalDays * DAY_WIDTH;

  return (
    <div className="mt-4 px-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="flex min-w-max">
          {/* Sticky name column: the labels must stay readable while the bars scroll. */}
          <div className="sticky left-0 z-20 w-[140px] shrink-0 border-r border-gray-200 bg-white md:w-[240px]">
            <div className="h-[44px] border-b border-gray-200" />
            {rows.map(({ task, depth }) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelect(task)}
                style={{ height: ROW_HEIGHT }}
                className="flex w-full items-center border-b border-gray-100 px-2 text-left last:border-b-0 hover:bg-gray-50"
              >
                <span
                  className={`truncate text-xs ${
                    depth > 0 ? "pl-3 text-gray-500" : "font-medium text-gray-900"
                  }`}
                >
                  {task.title}
                </span>
              </button>
            ))}
          </div>

          <div className="relative" style={{ width: gridWidth }}>
            <div className="flex h-[22px] border-b border-gray-100">
              {monthBands.map((band, index) => (
                <div
                  key={`${band.label}-${index}`}
                  style={{ width: band.days * DAY_WIDTH }}
                  className="truncate border-r border-gray-100 px-2 text-[11px] font-medium text-gray-600"
                >
                  {band.label}
                </div>
              ))}
            </div>

            <div className="flex h-[22px] border-b border-gray-200">
              {days.map((day) => {
                const weekday = day.getUTCDay();
                const isWeekend = weekday === 0 || weekday === 6;
                return (
                  <div
                    key={day.toISOString()}
                    style={{ width: DAY_WIDTH }}
                    className={`shrink-0 text-center text-[10px] leading-[22px] ${
                      isWeekend ? "bg-gray-50 text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {dayFormatter.format(day)}
                  </div>
                );
              })}
            </div>

            <div className="relative">
              {/* Weekend columns behind the bars, so the grid reads without extra lines. */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((day) => {
                  const weekday = day.getUTCDay();
                  const isWeekend = weekday === 0 || weekday === 6;
                  return (
                    <div
                      key={day.toISOString()}
                      style={{ width: DAY_WIDTH }}
                      className={`shrink-0 ${isWeekend ? "bg-gray-50" : ""}`}
                    />
                  );
                })}
              </div>

              {todayVisible && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-500"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                  aria-hidden
                />
              )}

              {rows.map(({ task, depth }) => {
                const hasDates = Boolean(task.startDate && task.endDate);
                const offset = task.startDate
                  ? daysBetween(range.start, new Date(task.startDate))
                  : 0;
                const span = hasDates
                  ? Math.max(
                      1,
                      daysBetween(
                        new Date(task.startDate as string),
                        new Date(task.endDate as string)
                      ) + 1
                    )
                  : 0;

                return (
                  <div
                    key={task.id}
                    style={{ height: ROW_HEIGHT }}
                    className="relative border-b border-gray-100 last:border-b-0"
                  >
                    {hasDates && (
                      <button
                        type="button"
                        onClick={() => onSelect(task)}
                        title={`${task.title} — ${task.trade}`}
                        className="absolute top-1/2 -translate-y-1/2 rounded-full text-left"
                        style={{
                          left: offset * DAY_WIDTH + 2,
                          width: Math.max(span * DAY_WIDTH - 4, 8),
                          height: depth > 0 ? 10 : 14,
                          background: tradeColor(task.trade),
                          opacity: task.status === "done" ? 0.45 : 1,
                        }}
                      >
                        <span className="sr-only">{task.title}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Az idővonal csak megjelenít. Átütemezni a feladatra koppintva, a dátum mezőkben
        lehet.
      </p>
    </div>
  );
}
