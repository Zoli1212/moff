"use client";
import TaskCard from "@/app/(works)/tasks/_components/TaskCard";
import type { WorkItem, Worker } from '@/types/work';
import { useState } from "react";

interface DiaryTaskCardListProps {
  items: WorkItem[];
}

export default function DiaryTaskCardList({ items }: DiaryTaskCardListProps) {
  const [checkedId, setCheckedId] = useState<number | null>(null);

  const handleCheck = (id: number, checked: boolean) => {
    setCheckedId(checked ? id : null);
    // TODO: Indítsd el a naplózási workflow-t itt (pl. open modal, navigate, stb.)
    // Például: router.push(`/diary/${id}/new`)
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Munkafázisok</h2>
      {items.length === 0 ? (
        <div>Nincs egyetlen munkafázis sem.</div>
      ) : (
        items.map((item) => (
          <TaskCard
            key={item.id}
            id={item.id}
            title={item.name}
            summary={item.description || ""}
            progress={0} // TODO: implement real progress if available
            checked={checkedId === item.id}
            onCheck={(checked) => handleCheck(item.id, checked)}
          >
            {/* Dolgozó(k) neve/professzió */}
            {item.workers && item.workers.length > 0 && (
              <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                {item.workers.map((w: Worker) => `${w.role || w.profession || 'Dolgozó'}`).join(", ")}
              </div>
            )}
          </TaskCard>
        ))
      )}
    </div>
  );
}
