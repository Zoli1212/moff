"use client";
import FullCalendar from '@fullcalendar/react';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import huLocale from '@fullcalendar/core/locales/hu';
import { WorkDiaryWithItem } from '@/actions/get-workdiariesbyworkid-actions';

interface GoogleCalendarViewProps {
  diaries: WorkDiaryWithItem[];
  onDateClick: (date: Date) => void;
  onEventClick: (diary: WorkDiaryWithItem) => void;
}

export default function GoogleCalendarView({ diaries = [], onDateClick, onEventClick }: GoogleCalendarViewProps) {
  // Csoportosítsuk a naplókat dátum szerint, hogy naponta csak egy esemény jelenjen meg
  const eventMap: { [date: string]: WorkDiaryWithItem[] } = {};
  (diaries ?? []).forEach(diary => {
    const date = new Date(diary.date).toISOString().slice(0, 10);
    if (!eventMap[date]) eventMap[date] = [];
    eventMap[date].push(diary);
  });
  const events = Object.entries(eventMap).map(([date, diaries]) => ({
    id: String(diaries[0].id),
    title: diaries.length === 1
      ? (diaries[0].workItem?.name || 'Napló')
      : `*${diaries[0].workItem?.name || 'Napló'} +${diaries.length - 1} további`,
    start: date,
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
      dateClick={(info: any) => onDateClick(info.date)}
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
