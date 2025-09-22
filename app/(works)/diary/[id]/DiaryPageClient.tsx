"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GoogleCalendarView from "./_components/GoogleCalendarView";
import PerformanceSummary from "./_components/PerformanceSummary";
import { usePerformanceData } from "@/hooks/usePerformanceData";
import WorkerDiaryEditForm from "./edit/WorkerDiaryEditForm";
import GroupedDiaryCreateForm from "./edit/GroupedDiaryCreateForm";
import GroupedDiaryEditForm from "./edit/GroupedDiaryEditForm";
import { WorkItem, Worker } from "@/types/work";

import type {
  WorkDiaryWithItem,
  WorkDiaryItemDTO,
} from "@/actions/get-workdiariesbyworkid-actions";
import type { WorkDiaryItemUpdate } from "@/types/work-diary";
import { Work } from "../../works/page";

// Define the Work type locally based on its usage in page.tsx


type DiaryWithEditing = WorkDiaryWithItem & {
  __editingItemId?: number;
  isGrouped?: boolean;
  groupNo?: number;
};

interface DiaryPageClientProps {
  work: (Work & { workers: Worker[]; expectedProfitPercent: number | null }) | null;
  items: WorkItem[];
  diaries: WorkDiaryWithItem[];
  error: string | null;
  type: "workers" | "contractor";
  diaryIds: number[];
}

export default function DiaryPageClient({
  work,
  items,
  diaries,
  error,
  type,
  diaryIds,
}: DiaryPageClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek'>('timeGridWeek');
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<WorkDiaryWithItem | null>(
    null
  );
  const [editingItem, setEditingItem] = useState<
    | (Partial<WorkDiaryItemUpdate> & {
        id: number;
        name?: string;
        email?: string;
      })
    | undefined
  >(undefined);
  const [isGroupedMode, setIsGroupedMode] = useState(true); // Default to grouped mode

  useEffect(() => {
    if (items || error) {
      setIsLoading(false);
    }
  }, [items, error]);

  const performanceData = usePerformanceData({
    diaries,
    workItems: items,
    workers: work?.workers ?? [],
    expectedProfitPercent: work?.expectedProfitPercent ?? 0,
    currentDate,
    view,
  });

  const handleDateSelect = (date: Date) => {
    // Get the local date components to avoid timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const targetDateStr = `${year}-${month}-${day}`;

    const found = (diaries ?? []).find(
      (d) => new Date(d.date).toISOString().split("T")[0] === targetDateStr
    );
    if (found) {
      setSelectedDiary(found);
    } else {
      const firstItem = (items ?? [])[0];
      // Create date using local date components to avoid timezone shifts
      const localDate = new Date(year, date.getMonth(), date.getDate());
      setSelectedDiary({
        id: 0,
        workId: firstItem?.workId || 0,
        workItemId: firstItem?.id || 0,
        date: localDate,
        description: "",
        weather: "",
        temperature: null,
        progress: null,
        issues: "",
        notes: "",
        images: [],
        reportedByName: "",
        workItem: firstItem || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantEmail: "",
        workDiaryItems: [],
      });
    }
    setEditingItem(undefined); // new item mode
    setShowDiaryModal(true);
  };

  const handleCloseModal = () => {
    setShowDiaryModal(false);
    setEditingItem(undefined);
    setIsGroupedMode(true); // Reset to grouped mode when closing
    // Ensure latest data (e.g., accepted flag) is fetched
    try {
      router.refresh();
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-8">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-6">
        Munkanapló
      </h1>

      <PerformanceSummary data={performanceData} isLoading={isLoading} />

      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>
      )}
      <GoogleCalendarView
        diaries={diaries}
        workItems={items}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        onEventClick={(diary) => {
          // extract clicked WorkDiaryItem id set by calendar
          const d = diary as DiaryWithEditing;
          const clickedId = d.__editingItemId;
          let itemForEdit:
            | (Partial<WorkDiaryItemUpdate> & {
                id: number;
                name?: string;
                email?: string;
              })
            | undefined = undefined;
          if (clickedId && Array.isArray(d.workDiaryItems)) {
            const it = (d.workDiaryItems as WorkDiaryItemDTO[]).find(
              (i) => i.id === clickedId
            );
            if (it) {
              itemForEdit = {
                id: it.id,
                workItemId: it.workItemId ?? undefined,
                workerId: it.workerId ?? undefined,
                date: it.date,
                quantity: it.quantity ?? undefined,
                unit: it.unit ?? undefined,
                workHours: it.workHours ?? undefined,
                images: it.images ?? [],
                notes: it.notes ?? undefined,
                name: it.name ?? undefined,
                email: it.email ?? undefined,
                // ensure tenant sees current accepted state in the form
                accepted: it.accepted ?? undefined,
              };
            }
          }

          // Set editing mode based on whether we have existing items or grouping
          if (
            d.isGrouped ||
            (d.workDiaryItems && d.workDiaryItems.length > 0)
          ) {
            setIsGroupedMode(true);
          } else {
            setIsGroupedMode(false);
          }

          setEditingItem(itemForEdit);
          setSelectedDiary(diary);
          setShowDiaryModal(true);
        }}
        onDateClick={handleDateSelect}
      />
      {/* DiaryEntryDetail modal - always opens for selected day */}
      {showDiaryModal && selectedDiary && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-w-4xl w-[95%] sm:w-full mx-auto max-h-[90dvh] overflow-y-auto">
            {isGroupedMode ? (
              selectedDiary.workDiaryItems &&
              selectedDiary.workDiaryItems.length > 0 ? (
                <GroupedDiaryEditForm
                  diary={selectedDiary}
                  workItems={items}
                  onSave={() => {
                    setShowDiaryModal(false);
                    setEditingItem(undefined);
                    try {
                      router.refresh();
                    } catch {}
                  }}
                  onCancel={handleCloseModal}
                />
              ) : (
                <GroupedDiaryCreateForm
                  diary={selectedDiary}
                  workItems={items}
                  onSave={() => {
                    setShowDiaryModal(false);
                    setEditingItem(undefined);
                    try {
                      router.refresh();
                    } catch {}
                  }}
                  onCancel={handleCloseModal}
                />
              )
            ) : (
              <WorkerDiaryEditForm
                diary={selectedDiary}
                workItems={items}
                editingItem={editingItem}
                onSave={() => {
                  setShowDiaryModal(false);
                  setEditingItem(undefined);
                  try {
                    router.refresh();
                  } catch {}
                }}
                onCancel={handleCloseModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
