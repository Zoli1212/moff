"use client";
import React, { useState } from "react";
import GoogleCalendarView from "./_components/GoogleCalendarView";
import WorkerDiaryEditForm from "./edit/WorkerDiaryEditForm";
import { WorkItem } from "@/types/work";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import type { WorkDiaryItemUpdate } from "@/types/work-diary";

type DiaryWithEditing = WorkDiaryWithItem & { __editingItemId?: number };

interface DiaryPageClientProps {
  items: WorkItem[];
  diaries: WorkDiaryWithItem[];
  error: string | null;
  type: "workers" | "contractor";
  diaryIds: number[];
}

export default function DiaryPageClient({ items, diaries, error }: DiaryPageClientProps) {
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<WorkDiaryWithItem | null>(null);
  const [editingItem, setEditingItem] = useState<(Partial<WorkDiaryItemUpdate> & { id: number }) | undefined>(undefined);

  const handleDateSelect = (date: Date) => {
    const found = (diaries ?? []).find(d => new Date(d.date).toDateString() === date.toDateString());
    if (found) {
      setSelectedDiary(found);
    } else {
      const firstItem = (items ?? [])[0];
      setSelectedDiary({
        id: 0,
        workId: firstItem?.workId || 0,
        workItemId: firstItem?.id || 0,
        date,
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
        workDiaryItems: []
      });
    }
    setEditingItem(undefined); // new item mode
    setShowDiaryModal(true);
  };

  const handleCloseModal = () => { setShowDiaryModal(false); setEditingItem(undefined); };

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-8">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-6">Munkanapló</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>
      )}
      <GoogleCalendarView
        diaries={diaries}
        onEventClick={diary => {
          // extract clicked WorkDiaryItem id set by calendar
          const d = diary as DiaryWithEditing;
          const clickedId = d.__editingItemId;
          let itemForEdit: (Partial<WorkDiaryItemUpdate> & { id: number }) | undefined = undefined;
          if (clickedId && Array.isArray(d.workDiaryItems)) {
            const it = d.workDiaryItems.find((i) => i.id === clickedId);
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
              };
            }
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
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto w-full">
            <WorkerDiaryEditForm
              diary={selectedDiary}
              workItems={items}
              editingItem={editingItem}
              onSave={() => { setShowDiaryModal(false); setEditingItem(undefined); }}
              onCancel={handleCloseModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
