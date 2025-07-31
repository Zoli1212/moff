import React from "react";
import type { WorkItem } from "@/types/work";

interface TasksProps {
  workItems: WorkItem[];
}

const Tasks: React.FC<TasksProps> = ({ workItems }) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 1px 5px #eee",
        padding: "14px 18px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 17,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        Feladatok ({workItems.length})
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          minHeight: 36,
          flexWrap: "wrap",
        }}
      >
        {workItems.length === 0 && (
          <span style={{ color: "#bbb" }}>Nincs szegmens</span>
        )}
        {workItems.map((item: WorkItem, idx: number) => (
          <div
            key={item.id || idx}
            style={{
              padding: "4px 11px",
              background: "#f7f7f7",
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 15,
              color: "#555",
              marginBottom: 4,
            }}
          >
            {item.name || item.id}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
