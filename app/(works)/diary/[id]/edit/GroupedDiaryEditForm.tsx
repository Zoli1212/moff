"use client";
import {
  getOrCreateWorkDiaryForWork,
  createWorkDiaryItem,
  deleteWorkDiaryItemsByGroup,
} from "@/actions/workdiary-actions";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import React, { useEffect, useMemo, useState } from "react";
import { Calendar, X, Plus, Users, User, BookOpen, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { updateWorkItemCompletedQuantityFromLatestDiary } from "@/actions/workdiary-actions";
import {
  updateGroupApproval,
  getGroupApprovalStatus,
} from "@/actions/group-approval-actions";
import { updateWorkItemQuantity } from "@/actions/update-workitem-quantity";
import { checkIsSuperUser } from "@/actions/user-management-actions";
import UpdateWorkItemQuantityModal from "./_components/UpdateWorkItemQuantityModal";
import { toast } from "sonner";

import type { WorkItem, WorkItemWorker } from "@/types/work";
import type { WorkDiaryItemCreate } from "@/types/work-diary";

type ActionResult<T> = { success: boolean; data?: T; message?: string };

interface GroupedWorkItem {
  workItem: WorkItem;
  progress: number;
}

interface GroupedDiaryEditFormProps {
  diary: WorkDiaryWithItem;
  workItems: WorkItem[];
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
}

export default function GroupedDiaryEditForm({
  diary,
  workItems,
  onSave,
  onCancel,
}: GroupedDiaryEditFormProps) {
  const { user } = useUser();
  const [date, setDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [selectedGroupedItems, setSelectedGroupedItems] = useState<
    GroupedWorkItem[]
  >([]);
  const [selectedWorkers, setSelectedWorkers] = useState<WorkItemWorker[]>([]);
  const [workHours, setWorkHours] = useState<number>(8); // Default 8 hours
  const [workerHours, setWorkerHours] = useState<Map<number, number>>(
    new Map()
  ); // Individual worker hours
  const [manuallyModifiedWorkers, setManuallyModifiedWorkers] = useState<Set<number>>(
    new Set()
  ); // Track which workers were manually modified
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showWorkItemModal, setShowWorkItemModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Track original completedQuantity values when form loads
  const [originalCompletedQuantities, setOriginalCompletedQuantities] =
    useState<Map<number, number>>(new Map());

  // Track local progress for this diary entry (progressAtDate)
  const [localProgress, setLocalProgress] = useState<Map<number, number>>(
    new Map()
  );

  // Track which sliders have been interacted with
  const [sliderInteracted, setSliderInteracted] = useState<
    Map<number, boolean>
  >(new Map());

  
  // Track original progressAtDate values from existing diary items
  const [originalProgressAtDate, setOriginalProgressAtDate] = useState<
  Map<number, number>
  >(new Map());
  
  console.log(sliderInteracted, originalProgressAtDate)

  // Group approval state
  const [groupApprovalStatus, setGroupApprovalStatus] = useState<{
    allApproved: boolean;
    someApproved: boolean;
    totalItems: number;
    approvedItems: number;
  } | null>(null);
  const [groupApprovalLoading, setGroupApprovalLoading] = useState(false);
  const [pendingApprovalChange, setPendingApprovalChange] = useState<
    boolean | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);

  // Quantity modification modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(
    null
  );
  const [newQuantity, setNewQuantity] = useState<string>("");

  // Check if current user is tenant
  const currentEmail = useMemo(
    () => user?.emailAddresses?.[0]?.emailAddress || "",
    [user]
  );
  const isTenant = useMemo(() => {
    const a = (currentEmail || "").toLowerCase();
    const b = (diary?.tenantEmail || "").toLowerCase();
    return !!a && !!b && a === b;
  }, [currentEmail, diary?.tenantEmail]);

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
              workItem: { ...item.workItem, quantity: newQuantity },
            }
          : item
      )
    );

    console.log(setWorkHours);
    console.log(originalCompletedQuantities);

    // Modal will be closed by the modal component itself after successful save

    // Save to server
    try {
      const result = await updateWorkItemQuantity(workItemId, newQuantity);
      if (result.success) {
        showToast("success", "Mennyiség sikeresen frissítve!");
      } else {
        showToast("error", result.error || "Hiba a mennyiség frissítése során");
      }
    } catch (error) {
      console.log("Error updating quantity:", error);
      showToast("error", "Hiba a mennyiség frissítése során");
    }
  };

  // Get ALL workItemWorkers from the work using server action
  const [allWorkWorkers, setAllWorkWorkers] = useState<WorkItemWorker[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if user is super user
  useEffect(() => {
    const checkSuperUser = async () => {
      try {
        const result = await checkIsSuperUser();
        setIsSuperUser(result.success && result.isSuperUser);
      } catch (error) {
        console.error('Error checking super user status:', error);
        setIsSuperUser(false);
      }
    };

    checkSuperUser();
  }, []);

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
        const convertedWorkers: WorkItemWorker[] = (
          workItemWorkerData || []
        ).map((worker) => ({
          id: worker.id,
          workerId: worker.workerId || 0,
          workItemId: worker.workItemId || 0,
          name: worker.name || "",
          email: worker.email || "",
          role: worker.role || "",
          quantity: worker.quantity || 1,
          avatarUrl: worker.avatarUrl || null,
        }));

        setAllWorkWorkers(convertedWorkers);
      } catch (error) {
        console.error("Error loading workItemWorkers:", error);
      }
    };

    if (diary.workId) {
      loadWorkItemWorkers();
    }
  }, [diary.workId]);

  // This is an edit form - don't initialize with default items
  // Workers and work items will be loaded from existing diary data

  // Initialize form with diary date
  useEffect(() => {
    if (diary.date) {
      // Use the diary's date - handle timezone properly
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
    }
  }, [diary.date]);

  // Load group approval status when diary items are available
  useEffect(() => {
    if (diary.workDiaryItems && diary.workDiaryItems.length > 0) {
      const firstItem = diary.workDiaryItems[0];
      if (firstItem.groupNo) {
        loadGroupApprovalStatus(firstItem.groupNo);
      }
    }
  }, [diary.workDiaryItems]);

  const loadGroupApprovalStatus = async (groupNo: number) => {
    try {
      setGroupApprovalLoading(true);
      const result = await getGroupApprovalStatus(groupNo);
      
      if (result.success) {
        setGroupApprovalStatus({
          allApproved: result.allApproved || false,
          someApproved: result.someApproved || false,
          totalItems: result.totalItems || 0,
          approvedItems: result.approvedItems || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load group approval status:", error);
    } finally {
      setGroupApprovalLoading(false);
    }
  };

  const handleGroupApprovalToggle = () => {
    if (!groupApprovalStatus) return;

    // Just toggle the local state, don't call server action immediately
    const newApprovalState = !groupApprovalStatus.allApproved;
    setPendingApprovalChange(newApprovalState);

    // Update local display state
    setGroupApprovalStatus((prev) =>
      prev
        ? {
            ...prev,
            allApproved: newApprovalState,
            someApproved: newApprovalState ? false : prev.someApproved,
            approvedItems: newApprovalState ? prev.totalItems : 0,
          }
        : null
    );
  };

  // Initialize form data from existing diary (only once)
  useEffect(() => {
    if (isInitialized) return; // Skip if already initialized
    // Check if diary has groupNo property (from GoogleCalendarView grouping)
    const diaryGroupNo = (diary as WorkDiaryWithItem & { groupNo?: number })
      .groupNo;

    // Filter workDiaryItems by groupNo if groupNo exists
    const filteredItems = diaryGroupNo
      ? diary.workDiaryItems?.filter((item) => item.groupNo === diaryGroupNo) ||
        []
      : diary.workDiaryItems || [];

    if (filteredItems && filteredItems.length > 0) {
      // Load existing diary data
      const firstItem = diary.workDiaryItems[0];

      // Set description from first item's notes
      if (firstItem.notes) {
        setDescription(firstItem.notes);
      }

      // Set images from first item
      if (firstItem.images && firstItem.images.length > 0) {
        setImages(firstItem.images);
      }

      // Build grouped items from diary items
      const groupedItemsMap = new Map<number, GroupedWorkItem>();
      const workersMap = new Map<string, WorkItemWorker>(); // Group by name (string key)
      const workerHoursMap = new Map<string, number>(); // Hours by name
      const localProgressMap = new Map<number, number>(); // Local progress for each workItem

      filteredItems.forEach((item, index) => {
        // Add work items
        if (item.workItemId) {
          const workItem = workItems.find((wi) => wi.id === item.workItemId);
          if (workItem && !groupedItemsMap.has(workItem.id)) {
            groupedItemsMap.set(workItem.id, {
              workItem,
              progress: workItem.progress || 0,
            });

            // Set local progress from existing diary item's progressAtDate
            if (
              item.progressAtDate !== undefined &&
              item.progressAtDate !== null
            ) {
              localProgressMap.set(workItem.id, item.progressAtDate);
              // Also store as original progressAtDate for delta calculation
              setOriginalProgressAtDate((prev) => {
                const newMap = new Map(prev);
                newMap.set(workItem.id, item.progressAtDate || 0);
                return newMap;
              });
            }
          }
        }

        // Group workers by name AND email to ensure uniqueness
        if (item.name && item.email) {
          const workerName = item.name.trim();
          const workerEmail = item.email.trim();
          const uniqueKey = `${workerName}|${workerEmail}`; // Use name+email as unique key

          if (!workersMap.has(uniqueKey)) {
            // First time seeing this worker name+email combination
            const worker: WorkItemWorker = {
              id: index, // Use index as unique id for first occurrence
              workerId: item.workerId || 0,
              name: workerName,
              email: workerEmail,
              workItemId: item.workItemId,
              role: "", // Default empty role
              quantity: 1, // Default quantity
            };
            workersMap.set(uniqueKey, worker);
            workerHoursMap.set(uniqueKey, 0); // Initialize hours
          }

          // Add hours for this worker name+email
          if (item.workHours) {
            const currentHours = workerHoursMap.get(uniqueKey) || 0;
            workerHoursMap.set(uniqueKey, currentHours + item.workHours);
          }
        }
      });

      // Set worker hours by uniqueKey (only if not manually modified)
      workerHoursMap.forEach((totalHours, uniqueKey) => {
        const worker = workersMap.get(uniqueKey);
        if (worker && !manuallyModifiedWorkers.has(worker.id)) {
          console.log(`🔄 [AUTO_SET_WORKER_HOURS] Worker: ${worker.name} (ID: ${worker.id}), Calculated Hours: ${Math.round(totalHours)}`);
          setWorkerHours(
            (prev) => new Map(prev.set(worker.id, Math.round(totalHours)))
          );
        } else if (worker && manuallyModifiedWorkers.has(worker.id)) {
          console.log(`⚠️ [SKIP_AUTO_SET] Worker: ${worker.name} (ID: ${worker.id}) was manually modified, keeping current value`);
        }
      });

      setSelectedGroupedItems(Array.from(groupedItemsMap.values()));
      setSelectedWorkers(Array.from(workersMap.values()));
      setLocalProgress(localProgressMap);
      setIsInitialized(true); // Mark as initialized
    }
  }, [diary, workItems, isInitialized]); // Add isInitialized to dependencies

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

  const removeWorker = (uniqueId: number) => {
    setSelectedWorkers((prev) => prev.filter((w) => w.id !== uniqueId));
    setWorkerHours((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uniqueId);
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
      setWorkerHours((prev) => new Map(prev.set(worker.id, 8)));
    }
  };

  const updateWorkerHours = (uniqueId: number, hours: number) => {
    console.log(`🕐 [UPDATE_WORKER_HOURS] Worker ID: ${uniqueId}, New Hours: ${hours}`);
    setWorkerHours((prev) => new Map(prev.set(uniqueId, hours)));
    setManuallyModifiedWorkers((prev) => new Set(prev.add(uniqueId)));
  };


  const updateProgress = (workItemId: number, progressAtDate: number) => {
    // Mark this slider as interacted with
    setSliderInteracted((prev) => new Map(prev.set(workItemId, true)));
    // Update local progress for this diary entry
    setLocalProgress((prev) => new Map(prev.set(workItemId, progressAtDate)));
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
      // Use existing groupNo and delete existing diary items for this group
      let groupNo: number;
      if (diary.workDiaryItems && diary.workDiaryItems.length > 0) {
        groupNo =
          diary.workDiaryItems[0].groupNo || Math.floor(Date.now() / 1000);

        // Delete existing diary items for this group
        await deleteWorkDiaryItemsByGroup({ groupNo });
        console.log(`🗑️ DEBUG - Deleted diary items for group: ${groupNo}`);
      } else {
        // Fallback groupNo if no existing items
        groupNo = Math.floor(Date.now() / 1000);
      }

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

      // Calculate total hours worked by all selected workers
      const totalWorkerHours = selectedWorkers.reduce((sum, w) => {
        return sum + (workerHours.get(w.id) || workHours);
      }, 0);

      for (const worker of selectedWorkers) {
        const workerTotalHours = workerHours.get(worker.id) || workHours;
        console.log(`🔍 DEBUG - Worker ${worker.name} total hours: ${workerTotalHours}, from workerHours.get: ${workerHours.get(worker.id)}, default workHours: ${workHours}`);

        // Use local progress values (progressAtDate) for each work item
        const progressValues = selectedGroupedItems.map(
          (item) => localProgress.get(item.workItem.id) || 0
        );

        const totalProgress = progressValues.reduce(
          (sum, progress) => sum + progress,
          0
        );

        console.log(`🔍 DEBUG - Worker: ${worker.name}, progressValues:`, progressValues, `totalProgress: ${totalProgress}`);

        for (let i = 0; i < selectedGroupedItems.length; i++) {
          const groupedItem = selectedGroupedItems[i];
          const itemProgress = progressValues[i] || 0;

          // Proportional distribution based on progress
          const proportion =
            totalProgress > 0
              ? itemProgress / totalProgress
              : 1 / selectedGroupedItems.length;
          const hoursPerWorkItem = workerTotalHours * proportion;
          console.log(`🔍 DEBUG - Worker: ${worker.name}, WorkItem: ${groupedItem.workItem.name}, Proportion: ${proportion}, Hours per item: ${hoursPerWorkItem}`);

          // Get previous progressAtDate for delta calculation
          const { getPreviousProgressAtDate } = await import(
            "@/actions/get-previous-progress-actions"
          );
          const previousProgressAtDate = await getPreviousProgressAtDate(
            diary.workId,
            groupedItem.workItem.id, 
            date // current diary date
          );
          
          // Calculate delta: current slider position - previous progressAtDate
          const deltaProgress = Math.max(0, itemProgress - previousProgressAtDate);
          
          console.log(`🔍 DEBUG - WorkItem: ${groupedItem.workItem.name}, Current: ${itemProgress}, Previous: ${previousProgressAtDate}, Delta: ${deltaProgress}`);

          // Distribute delta proportionally based on worker hours
          const quantityForThisWorker = totalWorkerHours > 0
            ? deltaProgress * (workerTotalHours / totalWorkerHours)
            : 0;

          // progressAtDate should ALWAYS reflect current slider position
          const progressAtDateForThisItem = itemProgress;

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
            quantity: quantityForThisWorker, // A haladás mennyisége arányositva a munkás órájával
            unit: groupedItem.workItem.unit, // A workItem unit-ja
            progressAtDate: progressAtDateForThisItem, // Progress at this specific date
            groupNo: groupNo,
          };

          promises.push(createWorkDiaryItem(diaryItemData));
        }
      }

      // Update work item progress for all selected items
      for (const groupedItem of selectedGroupedItems) {
        promises.push(
          updateWorkItemCompletedQuantityFromLatestDiary(
            groupedItem.workItem.id
          )
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
        showToast("success", "Csoportos napló bejegyzés sikeresen frissítve.");
      }

      onSave({});
    } catch (error) {
      console.log((error as Error).message);
      showToast("error", "Hiba történt a napló bejegyzés létrehozása során.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!diary.workDiaryItems || diary.workDiaryItems.length === 0) {
      return;
    }

    const groupNo = diary.workDiaryItems[0].groupNo;
    if (!groupNo) {
      showToast("error", "Csoport azonosító nem található.");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWorkDiaryItemsByGroup({ groupNo });
      showToast("success", "Csoportos napló bejegyzés sikeresen törölve.");
      onSave({}); // Close modal and refresh
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", "Hiba történt a törlés során.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
              Frissítés
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
          <span className="font-medium text-blue-800">Napló szerkesztése</span>
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
                    key={worker.id}
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
                          value={workerHours.get(worker.id) || ""}
                          onChange={(e) =>
                            updateWorkerHours(
                              worker.id,
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
                        onClick={() => removeWorker(worker.id)}
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
                          const effectiveQuantity =
                            groupedItem.workItem.quantity || 0;
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
                          {localProgress.get(groupedItem.workItem.id) || 0}/
                          {groupedItem.workItem.quantity || "?"} (
                          {groupedItem.workItem.unit || "?"})
                        </span>
                      </div>
                      <div className="relative w-full">
                        <div
                          className="w-full h-2 bg-gray-200 rounded-lg relative cursor-pointer select-none"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const slider = e.currentTarget;
                            const rect = slider.getBoundingClientRect();

                            const updateValue = (clientX: number) => {
                              const percent = Math.max(
                                0,
                                Math.min(
                                  100,
                                  ((clientX - rect.left) / rect.width) * 100
                                )
                              );
                              const effectiveQuantity =
                                groupedItem.workItem.quantity || 0;
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
                            };

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              moveEvent.preventDefault();
                              updateValue(moveEvent.clientX);
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener(
                                "mousemove",
                                handleMouseMove
                              );
                              document.removeEventListener(
                                "mouseup",
                                handleMouseUp
                              );
                              document.body.style.userSelect = "";
                            };

                            document.body.style.userSelect = "none";
                            document.addEventListener(
                              "mousemove",
                              handleMouseMove
                            );
                            document.addEventListener("mouseup", handleMouseUp);

                            // Set initial value
                            updateValue(e.clientX);
                          }}
                        >
                          <div
                            className="h-full bg-blue-500 rounded-lg pointer-events-none"
                            style={{
                              width: `${Math.min(
                                100,
                                ((localProgress.get(groupedItem.workItem.id) ||
                                  0) /
                                  (groupedItem.workItem.quantity || 1)) *
                                  100
                              )}%`,
                            }}
                          />
                          <div
                            className="absolute top-1/2 transform -translate-y-1/2"
                            style={{
                              left: `calc(${Math.min(
                                100,
                                ((localProgress.get(groupedItem.workItem.id) ||
                                  0) /
                                  (groupedItem.workItem.quantity || 1)) *
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
            {images.map((img, idx) => (
              <div key={img} className="relative group">
                <img
                  src={img}
                  alt={`napló kép ${idx + 1}`}
                  className="w-32 h-32 object-cover rounded-lg shadow cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setCurrentImageIndex(idx);
                    setSelectedImage(img);
                  }}
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
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 transition">
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

        {/* Group Approval Checkbox - Only for Super Users and Tenants */}
        {(isSuperUser || isTenant) &&
          diary.workDiaryItems &&
          diary.workDiaryItems.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="groupApproval"
                    checked={groupApprovalStatus?.allApproved || false}
                    onChange={handleGroupApprovalToggle}
                    disabled={groupApprovalLoading}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="groupApproval"
                    className="text-sm font-medium text-gray-700"
                  >
                    Jóváhagyás
                  </label>
                </div>
                {groupApprovalStatus?.someApproved &&
                  !groupApprovalStatus?.allApproved && (
                  <p className="text-xs text-amber-600 mt-2">
                    Részben jóváhagyva - kattintson a teljes jóváhagyáshoz
                  </p>
                )}
                {groupApprovalStatus?.allApproved && (
                  <p className="text-xs text-green-600 mt-2">
                    Minden elem jóváhagyva
                  </p>
                )}
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between">
          <div>
            {/* Delete Button - Only for Super Users and Tenants */}
            {(isSuperUser || isTenant) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    Törlés...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Törlés
                  </div>
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
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
                isSubmitting ||
                isDeleting
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Frissítés...
                </div>
              ) : (
                "Mentés"
              )}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Törlés
                  </h3>
                  <p className="text-sm text-gray-500">
                    Biztosan törölni szeretné ezt a napló bejegyzést?
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Figyelem:</strong> Ez a művelet nem visszavonható. Az
                  összes kapcsolódó napló bejegyzés véglegesen törlődik.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Mégsem
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteGroup}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Törlés...
                    </div>
                  ) : (
                    "Igen, törlöm"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Image Gallery Modal */}
      {selectedImage && images.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ×
            </button>

            {/* Previous Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : images.length - 1;
                  setCurrentImageIndex(newIndex);
                  setSelectedImage(images[newIndex]);
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ‹
              </button>
            )}

            {/* Next Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = currentImageIndex < images.length - 1 ? currentImageIndex + 1 : 0;
                  setCurrentImageIndex(newIndex);
                  setSelectedImage(images[newIndex]);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ›
              </button>
            )}

            {/* Main Image */}
            <img
              src={images[currentImageIndex]}
              alt={`Kép ${currentImageIndex + 1} / ${images.length}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className={`w-16 h-16 object-cover rounded cursor-pointer transition-opacity ${
                      idx === currentImageIndex ? 'opacity-100 ring-2 ring-white' : 'opacity-50 hover:opacity-80'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                      setSelectedImage(img);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
