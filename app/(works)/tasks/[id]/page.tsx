"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TaskCard from "../_components/TaskCard";
import { createWorkDiary } from "@/actions/workdiary-actions";
import { useParams } from "next/navigation";
import {
  fetchWorkAndItemsOptimized,
  updateWorkItemInProgress,
} from "@/actions/work-actions";
import { addWorkItemAndOfferItem } from "@/actions/add-work-item-actions";
import { AddOfferItemModal } from "@/components/AddOfferItemModal";
// import { updateWorkItemQuantity } from "@/actions/update-workitem-quantity";
import {
  WorkItemEditModal,
  WorkItemEditData,
} from "../_components/WorkItemEditModal";
import { updateWorkItemDetails } from "@/actions/update-workitem-details";
import WorkHeader from "@/components/WorkHeader";
import WorksSkeletonLoader from "../../_components/WorksSkeletonLoader";

import { WorkDiary } from "@/types/work-diary";

export interface WorkItem {
  id: number;
  workId: number;
  name: string;
  description?: string;
  progress?: number;
  quantity?: number;
  completedQuantity?: number;
  unit?: string;
  unitPrice?: number;
  materialUnitPrice?: number;
  totalPrice?: number;
  inProgress?: boolean;
  workItemWorkers?: { id: number; name?: string; role?: string }[];
  workDiaryEntries?: WorkDiary[];
  billableQuantity?: number;
  billedQuantity?: number;
  paidQuantity?: number;
  currentMarketPrice?: {
    bestPrice: number;
    supplier: string;
    url: string;
    productName: string;
    savings: number;
    checkedAt: string;
    lastRun?: string;
  } | null;
  lastPriceCheck?: Date;
}

