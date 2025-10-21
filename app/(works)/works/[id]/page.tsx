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
// import type { AssignedTool } from "@/types/tools.types";

type Tool = BaseTool & { quantity?: number };
import TechnicalButton from "./_components/TechnicalButton";
import CollapsibleSection from "../_components/CollapsibleSection";

import Link from "next/link";
// import { getAssignedToolsForWork } from "@/actions/tools-registry-actions";
import { checkWorkHasDiaries, deleteWorkWithRelatedData } from "@/actions/delete-work-actions";
import { useRouter } from "next/navigation";
import { getCurrentUserData } from "@/actions/user-actions";

export default function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Router
  const router = useRouter();
  
  // State for data
  const [work, setWork] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasDiaries, setHasDiaries] = useState(false);
  const [diaryCount, setDiaryCount] = useState(0);
  
  // State for tenant check
  const [isTenant, setIsTenant] = useState<boolean>(true);

  // State for image upload
  const [workImage, setWorkImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // State for additional data
  const [workItemsWithWorkers, setWorkItemsWithWorkers] = useState<WorkItem[]>(
    []
  );
  // const [assignedTools, setAssignedTools] = useState<Tool[]>([]);
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

  // Load tenant status
  useEffect(() => {
    getCurrentUserData()
      .then(data => {
        setIsTenant(data.isTenant ?? true);
      })
      .catch(() => {
        setIsTenant(true); // Default to tenant on error
      });
  }, []);

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
            // const assignedToolsData = await getAssignedToolsForWork(
            //   workData.id
            // );
            const generalWorkersData = await getGeneralWorkersForWork(
              workData.id
            );
            const workDiaryItemsData = await getWorkDiaryItemsByWorkId(
              workData.id
            );

            setWorkItemsWithWorkers(workItemsData as unknown as WorkItem[]);
            // setAssignedTools(assignedToolsData as unknown as Tool[]);
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
            // setAssignedTools([]);
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

  // Handle delete work
  const handleDeleteClick = async () => {
    if (!work || !work.id) return;
    
    const workId = (work as Record<string, unknown>).id as number;
    
    // Check if work has diaries
    const diaryCheck = await checkWorkHasDiaries(workId);
    if (diaryCheck.success) {
      setHasDiaries(diaryCheck.hasDiaries || false);
      setDiaryCount(diaryCheck.diaryCount || 0);
    }
    
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!work || !work.id) return;
    
    setDeleteLoading(true);
    const workId = (work as Record<string, unknown>).id as number;
    
    try {
      const result = await deleteWorkWithRelatedData(workId);
      
      if (result.success) {
        // Redirect to works list
        router.push('/works');
      } else {
        console.error('Delete failed:', result.error);
        alert('Hiba történt a törlés során: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Hiba történt a törlés során');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
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
  // const createdAt = (work as Record<string, unknown>).createdAt
  //   ? new Date(
  //       (work as Record<string, unknown>).createdAt as string
  //     ).toLocaleString()
  //   : "-";
  // const updatedAt = (work as Record<string, unknown>).updatedAt
  //   ? new Date(
  //       (work as Record<string, unknown>).updatedAt as string
  //     ).toLocaleString()
  //   : "-";

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

  // const billedPercent =
  //   aggregateStats.totalQuantity > 0
  //     ? Math.round(
  //         (aggregateStats.billedQuantity / aggregateStats.totalQuantity) * 100
  //       )
  //     : 0;

  // Számlázható = Teljesített - (Számlázott + Pénzügyileg teljesített)
  const totalBilledAndPaid = aggregateStats.billedQuantity + aggregateStats.paidQuantity;
  const billableQuantity = Math.max(
    0,
    aggregateStats.completedQuantity - totalBilledAndPaid
  );
  const billablePercent =
    aggregateStats.totalQuantity > 0
      ? Math.round((billableQuantity / aggregateStats.totalQuantity) * 100)
      : 0;

  // const paidPercent =
  //   aggregateStats.totalQuantity > 0
  //     ? Math.round(
  //         (aggregateStats.paidQuantity / aggregateStats.totalQuantity) * 100
  //       )
  //     : 0;

  // ToolsSlotsSection importálása

  // Use the fetched workDiaryItems instead of work.workDiaries
  const workDiaries: Record<string, unknown>[] = workDiaryItems;

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-6 flex-grow p-4">
        {/* Header with back button, title and delete button */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <Link
              href="/works"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {((work as Record<string, unknown>).title as string) || "Munka részletei"}
            </h1>
          </div>
          
          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="Munka törlése"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Work Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            {/* Left side - Location and dates in single column */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Helyszín:</span>
                  {((work as Record<string, unknown>).location as string) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((work as Record<string, unknown>).location as string)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 transition-colors"
                      title="Megnyitás Google Maps-ben"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </a>
                  )}
                </div>
                <div className="text-sm text-gray-900 break-words">
                  {((work as Record<string, unknown>).location as string) || "Nincs megadva"}
                </div>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-gray-500">Kezdés:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-900">{startDate}</span>
                  <button
                    onClick={() => setShowDateModal(true)}
                    className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-gray-500">Befejezés:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-900">{endDate}</span>
                  <button
                    onClick={() => setShowDateModal(true)}
                    className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500">Becsült időtartam:</span>
                <div className="text-sm text-gray-900">
                  {((work as Record<string, unknown>).estimatedDuration as string) || "Nincs megadva"}
                </div>
              </div>
            </div>
            
            {/* Right side - Image upload */}
            <div className="ml-4">
              <div className="relative">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                  />
                  <div className={`w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center transition-all duration-200 hover:border-gray-400 ${workImage ? 'border-solid border-gray-300' : ''}`}
                       style={{
                         backgroundImage: workImage ? `url(${workImage})` : "none",
                         backgroundSize: "cover",
                         backgroundPosition: "center",
                       }}>
                    {!workImage && !imageUploading && (
                      <div className="text-center text-gray-400">
                        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                    )}
                    {imageUploading && (
                      <div className="text-gray-400">
                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200"
                  >
                    ×
                  </button>
                )}

                {imageError && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {imageError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {((work as Record<string, unknown>).workSummary as string) && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 mb-4">
              <p className="text-sm text-gray-800 leading-relaxed">
                {((work as Record<string, unknown>).workSummary as string)}
              </p>
            </div>
          )}


          {/* Cost Summary */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Munkadíj összesen:</span>
                <span className="text-sm font-bold text-gray-900">
                  {(((work as Record<string, unknown>).totalLaborCost as number) ?? 0).toLocaleString('hu-HU')} Ft
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Anyagköltség összesen:</span>
                <span className="text-sm font-bold text-gray-900">
                  {(((work as Record<string, unknown>).totalMaterialCost as number) ?? 0).toLocaleString('hu-HU')} Ft
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-base font-bold text-gray-900">Összesen:</span>
                <span className="text-base font-bold text-gray-900">
                  {((((work as Record<string, unknown>).totalMaterialCost as number) ?? 0) +
                   (((work as Record<string, unknown>).totalLaborCost as number) ?? 0)).toLocaleString('hu-HU')} Ft
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Progress Section - Only for tenants */}
        {isTenant && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

          <div className="space-y-4">
            {/* Teljesített */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Teljesített:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${completedPercent}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-10 text-right">{completedPercent}%</span>
              </div>
            </div>

            {/* Számlázott (billed + paid combined) */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Számlázott:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(totalBilledAndPaid / aggregateStats.totalQuantity * 100) || 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-10 text-right">{Math.round(totalBilledAndPaid / aggregateStats.totalQuantity * 100) || 0}%</span>
              </div>
            </div>

            {/* Számlázható */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Számlázható:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-yellow-500 rounded-full transition-all duration-300"
                    style={{ width: `${billablePercent}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 w-10 text-right">{billablePercent}%</span>
              </div>
            </div>

          </div>
        </div>
        )}

        {/* Profit Section - Only for tenants */}
        {isTenant && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <h3 className="font-semibold text-gray-600">Profitráta elemzés</h3>
            {dynamicProfit.totalCost > 0 && (
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                dynamicProfit.totalRevenue > dynamicProfit.totalCost 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                Profitráta: {((dynamicProfit.totalRevenue / dynamicProfit.totalCost - 1) * 100).toFixed(1)}%
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-600 font-medium">Bevétel</div>
              <div className="text-lg font-bold text-blue-800">
                {dynamicProfit.totalRevenue.toLocaleString('hu-HU')} Ft
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-red-600 font-medium">Költség</div>
              <div className="text-lg font-bold text-red-800">
                {dynamicProfit.totalCost.toLocaleString('hu-HU')} Ft
              </div>
            </div>
            <div className={`p-3 rounded-lg ${
              dynamicProfit.totalProfit >= 0 ? 'bg-green-50' : 'bg-orange-50'
            }`}>
              <div className={`font-medium ${
                dynamicProfit.totalProfit >= 0 ? 'text-green-600' : 'text-orange-600'
              }`}>
                Profit
              </div>
              <div className={`text-lg font-bold ${
                dynamicProfit.totalProfit >= 0 ? 'text-green-800' : 'text-orange-800'
              }`}>
                {dynamicProfit.totalProfit >= 0 ? '+' : ''}
                {dynamicProfit.totalProfit.toLocaleString('hu-HU')} Ft
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Workers and Tools Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hidden">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{((work as Record<string, unknown>).totalWorkers as number) || 0}</div>
              <div className="text-sm text-gray-500">Munkások</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{((work as Record<string, unknown>).totalTools as number) || 0}</div>
              <div className="text-sm text-gray-500">Eszközök</div>
            </div>
          </div>
        </div>


        {/* Detailed Information Collapsible */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hidden">
          <CollapsibleSection title="Részletes információk" defaultOpen={false}>
            {/* Workers Section */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Munkások ({workers.length})</h3>
              {workers.length === 0 ? (
                <p className="text-sm text-gray-500">Nincsenek munkások</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    // Group workers by name
                    const workerGroups = workers.reduce((acc, worker) => {
                      const name = worker.name || 'Névtelen munkás';
                      if (acc[name]) {
                        acc[name].count += 1;
                      } else {
                        acc[name] = {
                          worker,
                          count: 1
                        };
                      }
                      return acc;
                    }, {} as Record<string, { worker: Worker; count: number }>);
                    
                    return Object.entries(workerGroups).map(([name, group]) => (
                      <div key={name} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">
                          {name}{group.count > 1 ? ` (${group.count})` : ''}
                        </span>
                        <span className="text-xs text-gray-500">{group.worker.profession || 'Munkás'}</span>
                      </div>
                    ));
                  })()} 
                </div>
              )}
            </div>

            {/* Tools Section */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Eszközök ({tools.length})</h3>
              {tools.length === 0 ? (
                <p className="text-sm text-gray-500">Nincsenek eszközök</p>
              ) : (
                <div className="space-y-2">
                  {tools.map((tool, idx) => {
                    const toolName = String(tool.name || tool.id || '');
                    const capitalizedName = toolName.charAt(0).toUpperCase() + toolName.slice(1);
                    return (
                      <div key={tool.id || idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">{capitalizedName}</span>
                        <span className="text-xs text-gray-500">Eszköz</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tasks Section */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feladatok ({workItems.length})</h3>
              {workItems.length === 0 ? (
                <p className="text-sm text-gray-500">Nincsenek feladatok</p>
              ) : (
                <div className="space-y-3">
                  {workItems.map((item, idx) => (
                    <div key={item.id || idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.inProgress ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.inProgress ? 'Folyamatban' : 'Várakozás'}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                      )}
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Mennyiség: {item.quantity} {item.unit}</span>
                        <span>Teljesítve: {item.completedQuantity || 0} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Materials Section */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Anyagok ({materials.length})</h3>
              {materials.length === 0 ? (
                <p className="text-sm text-gray-500">Nincsenek anyagok</p>
              ) : (
                <div className="space-y-2">
                  {materials.map((material, idx) => (
                    <div key={material.id || idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900">{material.name || material.id}</span>
                      <span className="text-xs text-gray-500">Anyag</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Diary Section */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Naplók ({workDiaries.length})</h3>
              {workDiaries.length === 0 ? (
                <p className="text-sm text-gray-500">Nincsenek naplóbejegyzések</p>
              ) : (
                <div className="space-y-2">
                  {workDiaries.map((diary, idx) => (
                    <div key={(diary.id as string) || idx} className="py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900">
                        {(diary.description as string) || (diary.id as string) || `Napló #${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Technical Button */}
        <div className="flex justify-center mt-6">
          <TechnicalButton
            workId={((work as Record<string, unknown>)?.id as string) || ""}
          />
        </div>
      </div>

      {/* Date Edit Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setShowDateModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dátumok szerkesztése</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kezdés dátuma:
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Befejezés dátuma:
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleDateSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
             onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Munka törlése</h3>
            </div>

            <div className="mb-6">
              {hasDiaries ? (
                <p className="text-sm text-gray-700">
                  A munkához <strong>{diaryCount} naplóbejegyzés</strong> tartozik, így is szeretné törölni?
                  <br /><br />
                  <span className="text-red-600 font-medium">
                    Ez a művelet véglegesen törli a munkát és minden kapcsolódó adatot (naplók, munkások, eszközök, anyagok).
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  Biztosan törölni szeretné ezt a munkát?
                  <br /><br />
                  <span className="text-red-600 font-medium">
                    Ez a művelet véglegesen törli a munkát és minden kapcsolódó adatot.
                  </span>
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Mégse
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {deleteLoading ? 'Törlés...' : 'Törlés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
