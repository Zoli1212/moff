import React from "react";
import MaterialSlotsSection from "../_components/MaterialSlotsSection";
import ToolsSlotsSection from "../_components/ToolsSlotsSection";
import WorkersSlotsSectionWithoutRoles from "../_components/WorkersSlotsSectionWithoutRoles";
import type { WorkItem, Material, Tool, Worker } from "@/types/work";
import type { AssignedTool } from "@/types/tools.types";
import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  getToolsRegistryByTenant,
  getAssignedToolsForWork,
} from "@/actions/tools-registry-actions";
import WorkHeader from "@/components/WorkHeader";

// Work interface with maxRequiredWorkers
interface Work {
  id: number;
  title: string;
  offerId: number;
  offerDescription?: string | null;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  location?: string | null;
  totalWorkers: number;
  totalLaborCost?: number | null;
  totalTools: number;
  totalToolCost?: number | null;
  totalMaterials: number;
  totalMaterialCost?: number | null;
  estimatedDuration?: string | null;
  progress?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantEmail: string;
  maxRequiredWorkers?: number | null;
  materials?: Material[];
  workers?: Worker[];
}

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
  let maxRequiredWorkers: number | null = null;
  try {
    // Párhuzamos lekérdezések a gyorsabb betöltésért
    const [work, richItems, toolsRegistry, assignedToolsData] =
      await Promise.all([
        getWorkById(workId) as Promise<Work>,
        getWorkItemsWithWorkers(workId),
        getToolsRegistryByTenant(),
        getAssignedToolsForWork(workId),
      ]);

    materials = work.materials || [];
    maxRequiredWorkers = work.maxRequiredWorkers || null;
    workItems = (richItems || []).map((item: WorkItem) => ({
      ...item,
      tools: item.tools || [],
      materials: item.materials || [],
      workers: item.workers || [],
      workItemWorkers: item.workItemWorkers || [],
    }));
    workName = work.title || "";
    tools = toolsRegistry;
    assignedTools = assignedToolsData as AssignedTool[];
    workers = work.workers || [];
  } catch (e) {
    console.error(e);
    return <div>Nem sikerült betölteni az anyagokat vagy szerszámokat.</div>;
  }

  return (
    <div style={{ maxWidth: 450, margin: "0 auto", paddingBottom: 120 }}>
      <WorkHeader title={workName || "Beszerzés"} />
      <div style={{ padding: "0 8px" }}>
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
            Eszközök
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

        {/* Description text for workers tab */}
        {(!tab || tab === "workers") && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "0px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6c757d",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              Folyamatban lévő feladatokhoz rendelt munkaerő
            </p>
          </div>
        )}

        {/* Description text for tools tab */}
        {tab === "tools" && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "0px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6c757d",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              Folyamatban lévő feladatokhoz szükséges eszközök
            </p>
          </div>
        )}

        {/* Description text for materials tab */}
        {tab === "materials" && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "0px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6c757d",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              Folyamatban lévő feladatokhoz szükséges anyagok
            </p>
          </div>
        )}

        {/* Tab content */}
        {!tab || tab === "workers" ? (
          <WorkersSlotsSectionWithoutRoles
            workId={workId}
            workItems={workItems}
            workers={workers}
            maxRequiredWorkers={maxRequiredWorkers}
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
