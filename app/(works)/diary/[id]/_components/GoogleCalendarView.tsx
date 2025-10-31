"use client";
import FullCalendar from "@fullcalendar/react";
import React from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventClickArg,
  DateSelectArg,
  type EventInput,
} from "@fullcalendar/core";
import huLocale from "@fullcalendar/core/locales/hu";
import {
  WorkDiaryWithItem,
  WorkDiaryItemDTO,
} from "@/actions/get-workdiariesbyworkid-actions";

type DiaryWithEditing = WorkDiaryWithItem & { __editingItemId?: number };
interface EventExtProps {
  diaryId: number;
  workItemName?: string;
  workItemId?: number | null;
  workId?: number | null;
  workerId?: number | null;
  email?: string | null;
  name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  workHours?: number | null;
  notes?: string | null;
  images?: string[] | null;
  tenantEmail?: string | null;
  date?: Date | string;
  accepted?: boolean;
}

interface GoogleCalendarViewProps {
  diaries: WorkDiaryWithItem[];
  onEventClick: (diary: WorkDiaryWithItem) => void;
  onDateClick?: (date: Date) => void;
  workItems?: Array<{ id: number; name: string }>;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  view: "dayGridMonth" | "timeGridWeek";
  setView: (view: "dayGridMonth" | "timeGridWeek") => void;
}

