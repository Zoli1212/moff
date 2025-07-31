"use client";
import React, { useState } from "react";
import TaskCard from "./TaskCard";

interface TaskCardListProps {
  works: Array<{
    id: number;
    title: string;
    endDate?: string;
    offerDescription?: string;
    progress?: number;
  }>;
}

const TaskCardList: React.FC<TaskCardListProps> = ({ works }) => {
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const handleCheck = (id: number, checked: boolean) => {
    setCheckedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Feladatok (Works)</h2>
      {works.length === 0 ? (
        <div>Nincs egyetlen munkád sem.</div>
      ) : (
        works.map((work) => (
          <div key={work.id} style={{ marginBottom: 16 }}>
            <TaskCard
              id={work.id}
              title={work.title}
              deadline={work.endDate || ""}
              summary={work.offerDescription || ""}
              progress={work.progress || 0}
              checked={checkedIds.includes(work.id)}
              onCheck={(checked) => handleCheck(work.id, checked)}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default TaskCardList;
