"use client";
import FullCalendar from "@fullcalendar/react";
import React from "react";

import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import huLocale from "@fullcalendar/core/locales/hu";
import { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

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
  // Minden naplóbejegyzést külön eseményként jelenítünk meg
  const events = (diaries ?? []).map((diary) => ({
    id: String(diary.id),
    title: diary.workItem?.name || "Napló",
    start: diary.date,
    allDay: true,
  }));

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
        events={events}
        eventClick={(info: EventClickArg) => {
          const diary = diaries.find((d) => String(d.id) === info.event.id);
          if (diary) onEventClick(diary);
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
      `}</style>
    </div>
  );
}