export default function GoogleCalendarView({
  diaries = [],
  onDateClick,
  onEventClick,
  workItems = [],
  currentDate,
  setCurrentDate,
  view,
  setView,
}: GoogleCalendarViewProps) {
  // Group WorkDiaryItems by groupNo and create events for groups
  const events = React.useMemo(() => {
    const list: EventInput[] = [];
    const groups = new Map<
      number,
      {
        groupNo: number;
        date: Date;
        items: WorkDiaryItemDTO[];
        diaryId: number;
        workItemNames: string[];
        workers: string[];
        workerHours: Map<string, number>;
        totalHours: number;
        hasUnapproved: boolean;
      }
    >();

    // First, collect all items and group them by groupNo
    for (const d of diaries ?? []) {
      const items = d.workDiaryItems as WorkDiaryItemDTO[] | undefined;
      if (!items || items.length === 0) continue;

      for (const it of items) {
        // Only process items with valid groupNo
        if (it.groupNo != null && it.groupNo !== undefined) {
          const groupNo = it.groupNo;

          if (!groups.has(groupNo)) {
            groups.set(groupNo, {
              groupNo,
              date: (() => {
                // Handle date properly to avoid timezone shifts
                const dateStr =
                  typeof it.date === "string"
                    ? it.date
                    : it.date.toISOString().split("T")[0];
                return new Date(dateStr + "T00:00:00");
              })(),
              items: [],
              diaryId: d.id,
              workItemNames: [],
              workers: [],
              workerHours: new Map<string, number>(),
              totalHours: 0,
              hasUnapproved: false,
            });
          }

          const group = groups.get(groupNo)!;
          group.items.push(it);

          // Check if this item is not accepted (jóváhagyva)
          if (
            it.accepted === false ||
            it.accepted === null ||
            it.accepted === undefined
          ) {
            group.hasUnapproved = true;
          }

          // Collect unique work item names based on workItemId from the item
          const workItem = workItems.find((wi) => wi.id === it.workItemId);
          if (workItem?.name && !group.workItemNames.includes(workItem.name)) {
            group.workItemNames.push(workItem.name);
          }

          // Collect unique worker names and track their hours
          if (it.name) {
            if (!group.workers.some((w) => w === it.name)) {
              group.workers.push(it.name);
            }

            // Sum work hours per worker
            if (it.workHours != null && !isNaN(Number(it.workHours))) {
              const hours = Number(it.workHours);
              const currentHours = group.workerHours.get(it.name) || 0;
              group.workerHours.set(it.name, currentHours + hours);
              group.totalHours += hours;
            }
          }
        } else {
          // Skip individual events - only show grouped events
        }
      }
    }

    // Create events for each group
    for (const group of groups.values()) {
      let calculatedTotal = 0;
      group.items.forEach((item) => {
        const hours =
          item.workHours != null && !isNaN(Number(item.workHours))
            ? Number(item.workHours)
            : 0;
        calculatedTotal += hours;
      });

      const ev: EventInput = {
        id: `group-${group.groupNo}`,
        title: `Munkanapló`,
        start: group.date,
        allDay: true,
        classNames: group.hasUnapproved
          ? ["grouped", "unapproved"]
          : ["grouped"], // Add unapproved class if needed
        extendedProps: {
          isGrouped: true,
          groupNo: group.groupNo,
          diaryId: group.diaryId,
          workItemNames: group.workItemNames,
          workers: group.workers,
          workerHours: group.workerHours,
          totalHours: calculatedTotal, // Use the recalculated total
          itemCount: group.items.length,
          items: group.items,
          hasUnapproved: group.hasUnapproved,
        },
      };

      list.push(ev);
    }

    return list;
  }, [diaries]);

  // Header toolbar: always show Month, Week, Day
  const headerToolbar = React.useMemo(
    () => ({
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    }),
    []
  );

  return (
    <div className="fc-mobile-wrap">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        initialDate={currentDate}
        datesSet={(arg) => {
          if (
            arg.view.type === "dayGridMonth" ||
            arg.view.type === "timeGridWeek"
          ) {
            setView(arg.view.type);
          }
          setCurrentDate(arg.view.currentStart);
        }}
        headerToolbar={headerToolbar}
        titleFormat={{ year: "numeric", month: "short" }}
        views={{
          timeGridDay: {
            titleFormat: {
              year: "numeric",
              month: "short",
              day: "2-digit",
              weekday: "long",
            },
          },
        }}
        buttonText={{
          today: "ma",
          month: "Hó",
          week: "Hét",
          day: "Nap",
        }}
        events={events}
        eventContent={(arg) => {
          const p = arg.event.extendedProps || {};
          const viewType = arg.view.type; // 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

          // Check if this is a grouped event
          if (p.isGrouped) {
            const groupData = p as {
              groupNo: number;
              workItemNames: string[];
              workers: string[];
              workerHours: Map<string, number>;
              totalHours: number;
              itemCount: number;
            };

            // Create worker list with individual hours
            const workersWithHours = groupData.workers.map((worker) => {
              const hours = groupData.workerHours?.get?.(worker) || 0;
              const roundedHours = Math.round(hours);
              return `${worker} (${roundedHours}h)`;
            });

            if (viewType === "dayGridMonth") {
              // Month view - compact format with monograms and line breaks
              const workersCompact = groupData.workers.map((worker) => {
                const hours = groupData.workerHours?.get?.(worker) || 0;
                const roundedHours = Math.round(hours);
                // Get initials from worker name with dots (M. Z.)
                const nameParts = worker.split(" ").filter(Boolean);
                const initials = nameParts
                  .map((part) => part[0].toUpperCase() + ".")
                  .join(" ");
                return `${initials} ${roundedHours}h`;
              });

              return (
                <div className="fc-event-inner grouped-compact">
                  <div style={{ whiteSpace: "pre-line" }}>
                    {workersCompact.join("\n")}
                  </div>
                </div>
              );
            }

            // Week view - compact format with monograms and line breaks
            if (viewType === "timeGridWeek") {
              const workersCompact = groupData.workers.map((worker) => {
                const hours = groupData.workerHours?.get?.(worker) || 0;
                const roundedHours = Math.round(hours);
                // Get initials from worker name with dots (M. Z.)
                const nameParts = worker.split(" ").filter(Boolean);
                const initials = nameParts
                  .map((part) => part[0].toUpperCase() + ".")
                  .join(" ");
                return `${initials} ${roundedHours}h`;
              });

              return (
                <div className="fc-event-inner grouped-compact">
                  <div className="text-xs">
                    <div style={{ whiteSpace: "pre-line" }}>
                      {workersCompact.join("\n")}
                    </div>
                  </div>
                </div>
              );
            }

            // Day view - detailed format like before
            const workItemsLines = groupData.workItemNames.map(
              (item, index) => <div key={index}>🔧 {item}</div>
            );

            return (
              <div className="fc-event-inner grouped-detailed">
                <div className="text-xs">
                  <div>👤 Dolgozók: {workersWithHours.join(", ")}</div>
                  {workItemsLines}
                  <div>📝 {groupData.itemCount} bejegyzés</div>
                </div>
              </div>
            );
          }

          // Original individual event rendering (fallback for non-grouped items)
          const originalProps = p as EventExtProps;
          const getInitialsFromNameOnly = (name?: string | null) => {
            const n = (name || "").trim();
            if (!n) return "";
            const parts = n.split(/\s+/).filter(Boolean);
            // Create initials with dots (M. Z.)
            return parts.map((part) => part[0].toUpperCase() + ".").join(" ");
          };
          const hours =
            originalProps.workHours != null
              ? `${Math.round(originalProps.workHours)} óra`
              : "";

          if (viewType === "dayGridMonth" || viewType === "timeGridWeek") {
            const nameInitials = getInitialsFromNameOnly(
              originalProps.name ?? null
            );
            const label = nameInitials || (originalProps.email ?? "");
            const hoursShort =
              originalProps.workHours != null
                ? `${Math.round(originalProps.workHours * 100) / 100}h`
                : "";

            // Format: "M. Z. 8h"
            const displayText = [label, hoursShort].filter(Boolean).join(" ");

            return (
              <div className="fc-event-inner compact">
                <div>{displayText}</div>
              </div>
            );
          }

          return (
            <div className="fc-event-inner detailed">
              <div>{originalProps.workItemName || "Napló"}</div>
              <div>{originalProps.name || originalProps.email}</div>
              {hours && <div>{hours}</div>}
            </div>
          );
        }}
        eventClick={(info: EventClickArg) => {
          const props = info.event.extendedProps;

          if (props.isGrouped) {
            // Handle grouped event click
            const groupNo = props.groupNo;

            // Collect all items from this group across all diaries
            const groupItems: WorkDiaryItemDTO[] = [];
            let baseDiary: WorkDiaryWithItem | null = null;

            diaries.forEach((d) => {
              if (d.workDiaryItems && d.workDiaryItems.length > 0) {
                const matchingItems = (
                  d.workDiaryItems as WorkDiaryItemDTO[]
                ).filter((item) => item.groupNo === groupNo);
                if (matchingItems.length > 0) {
                  groupItems.push(...matchingItems);
                  // Use the first diary that has items from this group as base
                  if (!baseDiary) {
                    baseDiary = d;
                  }
                }
              }
            });

            if (baseDiary && groupItems.length > 0) {
              // Create a comprehensive grouped diary object
              const groupedDiary: WorkDiaryWithItem & {
                isGrouped: true;
                groupNo: number;
              } = {
                ...(baseDiary as WorkDiaryWithItem),
                isGrouped: true,
                groupNo: groupNo,
                workDiaryItems: groupItems,
                date: (() => {
                  // Handle date properly to avoid timezone shifts
                  const dateStr =
                    typeof groupItems[0].date === "string"
                      ? groupItems[0].date
                      : groupItems[0].date.toISOString().split("T")[0];
                  return new Date(dateStr + "T00:00:00");
                })(),
                notes: (() => {
                  const aggregatedNotes = groupItems
                    .map((item) => item.notes ?? "")
                    .filter((s): s is string => s.length > 0)
                    .join("; ");
                  return (
                    aggregatedNotes ||
                    (baseDiary as WorkDiaryWithItem).notes ||
                    ""
                  );
                })(),
                workHours:
                  Math.round(
                    groupItems.reduce(
                      (sum, item) => sum + (Number(item.workHours) || 0),
                      0
                    ) * 100
                  ) / 100,
                quantity: groupItems.reduce(
                  (sum, item) => sum + (Number(item.quantity) || 0),
                  0
                ),
              };

              onEventClick(groupedDiary);
            }
          } else {
            // Handle individual event click (fallback)
            const diaryId = (info.event.extendedProps as EventExtProps)
              ?.diaryId;
            const itemId = Number(info.event.id);
            const diary = diaries.find((d) => d.id === diaryId);

            if (diary) {
              (diary as DiaryWithEditing).__editingItemId = itemId;
              onEventClick(diary);
            }
          }
        }}
        /* Long-press (touch) or drag select to create new */
        selectable={true}
        selectLongPressDelay={400}
        select={(info: DateSelectArg) => {
          onDateClick?.(info.start);
        }}
        height={view === "dayGridMonth" ? 600 : 400}
        locale={huLocale}
        dayMaxEvents={3}
        nowIndicator={true}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        fixedWeekCount={false}
      />
      <style jsx global>{`
        /* Fix calendar height to prevent internal scrolling */
        .fc-mobile-wrap .fc {
          height: ${view === "dayGridMonth" ? "600px" : "400px"} !important;
        }
        .fc-mobile-wrap .fc .fc-view-harness {
          height: auto !important;
          overflow: visible !important;
        }
        .fc-mobile-wrap .fc .fc-scroller {
          overflow: visible !important;
          height: auto !important;
        }
        .fc-mobile-wrap .fc .fc-scroller-liquid {
          height: auto !important;
        }
        /* Compact header/title on small screens */
        @media (max-width: 480px) {
          .fc-mobile-wrap .fc .fc-header-toolbar {
            margin-bottom: 0.35rem;
            gap: 0.2rem;
            flex-wrap: nowrap !important;
            align-items: center !important;
          }
          .fc-mobile-wrap .fc .fc-toolbar-chunk {
            display: flex !important;
            align-items: center !important;
            flex-shrink: 0 !important;
          }
          /* Mobile: keep axis elements but make them 0 width */
          /* Add spacing between grouped header buttons */
          .fc-mobile-wrap .fc .fc-button-group .fc-button + .fc-button {
            margin-left: 0.25rem;
          }
          .fc-mobile-wrap .fc-toolbar-title {
            font-size: 0.875rem; /* text-sm */
            font-weight: 500;
            line-height: 1rem;
            letter-spacing: 0.01em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-shrink: 1 !important;
          }
          .fc-mobile-wrap .fc .fc-button {
            padding: 0.2rem 0.45rem; /* even smaller */
            font-size: 0.7rem; /* slightly smaller than xs */
            border-radius: 0.375rem; /* rounded-md */
          }
          /* Hónapmozgató nyilak és 'ma' gomb narancssárga színe */
          .fc .fc-button.fc-prev-button,
          .fc .fc-button.fc-next-button,
          .fc .fc-button.fc-today-button {
            color: #FE9C00 !important;
            background-color: white !important;
            border-color: #FE9C00 !important;
          }
          .fc .fc-button.fc-prev-button .fc-icon,
          .fc .fc-button.fc-next-button .fc-icon {
            color: #FE9C00 !important;
          }
          .fc .fc-button.fc-prev-button::before,
          .fc .fc-button.fc-next-button::before {
            color: #FE9C00 !important;
          }
          .fc .fc-button.fc-prev-button:hover,
          .fc .fc-button.fc-next-button:hover,
          .fc .fc-button.fc-today-button:hover {
            background-color: #FEF3E6 !important;
            color: #FE9C00 !important;
            border-color: #FE9C00 !important;
          }
          .fc .fc-button.fc-today-button:disabled {
            background-color: #FE9C00 !important;
            color: white !important;
            border-color: #FE9C00 !important;
            opacity: 1 !important;
          }
          /* Hó Hét Nap gombok narancssárga színe - fehér háttér */
          .fc .fc-button-group .fc-button {
            color: #FE9C00 !important;
            border-color: #FE9C00 !important;
            background-color: white !important;
          }
          .fc .fc-button-group .fc-button:hover {
            background-color: #FEF3E6 !important;
            color: #FE9C00 !important;
            border-color: #FE9C00 !important;
          }
          .fc .fc-button-group .fc-button:focus,
          .fc .fc-button-group .fc-button:active {
            outline: none !important;
            box-shadow: 0 0 0 2px #FE9C00 !important;
            border-color: #FE9C00 !important;
          }
          .fc .fc-button-group .fc-button.fc-button-active {
            background-color: #FE9C00 !important;
            color: white !important;
            border-color: #FE9C00 !important;
          }
        }
        /* ===== DESKTOP & MOBILE: Az első (axis) oszlop maradjon a layoutban, de 0 szélességgel ===== */
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-scrollgrid-shrink,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-scrollgrid-shrink,
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-axis,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-axis {
          width: 0 !important;
          min-width: 0 !important;
          max-width: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          flex: 0 0 0 !important; /* fontos! */
        }

        /* A vékony függőleges elválasztót is rejtsd el */
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-divider,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-divider {
          display: none !important;
        }
        /* GROUPED EVENTS: green background */
        .fc-mobile-wrap .fc .fc-event.grouped,
        .fc-mobile-wrap .fc .fc-daygrid-event.grouped,
        .fc-mobile-wrap .fc .fc-timegrid-event.grouped {
          background-color: #dcfce7 !important; /* green-100 */
          border-color: #86efac !important; /* green-300 */
          color: #166534 !important; /* green-800 for readability */
          font-size: 0.75rem; /* text-sm */
          line-height: 1rem; /* tight lines */
          font-weight: 500; /* medium weight for grouped events */
        }
        /* UNAPPROVED EVENTS: golden yellow background */
        .fc-mobile-wrap .fc .fc-event.unapproved,
        .fc-mobile-wrap .fc .fc-daygrid-event.unapproved,
        .fc-mobile-wrap .fc .fc-timegrid-event.unapproved {
          background-color: #fbbf24 !important; /* amber-400 - golden yellow */
          border-color: #f59e0b !important; /* amber-500 */
          color: #92400e !important; /* amber-800 for readability */
        }
        /* INDIVIDUAL ITEMS: light green background */
        .fc-mobile-wrap .fc .fc-event:not(.grouped),
        .fc-mobile-wrap .fc .fc-daygrid-event:not(.grouped),
        .fc-mobile-wrap .fc .fc-timegrid-event:not(.grouped) {
          background-color: #d1fae5 !important; /* emerald-100 */
          border-color: #a7f3d0 !important; /* emerald-200 */
          color: #065f46 !important; /* emerald-900 for readability */
          font-size: 0.75rem; /* text-sm */
          line-height: 1rem; /* tight lines */
        }
        /* A tartalmat tüntesd el (óra-címkék) */
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-slot-label,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-slot-label,
        .fc-mobile-wrap
          .fc
          .fc-timeGridWeek-view
          .fc-timegrid-axis
          .fc-timegrid-axis-cushion,
        .fc-mobile-wrap
          .fc
          .fc-timeGridDay-view
          .fc-timegrid-axis
          .fc-timegrid-axis-cushion {
          display: none !important;
          visibility: hidden !important;
        }

          border-color: #a7f3d0 !important; /* emerald-200 */
          color: #065f46 !important; /* emerald-900 for readability */
          font-size: 0.75rem; /* text-sm */
          line-height: 1rem; /* tight lines */
        }
        /* PENDING (accepted === false): orange */
        .fc-mobile-wrap .fc .fc-event.pending,
        .fc-mobile-wrap .fc .fc-daygrid-event.pending,
        .fc-mobile-wrap .fc .fc-timegrid-event.pending {
          background-color: #fed7aa !important; /* orange-200 */
          border-color: #fdba74 !important; /* orange-300 */
          color: #9a3412 !important; /* orange-800 */
        }
        /* Ensure inner content inherits readable color */
        .fc-mobile-wrap .fc .fc-event .fc-event-main,
        .fc-mobile-wrap .fc .fc-event-inner {
          color: inherit;
          padding: 2px 4px; /* compact padding */
        }
        /* Prevent horizontal overflow: keep events inside the cell */
        .fc-mobile-wrap .fc .fc-daygrid-event,
        .fc-mobile-wrap .fc .fc-timegrid-event {
          max-width: 100% !important;
          box-sizing: border-box;
          overflow: hidden;
        }
        .fc-mobile-wrap .fc .fc-daygrid-event,
        .fc-mobile-wrap .fc .fc-daygrid-event .fc-event-main,
        .fc-mobile-wrap .fc .fc-event-inner {
          white-space: pre-line;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}
