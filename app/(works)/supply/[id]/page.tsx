import React from "react";
import MaterialSlotsSection from "../_components/MaterialSlotsSection";
import ToolsSlotsSection from "../_components/ToolsSlotsSection";
import WorkersSlotsSection from "../_components/WorkersSlotsSection";
import type { WorkItem, Material, Tool, Worker } from "@/types/work";
import type { AssignedTool } from "@/types/tools.types";
import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import { getToolsRegistryByTenant, getAssignedToolsForWork } from "@/actions/tools-registry-actions";
import WorkHeader from "@/components/WorkHeader";

export default async function SupplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const workId = Number(id);
  if (!workId) return <div>Hibás workId</div>;

  const { tab } = await searchParams;

  let materials: Material[] = [];
  let workItems: WorkItem[] = [];
  let workers: Worker[] = [];
  let workName = "";
  let tools: Tool[] = [];
  let assignedTools: AssignedTool[] = [];
  try {
    const work = await getWorkById(workId);
    materials = work.materials || [];
    const richItems = await getWorkItemsWithWorkers(workId);
    workItems = (richItems || []).map((item: WorkItem) => ({
      ...item,
      tools: item.tools || [],
      materials: item.materials || [],
      workers: item.workers || [],
      workItemWorkers: item.workItemWorkers || [],
    }));
    workName = work.title || "";
    tools = await getToolsRegistryByTenant();
    assignedTools = await getAssignedToolsForWork(workId) as AssignedTool[];
    workers = work.workers || [];
    
  } catch (e) {
    console.error(e);
    return <div>Nem sikerült betölteni az anyagokat vagy szerszámokat.</div>;
  }

  return (
    <div style={{ maxWidth: 450, margin: "0 auto", paddingBottom: 120 }}>
      <WorkHeader title={workName || "Beszerzés"} />
      <div style={{ padding: "0 8px" }}>

      {/* Info badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
            border: "1px solid #ffcc02",
            borderRadius: "20px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#e65100",
            boxShadow: "0 2px 4px rgba(255, 153, 0, 0.15)",
            letterSpacing: "0.3px",
          }}
        >
          📋 Beszerzés folyamatban lévő munkafázisokhoz
        </div>
      </div>

      {/* Toggle button for Anyagok/Szerszámok */}
      <div
        style={{
          display: "flex",
          gap: 0,
          width: "100%",
          margin: "0 0 12px 0",
          alignItems: "stretch",
          justifyContent: "space-between",
        }}
      >
        {/* Tab links */}
        <a
          href={`?tab=workers`}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "22px 0 0 22px",
            border: "none",
            background: !tab || tab === "workers" ? "#ddd" : "#f7f7f7",
            color: !tab || tab === "workers" ? "#222" : "#888",
            fontWeight: 600,
            fontSize: 15,
            boxShadow: "0 1px 2px #eee",
            outline: "none",
            cursor: "pointer",
            transition: "background .2s",
            textDecoration: "none",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Munkaerő
        </a>
        <a
          href={`?tab=tools`}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 0,
            border: "none",
            background: tab === "tools" ? "#ddd" : "#f7f7f7",
            color: tab === "tools" ? "#222" : "#888",
            fontWeight: 600,
            fontSize: 15,
            boxShadow: "0 1px 2px #eee",
            outline: "none",
            cursor: "pointer",
            textDecoration: "none",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Szerszámok
        </a>
        <a
          href={`?tab=materials`}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "0 22px 22px 0",
            border: "none",
            background: tab === "materials" ? "#ddd" : "#f7f7f7",
            color: tab === "materials" ? "#222" : "#888",
            fontWeight: 600,
            fontSize: 15,
            boxShadow: "0 1px 2px #eee",
            outline: "none",
            cursor: "pointer",
            textDecoration: "none",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Anyagok
        </a>
      </div>
      
      {/* Tab content */}
      {(!tab || tab === "workers") ? (
        <WorkersSlotsSection
          workId={workId}
          workItems={workItems}
          workers={workers}
        />
      ) : tab === "tools" ? (
        <ToolsSlotsSection
          tools={tools}
          workId={workId}
          assignedTools={assignedTools}
          workItems={workItems}
        />
      ) : (
        <MaterialSlotsSection
          materials={materials}
          workId={workId}
          workItems={workItems}
        />
      )}
      </div>
    </div>
  );
}
