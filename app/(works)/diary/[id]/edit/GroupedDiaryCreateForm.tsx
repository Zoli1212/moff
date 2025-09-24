"use client";
import {
  getOrCreateWorkDiaryForWork,
  createWorkDiaryItem,
} from "@/actions/workdiary-actions";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import React, { useEffect, useMemo, useState } from "react";
import { Calendar, X, Plus, Users, User, BookOpen } from "lucide-react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { updateWorkItemCompletion } from "@/actions/work-actions";
import { updateGroupApproval } from "@/actions/group-approval-actions";
import { updateWorkItemQuantity } from "@/actions/update-workitem-quantity";
import { useActiveWorkersStore } from "@/stores/active-workers-store";
import UpdateWorkItemQuantityModal from "./_components/UpdateWorkItemQuantityModal";
import { toast } from "sonner";

import type { WorkItem, WorkItemWorker } from "@/types/work";
import type { WorkDiaryItemCreate } from "@/types/work-diary";

type ActionResult<T> = { success: boolean; data?: T; message?: string };

interface GroupedWorkItem {
  workItem: WorkItem;
  progress: number;
  modifiedQuantity?: number | null;
}

interface GroupedDiaryFormProps {
  diary: WorkDiaryWithItem;
  workItems: WorkItem[];
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
}

