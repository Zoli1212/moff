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
  workItems?: Array<{ id: number; name: string; }>;
}

export default function GoogleCalendarView({
  diaries = [],
  onDateClick,
  onEventClick,
  workItems = [],
}: GoogleCalendarViewProps) {
  // Group WorkDiaryItems by groupNo and create events for groups
  const events = React.useMemo(() => {
    const list: EventInput[] = [];
    const groups = new Map<number, {
      groupNo: number;
      date: Date;
      items: WorkDiaryItemDTO[];
      diaryId: number;
      workItemNames: string[];
      workers: string[];
      totalHours: number;
    }>();

    console.groupCollapsed("[Calendar] Build grouped events");
    console.log("Diaries count:", diaries?.length ?? 0);

    // First, collect all items and group them by groupNo
    for (const d of diaries ?? []) {
      const items = d.workDiaryItems as WorkDiaryItemDTO[] | undefined;
      console.log("Diary:", d.id, "Items count:", items?.length ?? 0);
      if (!items || items.length === 0) continue;
      
      for (const it of items) {
        console.log("Item:", it.id, "groupNo:", it.groupNo, "name:", it.name);
        // Only process items with valid groupNo
        if (it.groupNo != null && it.groupNo !== undefined) {
          const groupNo = it.groupNo;
          
          if (!groups.has(groupNo)) {
            groups.set(groupNo, {
              groupNo,
              date: new Date(it.date),
              items: [],
              diaryId: d.id,
              workItemNames: [],
              workers: [],
              totalHours: 0,
            });
          }
          
          const group = groups.get(groupNo)!;
          group.items.push(it);
          
          // Collect unique work item names based on workItemId from the item
          const workItem = workItems.find(wi => wi.id === it.workItemId);
          if (workItem?.name && !group.workItemNames.includes(workItem.name)) {
            group.workItemNames.push(workItem.name);
          }
          
          // Collect unique worker names with their details
          if (it.name && !group.workers.some(w => w === it.name)) {
            group.workers.push(it.name);
          }
          
          // Sum work hours
          if (it.workHours) {
            group.totalHours += it.workHours;
          }
        } else {
          // Fallback: create individual events for items without groupNo
          console.log("Creating individual event for item:", it.id);
          const ev: EventInput = {
            id: String(it.id),
            title: d.workItem?.name || "Napló",
            start: it.date,
            allDay: true,
            classNames: (it as { accepted?: boolean }).accepted !== true ? ["pending"] : [],
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
              tenantEmail: it.tenantEmail,
              date: it.date,
              accepted: (it as { accepted?: boolean }).accepted,
            } as EventExtProps,
          };
          list.push(ev);
        }
      }
    }

    // Create events for each group
    for (const group of groups.values()) {
      console.log(`=== CSOPORT #${group.groupNo} RÉSZLETES ADATOK ===`);
      console.log("Dátum:", group.date);
      console.log("Összes bejegyzés:", group.items.length);
      console.log("Dolgozók:", group.workers);
      console.log("Munkafázisok:", group.workItemNames);
      console.log("Összes munkaóra:", group.totalHours);
      
      console.log("BEJEGYZÉSEK RÉSZLETESEN:");
      group.items.forEach((item, index) => {
        console.log(`  ${index + 1}. Bejegyzés:`, {
          id: item.id,
          dolgozó: item.name,
          email: item.email,
          munkaóra: item.workHours,
          mennyiség: item.quantity,
          egység: item.unit,
          workItemId: item.workItemId,
          notes: item.notes,
          dátum: item.date,
        });
      });
      console.log("=== CSOPORT VÉGE ===\n");

      const ev: EventInput = {
        id: `group-${group.groupNo}`,
        title: `Csoport #${group.groupNo}`,
        start: group.date,
        allDay: true,
        classNames: ["grouped"], // Special class for grouped events
        extendedProps: {
          isGrouped: true,
          groupNo: group.groupNo,
          diaryId: group.diaryId,
          workItemNames: group.workItemNames,
          workers: group.workers,
          totalHours: group.totalHours,
          itemCount: group.items.length,
          items: group.items,
        },
      };
      
      list.push(ev);
    }

    console.log("Total grouped events:", list.length);
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
              totalHours: number;
              itemCount: number;
            };

            if (viewType === "dayGridMonth") {
              return (
                <div className="fc-event-inner grouped-compact">
                  <div>Csoport #{groupData.groupNo}</div>
                  <div>👤 {groupData.workers.join(", ")}</div>
                  <div>🔧 {groupData.workItemNames.length} munkafázis</div>
                </div>
              );
            }

            // Week/Day view - more detailed
            const allWorkers = groupData.workers.join(", ");
            const allWorkItems = groupData.workItemNames.join(", ");
            
            return (
              <div className="fc-event-inner grouped-detailed">
                <div className="font-semibold">Csoport #{groupData.groupNo}</div>
                <div className="text-xs">
                  <div>👤 Dolgozók: {allWorkers}</div>
                  <div>🔧 Munkafázisok: {allWorkItems}</div>
                  <div>⏱️ {groupData.totalHours}h | {groupData.itemCount} bejegyzés</div>
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
            const first = parts[0]?.[0] || "";
            const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
            return (first + last).toUpperCase();
          };
          const hours = originalProps.workHours != null ? `${originalProps.workHours} óra` : "";

          if (viewType === "dayGridMonth") {
            const nameInitials = getInitialsFromNameOnly(originalProps.name ?? null);
            const label = nameInitials || (originalProps.email ?? "");
            const parts = [label, hours].filter(Boolean);
            return (
              <div className="fc-event-inner compact">
                {parts.map((part, i) => (
                  <div key={i}>{part}</div>
                ))}
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
            const diaryId = props.diaryId;
            const diary = diaries.find((d) => d.id === diaryId);
            
            if (diary) {
              // Create a special grouped diary object with all items from this group
              const groupItems: any[] = [];
              diaries.forEach((d) => {
                if (d.workDiaryItems && d.workDiaryItems.length > 0) {
                  const matchingItems = d.workDiaryItems.filter(
                    (item: any) => item.groupNo === groupNo
                  );
                  groupItems.push(...matchingItems);
                }
              });

              const groupedDiary = {
                ...diary,
                isGrouped: true,
                groupNo: groupNo,
                workDiaryItems: groupItems,
                date: groupItems[0]?.date ? new Date(groupItems[0].date) : diary.date,
              } as WorkDiaryWithItem & { isGrouped: boolean; groupNo: number };
              
              onEventClick(groupedDiary);
            }
          } else {
            // Handle individual event click (fallback)
            const diaryId = (info.event.extendedProps as EventExtProps)?.diaryId;
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
          }
          .fc-mobile-wrap .fc .fc-button {
            padding: 0.2rem 0.45rem; /* even smaller */
            font-size: 0.7rem; /* slightly smaller than xs */
            border-radius: 0.375rem; /* rounded-md */
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

        /* A vékony függőleges elválasztót is rejtsd el */
        .fc-mobile-wrap .fc .fc-timeGridWeek-view .fc-timegrid-divider,
        .fc-mobile-wrap .fc .fc-timeGridDay-view .fc-timegrid-divider {
          display: none !important;
        }
        /* GROUPED EVENTS: blue background */
        .fc-mobile-wrap .fc .fc-event.grouped,
        .fc-mobile-wrap .fc .fc-daygrid-event.grouped,
        .fc-mobile-wrap .fc .fc-timegrid-event.grouped {
          background-color: #dbeafe !important; /* blue-100 */
          border-color: #93c5fd !important; /* blue-300 */
          color: #1e40af !important; /* blue-800 for readability */
          font-size: 0.75rem; /* text-sm */
          line-height: 1rem; /* tight lines */
          font-weight: 500; /* medium weight for grouped events */
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
