"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  addDays,
  daysBetween,
  startOfUtcDay,
  type WorkTaskDependencyDto,
  type WorkTaskDto,
} from "@/lib/work-plan/schema";

const DAY_WIDTH = 28;
const ROW_HEIGHT = 34;
/** Horizontal stub an arrow leaves before turning, so lines do not touch the bar ends. */
const ELBOW = 10;

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

interface BarGeometry {
  left: number;
  right: number;
  centerY: number;
}

interface Props {
  tasks: WorkTaskDto[];
  dependencies: WorkTaskDependencyDto[];
  baseDate: string | null;
  onSelect: (task: WorkTaskDto) => void;
}

export default function GanttChart({
  tasks,
  dependencies,
  baseDate,
  onSelect,
}: Props) {
  const { t } = useLocale();
  const rows = useMemo(() => flattenRows(tasks), [tasks]);

  /**
   * Arrows start hidden and switch on for wide viewports only. At 28px per day a phone
   * shows about ten days, and dependency lines across that many overlapping trades turn
   * the chart into noise. The toggle stays available either way.
   */
  const [showArrows, setShowArrows] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowArrows(window.matchMedia("(min-width: 768px)").matches);
  }, []);

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

  // One geometry pass feeds both the bars and the arrows, so a line can never point at
  // coordinates the bar it targets does not actually occupy.
  const geometry = useMemo(() => {
    const map = new Map<number, BarGeometry>();
    if (!range) return map;

    rows.forEach(({ task }, rowIndex) => {
      if (!task.startDate || !task.endDate) return;
      const offset = daysBetween(range.start, new Date(task.startDate));
      const span = Math.max(
        1,
        daysBetween(new Date(task.startDate), new Date(task.endDate)) + 1
      );
      const left = offset * DAY_WIDTH + 2;
      map.set(task.id, {
        left,
        right: left + Math.max(span * DAY_WIDTH - 4, 8),
        centerY: rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
      });
    });

    return map;
  }, [rows, range]);

  const taskById = useMemo(() => {
    const map = new Map<number, WorkTaskDto>();
    for (const { task } of rows) map.set(task.id, task);
    return map;
  }, [rows]);

  const arrows = useMemo(() => {
    if (!showArrows) return [];

    return dependencies.flatMap((dependency) => {
      const from = geometry.get(dependency.predecessorId);
      const to = geometry.get(dependency.successorId);
      if (!from || !to) return [];

      const predecessor = taskById.get(dependency.predecessorId);
      const successor = taskById.get(dependency.successorId);

      // Nothing reschedules automatically, so a successor starting before its
      // predecessor finishes is a real state the plan can be in. Flagging it is the
      // main thing the arrows buy: the conflict is visible instead of silent.
      const violated = Boolean(
        predecessor?.endDate &&
          successor?.startDate &&
          new Date(successor.startDate) < new Date(predecessor.endDate)
      );

      return [{ id: dependency.id, path: elbowPath(from, to), violated }];
    });
  }, [dependencies, geometry, showArrows, taskById]);

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
  const gridHeight = rows.length * ROW_HEIGHT;
  const violatedCount = arrows.filter((arrow) => arrow.violated).length;

  return (
    <div className="mt-4 px-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowArrows((value) => !value)}
          aria-pressed={showArrows}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            showArrows
              ? "border-[#FE9C00] bg-orange-50 text-[#B36E00]"
              : "border-gray-200 text-gray-600"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          {t("plan.dependencies")}
          {dependencies.length > 0 && (
            <span className="text-gray-400">{dependencies.length}</span>
          )}
        </button>

        {showArrows && violatedCount > 0 && (
          <span className="text-xs text-red-600">
            {violatedCount} ütközés: a feladat előbb indul, mint ahogy az előzménye
            befejeződne.
          </span>
        )}
      </div>

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
                const bar = geometry.get(task.id);

                return (
                  <div
                    key={task.id}
                    style={{ height: ROW_HEIGHT }}
                    className="relative border-b border-gray-100 last:border-b-0"
                  >
                    {bar && (
                      <button
                        type="button"
                        onClick={() => onSelect(task)}
                        title={`${task.title} — ${task.trade}`}
                        className="absolute top-1/2 -translate-y-1/2 rounded-full text-left"
                        style={{
                          left: bar.left,
                          width: bar.right - bar.left,
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

              {/* Arrows sit above the bars but never intercept a tap on one. */}
              {arrows.length > 0 && (
                <svg
                  className="pointer-events-none absolute left-0 top-0 z-[15]"
                  width={gridWidth}
                  height={gridHeight}
                  aria-hidden
                >
                  <defs>
                    <marker
                      id="gantt-arrow"
                      markerWidth="6"
                      markerHeight="6"
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L6,3 L0,6 Z" fill="#9CA3AF" />
                    </marker>
                    <marker
                      id="gantt-arrow-violated"
                      markerWidth="6"
                      markerHeight="6"
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L6,3 L0,6 Z" fill="#EF4444" />
                    </marker>
                  </defs>
                  {arrows.map((arrow) => (
                    <path
                      key={arrow.id}
                      d={arrow.path}
                      fill="none"
                      stroke={arrow.violated ? "#EF4444" : "#9CA3AF"}
                      strokeWidth={arrow.violated ? 1.6 : 1.2}
                      strokeDasharray={arrow.violated ? "4 3" : undefined}
                      markerEnd={`url(#${
                        arrow.violated ? "gantt-arrow-violated" : "gantt-arrow"
                      })`}
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {t("plan.ganttReadOnly")}
      </p>
    </div>
  );
}

/**
 * Elbow route from the end of one bar to the start of another.
 *
 * When the successor starts far enough to the right, a single step down suffices. When
 * it starts earlier — which happens because nothing reschedules automatically — the line
 * has to double back, so it drops into the gap between the rows before returning.
 */
function elbowPath(from: BarGeometry, to: BarGeometry): string {
  const startX = from.right;
  const startY = from.centerY;
  const endX = to.left;
  const endY = to.centerY;

  if (endX >= startX + ELBOW * 2) {
    const midX = endX - ELBOW;
    return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
  }

  const gapY =
    endY > startY
      ? startY + ROW_HEIGHT / 2
      : startY - ROW_HEIGHT / 2;

  return [
    `M ${startX} ${startY}`,
    `H ${startX + ELBOW}`,
    `V ${gapY}`,
    `H ${endX - ELBOW}`,
    `V ${endY}`,
    `H ${endX}`,
  ].join(" ");
}