export default function GroupedDiaryForm({
  diary,
  workItems,
  onSave,
  onCancel,
}: GroupedDiaryFormProps) {
  const { user } = useUser();
  const [date, setDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedGroupedItems, setSelectedGroupedItems] = useState<
    GroupedWorkItem[]
  >([]);
  const [selectedWorkers, setSelectedWorkers] = useState<WorkItemWorker[]>([]);
  const [workerHours, setWorkerHours] = useState<Map<string, number>>(
    new Map()
  ); // Individual worker hours by name
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showWorkItemModal, setShowWorkItemModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Track original completedQuantity values when form loads
  const [originalCompletedQuantities, setOriginalCompletedQuantities] =
    useState<Map<number, number>>(new Map());

  const [pendingApprovalChange, setPendingApprovalChange] = useState<
    boolean | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quantity modification modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(
    null
  );
  const [newQuantity, setNewQuantity] = useState<string>("");

  const handleQuantityChange = (
    workItemId: number | null,
    quantity: number | null
  ) => {
    if (workItemId === null) return;

    setSelectedGroupedItems((prev) =>
      prev.map((item) =>
        item.workItem.id === workItemId
          ? {
              ...item,
              modifiedQuantity: quantity,
              workItem: { ...item.workItem, modifiedQuantity: quantity }, // Also update nested workItem
            }
          : item
      )
    );
  };

  // This function updates the quantity in the local state AND saves to server
  const handleUpdateQuantity = async (
    workItemId: number,
    newQuantity: number
  ) => {
    console.log("[Form] handleUpdateQuantity function started.");
    // Update UI immediately for better UX
    setSelectedGroupedItems((prev) =>
      prev.map((item) =>
        item.workItem.id === workItemId
          ? {
              ...item,
              modifiedQuantity: newQuantity,
              workItem: { ...item.workItem, modifiedQuantity: newQuantity },
            }
          : item
      )
    );

    // Close modal immediately for better UX
    setShowQuantityModal(false);

    // Save to server
    try {
      const result = await updateWorkItemQuantity(workItemId, newQuantity);
      if (result.success) {
        showToast("success", "Mennyiség sikeresen frissítve!");
      } else {
        showToast("error", result.error || "Hiba a mennyiség frissítése során");
      }
    } catch (error) {
      showToast("error", "Hiba a mennyiség frissítése során");
    }
  };

  // Get active work items (in progress)
  const activeWorkItems = useMemo(() => {
    return workItems.filter((item) => item.inProgress === true);
  }, [workItems]);

  // Get ALL workItemWorkers from the work using server action
  const [allWorkWorkers, setAllWorkWorkers] = useState<WorkItemWorker[]>([]);

  // Load all workItemWorkers for this work
  useEffect(() => {
    const loadWorkItemWorkers = async () => {
      try {
        const { getWorkItemWorkersForWork } = await import(
          "@/actions/get-workitemworkers-for-work"
        );
        const workItemWorkerData = await getWorkItemWorkersForWork(
          diary.workId
        );

        // Convert workItemWorker data to WorkItemWorker format
        const uniqueWorkers = new Map<string, WorkItemWorker>();
        (workItemWorkerData || []).forEach((worker) => {
          const workerName = worker.name || "";
          if (workerName && !uniqueWorkers.has(workerName)) {
            uniqueWorkers.set(workerName, {
              id: worker.id,
              workerId: worker.workerId || 0,
              workItemId: worker.workItemId || 0,
              name: worker.name || "",
              email: worker.email || "",
              role: worker.role || "",
              quantity: worker.quantity || 1,
              avatarUrl: worker.avatarUrl || null,
            });
          }
        });

        setAllWorkWorkers(Array.from(uniqueWorkers.values()));
      } catch (error) {
        console.error("Error loading workItemWorkers:", error);
      }
    };

    if (diary.workId) {
      loadWorkItemWorkers();
    }
  }, [diary.workId]);

  // Initialize with ALL active work items by default (only on first load)
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (
      !hasInitialized &&
      selectedGroupedItems.length === 0 &&
      activeWorkItems.length > 0
    ) {
      const allActiveItems: GroupedWorkItem[] = activeWorkItems.map(
        (workItem) => ({
          workItem,
          progress: workItem.progress || 0,
          modifiedQuantity: workItem.modifiedQuantity,
        })
      );
      setSelectedGroupedItems(allActiveItems);
      setHasInitialized(true);
    }
  }, [activeWorkItems, selectedGroupedItems.length, hasInitialized]);

  // Don't initialize workers by default - start with empty selection
  const { activeWorkers, workerHours: activeWorkerHours } =
    useActiveWorkersStore();

  useEffect(() => {
    // Initialize workers from the Zustand store on first load
    if (activeWorkers.length > 0) {
      setSelectedWorkers(activeWorkers);
    }
    if (activeWorkerHours.size > 0) {
      setWorkerHours(new Map(activeWorkerHours));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Initialize form with selected date from calendar or today's date as fallback
  useEffect(() => {
    // Use the selected date from calendar (diary.date) or today's date as fallback
    if (diary.date) {
      if (typeof diary.date === "string") {
        const dateOnly = (diary.date as string).split("T")[0];
        setDate(dateOnly);
      } else {
        // Use local date components to avoid timezone conversion
        const year = diary.date.getFullYear();
        const month = String(diary.date.getMonth() + 1).padStart(2, "0");
        const day = String(diary.date.getDate()).padStart(2, "0");
        const dateOnly = `${year}-${month}-${day}`;
        setDate(dateOnly);
      }
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateOnly = `${year}-${month}-${day}`;
      setDate(dateOnly);
    }
  }, [diary.date]);

  // No group approval loading needed in create mode

  // No form data initialization needed in create mode - start with empty form

  const showToast = (type: "success" | "error", message: string) => {
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const addGroupedItem = (groupedItem: GroupedWorkItem) => {
    if (
      !selectedGroupedItems.find(
        (item) => item.workItem.id === groupedItem.workItem.id
      )
    ) {
      setSelectedGroupedItems((prev) => [...prev, groupedItem]);

      // Store original completedQuantity value when workItem is first selected
      setOriginalCompletedQuantities((prev) => {
        const newMap = new Map(prev);
        newMap.set(
          groupedItem.workItem.id,
          groupedItem.workItem.completedQuantity || 0
        );
        return newMap;
      });
    }
  };

  const removeWorkItem = (workItemId: number) => {
    setSelectedGroupedItems((prev) =>
      prev.filter((item) => item.workItem.id !== workItemId)
    );

    // Remove original value when workItem is removed
    setOriginalCompletedQuantities((prev) => {
      const newMap = new Map(prev);
      newMap.delete(workItemId);
      return newMap;
    });
  };

  // const addAllActiveWorkItems = () => {
  //   const newItems: GroupedWorkItem[] = [];
  //   activeWorkItems.forEach(workItem => {
  //     if (!selectedGroupedItems.find(item => item.workItem.id === workItem.id)) {
  //       newItems.push({
  //         workItem,
  //         progress: workItem.progress || 0
  //       });
  //     }
  //   });
  //   setSelectedGroupedItems(prev => [...prev, ...newItems]);
  // };

  const removeWorker = (workerName: string) => {
    setSelectedWorkers((prev) => prev.filter((w) => w.name !== workerName));
    setWorkerHours((prev) => {
      const newMap = new Map(prev);
      newMap.delete(workerName);
      return newMap;
    });
  };

  const openWorkerModal = () => {
    setShowWorkerModal(true);
  };

  const closeWorkerModal = () => {
    setShowWorkerModal(false);
  };

  const openWorkItemModal = () => {
    setShowWorkItemModal(true);
  };

  const closeWorkItemModal = () => {
    setShowWorkItemModal(false);
  };

  const addWorker = (worker: WorkItemWorker) => {
    if (
      !selectedWorkers.find(
        (w) => w.name?.toLowerCase() === worker.name?.toLowerCase()
      )
    ) {
      setSelectedWorkers((prev) => [...prev, worker]);
      // Initialize with 8 hours for new workers
      setWorkerHours((prev) => new Map(prev.set(worker.name || "", 8)));
    }
  };

  const updateWorkerHours = (workerName: string, hours: number) => {
    setWorkerHours((prev) => new Map(prev.set(workerName, hours)));
  };

  const updateProgress = (workItemId: number, completedQuantity: number) => {
    // Only update local state, database update happens on form submission
    setSelectedGroupedItems((prev) =>
      prev.map((item) =>
        item.workItem.id === workItemId
          ? {
              ...item,
              workItem: {
                ...item.workItem,
                completedQuantity: completedQuantity,
              },
            }
          : item
      )
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError("");
    setImageUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload-avatar", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.url) {
          return data.url;
        } else {
          throw new Error(data.error || "Hiba történt a feltöltésnél.");
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setImageError("Hiba a feltöltés során: " + (err as Error).message);
    } finally {
      setImageUploading(false);
      // Reset the input value so the same files can be selected again
      e.target.value = "";
    }
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || selectedGroupedItems.length === 0) {
      showToast("error", "Dátum és legalább egy munkafázis szükséges.");
      return;
    }

    // Check if workers are selected
    if (selectedWorkers.length === 0) {
      showToast("error", "Legalább egy dolgozót ki kell választani.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate unique groupNo for new group
      const groupNo = Math.floor(Date.now() / 1000);

      // Get or create diary
      let diaryIdToUse = diary.id;
      if (!diaryIdToUse || diaryIdToUse === 0) {
        const res: ActionResult<{ id: number }> =
          await getOrCreateWorkDiaryForWork({
            workId: diary.workId,
            workItemId: selectedGroupedItems[0].workItem.id,
          });
        if (!res?.success || !res?.data?.id) {
          showToast("error", "Napló azonosító megszerzése sikertelen.");
          return;
        }
        diaryIdToUse = res.data.id as number;
      }

      // Create diary items for each worker and each work item combination
      const promises: Promise<unknown>[] = [];

      for (const worker of selectedWorkers) {
        const workerTotalHours = workerHours.get(worker.name || "") || 8;

        // Calculate progress changes by comparing current values with original values
        const progressChanges = selectedGroupedItems.map((item) => {
          const currentCompleted = item.workItem.completedQuantity || 0;
          const originalCompleted =
            originalCompletedQuantities.get(item.workItem.id) || 0;
          return Math.max(0, currentCompleted - originalCompleted);
        });

        const totalProgress = progressChanges.reduce(
          (sum, progress) => sum + progress,
          0
        );

        // If no progress or all zero, use equal distribution
        const useEqualDistribution = totalProgress === 0;

        for (let i = 0; i < selectedGroupedItems.length; i++) {
          const groupedItem = selectedGroupedItems[i];

          let hoursPerWorkItem: number;

          if (useEqualDistribution) {
            // Equal distribution
            hoursPerWorkItem =
              selectedGroupedItems.length > 0
                ? workerTotalHours / selectedGroupedItems.length
                : workerTotalHours;
          } else {
            // Proportional distribution based on progress
            const itemProgress = progressChanges[i];
            const proportion = itemProgress / totalProgress;
            hoursPerWorkItem = workerTotalHours * proportion;
          }

          const diaryItemData: WorkDiaryItemCreate = {
            diaryId: diaryIdToUse,
            workId: diary.workId,
            workItemId: groupedItem.workItem.id,
            workerId: worker.workerId,
            email:
              worker.email || user?.emailAddresses?.[0]?.emailAddress || "",
            name: worker.name || "",
            date: new Date(date),
            notes: description,
            images: images,
            workHours: hoursPerWorkItem,
            quantity: progressChanges[i] || 0, // A haladás mennyisége
            unit: groupedItem.workItem.unit, // A workItem unit-ja
            groupNo: groupNo,
            tenantEmail: user?.emailAddresses?.[0]?.emailAddress || "",
          };

          promises.push(createWorkDiaryItem(diaryItemData));
        }
      }

      // Update work item progress for all selected items
      for (const groupedItem of selectedGroupedItems) {
        promises.push(
          updateWorkItemCompletion({
            workItemId: groupedItem.workItem.id,
            completedQuantity: groupedItem.workItem.completedQuantity || 0,
          })
        );
      }

      // Handle pending group approval change if exists
      if (
        pendingApprovalChange !== null &&
        diary.workDiaryItems &&
        diary.workDiaryItems.length > 0
      ) {
        const firstItem = diary.workDiaryItems[0];
        if (firstItem.groupNo) {
          try {
            const result = await updateGroupApproval(
              firstItem.groupNo,
              pendingApprovalChange
            );
            if (result.success) {
              showToast(
                "success",
                result.message || "Csoportos jóváhagyás frissítve"
              );
            } else {
              showToast(
                "error",
                result.message || "Hiba történt a jóváhagyás során"
              );
            }
          } catch (error) {
            console.error("Group approval update error:", error);
            showToast("error", "Hiba történt a jóváhagyás során");
          }
        }
        setPendingApprovalChange(null);
      }

      const results = await Promise.allSettled(promises);

      // Check results
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        showToast("error", `${failed.length} művelet sikertelen volt.`);
      } else {
        showToast("success", "Csoportos napló bejegyzés sikeresen létrehozva.");
      }

      onSave({});
    } catch (error) {
      console.log((error as Error).message);
      showToast("error", "Hiba történt a napló bejegyzés létrehozása során.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // No delete functionality needed in create mode

  // const availableWorkItems = activeWorkItems.filter(
  //   item => !selectedGroupedItems.find(selected => selected.workItem.id === item.id)
  // );

  return (
    <div className="space-y-4">
      {/* Modal for Updating Work Item Quantity */}
      <UpdateWorkItemQuantityModal
        isOpen={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        onSave={(quantity) => {
          console.log(
            "[Form] onSave triggered from modal with quantity:",
            quantity
          );
          if (selectedWorkItemId) {
            console.log(
              "[Form] selectedWorkItemId is valid:",
              selectedWorkItemId,
              ". Calling handleUpdateQuantity."
            );
            handleUpdateQuantity(selectedWorkItemId, quantity);
          } else {
            console.error(
              "[Form] selectedWorkItemId is null or undefined. Cannot update."
            );
          }
        }}
        initialQuantity={newQuantity}
        workItemName={
          selectedGroupedItems.find(
            (item) => item.workItem.id === selectedWorkItemId
          )?.workItem.name || ""
        }
      />
      {/* Loading Overlay - AI Processing */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-lg font-medium text-gray-800">
              AI frissítés
            </div>
            <div className="text-sm text-gray-600">
              Napló bejegyzések feldolgozása...
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay - Image Upload */}
      {imageUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <div className="text-lg font-medium text-gray-800">
              Képek feltöltése
            </div>
            <div className="text-sm text-gray-600">
              Kérjük várjon, amíg a képek feltöltődnek...
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-800">Napló bejegyzés</span>
        </div>
        {/* <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onModeToggle}
          disabled={true}
          className="flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <User className="h-4 w-4" />
          Egyéni módra
        </Button> */}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Field */}
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Dátum
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Work Items Selection - Top Box */}
        <div className="border rounded-lg p-4 bg-gray-50 mb-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">Feladatok</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openWorkItemModal}
              className="border-orange-500 text-orange-500 hover:bg-orange-50 rounded-full w-8 h-8 p-0 flex items-center justify-center"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Work Items - Only names and progress */}
          <div className="space-y-2">
            {selectedGroupedItems.map((groupedItem) => (
              <div
                key={groupedItem.workItem.id}
                className="flex items-center justify-between p-3 bg-white border rounded"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{groupedItem.workItem.name}</h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWorkItem(groupedItem.workItem.id)}
                  className="text-red-600 hover:text-red-800 ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {selectedGroupedItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Kattints a + gombra munkafázisok hozzáadásához</p>
            </div>
          )}
        </div>

        {/* Workers Selection - Top Box */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-800">
                Dolgozók kiválasztása
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openWorkerModal}
                className="border-orange-500 text-orange-500 hover:bg-orange-50 rounded-full w-8 h-8 p-0 flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Workers Display */}
            {selectedWorkers.length > 0 && (
              <div className="space-y-2">
                {selectedWorkers.map((worker: WorkItemWorker) => (
                  <div
                    key={worker.workerId}
                    className="flex items-center justify-between bg-white p-3 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{worker.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={workerHours.get(worker.name || "") || ""}
                          onChange={(e) =>
                            updateWorkerHours(
                              worker.name || "",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 h-8 text-xs"
                          placeholder="8"
                        />
                        <span className="text-xs text-gray-500">óra</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWorker(worker.name || "")}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedWorkers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Kattints a + gombra dolgozók hozzáadásához
                </p>
              </div>
            )}
          </div>

          {/* WorkItem Selection Modal */}
          {showWorkItemModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Munkafázis kiválasztása
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeWorkItemModal}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {workItems.filter(
                    (w: WorkItem) =>
                      !selectedGroupedItems.find(
                        (sg) => sg.workItem.id === w.id
                      )
                  ).length > 0 ? (
                    <div className="space-y-2">
                      {workItems
                        .filter(
                          (w: WorkItem) =>
                            !selectedGroupedItems.find(
                              (sg: GroupedWorkItem) => sg.workItem.id === w.id
                            )
                        )
                        .map((workItem: WorkItem) => (
                          <Button
                            key={workItem.id}
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              addGroupedItem({
                                workItem,
                                progress: workItem.progress || 0,
                              });
                              closeWorkItemModal();
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            {workItem.name}
                            {workItem.inProgress && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Aktív
                              </span>
                            )}
                          </Button>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>Minden munkafázis hozzá van adva</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Work Items Selection - Bottom Box */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">
                Jelenlegi állapot
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openWorkItemModal}
                className="border-orange-500 text-orange-500 hover:bg-orange-50 rounded-full w-8 h-8 p-0 flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Work Items - Only names and progress */}
            <div className="space-y-2">
              {selectedGroupedItems.map((groupedItem) => (
                <div
                  key={groupedItem.workItem.id}
                  className="flex items-center justify-between p-3 bg-white border rounded"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {groupedItem.workItem.name}
                      </h3>
                      <button
                        type="button" // PREVENTS FORM SUBMISSION
                        onClick={() => {
                          const effectiveQuantity = (() => {
                            const modifiedQty = groupedItem.modifiedQuantity;
                            const originalQty = groupedItem.workItem.quantity;
                            if (
                              modifiedQty !== null &&
                              modifiedQty !== undefined
                            ) {
                              return modifiedQty;
                            } else if (
                              originalQty !== null &&
                              originalQty !== undefined
                            ) {
                              return originalQty;
                            } else {
                              return 0;
                            }
                          })();
                          setNewQuantity(effectiveQuantity?.toString() || "");
                          setSelectedWorkItemId(groupedItem.workItem.id);
                          setShowQuantityModal(true);
                        }}
                        className="p-1 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                        title="Mennyiség módosítása"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          Készültség
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                          {groupedItem.workItem.completedQuantity || 0}/
                          {(() => {
                            const modifiedQty = groupedItem.modifiedQuantity;
                            const originalQty = groupedItem.workItem.quantity;
                            if (
                              modifiedQty !== null &&
                              modifiedQty !== undefined
                            ) {
                              return modifiedQty;
                            } else if (
                              originalQty !== null &&
                              originalQty !== undefined
                            ) {
                              return originalQty;
                            } else {
                              return "?";
                            }
                          })()}{" "}
                          ({groupedItem.workItem.unit || "?"})
                        </span>
                      </div>
                      <div className="relative w-full">
                        <div
                          className="w-full h-2 bg-gray-200 rounded-lg relative cursor-pointer"
                          onClick={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const percent =
                              ((e.clientX - rect.left) / rect.width) * 100;
                            const effectiveQuantity = (() => {
                              const modifiedQty = groupedItem.modifiedQuantity;
                              const originalQty = groupedItem.workItem.quantity;
                              if (
                                modifiedQty !== null &&
                                modifiedQty !== undefined
                              ) {
                                return modifiedQty;
                              } else if (
                                originalQty !== null &&
                                originalQty !== undefined
                              ) {
                                return originalQty;
                              } else {
                                return 0;
                              }
                            })();
                            const newCompletedQuantity = Math.round(
                              (percent / 100) * effectiveQuantity
                            );
                            updateProgress(
                              groupedItem.workItem.id,
                              Math.max(
                                0,
                                Math.min(
                                  effectiveQuantity,
                                  newCompletedQuantity
                                )
                              )
                            );
                          }}
                        >
                          <div
                            className="h-full bg-blue-500 rounded-lg"
                            style={{
                              width: `${Math.min(
                                100,
                                ((groupedItem.workItem.completedQuantity || 0) /
                                  (() => {
                                    const modifiedQty =
                                      groupedItem.modifiedQuantity;
                                    const originalQty =
                                      groupedItem.workItem.quantity;
                                    if (
                                      modifiedQty !== null &&
                                      modifiedQty !== undefined
                                    ) {
                                      return modifiedQty;
                                    } else if (
                                      originalQty !== null &&
                                      originalQty !== undefined
                                    ) {
                                      return originalQty;
                                    } else {
                                      return 1; // Avoid division by zero
                                    }
                                  })()) *
                                  100
                              )}%`,
                            }}
                          />
                          <div
                            className="absolute top-1/2 transform -translate-y-1/2"
                            style={{
                              left: `calc(${Math.min(
                                100,
                                ((groupedItem.workItem.completedQuantity || 0) /
                                  (() => {
                                    const modifiedQty =
                                      groupedItem.modifiedQuantity;
                                    const originalQty =
                                      groupedItem.workItem.quantity;
                                    if (
                                      modifiedQty !== null &&
                                      modifiedQty !== undefined
                                    ) {
                                      return modifiedQty;
                                    } else if (
                                      originalQty !== null &&
                                      originalQty !== undefined
                                    ) {
                                      return originalQty;
                                    } else {
                                      return 1; // Avoid division by zero
                                    }
                                  })()) *
                                  100
                              )}% - 20px)`,
                            }}
                          >
                            {/* Invisible larger touch target */}
                            <div
                              className="absolute inset-0 w-10 h-10 -m-2 cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const slider =
                                  e.currentTarget.parentElement?.parentElement;
                                let isDragging = true;

                                const handleMouseMove = (
                                  moveEvent: MouseEvent
                                ) => {
                                  if (!isDragging) return;
                                  const rect = slider!.getBoundingClientRect();
                                  const percent = Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      ((moveEvent.clientX - rect.left) /
                                        rect.width) *
                                        100
                                    )
                                  );
                                  const newCompletedQuantity = Math.round(
                                    (percent / 100) *
                                      groupedItem.workItem.quantity
                                  );
                                  updateProgress(
                                    groupedItem.workItem.id,
                                    newCompletedQuantity
                                  );
                                };

                                const handleMouseUp = () => {
                                  isDragging = false;
                                  document.removeEventListener(
                                    "mousemove",
                                    handleMouseMove
                                  );
                                  document.removeEventListener(
                                    "mouseup",
                                    handleMouseUp
                                  );
                                };

                                document.addEventListener(
                                  "mousemove",
                                  handleMouseMove
                                );
                                document.addEventListener(
                                  "mouseup",
                                  handleMouseUp
                                );
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                const slider =
                                  e.currentTarget.parentElement?.parentElement;
                                let isDragging = true;

                                const handleTouchMove = (
                                  moveEvent: TouchEvent
                                ) => {
                                  if (!isDragging) return;
                                  moveEvent.preventDefault();
                                  const rect = slider!.getBoundingClientRect();
                                  const touch = moveEvent.touches[0];
                                  const percent = Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      ((touch.clientX - rect.left) /
                                        rect.width) *
                                        100
                                    )
                                  );
                                  const newCompletedQuantity = Math.round(
                                    (percent / 100) *
                                      groupedItem.workItem.quantity
                                  );
                                  updateProgress(
                                    groupedItem.workItem.id,
                                    newCompletedQuantity
                                  );
                                };

                                const handleTouchEnd = () => {
                                  isDragging = false;
                                  document.removeEventListener(
                                    "touchmove",
                                    handleTouchMove
                                  );
                                  document.removeEventListener(
                                    "touchend",
                                    handleTouchEnd
                                  );
                                };

                                document.addEventListener(
                                  "touchmove",
                                  handleTouchMove,
                                  { passive: false }
                                );
                                document.addEventListener(
                                  "touchend",
                                  handleTouchEnd
                                );
                              }}
                            />
                            {/* Visible slider handle - original size */}
                            <div className="w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWorkItem(groupedItem.workItem.id)}
                    className="text-red-600 hover:text-red-800 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {selectedGroupedItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Kattints a + gombra munkafázisok hozzáadásához</p>
              </div>
            )}
          </div>

          {/* Worker Selection Modal */}
          {showWorkerModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Dolgozó kiválasztása
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeWorkerModal}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {allWorkWorkers.filter(
                    (w: WorkItemWorker) =>
                      !selectedWorkers.find(
                        (sw) => sw.name?.toLowerCase() === w.name?.toLowerCase()
                      )
                  ).length > 0 ? (
                    <div className="space-y-2">
                      {allWorkWorkers
                        .filter(
                          (w: WorkItemWorker) =>
                            !selectedWorkers.find(
                              (sw: WorkItemWorker) =>
                                sw.name?.toLowerCase() === w.name?.toLowerCase()
                            )
                        )
                        .map((worker: WorkItemWorker) => (
                          <Button
                            key={worker.workerId}
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              addWorker(worker);
                              closeWorkerModal();
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            {worker.name}
                          </Button>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>Minden dolgozó hozzá van adva</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Leírás</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Csoportos munka leírása..."
          />
        </div>

        {/* Images */}
        <div className="space-y-2">
          <Label>Képek feltöltése</Label>
          <div className="flex flex-wrap gap-3 items-center">
            {images.map((img, index) => (
              <div key={img} className="relative group">
                <Image
                  src={img}
                  alt={`Kép ${index + 1}`}
                  width={80}
                  height={80}
                  className="object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img)}
                  className="absolute -top-2 -right-2 bg-white border border-red-500 text-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-70 group-hover:opacity-100"
                  title="Kép törlése"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 transition">
              <span className="text-xs text-gray-500">Kép hozzáadása</span>
              <Input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={imageUploading}
              />
            </label>
          </div>
          {imageError && (
            <div className="text-red-600 text-xs mt-1">{imageError}</div>
          )}
        </div>

        {/* No group approval needed in create mode */}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Mégsem
          </Button>
          <Button
            type="submit"
            disabled={
              !date ||
              imageUploading ||
              selectedGroupedItems.length === 0 ||
              selectedWorkers.length === 0 ||
              isSubmitting
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                AI frissítés...
              </div>
            ) : (
              "Bejegyzés mentése"
            )}
          </Button>
        </div>

        {/* No delete confirmation needed in create mode */}
      </form>

    </div>
  );
}
