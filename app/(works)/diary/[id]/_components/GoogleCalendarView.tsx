"use client";
import FullCalendar from "@fullcalendar/react";
import React from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, type EventInput } from "@fullcalendar/core";
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


  console.log(diaries, 'DIARIES')
  // Egy WorkDiaryItem = egy naptár esemény, hogy minden információ látszódjon
  const events = React.useMemo(() => {
    const list: EventInput[] = [];
    console.groupCollapsed("[Calendar] Build events");
    console.log("Diaries count:", diaries?.length ?? 0);
    for (const d of diaries ?? []) {
      const items = d.workDiaryItems as WorkDiaryItemDTO[] | undefined;
      if (!items || items.length === 0) continue;
      for (const it of items) {
        const accepted = (it as any).accepted as boolean | undefined;
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
            name: (it as any).name ?? null,
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
          extendedProps: (ev as any).extendedProps,
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
        buttonText={{
          today: "ma",
          month: "Hó",
          week: "Hét",
          day: "Nap",
        }}
        /* no header plus buttons to avoid duplicates */
        events={events}
        dayCellContent={(arg) => {
          // Egyetlen "+" ikon minden nap alján jobb sarokban
          const d = arg.date; // cella dátuma
          const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onDateClick?.(d);
            console.log("[Calendar] dayCell + clicked:", { date: d });
          };
          return (
            <div className="fc-daycell-wrap">
              <span className="fc-daynum">{arg.dayNumberText}</span>
              <button
                className="fc-add-btn"
                onClick={handleClick}
                title="Új napló tétel"
              >
                +
              </button>
            </div>
          );
        }}
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

          const getInitials = (name?: string | null, email?: string | null) => {
            const n = (name || "").trim();
            if (n) {
              const parts = n.split(/\s+/).filter(Boolean);
              const first = parts[0]?.[0] || "";
              const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
              return (first + last).toUpperCase();
            }
            const mail = email || "";
            const loc = mail.split("@")[0] || "";
            if (!loc) return "";
            const lp = loc.split(/[._-]+/).filter(Boolean);
            if (lp.length >= 2) return (lp[0][0] + lp[1][0]).toUpperCase();
            return loc.slice(0, 2).toUpperCase();
          };

          const getInitialsFromNameOnly = (name?: string | null) => {
            const n = (name || "").trim();
            if (!n) return "";
            const parts = n.split(/\s+/).filter(Boolean);
            const first = parts[0]?.[0] || "";
            const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
            return (first + last).toUpperCase();
          };

          const initials = getInitials(p.name ?? null, p.email ?? null);
          const hours = p.workHours != null ? `${p.workHours} óra` : "";

          if (viewType === "dayGridMonth") {
            // Hónap nézet: monogram (csak névből), vagy ha nincs név, akkor teljes email + munkaóra
            const nameInitials = getInitialsFromNameOnly(p.name ?? null);
            const label = nameInitials || (p.email ?? "");
            return (
              <div className="fc-event-inner compact">
                <div>{[label, hours].filter(Boolean).join(", ")}</div>
              </div>
            );
          }

          // Részletek: hét/nap nézetben nincs megjegyzés és képek, és NINCS külön "Munkás:" sor
          const workerLine = p.name && p.email
            ? `Munkás: ${p.name} (${p.email})`
            : p.name
            ? `Munkás: ${p.name}`
            : p.email
            ? `Munkás: ${p.email}`
            : undefined;
          const qtyLine =
            p.quantity != null || p.unit
              ? `Menny.: ${p.quantity ?? "-"} ${p.unit ?? ""}`
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
          const header = headerParts.join(", ");
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
        dateClick={(info: DateClickArg) => {
          if (onDateClick) onDateClick(info.date);
          console.log("[Calendar] dateClick:", info);
        }}
        height="80vh"
        locale={huLocale}
        selectable={true}
        longPressDelay={0}
        dayMaxEvents={3}
        nowIndicator={true}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        fixedWeekCount={false}
      />
      <style jsx global>{`
        /* Day number + plus button container (whole cell) */
        .fc-mobile-wrap .fc .fc-daygrid-day-frame .fc-daycell-wrap {
          position: relative;
          display: block;
          height: 100%;
          padding: 2px 4px 20px 4px; /* bottom space for + */
          box-sizing: border-box;
        }
        .fc-mobile-wrap .fc .fc-add-btn {
          position: absolute;
          right: 2px;
          bottom: 2px;
          width: 16px;
          height: 16px;
          line-height: 14px;
          padding: 0;
          font-size: 12px;
          border-radius: 4px;
          border: 1px solid #a7f3d0;
          background: #ecfdf5; /* emerald-50 */
          color: #047857; /* emerald-700 */
          cursor: pointer;
        }
        .fc-mobile-wrap .fc .fc-add-btn:hover {
          background: #d1fae5;
        }
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
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}
