"use client";
import React, { useState } from "react";
import GoogleCalendarView from "./_components/GoogleCalendarView";
import DiaryEntryDetail from "./_components/DiaryEntryDetail";
import { WorkItem } from "@/types/work";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

interface DiaryPageClientProps {
  items: WorkItem[];
  diaries: WorkDiaryWithItem[];
  error: string | null;
  type: "workers" | "contractor";
  diaryIds: number[];
}

export default function DiaryPageClient({ items, diaries, error, type, diaryIds }: DiaryPageClientProps) {
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<WorkDiaryWithItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
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
        tenantEmail: ""
      });
    }
    setShowDiaryModal(true);
  };

  const handleCloseModal = () => setShowDiaryModal(false);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Munkanapló</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">{error}</div>
      )}
      <GoogleCalendarView
        diaries={diaries}
        onDateClick={handleDateSelect}
        onEventClick={diary => {
          setSelectedDiary(diary);
          setShowDiaryModal(true);
        }}
      />
      {/* DiaryEntryDetail modal - always opens for selected day */}
      {showDiaryModal && selectedDiary && (
        <DiaryEntryDetail
          diary={selectedDiary}
          diaries={diaries}
          workItems={items ?? []}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
