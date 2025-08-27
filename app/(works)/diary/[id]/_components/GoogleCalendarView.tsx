"use client";
import FullCalendar from "@fullcalendar/react";
import React from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, DateSelectArg, type EventInput } from "@fullcalendar/core";
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
}

export default function GoogleCalendarView({
  diaries = [],
  onDateClick,
  onEventClick,
}: GoogleCalendarViewProps) {


  // Egy WorkDiaryItem = egy naptár esemény, hogy minden információ látszódjon
  const events = React.useMemo(() => {
    const list: EventInput[] = [];
    console.groupCollapsed("[Calendar] Build events");
    console.log("Diaries count:", diaries?.length ?? 0);
    for (const d of diaries ?? []) {
      const items = d.workDiaryItems as WorkDiaryItemDTO[] | undefined;
      if (!items || items.length === 0) continue;
      for (const it of items) {
        const accepted = (it as { accepted?: boolean }).accepted;
        const ev: EventInput = {
          id: String(it.id),
          title: d.workItem?.name || "Napló",
          start: it.date,
          allDay: true,
          classNames: accepted !== true ? ["pending"] : [],
          extendedProps: {
            diaryId: d.id,
            workItemName: d.workItem?.name,
            workItemId: it.workItemId,
            workId: it.workId,
            workerId: it.workerId,
            email: it.email,
            name: it.name ?? null,
            quantity: it.quantity,
            unit: it.unit,
            workHours: it.workHours,
            notes: it.notes,
            images: it.images,
            tenantEmail:
              (it as unknown as { tenantEmail?: string | null }).tenantEmail ??
              null,
            date: it.date,
            accepted,
          } as EventExtProps,
        };
        console.log("Event built:", {
          itemId: it.id,
          workItemName: d.workItem?.name,
          date: it.date,
          accepted,
          extendedProps: (ev.extendedProps as EventExtProps),
        });
        list.push(ev);
      }
    }
    console.log("Total events:", list.length);
    console.groupEnd();
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
        initialView="timeGridWeek"
        headerToolbar={headerToolbar}
        titleFormat={{ year: "numeric", month: "short" }}
        views={{
          timeGridDay: {
            titleFormat: { year: "numeric", month: "short", day: "2-digit", weekday: "long" },
          },
        }}
        buttonText={{
          today: "ma",
          month: "Hó",
          week: "Hét",
          day: "Nap",
        }}
        /* no header plus buttons to avoid duplicates */
        events={events}
        /* Default day cells (no custom '+') */
        eventContent={(arg) => {
          const p = (arg.event.extendedProps || {}) as EventExtProps;
          const viewType = arg.view.type; // 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
          try {
            console.groupCollapsed("[Calendar] render eventContent");
            console.log("View:", viewType);
            console.log("Event:", arg.event);
            console.log("ExtendedProps:", p);
            console.groupEnd();
          } catch {}

          const getInitialsFromNameOnly = (name?: string | null) => {
            const n = (name || "").trim();
            if (!n) return "";
            const parts = n.split(/\s+/).filter(Boolean);
            const first = parts[0]?.[0] || "";
            const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
            return (first + last).toUpperCase();
          };
          const hours = p.workHours != null ? `${p.workHours} óra` : "";

          if (viewType === "dayGridMonth") {
            // Hónap nézet: monogram (csak névből), vagy ha nincs név, akkor teljes email + munkaóra
            const nameInitials = getInitialsFromNameOnly(p.name ?? null);
            const label = nameInitials || (p.email ?? "");
            const parts = [label, hours].filter(Boolean);
            return (
              <div className="fc-event-inner compact">
                {parts.map((part, i) => (
                  <div key={i}>{part}</div>
                ))}
              </div>
            );
          }

          // Részletek: hét/nap nézetben nincs megjegyzés és képek, és NINCS külön "Munkás:" sor
          const workerLine = p.name && p.email
            ? `${p.name}`
            : p.name
            ? `Munkás: ${p.name}`
            : p.email
            ? `Munkás: ${p.email}`
            : undefined;
          const qtyLine =
            p.quantity != null || p.unit
              ? ` ${p.quantity ?? "-"} ${p.unit ?? ""}`
              : undefined;

          const restLines =
            viewType === "timeGridWeek"
              ? [qtyLine].filter(Boolean) // hét: csak mennyiség
              : [
                  workerLine,
                  qtyLine,
                  p.notes ? `Megjegyzés: ${p.notes}` : undefined,
                  Array.isArray(p.images) ? `Képek: ${p.images.length}` : undefined,
                ].filter(Boolean); // nap és többi: minden (tenantEmail továbbra sem jelenik meg)

          // Hét/Nap: első sor workItemName[0..8] + (monogram névből VAGY teljes email) + munkaóra, utána minden
          const nameInitials = getInitialsFromNameOnly(p.name ?? null);
          const nameOrEmail = nameInitials || (p.email ?? "");
          const headerParts = [
            (p.workItemName || "").slice(0, 8),
            nameOrEmail,
            hours,
          ].filter(Boolean);
          const header = headerParts.join("\n");
          const lines = [header, ...restLines];

          return (
            <div className="fc-event-inner detailed">
              {lines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          );
        }}
        eventClick={(info: EventClickArg) => {
          const diaryId = (info.event.extendedProps as EventExtProps)?.diaryId;
          const itemId = Number(info.event.id);
          const diary = diaries.find((d) => d.id === diaryId);
          console.log("[Calendar] eventClick:", {
            diaryId,
            itemId,
            event: info.event,
            extendedProps: info.event.extendedProps,
          });
          if (diary) {
            // Megjelöljük, melyik WorkDiaryItem-re kattintottak (szükség esetére)
            (diary as DiaryWithEditing).__editingItemId = itemId;
            onEventClick(diary);
          }
        }}
        /* Long-press (touch) or drag select to create new */
        selectable={true}
        selectLongPressDelay={400}
        select={(info: DateSelectArg) => {
          onDateClick?.(info.start);
          console.log("[Calendar] select:", info);
        }}
        height="80vh"
        locale={huLocale}
        dayMaxEvents={3}
        nowIndicator={true}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        fixedWeekCount={false}
      />
      <style jsx global>{`
        /* Compact header/title on small screens */
        @media (max-width: 480px) {
          .fc-mobile-wrap .fc .fc-header-toolbar {
            margin-bottom: 0.35rem;
            gap: 0.2rem;
          }
          /* Hide hour labels in weekly view, keep the grid */
          .fc-mobile-wrap .fc .fc-timegrid-slot-label {
            display: none;
          }
          /* Remove the first (left) axis column entirely */
          .fc-mobile-wrap .fc .fc-timegrid-axis,
          .fc-mobile-wrap .fc .fc-scrollgrid-shrink,
          .fc-mobile-wrap .fc .fc-timegrid-divider {
            display: none;
          }
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
          }
          .fc-mobile-wrap .fc .fc-button {
            padding: 0.2rem 0.45rem; /* even smaller */
            font-size: 0.7rem; /* slightly smaller than xs */
            border-radius: 0.375rem; /* rounded-md */
          }
        }
        /* DAY VIEW ONLY: hide the first hours column (timeGridDay) */
        /* FullCalendar adds view-specific root class names: .fc-timeGridDay-view */
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-axis,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-scrollgrid-shrink,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-slot-label,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-divider {
          display: none !important;
        }
        /* WEEK VIEW ONLY: hide the first hours column (timeGridWeek) */
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-axis,
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-scrollgrid-shrink,
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-slot-label,
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-divider {
          display: none !important;
        }
        /* ITEMS: light green background in all views */
        .fc-mobile-wrap .fc .fc-event,
        .fc-mobile-wrap .fc .fc-daygrid-event,
        .fc-mobile-wrap .fc .fc-timegrid-event {
          background-color: #d1fae5 !important; /* emerald-100 */
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
          white-space: pre-line;;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}
