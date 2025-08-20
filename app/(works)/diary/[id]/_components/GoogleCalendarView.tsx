"use client";
import FullCalendar from '@fullcalendar/react';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import huLocale from '@fullcalendar/core/locales/hu';
import { WorkDiaryWithItem } from '@/actions/get-workdiariesbyworkid-actions';

interface GoogleCalendarViewProps {
  diaries: WorkDiaryWithItem[];
  onEventClick: (diary: WorkDiaryWithItem) => void;
}

export default function GoogleCalendarView({ diaries = [], onDateClick, onEventClick }: GoogleCalendarViewProps) {
  // Minden naplóbejegyzést külön eseményként jelenítünk meg
  const events = (diaries ?? []).map(diary => ({
    id: String(diary.id),
    title: diary.workItem?.name || 'Napló',
    start: diary.date,
    allDay: true,
  }));

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }}
      events={events}

      eventClick={(info: any) => {
        const diary = diaries.find(d => String(d.id) === info.event.id);
        if (diary) onEventClick(diary);
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
  );
}
