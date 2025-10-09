"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import TaskCard from "../_components/TaskCard";
import { createWorkDiary } from "@/actions/workdiary-actions";
import { useParams } from "next/navigation";
import {
  fetchWorkAndItems,
  updateWorkItemInProgress,
} from "@/actions/work-actions";
import { addWorkItemAndOfferItem } from "@/actions/add-work-item-actions";
import { AddOfferItemModal } from "@/components/AddOfferItemModal";
import { updateWorkItemQuantity } from "@/actions/update-workitem-quantity";
import {
  WorkItemEditModal,
  WorkItemEditData,
} from "../_components/WorkItemEditModal";
import { updateWorkItemDetails } from "@/actions/update-workitem-details";
import WorkHeader from "@/components/WorkHeader";

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
}

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

  const [work, setWork] = useState<Work | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null); // For loading spinner per task
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

  const handleQuantityChange = async (
    workItemId: number,
    newQuantity: number
  ) => {
    try {
      const result = await updateWorkItemQuantity(workItemId, newQuantity);
      if (result.success) {
        // Update local state
        setWorkItems((prev) =>
          prev.map((item) =>
            item.id === workItemId ? { ...item, quantity: newQuantity } : item
          )
        );
        showToast("success", "Mennyiség sikeresen módosítva!");
      } else {
        showToast("error", result.error || "Hiba történt a módosítás során");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      showToast("error", "Hiba történt a módosítás során");
    }
  };

  const doFetchWorkAndItems = useCallback(async () => {
    if (isNaN(workId)) {
      setLoading(false);
      setError("Érvénytelen munkalap azonosító");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { work, workItems } = await fetchWorkAndItems(workId);
      setWork(work);
      setWorkItems(workItems || []);
    } catch (e) {
      console.error("Error fetching work items:", e);
      setError(
        "Nem sikerült betölteni a munkalapot. Kérjük, próbálja újra később."
      );
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    doFetchWorkAndItems();

    const onFocus = () => doFetchWorkAndItems();
    const onVisibility = () => {
      if (document.visibilityState === "visible") doFetchWorkAndItems();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, [doFetchWorkAndItems]);

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

      // Only create diary if checking and no diary exists for this work yet
      if (checked) {
        const hasExistingDiaryForWork = workItems.some(
          (item) => item.workDiaryEntries && item.workDiaryEntries.length > 0
        );

        if (!hasExistingDiaryForWork) {
          const result = await createWorkDiary({ workId, workItemId });

          if (result.success) {
            setWorkItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id === workItemId) {
                  return {
                    ...item,
                    inProgress: true,
                    workDiaryEntries: [
                      {
                        id: result.data?.id || Date.now(),
                        workItemId,
                        workId,
                      },
                    ] as WorkDiary[],
                  };
                }
                return item;
              })
            );
          } else {
            setAssignError("Nem sikerült naplót létrehozni.");
            return;
          }
        } else {
          // Just update inProgress status in UI
          setWorkItems((prevItems) =>
            prevItems.map((item) => {
              if (item.id === workItemId) {
                return {
                  ...item,
                  inProgress: true,
                };
              }
              return item;
            })
          );
        }
      } else {
        // Just update inProgress status in UI - never delete diary
        setWorkItems((prevItems) =>
          prevItems.map((item) => {
            if (item.id === workItemId) {
              return {
                ...item,
                inProgress: false,
              };
            }
            return item;
          })
        );
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

    console.log("Tasks page - saving new item:", newItemData);

    try {
      // Create the work item with the form data
      const result = await addWorkItemAndOfferItem(workId, {
        name: newItemData.name,
        quantity: parseFloat(newItemData.quantity) || 1,
        unit: newItemData.unit,
        materialUnitPrice: newItemData.materialUnitPrice,
        unitPrice: newItemData.unitPrice,
      });

      console.log("Tasks page - result:", result);

      if (result.success) {
        console.log("Tasks page - success, refreshing data");
        // Refresh the work items to show the new item
        await doFetchWorkAndItems();
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
      console.log("handleSaveEditedWorkItem called with:", {
        workItemId,
        updatedData,
      });
      const result = await updateWorkItemDetails(workItemId, updatedData);
      console.log("updateWorkItemDetails result:", result);

      if (result.success) {
        // Update local state
        setWorkItems((prev) =>
          prev.map((item) =>
            item.id === workItemId
              ? {
                  ...item,
                  name: updatedData.name || item.name,
                  description:
                    updatedData.description !== undefined
                      ? updatedData.description
                      : item.description,
                  quantity:
                    updatedData.quantity !== undefined
                      ? updatedData.quantity
                      : item.quantity,
                  unit: updatedData.unit || item.unit,
                  unitPrice:
                    updatedData.unitPrice !== undefined
                      ? updatedData.unitPrice
                      : item.unitPrice,
                  materialUnitPrice:
                    updatedData.materialUnitPrice !== undefined
                      ? updatedData.materialUnitPrice
                      : item.materialUnitPrice,
                  totalPrice:
                    updatedData.totalPrice !== undefined
                      ? updatedData.totalPrice
                      : item.totalPrice,
                }
              : item
          )
        );
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
      <WorkHeader title={work?.title || "Feladatok"} />
      <div style={{ padding: "0px 16px 16px 16px" }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleAddNewItem}
            disabled={addingNewItem}
            style={{
              marginLeft: "auto",
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "transparent",
              border: addingNewItem ? "2px solid #ccc" : "2px solid #f97316",
              color: addingNewItem ? "#ccc" : "#f97316",
              fontSize: 20,
              fontWeight: "bold",
              cursor: addingNewItem ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!addingNewItem) {
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.color = "#ea580c";
              }
            }}
            onMouseLeave={(e) => {
              if (!addingNewItem) {
                e.currentTarget.style.borderColor = "#f97316";
                e.currentTarget.style.color = "#f97316";
              }
            }}
          >
            {addingNewItem ? "..." : "+"}
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
            <span>Betöltés...</span>
          </div>
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
            {work.endDate && (
              <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
                Határidő: {work.endDate.toString()}
              </div>
            )}
            {work.startDate && (
              <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
                Kezdődő: {work.startDate.toString()}
              </div>
            )}

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
                      onQuantityChange={handleQuantityChange}
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
