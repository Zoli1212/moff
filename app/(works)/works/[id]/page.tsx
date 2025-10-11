"use client";
import React, { useState, useEffect } from "react";

import {
  getWorkById,
  getWorkItemsWithWorkers,
  getWorkDiaryItemsByWorkId,
} from "@/actions/work-actions";
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
import type { AssignedTool } from "@/types/tools.types";

type Tool = BaseTool & { quantity?: number };
import CollapsibleSection from "../_components/CollapsibleSection";
import TechnicalButton from "./_components/TechnicalButton";

import Link from "next/link";
import { getAssignedToolsForWork } from "@/actions/tools-registry-actions";

import Tasks from "../_components/Tasks";
import ToolsSummary from "../_components/ToolsSummary";
import WorkersSummary, {
  GeneralWorkerFromDB,
} from "../_components/WorkersSummary";

export default function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // State for data
  const [work, setWork] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // State for image upload
  const [workImage, setWorkImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // State for additional data
  const [workItemsWithWorkers, setWorkItemsWithWorkers] = useState<WorkItem[]>(
    []
  );
  const [assignedTools, setAssignedTools] = useState<Tool[]>([]);
  const [generalWorkersFromDB, setGeneralWorkersFromDB] = useState<Worker[]>(
    []
  );
  const [workDiaryItems, setWorkDiaryItems] = useState<
    Record<string, unknown>[]
  >([]);

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
        setEditStartDate(
          workData.startDate
            ? new Date(workData.startDate).toISOString().split("T")[0]
            : ""
        );
        setEditEndDate(
          workData.endDate
            ? new Date(workData.endDate).toISOString().split("T")[0]
            : ""
        );

        if (workData && workData.id) {
          try {
            const workItemsData = await getWorkItemsWithWorkers(workData.id);
            const assignedToolsData = await getAssignedToolsForWork(
              workData.id
            );
            const generalWorkersData = await getGeneralWorkersForWork(
              workData.id
            );
            const workDiaryItemsData = await getWorkDiaryItemsByWorkId(
              workData.id
            );

            setWorkItemsWithWorkers(workItemsData as unknown as WorkItem[]);
            setAssignedTools(assignedToolsData as unknown as Tool[]);
            setGeneralWorkersFromDB(generalWorkersData as unknown as Worker[]);
            setWorkDiaryItems(workDiaryItemsData);

            // Load profit calculation
            try {
              const workItems = (workData.workItems || []).map(
                (item: Record<string, unknown>) => ({
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

              const profitResult = await calculateWorkProfitAction(
                workData.id,
                workItems as unknown as WorkItem[]
              );
              setDynamicProfit(profitResult);
            } catch (profitError) {
              console.error(
                "❌ [PROFIT] Error calculating profit:",
                profitError
              );
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
            setWorkItemsWithWorkers(
              (workData.workItems as unknown as WorkItem[]) || []
            );
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

      if (data.url && work && work.id) {
        setWorkImage(data.url);
        // Save to database
        const workId = (work as Record<string, unknown>).id as number;
        const updateResult = await updateWorkImageUrl(workId, data.url);
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
      if (work && work.id) {
        const workId = (work as Record<string, unknown>).id as number;
        const updateResult = await updateWorkImageUrl(workId, null);
        if (!updateResult.success) {
          setImageError("Hiba az adatbázis frissítésekor.");
        }
      }
    } catch (err) {
      setImageError("Hiba a kép törlésekor: " + (err as Error).message);
    }
  };

  // Handle date save
  const handleDateSave = async () => {
    try {
      if (!work || !work.id) return;

      const workId = (work as Record<string, unknown>).id as number;
      const updateResult = await updateWorkDates(
        workId,
        editStartDate || null,
        editEndDate || null
      );

      if (updateResult.success) {
        // Update the work object with new dates
        setWork((prev: Record<string, unknown> | null) => ({
          ...prev,
          startDate: editStartDate ? new Date(editStartDate) : null,
          endDate: editEndDate ? new Date(editEndDate) : null,
        }));
        setShowDateModal(false);
      } else {
        console.error("Failed to update dates:", updateResult.error);
      }
    } catch (error) {
      console.error("Error updating dates:", error);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Betöltés...</div>;
  if (error)
    return <div style={{ padding: 40, color: "red" }}>Hiba: {error}</div>;
  if (!work) return <div style={{ padding: 40 }}>Nincs adat a munkához.</div>;

  // Dates
  const startDate = (work as Record<string, unknown>).startDate
    ? new Date(
        (work as Record<string, unknown>).startDate as string
      ).toLocaleDateString()
    : "-";
  const endDate = (work as Record<string, unknown>).endDate
    ? new Date(
        (work as Record<string, unknown>).endDate as string
      ).toLocaleDateString()
    : "-";
  const createdAt = (work as Record<string, unknown>).createdAt
    ? new Date(
        (work as Record<string, unknown>).createdAt as string
      ).toLocaleString()
    : "-";
  const updatedAt = (work as Record<string, unknown>).updatedAt
    ? new Date(
        (work as Record<string, unknown>).updatedAt as string
      ).toLocaleString()
    : "-";

  // Related entities
  const workers: Worker[] =
    ((work as Record<string, unknown>).workers as Worker[]) || [];
  const tools: Tool[] =
    ((work as Record<string, unknown>).tools as Tool[]) || [];
  const materials: Material[] =
    ((work as Record<string, unknown>).materials as Material[]) || [];
  const workItems: WorkItem[] = (
    ((work as Record<string, unknown>).workItems as WorkItemFromDb[]) || []
  ).map((item: WorkItemFromDb) => ({
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
    ((item.tools as Tool[]) || []).forEach((tool: Tool) => {
      const key =
        (tool.id as unknown as string)?.toString() || (tool.name as string);
      const prev = toolMap.get(key);
      if (!prev || ((tool.quantity as number) ?? 0) > prev.quantity) {
        toolMap.set(key, {
          tool: tool as unknown as Tool,
          quantity: (tool.quantity as number) ?? 1,
        });
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

  // Use the fetched workDiaryItems instead of work.workDiaries
  const workDiaries: Record<string, unknown>[] = workDiaryItems;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-300">
        <div className="flex items-center gap-4 px-4 py-4 max-w-md mx-auto">
          <Link
            href="/works"
            style={{
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              color: "#f97316",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-black truncate">
              {((work as Record<string, unknown>).title as string) || "Munka neve"}
            </h1>
            <p className="text-sm text-orange-500">Projekt részletek</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto space-y-6 pb-32">
        {/* Hero Card - Helyszín és Összes Költség Elől */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-300 overflow-hidden">
          {/* Top Section - Helyszín és Összes Költség */}
          <div className="bg-white p-6 border-b border-gray-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span className="text-lg font-bold text-orange-500">Helyszín</span>
                </div>
                <p className="text-xl font-bold text-black mb-4">
                  {((work as Record<string, unknown>).location as string) || "Helyszín nincs megadva"}
                </p>
                
                <div className="bg-orange-50 rounded-2xl p-4 border border-gray-300">
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600 mb-2">Összes költség</div>
                    <div className="text-2xl font-bold text-orange-500">
                      {((((work as Record<string, unknown>).totalMaterialCost as number) ?? 0) +
                       (((work as Record<string, unknown>).totalLaborCost as number) ?? 0)).toLocaleString('hu-HU')} Ft
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Image upload section */}
              <div className="relative ml-4">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                  />
                  <div className={`w-24 h-24 rounded-2xl border-2 border-dashed border-gray-400 flex items-center justify-center transition-all duration-200 hover:border-orange-500 ${workImage ? 'border-solid border-gray-300' : ''}`}
                       style={{
                         backgroundImage: workImage ? `url(${workImage})` : "none",
                         backgroundSize: "cover",
                         backgroundPosition: "center",
                       }}>
                    {!workImage && !imageUploading && (
                      <div className="text-center text-gray-500">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <div className="text-xs font-medium">Kép</div>
                      </div>
                    )}
                    {imageUploading && (
                      <div className="text-gray-500">
                        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </label>

                {workImage && (
                  <button
                    onClick={handleImageRemove}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 shadow-lg"
                  >
                    ×
                  </button>
                )}

                {imageError && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-red-200 bg-red-500/20 px-2 py-1 rounded backdrop-blur-sm">
                    {imageError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6 bg-white text-black space-y-4">
            {/* Összefoglaló */}
            {((work as Record<string, unknown>).workSummary as string) && (
              <div className="bg-orange-50 rounded-2xl p-4 border border-gray-300">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span className="text-sm font-bold text-orange-600">Összefoglaló</span>
                </div>
                <p className="text-sm text-black leading-relaxed">
                  {((work as Record<string, unknown>).workSummary as string)}
                </p>
              </div>
            )}

            {/* Duration */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="text-sm font-medium text-orange-600">Időtartam</span>
                </div>
                <span className="text-lg font-bold text-black">
                  {((work as Record<string, unknown>).estimatedDuration as string) || "Nincs megadva"}
                </span>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl border border-gray-300">
                <span className="text-gray-700 font-medium">Munkaerő költség</span>
                <span className="font-bold text-orange-600">{((work as Record<string, unknown>).totalLaborCost as number) ?? 0} Ft</span>
              </div>
              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl border border-gray-300">
                <span className="text-gray-700 font-medium">Anyag költség</span>
                <span className="font-bold text-orange-600">{((work as Record<string, unknown>).totalMaterialCost as number) ?? 0} Ft</span>
              </div>
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-300">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{((work as Record<string, unknown>).totalWorkers as number) || 0}</div>
                <div className="text-sm text-gray-600">Munkás</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{((work as Record<string, unknown>).totalTools as number) || 0}</div>
                <div className="text-sm text-gray-600">Eszköz</div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kezdés:</span>
                <span className="font-medium text-black">{startDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Befejezés:</span>
                <span className="font-medium text-black">{endDate}</span>
              </div>
            </div>

            {/* Workers list if any */}
            {workers.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="text-sm text-gray-600 mb-2">Szakmunkások:</div>
                <div className="text-black font-medium">{workers.map((w) => w.name).join(", ")}</div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-300">
              <div>Létrehozva: {createdAt}</div>
              <div>Módosítva: {updatedAt}</div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-300 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-black">Projekt előrehaladás</h3>
              <p className="text-sm text-orange-600">Teljesítmény áttekintés</p>
            </div>
          </div>

          {/* Progress items */}
          <div className="space-y-6">
            {/* Teljesített */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-orange-500 rounded-full shadow-lg"></div>
                  <span className="font-bold text-black text-lg">Teljesített</span>
                </div>
                <span className="text-2xl font-bold text-orange-500">{completedPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ width: `${completedPercent}%` }}
                />
              </div>
            </div>

            {/* Számlázott */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-orange-400 rounded-full shadow-lg"></div>
                  <span className="font-bold text-black text-lg">Számlázott</span>
                </div>
                <span className="text-2xl font-bold text-orange-400">{billedPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-orange-300 to-orange-500 rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ width: `${billedPercent}%` }}
                />
              </div>
            </div>

            {/* Számlázható */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg"></div>
                  <span className="font-bold text-black text-lg">Számlázható</span>
                </div>
                <span className="text-2xl font-bold text-yellow-500">{billablePercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ width: `${billablePercent}%` }}
                />
              </div>
            </div>

            {/* Pénzügyileg teljesített */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-400 rounded-full shadow-lg"></div>
                  <span className="font-bold text-black text-lg">Pénzügyileg teljesített</span>
                </div>
                <span className="text-2xl font-bold text-gray-400">{paidPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-gray-400 to-gray-600 rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dates section */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-300 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-black">Időtartam</h3>
                <p className="text-sm text-orange-600">Projekt ütemezés</p>
              </div>
            </div>
            <button
              onClick={() => setShowDateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Szerkesztés
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-4 px-6 bg-gray-50 rounded-2xl border border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg"></div>
                <span className="font-bold text-black text-lg">Kezdés:</span>
              </div>
              <span className="font-bold text-orange-600 text-lg">{startDate}</span>
            </div>
            <div className="flex justify-between items-center py-4 px-6 bg-gray-50 rounded-2xl border border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg"></div>
                <span className="font-bold text-black text-lg">Befejezés:</span>
              </div>
              <span className="font-bold text-orange-600 text-lg">{endDate}</span>
            </div>
          </div>
        </div>

        {/* Profit box */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-300 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dynamicProfit.totalProfit >= 0 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {dynamicProfit.totalProfit >= 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                )}
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Profit</h3>
              <p className="text-sm text-orange-400">Pénzügyi áttekintés</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`p-6 rounded-2xl border ${dynamicProfit.totalProfit >= 0 ? 'bg-gradient-to-r from-gray-700 to-gray-800 border-orange-500/20' : 'bg-gradient-to-r from-red-900/20 to-red-800/20 border-red-500/20'}`}>
              <div className="flex justify-between items-center">
                <span className={`font-bold text-xl ${dynamicProfit.totalProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                  Összprofit
                </span>
                <span className={`text-3xl font-bold ${dynamicProfit.totalProfit >= 0 ? 'text-orange-500' : 'text-red-500'}`}>
                  {dynamicProfit.totalProfit >= 0 ? "+" : ""}
                  {dynamicProfit.totalProfit.toLocaleString("hu-HU")} Ft
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 px-6 bg-gray-700/50 rounded-xl border border-gray-600">
              <span className="font-bold text-white text-lg">Profit ráta:</span>
              <span className={`text-xl font-bold ${dynamicProfit.profitMargin >= 0 ? 'text-orange-500' : 'text-red-500'}`}>
                {dynamicProfit.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* További részletek wrapper */}
        <div className="bg-gradient-to-br from-gray-800 to-black rounded-3xl shadow-2xl border border-orange-500/20 overflow-hidden">
          <CollapsibleSection title="További részletek" defaultOpen={false}>
        {/* Munkások (lenyíló) */}
        <CollapsibleSection
          title="Munkára felvett munkások"
          defaultOpen={false}
        >
          <WorkersSummary
            workId={(work as Record<string, unknown>).id as number}
            workItems={workItemsWithWorkers.map((item) => ({
              ...item,
              tools: item.tools ?? [],
              materials: item.materials ?? [],
              workers: item.workers ?? [],
              workItemWorkers: item.workItemWorkers ?? [],
            }))}
            workers={workers as unknown as Worker[]}
            generalWorkersFromDB={
              generalWorkersFromDB as unknown as GeneralWorkerFromDB[]
            }
            showAllWorkItems={true}
          />
        </CollapsibleSection>

        {/* Eszköz slotok (lenyíló) */}
        <CollapsibleSection title="Hozzárendelt eszközök" defaultOpen={false}>
          <ToolsSummary
            workId={(work as Record<string, unknown>).id as number}
            workItems={workItemsWithWorkers.map((item) => ({
              ...item,
              tools: item.tools ?? [],
              materials: item.materials ?? [],
              workers: item.workers ?? [],
              workItemWorkers: item.workItemWorkers ?? [],
            }))}
            assignedTools={assignedTools as unknown as AssignedTool[]}
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
              {workDiaries.map(
                (diary: Record<string, unknown>, idx: number) => (
                  <div
                    key={(diary.id as string) || idx}
                    style={{
                      padding: "4px 11px",
                      background: "#f4f4fa",
                      borderRadius: 8,
                      fontWeight: 500,
                      fontSize: 15,
                      color: "#6363a2",
                    }}
                  >
                    {(diary.description as string) || (diary.id as string)}
                  </div>
                )
              )}
            </div>
          </div>
        </CollapsibleSection>
          </CollapsibleSection>
        </div>

        {/* Technical Button */}
        <div className="flex justify-center">
          <TechnicalButton
            workId={((work as Record<string, unknown>)?.id as string) || ""}
          />
        </div>
      </div>

      {/* Date Edit Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={() => setShowDateModal(false)}>
          <div className="bg-gradient-to-br from-gray-800 to-black rounded-3xl shadow-2xl border border-orange-500/20 p-6 max-w-md w-full"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Időtartam szerkesztése</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-orange-400 mb-2">
                  Kezdés dátuma:
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-400 mb-2">
                  Befejezés dátuma:
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDateModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors duration-200"
              >
                Mégse
              </button>
              <button
                onClick={handleDateSave}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
