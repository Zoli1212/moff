"use client";
import React, { useState, useEffect } from "react";

import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import { getGeneralWorkersForWork } from "@/actions/workitemworker-actions";
import { calculateWorkProfitAction } from "@/actions/work-profit-actions";
import { updateWorkImageUrl } from "@/actions/update-work-image";
import { updateWorkDates } from "@/actions/update-work-dates";
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
import ToolsSlotsSection from "../_components/ToolsSlotsSection"; // ÚJ: tools slot szekció
// import WorkersSlotsSection from "../../supply/_components/WorkersSlotsSection";
import Link from "next/link";
import { getAssignedToolsForWork } from "@/actions/tools-registry-actions";
import { AssignedTool } from "@/types/tools.types";

import Tasks from "../_components/Tasks";
import ToolsSummary from "../_components/ToolsSummary";
import WorkersSummary from "../_components/WorkersSummary";

export default function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // State for data
  const [work, setWork] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for image upload
  const [workImage, setWorkImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // State for additional data
  const [workItemsWithWorkers, setWorkItemsWithWorkers] = useState<any[]>([]);
  const [assignedTools, setAssignedTools] = useState<any[]>([]);
  const [generalWorkersFromDB, setGeneralWorkersFromDB] = useState<any[]>([]);
  
  // State for dates
  const [showDateModal, setShowDateModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  
  const [dynamicProfit, setDynamicProfit] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 450000,
    profitMargin: 15.2,
  });

  function hasMessage(obj: unknown): obj is { message: string } {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "message" in obj &&
      typeof (obj as { message: unknown }).message === "string"
    );
  }

  // Load work data
  useEffect(() => {
    const loadWorkData = async () => {
      try {
        const resolvedParams = await params;
        const workData = await getWorkById(Number(resolvedParams.id));
        setWork(workData);
        setWorkImage(workData.workImageUrl || null);
        
        // Initialize date states
        setEditStartDate(workData.startDate ? new Date(workData.startDate).toISOString().split('T')[0] : "");
        setEditEndDate(workData.endDate ? new Date(workData.endDate).toISOString().split('T')[0] : "");

        if (workData && workData.id) {
          try {
            const workItemsData = await getWorkItemsWithWorkers(workData.id);
            const assignedToolsData = await getAssignedToolsForWork(workData.id);
            const generalWorkersData = await getGeneralWorkersForWork(workData.id);
            
            setWorkItemsWithWorkers(workItemsData);
            setAssignedTools(assignedToolsData);
            setGeneralWorkersFromDB(generalWorkersData);
            
            console.log(workItemsData, "WORKITEMSWITHWORKERS");
            console.log(assignedToolsData, "ASSIGNEDTOOLS");
            console.log(generalWorkersData, "GENERAL_WORKERS_FROM_WORKITEMWORKERS");

            // Load profit calculation
            try {
              const workItems = (workData.workItems || []).map((item: any) => ({
                ...item,
                description: item.description ?? null,
                materialUnitPrice: item.materialUnitPrice ?? null,
                workTotal: item.workTotal ?? null,
                materialTotal: item.materialTotal ?? null,
                tools: item.tools ?? [],
                materials: item.materials ?? [],
                workers: item.workers ?? [],
                workItemWorkers: item.workItemWorkers ?? [],
              }));
              
              const profitResult = await calculateWorkProfitAction(
                workData.id,
                workItems
              );
              setDynamicProfit(profitResult);
            } catch (profitError) {
              console.error('❌ [PROFIT] Error calculating profit:', profitError);
              // Keep default values if calculation fails
              setDynamicProfit({
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                profitMargin: 0,
              });
            }
          } catch (err) {
            console.log(err);
            setWorkItemsWithWorkers(workData.workItems || []);
            setAssignedTools([]);
            setGeneralWorkersFromDB([]);
          }
        }
      } catch (e: unknown) {
        let msg = "Hiba a munka lekérdezésekor";
        if (hasMessage(e)) {
          msg = e.message;
        } else if (typeof e === "string") {
          msg = e;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadWorkData();
  }, [params]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageError("");
    setImageUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.url) {
        setWorkImage(data.url);
        // Save to database
        const updateResult = await updateWorkImageUrl(work.id, data.url);
        if (!updateResult.success) {
          setImageError("Hiba az adatbázis frissítésekor.");
        }
      } else {
        setImageError(data.error || "Hiba történt a feltöltésnél.");
      }
    } catch (err) {
      setImageError("Hiba a feltöltés során: " + (err as Error).message);
    } finally {
      setImageUploading(false);
    }
  };

  // Handle image removal
  const handleImageRemove = async () => {
    try {
      setWorkImage(null);
      // Remove from database
      const updateResult = await updateWorkImageUrl(work.id, null);
      if (!updateResult.success) {
        setImageError("Hiba az adatbázis frissítésekor.");
      }
    } catch (err) {
      setImageError("Hiba a kép törlésekor: " + (err as Error).message);
    }
  };

  // Handle date save
  const handleDateSave = async () => {
    try {
      const updateResult = await updateWorkDates(
        work.id, 
        editStartDate || null, 
        editEndDate || null
      );
      
      if (updateResult.success) {
        // Update the work object with new dates
        setWork((prev: any) => ({
          ...prev,
          startDate: editStartDate ? new Date(editStartDate) : null,
          endDate: editEndDate ? new Date(editEndDate) : null,
        }));
        setShowDateModal(false);
      } else {
        console.error('Failed to update dates:', updateResult.error);
      }
    } catch (error) {
      console.error('Error updating dates:', error);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Betöltés...</div>;
  if (error) return <div style={{ padding: 40, color: "red" }}>Hiba: {error}</div>;
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
    (item.tools || []).forEach((tool: any) => {
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

  // Aggregate calculations for all WorkItems
  const aggregateStats = workItems.reduce(
    (acc, item) => {
      const totalQuantity = item.quantity || 0;
      const completedQuantity = item.completedQuantity || 0;
      const billedQuantity = item.billedQuantity || 0;
      const paidQuantity = item.paidQuantity || 0;

      acc.totalQuantity += totalQuantity;
      acc.completedQuantity += completedQuantity;
      acc.billedQuantity += billedQuantity;
      acc.paidQuantity += paidQuantity;

      return acc;
    },
    {
      totalQuantity: 0,
      completedQuantity: 0,
      billedQuantity: 0,
      paidQuantity: 0,
    }
  );

  // Calculate percentages
  const completedPercent =
    aggregateStats.totalQuantity > 0
      ? Math.round(
          (aggregateStats.completedQuantity / aggregateStats.totalQuantity) *
            100
        )
      : 0;

  const billedPercent =
    aggregateStats.totalQuantity > 0
      ? Math.round(
          (aggregateStats.billedQuantity / aggregateStats.totalQuantity) * 100
        )
      : 0;

  const billableQuantity = Math.max(
    0,
    aggregateStats.completedQuantity -
      aggregateStats.billedQuantity -
      aggregateStats.paidQuantity
  );
  const billablePercent =
    aggregateStats.totalQuantity > 0
      ? Math.round((billableQuantity / aggregateStats.totalQuantity) * 100)
      : 0;

  const paidPercent =
    aggregateStats.totalQuantity > 0
      ? Math.round(
          (aggregateStats.paidQuantity / aggregateStats.totalQuantity) * 100
        )
      : 0;

  // ToolsSlotsSection importálása

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
            <label style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
                disabled={imageUploading}
              />
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
                  backgroundColor: workImage ? "transparent" : "#f9f9f9",
                  backgroundImage: workImage ? `url(${workImage})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  overflow: "hidden",
                }}
              >
                {!workImage && !imageUploading && (
                  <div style={{ textAlign: "center", color: "#999" }}>
                    <div style={{ fontSize: 24 }}>📷</div>
                    <div style={{ fontSize: 10 }}>Kép</div>
                  </div>
                )}
                {imageUploading && (
                  <div style={{ textAlign: "center", color: "#666" }}>
                    <div style={{ fontSize: 12 }}>...</div>
                  </div>
                )}
              </div>
            </label>
            
            {/* Red X button to remove image */}
            {workImage && (
              <button
                onClick={handleImageRemove}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: "#ff4444",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: "bold",
                  zIndex: 10,
                }}
              >
                ×
              </button>
            )}
            
            {imageError && (
              <div style={{ 
                fontSize: 10, 
                color: "red", 
                marginTop: 4,
                position: "absolute",
                width: "100px",
                textAlign: "center"
              }}>
                {imageError}
              </div>
            )}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>Teljesített</span>
              <span style={{ fontSize: 14, color: "#666" }}>
                {completedPercent}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                backgroundColor: "#f0f0f0",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${completedPercent}%`,
                  height: "100%",
                  backgroundColor: "#4CAF50",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Számlázott */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>Számlázott</span>
              <span style={{ fontSize: 14, color: "#666" }}>
                {billedPercent}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                backgroundColor: "#f0f0f0",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${billedPercent}%`,
                  height: "100%",
                  backgroundColor: "#2196F3",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Számlázható */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>Számlázható</span>
              <span style={{ fontSize: 14, color: "#666" }}>
                {billablePercent}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                backgroundColor: "#f0f0f0",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${billablePercent}%`,
                  height: "100%",
                  backgroundColor: "#FF9800",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Pénzügyileg teljesített */}
          <div style={{ marginBottom: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Pénzügyileg teljesített
              </span>
              <span style={{ fontSize: 14, color: "#666" }}>
                {paidPercent}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                backgroundColor: "#f0f0f0",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${paidPercent}%`,
                  height: "100%",
                  backgroundColor: "#9C27B0",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dates section */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 10px #eee",
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#333",
            }}
          >
            Időtartam
          </span>
          <button
            onClick={() => setShowDateModal(true)}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Szerkesztés
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, color: "#666" }}>Kezdés:</span>
            <span style={{ color: "#333" }}>{startDate}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, color: "#666" }}>Befejezés:</span>
            <span style={{ color: "#333" }}>{endDate}</span>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#333",
            }}
          >
            Profit
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: dynamicProfit.totalProfit >= 0 ? "#4CAF50" : "#f44336",
            }}
          >
            {dynamicProfit.totalProfit >= 0 ? "+" : ""}
            {dynamicProfit.totalProfit.toLocaleString("hu-HU")} Ft
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 0,
          }}
        >
          <span style={{ fontWeight: 600 }}>Profit ráta:</span>
          <span
            style={{
              fontWeight: 400,
              color: dynamicProfit.profitMargin >= 0 ? "#4CAF50" : "#f44336",
            }}
          >
            {dynamicProfit.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* További részletek wrapper */}
      <CollapsibleSection title="További részletek" defaultOpen={false}>
        {/* Munkások (lenyíló) */}
        <CollapsibleSection
          title="Munkára felvett munkások"
          defaultOpen={false}
        >
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
      <TechnicalButton workId={work?.id || ''} />

      {/* Date Edit Modal */}
      {showDateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDateModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 600 }}>
              Időtartam szerkesztése
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#666" }}>
                Kezdés dátuma:
              </label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#666" }}>
                Befejezés dátuma:
              </label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDateModal(false)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  backgroundColor: "white",
                  color: "#666",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Mégse
              </button>
              <button
                onClick={handleDateSave}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: "#4CAF50",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
    </div>
  );
}
