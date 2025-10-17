"use client";
import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import type {
  WorkItem,
  Worker,
  WorkItemWorker,
  Professional,
} from "@/types/work";

import { Plus, Trash2} from "lucide-react";
import { toast } from "sonner";
import WorkerAddModal from "./WorkerAddModal";
import WorkerEditModal, { WorkerAssignment } from "./WorkerEditModal";
import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  updateWorkItemWorker,
  deleteWorkItemWorker,
} from "@/actions/update-workitemworker";
import { addWorkerToRegistryAndAssign } from "@/actions/add-worker-to-registry-and-assign";
import { removeWorkersFromWorkItem } from "@/actions/remove-workers-from-workitem";
import WorkerRemoveModal from "./WorkerRemoveModal";
import { useActiveWorkersStore } from "@/stores/active-workers-store";
import { updateWorkMaxRequiredWorkers } from "@/actions/update-work-maxrequired";

interface Props {
  workId: number;
  workItems: WorkItem[];
  workers: Worker[]; // Worker rows for this work (professions)
  showAllWorkItems?: boolean; // If true, treat all workItems as active (for works/[id] page)
  maxRequiredWorkers?: number | null; // Manual override for slot count
}

// Extend WorkItemWorker with optional fields that can be present from the API/DB
type AssignmentEx = WorkItemWorker & {
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

// Type guard for Professional in WorkItem.requiredProfessionals (unknown on the base type)
function isProfessional(obj: unknown): obj is Professional {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return typeof o.type === "string" && typeof o.quantity === "number";
}

function getRequiredProfessionals(item: WorkItem): Professional[] {
  const raw = (item as unknown as { requiredProfessionals?: unknown })
    .requiredProfessionals;
  if (Array.isArray(raw)) {
    return raw.filter(isProfessional);
  }
  return [];
}

// Registry entry shape stored in Worker.workers (unknown by default)
// type RegistryEntry = {
//   id?: number;
//   workItemId?: number;
//   name?: string | null;
//   email?: string | null;
//   phone?: string | null;
//   profession?: string | null;
//   avatarUrl?: string | null;
// };

// function isRegistryEntry(obj: unknown): obj is RegistryEntry {
//   if (!obj || typeof obj !== "object") return false;
//   const o = obj as Record<string, unknown>;
//   const okId = o.id === undefined || typeof o.id === "number";
//   const okWorkItemId = o.workItemId === undefined || typeof o.workItemId === "number";
//   const okName = o.name === undefined || typeof o.name === "string";
//   const okEmail = o.email === undefined || typeof o.email === "string";
//   const okPhone = o.phone === undefined || typeof o.phone === "string";
//   return okId && okWorkItemId && okName && okEmail && okPhone;
// }

function WorkersSlotsSectionWithoutRoles({
  workId,
  workItems,
  workers,
  showAllWorkItems = false,
  maxRequiredWorkers,
}: Props) {
  // Local state for dynamic slot count updates - default to 1
  const [localMaxRequiredWorkers, setLocalMaxRequiredWorkers] = useState<
    number | null
  >(maxRequiredWorkers ?? 1);

  // Update local state when prop changes
  useEffect(() => {
    setLocalMaxRequiredWorkers(maxRequiredWorkers ?? 1);
  }, [maxRequiredWorkers]);

  // Filter work items based on showAllWorkItems flag
  const activeWorkItemIds = useMemo(
    () =>
      showAllWorkItems
        ? workItems.map((w) => w.id)
        : workItems.filter((w) => w.inProgress).map((w) => w.id),
    [workItems, showAllWorkItems]
  );
  // Load assignments directly from workItemWorker table for this workId
  const [assignments, setAssignments] = useState<AssignmentEx[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setActiveWorkers, setWorkerHours, clearActiveWorkers } =
    useActiveWorkersStore();

  React.useEffect(() => {
    const loadWorkItemWorkers = async () => {
      setIsLoading(true);
      try {
        const { getWorkItemWorkersForWork } = await import(
          "@/actions/get-workitemworkers-for-work"
        );
        const data = await getWorkItemWorkersForWork(workId);
        console.log("=== DEBUG workItemWorkers for workId", workId, "===");
        console.log("Direct workItemWorker query result:", data);
        setAssignments(data || []);
      } catch (error) {
        console.error("Error loading workItemWorkers:", error);
        setAssignments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkItemWorkers();
  }, [workId]);

  useEffect(() => {
    // Clear the store whenever the active work items change
    clearActiveWorkers();
  }, [activeWorkItemIds, workId, clearActiveWorkers]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLock, setAddLock] = useState<{
    role?: string;
    workItemId?: number;
  } | null>(null);
  const [editAssignment, setEditAssignment] = useState<WorkerAssignment | null>(
    null
  );

  console.log(addLock)

  // No automatic calculation - slots are manually managed
  // totalRequiredWorkers is always 0 (not calculated from workItems)

  // Determine effective slot count: use localMaxRequiredWorkers (default 1)
  const effectiveSlotCount = useMemo(() => {
    return localMaxRequiredWorkers ?? 1;
  }, [localMaxRequiredWorkers]);

  // No automatic saving of calculated values - slots are manually managed

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedRoleForRemoval, setSelectedRoleForRemoval] =
    useState<string>("");

console.log(setSelectedRoleForRemoval)

  const handleRemoveFromWorkItem = async (workItemId: number) => {
    await removeWorkersFromWorkItem(workItemId, selectedRoleForRemoval);
    await refreshAssignments();
  };

  // Handle slot count changes
  const handleIncreaseSlots = async () => {
    const currentCount = localMaxRequiredWorkers || 0;
    const newCount = currentCount + 1;

    // Update local state immediately for instant UI feedback
    setLocalMaxRequiredWorkers(newCount);

    try {
      await updateWorkMaxRequiredWorkers(workId, newCount);
      toast.success(`Munkások száma bővítve: ${newCount}`);
    } catch (error) {
      console.error("Failed to increase slots:", error);
      toast.error("Hiba történt a munkások számának bővítése közben");
      // Revert local state on error
      setLocalMaxRequiredWorkers(currentCount);
    }
  };

  const handleDecreaseSlots = async () => {
    const currentCount = localMaxRequiredWorkers ?? 0;
    const assignedCount = allAssignments.length;

    if (currentCount <= assignedCount) {
      toast.error(
        "Nem lehet kevesebb hely, mint a hozzárendelt munkások száma"
      );
      return;
    }

    if (currentCount <= 0) {
      toast.error("Nem lehet negatív slot szám");
      return;
    }

    const newCount = currentCount - 1;

    // Update local state immediately for instant UI feedback
    setLocalMaxRequiredWorkers(newCount);

    try {
      await updateWorkMaxRequiredWorkers(workId, newCount);
      toast.success(`Munkások száma csökkentve: ${newCount}`);
    } catch (error) {
      console.error("Failed to decrease slots:", error);
      toast.error("Hiba történt a munkások számának csökkentése közben");
      // Revert local state on error
      setLocalMaxRequiredWorkers(currentCount);
    }
  };

  // ALL worker types from the entire work (for WorkerAddModal)
  const allProfessionsFromWork = useMemo(() => {
    const allRoles = new Set<string>();

    // Add roles from all workItems (not just active ones)
    for (const wi of workItems) {
      // From workItemWorkers
      for (const wiw of wi.workItemWorkers ?? []) {
        const worker = workers.find((w) => w.id === wiw.workerId);
        if (worker) {
          const role = worker.name || "Ismeretlen";
          allRoles.add(role);
        }
      }

      // From requiredProfessionals if available
      const requiredProfs = getRequiredProfessionals(wi);
      for (const rp of requiredProfs) {
        if (rp.type) {
          allRoles.add(rp.type);
        }
      }
    }

    // Add roles from workers list
    for (const w of workers) {
      const role = w.name || "Ismeretlen";
      allRoles.add(role);
    }

    return Array.from(allRoles).sort((a, b) => a.localeCompare(b, "hu"));
  }, [workItems, workers]);

  const refreshAssignments = async () => {
    try {
      const items = await getWorkItemsWithWorkers(workId);
      // Include all workers for this work (not filtered by workItem status)
      const list: AssignmentEx[] = items.flatMap(
        (wi) => wi.workItemWorkers ?? ([] as AssignmentEx[])
      );
      setAssignments(list);
    } catch (err) {
      console.error(err);
      toast.error("Nem sikerült frissíteni a munkások listáját!");
    }
  };

  const handleAdd = async (data: {
    name: string;
    email: string;
    phone: string;
    profession: string;
    workItemId: number | null;
    avatarUrl?: string;
    dailyRate?: number;
  }) => {
    try {
      // Always set workItemId to null - workers are assigned to work, not specific workItems
      const workItemId = null;

      // Always use addWorkerToRegistryAndAssign - let server decide about duplicates
      await addWorkerToRegistryAndAssign({
        workId,
        workItemId, // Always null
        name: data.name,
        email: data.email,
        phone: data.phone,
        profession: data.profession,
        avatarUrl: data.avatarUrl,
        dailyRate: data.dailyRate,
        quantity: 1,
      });

      toast.success("Munkás regisztrálva és hozzárendelve!");

      // Reload assignments from server using the new server action
      const { getWorkItemWorkersForWork } = await import(
        "@/actions/get-workitemworkers-for-work"
      );
      const workItemWorkerData = await getWorkItemWorkersForWork(workId);
      setAssignments(workItemWorkerData || []);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Hiba történt mentés közben.";
      toast.error(errorMessage);
    }
  };

  const handleEdit = async (data: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    quantity?: number;
    avatarUrl?: string | null;
  }) => {
    try {
      await updateWorkItemWorker(data);
      toast.success("Munkás hozzárendelés frissítve!");
      setEditAssignment(null);
      await refreshAssignments();
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt a frissítés közben.");
    }
  };

  const handleDelete = async ({
    id,
    name,
    email,
    role,
  }: {
    id: number;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  }) => {
    try {
      // 1) Remove from Worker.workers registry by locating parent Worker row
      const assignment = assignments.find((a) => a.id === id);
      const effectiveEmail = (email || assignment?.email || "").trim();
      const effectiveName = (name || assignment?.name || "").trim();
      const effectiveRole = role || assignment?.role || null;
      if (effectiveEmail) {
        try {
          const workerIdFromAssignment = assignment?.workerId as
            | number
            | undefined;
          let parentWorkerId: number | undefined = workerIdFromAssignment;
          if (typeof parentWorkerId !== "number" && effectiveRole) {
            const workerRow = workers.find(
              (w) => (w.name || "") === effectiveRole
            );
            if (workerRow) parentWorkerId = workerRow.id;
          }
          if (typeof parentWorkerId === "number") {
            const { removeWorkerFromJsonArray } = await import(
              "@/actions/works.action"
            );
            await removeWorkerFromJsonArray({
              workerId: parentWorkerId,
              workId,
              name: effectiveName,
              email: effectiveEmail,
            });
          }
        } catch (innerErr) {
          console.warn(
            "Registry removal failed (continuing with assignment delete)",
            innerErr
          );
        }
      }

      // 2) Delete the WorkItemWorker assignment (only if it exists locally)
      if (assignment) {
        await deleteWorkItemWorker(id);
      }
      toast.success("Hozzárendelés törölve!");
      setEditAssignment(null);
      await refreshAssignments();
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt törlés közben.");
    }
  };

  // Simple delete function that only removes workItemWorker record
  const handleDeleteWorkItemWorkerOnly = async (id: number) => {
    // Store current assignments for rollback if needed
    const previousAssignments = [...assignments];
    
    try {
      // Optimistic UI update - remove from local state immediately
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      
      // Delete from server
      await deleteWorkItemWorker(id);
      
      // Reload assignments from server to ensure consistency
      const { getWorkItemWorkersForWork } = await import(
        "@/actions/get-workitemworkers-for-work"
      );
      const data = await getWorkItemWorkersForWork(workId);
      
      // Only update if we got valid data back
      if (data) {
        setAssignments(data);
        toast.success("Munkás eltávolítva!");
      } else {
        // Rollback to previous state if no data returned
        setAssignments(previousAssignments.filter((a) => a.id !== id));
        toast.success("Munkás eltávolítva!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt törlés közben.");
      
      // Rollback to previous state on error
      setAssignments(previousAssignments);
    }
  };

  // Get all assignments for this work (no role grouping)
  const allAssignments = useMemo(() => {
    return assignments.filter((a) => Boolean(a.name) || Boolean(a.email));
  }, [assignments]);

  useEffect(() => {
    const uniqueWorkers = new Map<string, WorkItemWorker>();
    const hoursMap = new Map<string, number>();

    allAssignments.forEach((worker) => {
      const workerName = worker.name || "";
      if (workerName && !uniqueWorkers.has(workerName)) {
        uniqueWorkers.set(workerName, worker);
      }
      // Default to 8 hours if not specified
      hoursMap.set(workerName, 8);
    });

    const activeWorkerList = Array.from(uniqueWorkers.values());
    setActiveWorkers(activeWorkerList);
    setWorkerHours(hoursMap);
  }, [allAssignments, setActiveWorkers, setWorkerHours]);

  // Fallback list built from Worker.workers registry (ParticipantsSection parity)
  // const registryByRole: Record<string, AssignmentEx[]> = useMemo(() => {
  //   const map: Record<string, AssignmentEx[]> = {};
  //   for (const w of workers) {
  //     const role = w.name || "Ismeretlen";
  //     const arrUnknown = w.workers;
  //     const arr: RegistryEntry[] = Array.isArray(arrUnknown)
  //       ? (arrUnknown as unknown[]).filter(isRegistryEntry)
  //       : [];
  //     for (const reg of arr) {
  //       if (!map[role]) map[role] = [];
  //       map[role].push({
  //         id: (reg.id ?? Math.floor(Math.random() * 1_000_000)) as number,
  //         workItemId: reg.workItemId ?? 0,
  //         workerId: w.id,
  //         name: reg.name ?? null,
  //         email: reg.email ?? null,
  //         phone: reg.phone ?? null,
  //         role: (reg.profession as string) ?? role,
  //         avatarUrl: reg.avatarUrl ?? null,
  //         quantity: 1,
  //       });
  //     }
  //   }
  //   return map;
  // }, [workers]);

  return (
    <div className="relative bg-white rounded-xl shadow-sm px-5 py-3 mb-5">
      <WorkerAddModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        workId={workId}
        onSubmit={handleAdd}
        workItems={workItems}
        professions={allProfessionsFromWork} // Always use all professions from work
        workers={workers}
        lockedProfession={undefined} // No profession lock
        lockedWorkItemId={undefined} // No workItem lock
        showAllWorkItems={showAllWorkItems}
      />
      <div className="h-8" />
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-[17px] tracking-[0.5px]">
          Munkások ({allAssignments.length} / {effectiveSlotCount})
        </div>
        <button
          onClick={handleIncreaseSlots}
          className="flex items-center justify-center w-6 h-6 rounded-full border border-[#FF9900] text-[#FF9900] bg-white hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
          title="Slot hozzáadása"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <WorkerEditModal
        open={!!editAssignment}
        onOpenChange={(o) => {
          if (!o) setEditAssignment(null);
        }}
        worker={editAssignment}
        onSubmit={handleEdit}
        onDelete={async (args) => {
          await handleDeleteWorkItemWorkerOnly(args.id);
          setEditAssignment(null);
        }}
      />

      <WorkerRemoveModal
        open={removeModalOpen}
        onOpenChange={setRemoveModalOpen}
        role={selectedRoleForRemoval}
        workItems={workItems}
        onRemove={handleRemoveFromWorkItem}
      />

      <div className="flex flex-col gap-3 max-h=[calc(100vh-250px)] overflow-y-auto pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-[#666] font-medium">Frissítés</span>
            <span className="text-[#888] text-sm">Adatok betöltése</span>
          </div>
        ) : (
          <>
            {/* Simple unified worker list - no role grouping */}
            <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="flex-1 font-semibold">Összes munkás</div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="font-semibold text-[14px] text-[#222]">
                    {allAssignments.length} / {effectiveSlotCount}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {/* Show all assigned workers */}
                {allAssignments.map((w) => (
                  <div
                    key={`worker-${w.id}`}
                    className="flex items-center bg-white rounded border border-[#eee] px-3 py-2 w-full h-12"
                  >
                    <div
                      className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-[#fafafa] rounded px-1 py-1"
                      onClick={() =>
                        setEditAssignment({
                          id: w.id,
                          name: w.name ?? undefined,
                          email: w.email ?? undefined,
                          phone: w.phone ?? undefined,
                          role: w.role ?? undefined,
                          quantity: w.quantity ?? undefined,
                          avatarUrl: w.avatarUrl ?? null,
                        })
                      }
                    >
                      <Image
                        src={w.avatarUrl || "/worker.jpg"}
                        alt={w.name ?? ""}
                        width={28}
                        height={28}
                        className="rounded-full object-cover border border-[#eee]"
                      />
                      <div className="text-[14px] text-[#333] font-medium">
                        {w.name}
                      </div>
                      <div className="text-[12px] text-[#666] ml-2">
                        ({w.role || "Általános"})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkItemWorkerOnly(w.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="Munkás eltávolítása"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Show empty slots for remaining required workers */}
                {Array.from({
                  length: Math.max(
                    0,
                    effectiveSlotCount - allAssignments.length
                  ),
                }).map((_, idx) => (
                  <div
                    key={`empty-slot-${idx}`}
                    className="flex items-center w-full gap-2 h-12"
                  >
                    <button
                      className="flex-grow flex items-center justify-center rounded border border-dashed border-[#aaa] text-[#222] bg-[#fafbfc] hover:bg-[#f5f7fa] px-3 py-2 h-full"
                      onClick={() => {
                        setAddLock(null); // No role lock - general assignment
                        setIsAddOpen(true);
                      }}
                      title="Új munkás hozzáadása"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDecreaseSlots}
                      className="flex items-center justify-center w-12 h-12 rounded border border-red-300 text-red-500 bg-white hover:bg-red-50 hover:border-red-400 hover:text-red-600"
                      title="Slot eltávolítása"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WorkersSlotsSectionWithoutRoles;
