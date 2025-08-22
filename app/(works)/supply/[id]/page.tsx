import React from "react";
import MaterialSlotsSection from "../_components/MaterialSlotsSection";
import ToolsSlotsSection from "../_components/ToolsSlotsSection";
import WorkersSlotsSection from "../_components/WorkersSlotsSection";
import type { WorkItem, Material, Tool, Worker } from "@/types/work";
import type { AssignedTool } from "@/types/tools.types";
import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import { getToolsRegistryByTenant, getAssignedToolsForWork } from "@/actions/tools-registry-actions";

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
    <div style={{ maxWidth: 450, margin: "0 auto", padding: "0 8px", paddingBottom: 120 }}>
      {/* Header with back arrow and work name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "18px 0 6px 0",
          gap: 10,
        }}
      >
        <a
          href={`/works/${workId}`}
          style={{
            textDecoration: "none",
            color: "#222",
            fontSize: 22,
            lineHeight: 1,
            padding: 0,
            marginRight: 2,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            style={{ verticalAlign: "middle" }}
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="#222"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <span
          style={{
            fontWeight: 700,
            fontSize: 22,
            flex: 1,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {workName}
        </span>
        {/* Optionally add a plus or other icon here if needed */}
      </div>
      {/* Subtitle */}

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
          href={`?tab=materials`}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "22px 0 0 22px",
            border: "none",
            background: !tab || tab === "materials" ? "#ddd" : "#f7f7f7",
            color: !tab || tab === "materials" ? "#222" : "#888",
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
          Anyagok
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
          href={`?tab=workers`}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "0 22px 22px 0",
            border: "none",
            background: tab === "workers" ? "#ddd" : "#f7f7f7",
            color: tab === "workers" ? "#222" : "#888",
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
          Munkaerő
        </a>
      </div>
      {/* Tab content */}
      {(!tab || tab === "materials") ? (
        <MaterialSlotsSection
          materials={materials}
          workId={workId}
          workItems={workItems}
        />
      ) : tab === "tools" ? (
        <ToolsSlotsSection
          tools={tools}
          workId={workId}
          assignedTools={assignedTools}
          workItems={workItems}
        />
      ) : (
        <WorkersSlotsSection
          workId={workId}
          workItems={workItems}
          workers={workers}
        />
      )}
    </div>
  );
}
