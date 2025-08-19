"use client";

import type { Worker, WorkItem } from "@/types/work";
import { useState } from "react";
import DiaryTaskCard from "./DiaryTaskCard";
import DiaryEntryDetail from "./DiaryEntryDetail";

import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";

interface DiaryTaskCardListProps {
  items: WorkItem[];
  diaryIds: number[];
  diaries?: WorkDiaryWithItem[];
}

export default function DiaryTaskCardList({
  items,
  diaryIds,
  diaries = [],
}: DiaryTaskCardListProps) {
  const [selectedDiary, setSelectedDiary] = useState<WorkDiaryWithItem | null>(null);

  // Only show contractor diaries (vállalkozó): those where reportedByRole or similar indicates contractor
  // For now, assume all diaries in this list are contractor diaries (vállalkozó naplója)

  const handleCardClick = (itemId: number) => {
    const diary = diaries.find((d) => d.workItemId === itemId);
    if (diary) {
      setSelectedDiary(diary);
    } else {
      // Open DiaryEntryDetail with empty diary for this item
      setSelectedDiary({
        id: 0,
        workId: items.find(i => i.id === itemId)?.workId || 0,
        workItemId: itemId,
        date: new Date(),
        description: "",
        weather: "",
        temperature: null,
        progress: null,
        issues: "",
        notes: "",
        images: [],
        reportedByName: "",
        workItem: items.find(i => i.id === itemId),
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantEmail: ""
      });
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Munka napló
      </h2>
      {items.length === 0 || diaryIds.length === 0 ? (
        <div>Nincs egyetlen munkafázis sem.</div>
      ) : (
        items
          .map((item) => {
            return (
              <div key={item.id} onClick={() => handleCardClick(item.id)} style={{ cursor: "pointer" }}>
                <DiaryTaskCard
                  id={item.id}
                  title={item.name}
                  summary={item.description || ""}
                  progress={0} // TODO: implement real progress if available
                  checked={false}
                  className="bg-green-100"
                >
                  {/* Dolgozó(k) neve/professzió */}
                  {item.workers && item.workers.length > 0 && (
                    <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                      {item.workers
                        .map(
                          (w: Worker) => `${w.role || w.profession || "Dolgozó"}`
                        )
                        .join(", ")}
                    </div>
                  )}
                </DiaryTaskCard>
              </div>
            );
          })
      )}
      {selectedDiary && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <DiaryEntryDetail diary={selectedDiary} diaries={diaries} onClose={() => setSelectedDiary(null)} />
        </div>
      )}
    </div>
  );
}

