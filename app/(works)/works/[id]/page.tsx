import React from "react";

import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import { getGeneralWorkersForWork } from "@/actions/workitemworker-actions";
import type {
  WorkItem,
  WorkItemFromDb,
  Tool as BaseTool,
  Material,
  Worker,
} from "@/types/work";
import type { WorkDiary } from "@/types/work-diary";
import type { GeneralWorkerFromDB } from "../_components/WorkersSummary";
// Tool típust bővítjük quantity-vel

type Tool = BaseTool & { quantity?: number };
import CollapsibleSection from "../_components/CollapsibleSection";
import TechnicalButton from "./_components/TechnicalButton";
// import ToolsSlotsSection from "../_components/ToolsSlotsSection"; // ÚJ: tools slot szekció
// import WorkersSlotsSection from "../../supply/_components/WorkersSlotsSection";
import Link from "next/link";
import { getAssignedToolsForWork } from "@/actions/tools-registry-actions";
import { AssignedTool } from "@/types/tools.types";

import Tasks from "../_components/Tasks";
import ToolsSummary from "../_components/ToolsSummary";
import WorkersSummary from "../_components/WorkersSummary";

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let work = null;
  let error = null;

  function hasMessage(obj: unknown): obj is { message: string } {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "message" in obj &&
      typeof (obj as { message: unknown }).message === "string"
    );
  }
  try {
    work = await getWorkById(Number((await params).id));
  } catch (e: unknown) {
    let msg = "Hiba a munka lekérdezésekor";
    if (hasMessage(e)) {
      msg = e.message;
    } else if (typeof e === "string") {
      msg = e;
    }
    error = msg;
  }

  let workItemsWithWorkers: WorkItemFromDb[] = [];
  let assignedTools: AssignedTool[] = [];
  let generalWorkersFromDB: GeneralWorkerFromDB[] = [];
  if (work && work.id) {
    try {
      // ÚJ: lekérjük a workItemeket a WorkItemWorker kapcsolattal
      workItemsWithWorkers = await getWorkItemsWithWorkers(work.id);
      assignedTools = await getAssignedToolsForWork(work.id);
      // Fetch general workers (workItemId = null) from workItemWorkers table
      generalWorkersFromDB = await getGeneralWorkersForWork(work.id);
      console.log(workItemsWithWorkers, "WORKITEMSWITHWORKERS");
      console.log(assignedTools, "ASSIGNEDTOOLS");
      console.log(generalWorkersFromDB, "GENERAL_WORKERS_FROM_WORKITEMWORKERS");
    } catch (err) {
      // Hiba esetén fallback az eredeti workItems-re
      console.log(err);
      workItemsWithWorkers = work.workItems || [];
      assignedTools = [];
      generalWorkersFromDB = [];
    }
  }

  if (error)
    return <div style={{ padding: 40, color: "red" }}>Hiba: {error}</div>;
  if (!work) return <div style={{ padding: 40 }}>Nincs adat a munkához.</div>;

  // Progress calculations
  const progress = typeof work.progress === "number" ? work.progress : 0;
  const percent = Math.min(100, Math.round(progress));

  // Dates
  const startDate = work.startDate
    ? new Date(work.startDate).toLocaleDateString()
    : "-";
  const endDate = work.endDate
    ? new Date(work.endDate).toLocaleDateString()
    : "-";
  const createdAt = work.createdAt
    ? new Date(work.createdAt).toLocaleString()
    : "-";
  const updatedAt = work.updatedAt
    ? new Date(work.updatedAt).toLocaleString()
    : "-";

  // Related entities
  const workers: Worker[] = work.workers || [];
  const tools: Tool[] = work.tools || [];
  const materials: Material[] = work.materials || [];
  const workItems: WorkItem[] = (work.workItems || []).map(
    (item: WorkItemFromDb) => ({
      ...item,
      description: item.description ?? null,
      materialUnitPrice: item.materialUnitPrice ?? null,
      workTotal: item.workTotal ?? null,
      materialTotal: item.materialTotal ?? null,
      tools: item.tools ?? [],
      materials: item.materials ?? [],
      workers: item.workers ?? [],
      workItemWorkers: item.workItemWorkers ?? [],
    })
  );

  console.log(workItemsWithWorkers, "WORKITEMSWITHWORKERS");
  console.log(workers, "WORKERS - from work.workers");
  console.log(
    generalWorkersFromDB,
    "GENERAL_WORKERS_FROM_DB - workItemId=null from workItemWorkers table"
  );

  // Debug: Check if we have general workers from both sources
  const generalWorkers = workers.filter((w) => w.workItemId === null);
  const specificWorkers = workers.filter((w) => w.workItemId !== null);
  console.log(
    `[CLIENT DEBUG] Total workers from work.workers: ${workers.length}`
  );
  console.log(
    `[CLIENT DEBUG] General workers from work.workers (workItemId=null): ${generalWorkers.length}`,
    generalWorkers
  );
  console.log(
    `[CLIENT DEBUG] Specific workers from work.workers (workItemId!=null): ${specificWorkers.length}`,
    specificWorkers.map((w) => ({
      id: w.id,
      name: w.name,
      workItemId: w.workItemId,
    }))
  );
  console.log(
    `[CLIENT DEBUG] General workers from workItemWorkers table: ${generalWorkersFromDB.length}`,
    generalWorkersFromDB
  );

  // --- TOOL AGGREGÁCIÓ ---
  const toolMap = new Map<string, { tool: Tool; quantity: number }>();
  workItemsWithWorkers.forEach((item) => {
    (item.tools || []).forEach((tool) => {
      const key = tool.id?.toString() || tool.name;
      const prev = toolMap.get(key);
      if (!prev || (tool.quantity ?? 0) > prev.quantity) {
        toolMap.set(key, { tool, quantity: tool.quantity ?? 1 });
      }
    });
  });
  // const aggregatedTools = Array.from(toolMap.values()).map(
  //   ({ tool, quantity }) => ({
  //     ...tool,
  //     quantity,
  //   })
  // );

  // --- END TOOL AGGREGÁCIÓ ---

  // ToolsSlotsSection importálása
  // import ToolsSlotsSection from "../_components/ToolsSlotsSection"; (ha nincs, a file tetejére kell)

  const workDiaries: WorkDiary[] = work.workDiaries || [];

  return (
    <div
      style={{
        padding: 24,
        paddingBottom: 140,
        maxWidth: 420,
        margin: "0 auto",
        fontFamily: "inherit",
        background: "#fafafa",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Link
          href="/works"
          style={{
            border: "none",
            background: "none",
            fontSize: 28,
            cursor: "pointer",
            marginLeft: -12,
            marginRight: 8,
            fontWeight: "bold",
            textDecoration: "none",
            color: "#222",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            <polyline points="18,4 7,13 18,22" fill="none" />
          </svg>
        </Link>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
          {work.title || "Munka neve"}
        </div>
      </div>
      {/* Work summary card */}
      {/* Szükséges eszközök szekció */}

      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 10px #eee",
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Left side - Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Helyszín:{" "}
              <span style={{ fontWeight: 400 }}>{work.location || "-"}</span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Kezdés: <span style={{ fontWeight: 400 }}>{startDate}</span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Befejezés: <span style={{ fontWeight: 400 }}>{endDate}</span>
            </div>
            <div style={{ fontWeight: 600 }}>
              Becsült időtartam:{" "}
              <span style={{ fontWeight: 400 }}>
                {work.estimatedDuration || "-"}
              </span>
            </div>
          </div>

          {/* Right side - Image upload */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                border: "2px dashed #ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backgroundColor: "#f9f9f9",
                overflow: "hidden",
              }}
            >
              <div style={{ textAlign: "center", color: "#999" }}>
                <div style={{ fontSize: 24 }}>📷</div>
                <div style={{ fontSize: 10 }}>Kép</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontWeight: 600 }}>
          Aktív:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.isActive ? "Igen" : "Nem"}
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Létrehozva: <span style={{ fontWeight: 400 }}>{createdAt}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Módosítva: <span style={{ fontWeight: 400 }}>{updatedAt}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Szakmunkás
          <span style={{ fontWeight: 400 }}>
            ({work.totalWorkers}){" "}
            {workers.length > 0 ? workers.map((w) => w.name).join(", ") : "-"}
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Munkaerő költség:{" "}
          <span style={{ fontWeight: 400 }}>{work.totalLaborCost ?? 0} Ft</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Összes eszköz:{" "}
          <span style={{ fontWeight: 400 }}>{work.totalTools} db</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Anyag költség:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.totalMaterialCost ?? 0} Ft
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Összes költség:{" "}
          <span style={{ fontWeight: 400 }}>
            {(work.totalMaterialCost ?? 0) + (work.totalLaborCost ?? 0)} Ft Ft
          </span>
        </div>

        {/* Progress bars */}
        <div style={{ marginTop: 20 }}>
          {/* Teljesített */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Teljesített</span>
              <span style={{ fontSize: 14, color: "#666" }}>65%</span>
            </div>
            <div style={{ 
              width: "100%", 
              height: 8, 
              backgroundColor: "#f0f0f0", 
              borderRadius: 4,
              overflow: "hidden"
            }}>
              <div style={{
                width: "65%",
                height: "100%",
                backgroundColor: "#4CAF50",
                borderRadius: 4,
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>

          {/* Számlázott */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Számlázott</span>
              <span style={{ fontSize: 14, color: "#666" }}>45%</span>
            </div>
            <div style={{ 
              width: "100%", 
              height: 8, 
              backgroundColor: "#f0f0f0", 
              borderRadius: 4,
              overflow: "hidden"
            }}>
              <div style={{
                width: "45%",
                height: "100%",
                backgroundColor: "#2196F3",
                borderRadius: 4,
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>

          {/* Számlázható */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Számlázható</span>
              <span style={{ fontSize: 14, color: "#666" }}>80%</span>
            </div>
            <div style={{ 
              width: "100%", 
              height: 8, 
              backgroundColor: "#f0f0f0", 
              borderRadius: 4,
              overflow: "hidden"
            }}>
              <div style={{
                width: "80%",
                height: "100%",
                backgroundColor: "#FF9800",
                borderRadius: 4,
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Profit box */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 10px #eee",
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 16
        }}>
          <span style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            color: "#333"
          }}>
            Profit
          </span>
          <span style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            color: "#4CAF50" 
          }}>
            +450 000 Ft
          </span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 0 }}>
          <span style={{ fontWeight: 600 }}>Profit margin:</span>
          <span style={{ fontWeight: 400 }}>15.2%</span>
        </div>
      </div>
      
      {/* További részletek wrapper */}
      <CollapsibleSection title="További részletek" defaultOpen={false}>
        {/* Munkások (lenyíló) */}
        <CollapsibleSection title="Munkára felvett munkások" defaultOpen={false}>
        <WorkersSummary
          workId={work.id}
          workItems={workItemsWithWorkers.map((item) => ({
            ...item,
            tools: item.tools ?? [],
            materials: item.materials ?? [],
            workers: item.workers ?? [],
            workItemWorkers: item.workItemWorkers ?? [],
          }))}
          workers={workers}
          generalWorkersFromDB={generalWorkersFromDB}
          showAllWorkItems={true}
        />
      </CollapsibleSection>

      {/* Eszköz slotok (lenyíló) */}
      <CollapsibleSection title="Hozzárendelt eszközök" defaultOpen={false}>
        <ToolsSummary
          workId={work.id}
          workItems={workItemsWithWorkers.map((item) => ({
            ...item,
            tools: item.tools ?? [],
            materials: item.materials ?? [],
            workers: item.workers ?? [],
            workItemWorkers: item.workItemWorkers ?? [],
          }))}
          assignedTools={assignedTools}
        />
        {/* {(() => {
          const assignedToolObjects = assignedTools
            .map((at: AssignedTool) => at.tool)
            .filter(Boolean);
          const allToolsMap = new Map<number, Tool>();
          [...(tools || []), ...assignedToolObjects].forEach((tool) => {
            if (tool && !allToolsMap.has(tool.id)) {
              allToolsMap.set(tool.id, tool);
            }
          });
          const allTools = Array.from(allToolsMap.values());
          return (
            <ToolsSlotsSection
              tools={allTools}
              workId={work.id}
              assignedTools={assignedTools}
              workItems={workItemsWithWorkers.map((item) => ({
                ...item,
                tools: item.tools ?? [],
                materials: item.materials ?? [],
                workers: item.workers ?? [],
                workItemWorkers: item.workItemWorkers ?? [],
              }))}
            />
          );
        })()} */}
      </CollapsibleSection>

      {/* Szegmensek (workItems) - lenyíló */}
      <CollapsibleSection
        title="Feladatok"
        count={workItems.length}
        defaultOpen={false}
      >
        <Tasks workItems={workItems} />
      </CollapsibleSection>
      {/* Eszközök - lenyíló */}
      <CollapsibleSection
        title="Eszközök"
        count={tools.length}
        defaultOpen={false}
      >
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
            Eszközök ({tools.length})
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
            {tools.length === 0 && (
              <span style={{ color: "#bbb" }}>Nincs eszköz</span>
            )}
            {tools.map((tool: Tool, idx: number) => (
              <div
                key={tool.id || idx}
                style={{
                  padding: "4px 11px",
                  background: "#f1f8fe",
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: 15,
                  color: "#3498db",
                  marginBottom: 4,
                }}
              >
                {tool.name || tool.id}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>
      {/* Anyagok - lenyíló */}
      <CollapsibleSection
        title="Anyagok"
        count={materials.length}
        defaultOpen={false}
      >
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
            Anyagok ({materials.length})
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
            {materials.length === 0 && (
              <span style={{ color: "#bbb" }}>Nincs anyag</span>
            )}
            {materials.map((material: Material, idx: number) => (
              <div
                key={material.id || idx}
                style={{
                  padding: "4px 11px",
                  background: "#fef7e0",
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: 15,
                  color: "#e67e22",
                  marginBottom: 4,
                }}
              >
                {material.name || material.id}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>
      {/* Naplók - lenyíló */}
      <CollapsibleSection
        title="Naplóelemek"
        count={workDiaries.length}
        defaultOpen={false}
      >
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
            Naplók ({workDiaries.length})
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minHeight: 24,
            }}
          >
            {workDiaries.length === 0 && (
              <span style={{ color: "#bbb" }}>Nincs napló</span>
            )}
            {workDiaries.map((diary: WorkDiary, idx: number) => (
              <div
                key={diary.id || idx}
                style={{
                  padding: "4px 11px",
                  background: "#f4f4fa",
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: 15,
                  color: "#6363a2",
                }}
              >
                {diary.description || diary.id}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>
      
      </CollapsibleSection>

      {/* Technical Button */}
      <TechnicalButton workId={(await params).id} />

      {/* Bottom Nav */}
    </div>
  );
}
