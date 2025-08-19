"use client";

import type { Worker, WorkItem } from "@/types/work";
import { useState } from "react";
import DiaryTaskCard from "./DiaryTaskCard";

interface DiaryTaskCardListProps {
  items: WorkItem[];
  diaryIds: number[];
}

export default function DiaryTaskCardList({
  items,
  diaryIds,
}: DiaryTaskCardListProps) {
  const [checkedId, setCheckedId] = useState<number | null>(null);
  console.log(checkedId)

  const handleCheck = (id: number, checked: boolean) => {
    setCheckedId(checked ? id : null);
    // TODO: Indítsd el a naplózási workflow-t itt (pl. open modal, navigate, stb.)
    // Például: router.push(`/diary/${id}/new`)
  };

  console.log(handleCheck)

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Munkafázisok
      </h2>
      {items.length === 0 || diaryIds.length === 0 ? (
        <div>Nincs egyetlen munkafázis sem.</div>
      ) : (
        items
          .filter((item) => diaryIds.includes(item.id))
          .map((item) => {
            // Only items with a diary
            return (
              <DiaryTaskCard
                key={item.id}
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
            );
          })
      )}
    </div>
  );
}
