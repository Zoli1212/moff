import React from "react";
import type { WorkItemFromDb, Tool } from "@/types/work";
import { AssignedTool } from "@/types/tools.types";

interface ToolsSummaryProps {
  workId: number;
  workItems: WorkItemFromDb[];
  assignedTools: AssignedTool[];
}

export default function ToolsSummary({
  workItems,
  assignedTools,
}: ToolsSummaryProps) {
  // Collect tools from workItems (required tools)
  const requiredToolsMap = new Map<string, { tool: Tool; workItems: string[]; totalQuantity: number }>();
  
  workItems
    .filter(wi => wi.inProgress) // Only show tools for in-progress workItems
    .forEach((workItem) => {
      if (workItem.tools && workItem.tools.length > 0) {
        workItem.tools.forEach((tool) => {
          const key = tool.id?.toString() || tool.name;
          if (key) {
            if (requiredToolsMap.has(key)) {
              const existing = requiredToolsMap.get(key)!;
              if (!existing.workItems.includes(workItem.name)) {
                existing.workItems.push(workItem.name);
              }
              existing.totalQuantity += tool.quantity || 1;
            } else {
              requiredToolsMap.set(key, {
                tool,
                workItems: [workItem.name],
                totalQuantity: tool.quantity || 1,
              });
            }
          }
        });
      }
    });

  // Collect assigned tools (actual assignments)
  const assignedToolsMap = new Map<string, { tool: Tool; quantity: number }>();
  
  assignedTools.forEach((assignedTool) => {
    if (assignedTool.tool) {
      const key = assignedTool.tool.id?.toString() || assignedTool.tool.name;
      if (key) {
        assignedToolsMap.set(key, {
          tool: assignedTool.tool,
          quantity: assignedTool.quantity || 1,
        });
      }
    }
  });

  const totalRequired = Array.from(requiredToolsMap.values()).reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalAssigned = Array.from(assignedToolsMap.values()).reduce((sum, item) => sum + item.quantity, 0);

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
          marginBottom: 12,
          letterSpacing: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>🔧</span>
        Hozzárendelt eszközök ({totalAssigned}/{totalRequired})
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          padding: "8px 12px",
          background: "#f8f9fa",
          borderRadius: 8,
          fontSize: 14,
        }}
      >
        <div>
          <span style={{ fontWeight: 600, color: "#27ae60" }}>Hozzárendelve:</span> {totalAssigned} db
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#e74c3c" }}>Szükséges:</span> {totalRequired} db
        </div>
      </div>

      {totalAssigned === 0 && totalRequired === 0 ? (
        <div style={{ color: "#bbb", fontStyle: "italic" }}>
          Nincsenek eszközök
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Assigned tools */}
          {Array.from(assignedToolsMap.values()).map((item, idx) => {
            const requiredItem = requiredToolsMap.get(item.tool.id?.toString() || item.tool.name);
            const isFullyAssigned = requiredItem ? item.quantity >= requiredItem.totalQuantity : true;
            
            return (
              <div
                key={idx}
                style={{
                  padding: "12px 14px",
                  background: isFullyAssigned ? "#f8fffe" : "#fff8e1",
                  borderRadius: 10,
                  border: `1px solid ${isFullyAssigned ? "#e8f5f3" : "#ffecb3"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: isFullyAssigned ? "#2c5530" : "#f57c00",
                    }}
                  >
                    {item.tool.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isFullyAssigned ? "#27ae60" : "#ff9800",
                      background: isFullyAssigned ? "#e8f5e8" : "#fff3e0",
                      padding: "2px 8px",
                      borderRadius: 12,
                    }}
                  >
                    {item.quantity} db
                  </div>
                </div>
                
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Hozzárendelve a munkához
                </div>
                
                {requiredItem && (
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Szükséges feladatokhoz: {requiredItem.workItems.join(", ")} 
                    ({requiredItem.totalQuantity} db)
                  </div>
                )}
                
                {!isFullyAssigned && requiredItem && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#e65100",
                      fontWeight: 500,
                      marginTop: 4,
                    }}
                  >
                    ⚠️ Hiány: {requiredItem.totalQuantity - item.quantity} db
                  </div>
                )}
              </div>
            );
          })}

          {/* Required but not assigned tools */}
          {Array.from(requiredToolsMap.entries()).map(([key, item]) => {
            if (!assignedToolsMap.has(key)) {
              return (
                <div
                  key={`missing-${key}`}
                  style={{
                    padding: "12px 14px",
                    background: "#ffebee",
                    borderRadius: 10,
                    border: "1px solid #ffcdd2",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#c62828",
                      }}
                    >
                      {item.tool.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#d32f2f",
                        background: "#ffebee",
                        padding: "2px 8px",
                        borderRadius: 12,
                      }}
                    >
                      {item.totalQuantity} db
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    Szükséges feladatokhoz: {item.workItems.join(", ")}
                  </div>
                  
                  <div
                    style={{
                      fontSize: 12,
                      color: "#d32f2f",
                      fontWeight: 500,
                    }}
                  >
                    ❌ Nincs hozzárendelve
                  </div>
                </div>
              );
            }
            return null;
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
}
