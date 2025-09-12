"use client";

import React from "react";
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
  const [selectedDiary, setSelectedDiary] = useState<WorkDiaryWithItem | null>(
    null
  );

  // Only show contractor diaries (vállalkozó): those where reportedByRole or similar indicates contractor
  // For now, assume all diaries in this list are contractor diaries (vállalkozó naplója)

  const handleCardClick = (groupNo: number, isGrouped: boolean = false) => {
    if (isGrouped) {
      // For grouped entries, find the diary that contains items with this groupNo
      const diary = diaries.find(
        (d) =>
          d.workDiaryItems &&
          d.workDiaryItems.some(
            (item: any) => (item.groupNo || item.id) === groupNo
          )
      );
      if (diary) {
        // Create a special grouped diary object
        const groupedDiary = {
          ...diary,
          isGrouped: true,
          groupNo: groupNo,
        };
        setSelectedDiary(groupedDiary);
      }
    } else {
      // Original logic for individual entries
      const diary = diaries.find((d) => d.workItemId === groupNo);
      if (diary) {
        setSelectedDiary(diary);
      } else {
        // Open DiaryEntryDetail with empty diary for this item
        setSelectedDiary({
          id: 0,
          workId: items.find((i) => i.id === groupNo)?.workId || 0,
          workItemId: groupNo,
          date: new Date(),
          description: "",
          weather: "",
          temperature: null,
          progress: null,
          issues: "",
          notes: "",
          images: [],
          reportedByName: "",
          workItem: items.find((i) => i.id === groupNo),
          createdAt: new Date(),
          updatedAt: new Date(),
          tenantEmail: "",
          workDiaryItems: [],
        });
      }
    }
  };

  // Group diary entries by groupNo for consolidated display
  const groupedEntries = React.useMemo(() => {
    const groups = new Map<
      number,
      {
        groupNo: number;
        date: Date;
        workers: Array<{ name: string; hours: number }>;
        workItems: Array<{ name: string; id: number }>;
        description: string;
        diaryId: number;
      }
    >();

    diaries.forEach((diary) => {
      if (diary.workDiaryItems && diary.workDiaryItems.length > 0) {
        diary.workDiaryItems.forEach((item: any) => {
          const groupNo = item.groupNo || item.id; // fallback to item.id if no groupNo

          if (!groups.has(groupNo)) {
            groups.set(groupNo, {
              groupNo,
              date: new Date(item.date),
              workers: [],
              workItems: [],
              description: diary.description || "",
              diaryId: diary.id,
            });
          }

          const group = groups.get(groupNo)!;

          // Add worker if not already added
          const workerExists = group.workers.find((w) => w.name === item.name);
          if (!workerExists && item.name) {
            group.workers.push({
              name: item.name,
              hours: item.workHours || 0,
            });
          }

          // Add workItem if not already added
          const workItem = items.find((wi) => wi.id === item.workItemId);
          const workItemExists = group.workItems.find(
            (wi) => wi.id === item.workItemId
          );
          if (!workItemExists && workItem) {
            group.workItems.push({
              name: workItem.name,
              id: workItem.id,
            });
          }
        });
      }
    });

    return Array.from(groups.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [diaries, items]);

  const getMonogram = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getWorkItemAbbr = (name: string) => {
    return name.slice(0, 3).toUpperCase();
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Munka napló
      </h2>
      {groupedEntries.length === 0 ? (
        <div>Nincs napló bejegyzés.</div>
      ) : (
        groupedEntries.map((group) => (
          <div
            key={group.groupNo}
            onClick={() => handleCardClick(group.groupNo, true)}
            style={{ cursor: "pointer" }}
          >
            <DiaryTaskCard
              id={group.groupNo}
              title={`Csoportos munka - ${group.date.toLocaleDateString()}`}
              summary={group.description}
              progress={0}
              checked={false}
              className="bg-blue-100"
            >
              <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                <div>
                  👤{" "}
                  {group.workers
                    .map((w) => `${getMonogram(w.name)}(${w.hours}h)`)
                    .join(" ")}
                </div>
                <div style={{ marginTop: 4 }}>
                  🔧{" "}
                  {group.workItems
                    .map((wi) => getWorkItemAbbr(wi.name))
                    .join(", ")}
                </div>
              </div>
            </DiaryTaskCard>
          </div>
        ))
      )}
      {selectedDiary && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <DiaryEntryDetail
            diary={selectedDiary}
            diaries={diaries}
            workItems={items}
            onClose={() => setSelectedDiary(null)}
          />
        </div>
      )}
    </div>
  );
}