const getMonogram = (name?: string): string => {
  if (!name) return "D"; // Default for 'Dolgozó'
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function TasksPage() {
  const params = useParams();
  const workId = useMemo(() => Number(params.id), [params.id]);
  const queryClient = useQueryClient();

  // React Query: Fetch work and items with cache
  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['work-tasks', workId],
    queryFn: () => fetchWorkAndItemsOptimized(workId),
    enabled: !isNaN(workId),
    staleTime: 5 * 1000, // 5 seconds cache
    retry: 1,
  });

  const work = data?.work || null;
  const workItems = data?.workItems || [];
  const error = queryError ? "Nem sikerült betölteni a munkalapot. Kérjük, próbálja újra később." : null;

  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [addingNewItem, setAddingNewItem] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorkItem, setEditingWorkItem] =
    useState<WorkItemEditData | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Window focus and visibility refetch (with 5sec cache protection)
  useEffect(() => {
    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  // Toggle workItem inProgress status (checkbox)
  const handleAssignDiary = async (workItemId: number, checked: boolean) => {
    setAssigning(workItemId);
    setAssignError(null);

    try {
      // Update workItem inProgress status
      const inProgressResult = await updateWorkItemInProgress({
        workItemId,
        inProgress: checked,
      });

      if (!inProgressResult.success) {
        setAssignError(
          inProgressResult.message ||
            "Nem sikerült frissíteni a munkafázis állapotát."
        );
        return;
      }

      // Force refetch immediately to refresh UI
      await queryClient.refetchQueries({ queryKey: ['work-tasks', workId] });

      // Only create diary if checking and no diary exists for this work yet
      if (checked) {
        const hasExistingDiaryForWork = workItems.some(
          (item) => item.workDiaryEntries && item.workDiaryEntries.length > 0
        );

        if (!hasExistingDiaryForWork) {
          const result = await createWorkDiary({ workId, workItemId });

          if (!result.success) {
            setAssignError("Nem sikerült naplót létrehozni.");
            return;
          }
        }
      }
    } catch (e) {
      setAssignError(
        (e as Error).message ||
          "Hiba történt a munkafázis állapot frissítésekor"
      );
    } finally {
      setAssigning(null);
    }
  };

  // Handle adding new work item and offer item - now opens modal
  const handleAddNewItem = () => {
    setShowAddModal(true);
  };

  // Handle saving new item from modal
  const handleSaveNewItem = async (newItemData: {
    name: string;
    quantity: string;
    unit: string;
    materialUnitPrice: string;
    unitPrice: string;
  }) => {
    setAddingNewItem(true);
    setAssignError(null);

    try{
      // Create the work item with the form data
      const result = await addWorkItemAndOfferItem(workId, {
        name: newItemData.name,
        quantity: parseFloat(newItemData.quantity) || 1,
        unit: newItemData.unit,
        materialUnitPrice: newItemData.materialUnitPrice,
        unitPrice: newItemData.unitPrice,
      });

      if (result.success) {
        // Force refetch immediately to refresh UI
        await queryClient.refetchQueries({ queryKey: ['work-tasks', workId] });
        // Show success message
        showToast("success", "Új tétel sikeresen hozzáadva!");
      } else {
        console.error("Tasks page - error:", result.error);
        setAssignError(result.error || "Nem sikerült új tételt létrehozni.");
        showToast(
          "error",
          result.error || "Nem sikerült új tételt létrehozni."
        );
      }
    } catch (error) {
      console.error("Tasks page - exception:", error);
      setAssignError("Hiba történt az új tétel létrehozásakor.");
      showToast("error", "Hiba történt az új tétel létrehozásakor.");
    } finally {
      setAddingNewItem(false);
    }
  };

  // Handle opening edit modal
  const handleEditWorkItem = (workItemId: number) => {
    const workItem = workItems.find((item) => item.id === workItemId);
    if (workItem) {
      setEditingWorkItem({
        id: workItem.id,
        name: workItem.name,
        description: workItem.description,
        quantity: workItem.quantity,
        unit: workItem.unit,
        unitPrice: workItem.unitPrice,
        materialUnitPrice: workItem.materialUnitPrice,
        totalPrice: workItem.totalPrice,
        completedQuantity: workItem.completedQuantity,
      });
      setShowEditModal(true);
    }
  };

  // Handle saving edited work item
  const handleSaveEditedWorkItem = async (
    workItemId: number,
    updatedData: Partial<WorkItemEditData>
  ) => {
    try {
      const result = await updateWorkItemDetails(workItemId, updatedData);

      if (result.success) {
        // Force refetch immediately to refresh UI
        await queryClient.refetchQueries({ queryKey: ['work-tasks', workId] });
        setShowEditModal(false);
        setEditingWorkItem(null);
      } else {
        throw new Error(result.error || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error updating work item:", error);
      throw error; // Let the modal handle the error display
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <WorkHeader 
        title={work?.title || "Feladatok"} 
        onAddClick={handleAddNewItem}
        addButtonDisabled={addingNewItem}
      />
      <div style={{ padding: "0px 16px 16px 16px" }}>
        <div
          style={{
            marginBottom: 16,
            background: "#fff9e6",
            padding: "12px 16px",
            borderRadius: 8,
            borderLeft: "4px solid #ffcc00",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "#5c3d09",
            }}
          >
            <strong>Pipáld ki a folyamatban lévő feladatokat!</strong> Ezekre
            fogom kiszámolni a szükséges erőforrás és eszköz igényt!
          </div>
        </div>
        <div style={{ marginBottom: 8 }}></div>
        {loading ? (
          <WorksSkeletonLoader />
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : !work ? (
          <div>Nincs ilyen munka.</div>
        ) : (
          <div
            style={{
              marginBottom: 40,
              background: "#fff",
              borderRadius: 18,

              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >

            {workItems.length === 0 ? (
              <div style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>
                Nincsenek feladatok ehhez a projekthez.
              </div>
            ) : (
              [...workItems]
                .sort((a, b) => {
                  const aInProgress = a.inProgress === true;
                  const bInProgress = b.inProgress === true;
                  return (bInProgress ? 1 : 0) - (aInProgress ? 1 : 0);
                })
                .map((item: WorkItem) => {
                  const p = Math.max(
                    0,
                    Math.min(100, Math.round(item.progress || 0))
                  );
                  return (
                    <TaskCard
                      key={item.id}
                      id={item.id}
                      title={item.name}
                      summary={item.description}
                      progress={p}
                      quantity={item.quantity}
                      completedQuantity={item.completedQuantity}
                      unit={item.unit}
                      isLoading={assigning === item.id}
                      checked={item.inProgress === true}
                      className={
                        item.inProgress === true
                          ? "border-green-500 border-2 bg-green-50"
                          : ""
                      }
                      onCheck={(checked) => handleAssignDiary(item.id, checked)}
                      onEdit={handleEditWorkItem}
                      // Add billing-related props with default values
                      billedQuantity={item.billedQuantity || 0}
                      paidQuantity={item.paidQuantity || 0}
                    >
                      {item.workItemWorkers &&
                        item.workItemWorkers.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "12px",
                              marginTop: "8px",
                            }}
                          >
                            {item.workItemWorkers
                              .filter((w) => w.name && w.name.trim() !== "")
                              .map((w) => (
                                <div
                                  key={w.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    backgroundColor: "#f0f0f0",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                  }}
                                >
                                  <Image
                                    src="/worker.jpg"
                                    alt="worker avatar"
                                    width={24}
                                    height={24}
                                    style={{ borderRadius: "50%" }}
                                  />
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      fontSize: "11px",
                                      lineHeight: "1.2",
                                    }}
                                  >
                                    {getMonogram(w.name)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      {assignError && assigning === item.id && (
                        <span style={{ color: "red", marginLeft: 8 }}>
                          {assignError}
                        </span>
                      )}
                    </TaskCard>
                  );
                })
            )}
          </div>
        )}

        {/* Add Item Modal */}
        <AddOfferItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveNewItem}
        />

        {/* Edit Work Item Modal */}
        <WorkItemEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorkItem(null);
          }}
          workItem={editingWorkItem}
          onSave={handleSaveEditedWorkItem}
        />

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg text-white ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
