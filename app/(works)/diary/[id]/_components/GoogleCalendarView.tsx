"use client";
import FullCalendar from "@fullcalendar/react";
import React from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg, type EventInput } from "@fullcalendar/core";
import huLocale from "@fullcalendar/core/locales/hu";
import { WorkDiaryWithItem, WorkDiaryItemDTO } from "@/actions/get-workdiariesbyworkid-actions";

type DiaryWithEditing = WorkDiaryWithItem & { __editingItemId?: number };
interface EventExtProps {
  diaryId: number;
  workItemName?: string;
  workItemId?: number | null;
  workId?: number | null;
  workerId?: number | null;
  email?: string | null;
  quantity?: number | null;
  unit?: string | null;
  workHours?: number | null;
  notes?: string | null;
  images?: string[] | null;
  tenantEmail?: string | null;
  date?: Date | string;
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
    for (const d of diaries ?? []) {
      const items = d.workDiaryItems as WorkDiaryItemDTO[] | undefined;
      if (!items || items.length === 0) continue;
      for (const it of items) {
        list.push({
          id: String(it.id),
          title: d.workItem?.name || "Napló",
          start: it.date,
          allDay: true,
          extendedProps: {
            diaryId: d.id,
            workItemName: d.workItem?.name,
            workItemId: it.workItemId,
            workId: it.workId,
            workerId: it.workerId,
            email: it.email,
            quantity: it.quantity,
            unit: it.unit,
            workHours: it.workHours,
            notes: it.notes,
            images: it.images,
            tenantEmail: (it as unknown as { tenantEmail?: string | null }).tenantEmail ?? null,
            date: it.date,
          } as EventExtProps,
        });
      }
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
          };
          return (
            <div className="fc-daycell-wrap">
              <span className="fc-daynum">{arg.dayNumberText}</span>
              <button className="fc-add-btn" onClick={handleClick} title="Új napló tétel">+</button>
            </div>
          );
        }}
        eventContent={(arg) => {
          const p = (arg.event.extendedProps || {}) as EventExtProps;
          const isDay = arg.view.type === "timeGridDay";
          const lines = [
            p.workItemName ? `${p.workItemName}` : undefined,
            p.email ? `Munkás: ${p.email}` : undefined,
            p.quantity != null || p.unit ? `Menny.: ${p.quantity ?? "-"} ${p.unit ?? ""}` : undefined,
            p.workHours != null ? `Munkaóra: ${p.workHours}` : undefined,
            p.notes ? `Megjegyzés: ${p.notes}` : undefined,
            Array.isArray(p.images) ? `Képek: ${p.images.length}` : undefined,
            p.tenantEmail ? `Tenant: ${p.tenantEmail}` : undefined,
          ].filter(Boolean) as string[];

          if (!isDay) {
            // Hét/Hónap: kompakt, első 2-3 sor
            const compact = lines.slice(0, 3);
            return (
              <div className="fc-event-inner compact">
                {compact.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            );
          }

          // Nap nézet: minden részlet
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
          if (diary) {
            // Megjelöljük, melyik WorkDiaryItem-re kattintottak (szükség esetére)
            (diary as DiaryWithEditing).__editingItemId = itemId;
            onEventClick(diary);
          }
        }}
        dateClick={(info: DateClickArg) => {
          if (onDateClick) onDateClick(info.date);
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
          color: #047857;      /* emerald-700 */
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
          border-color: #a7f3d0 !important;     /* emerald-200 */
          color: #065f46 !important;            /* emerald-900 for readability */
          font-size: 0.75rem;                   /* text-sm */
          line-height: 1rem;                    /* tight lines */
        }
        /* Ensure inner content inherits readable color */
        .fc-mobile-wrap .fc .fc-event .fc-event-main,
        .fc-mobile-wrap .fc .fc-event-inner {
          color: inherit;
          padding: 2px 4px;                    /* compact padding */
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
