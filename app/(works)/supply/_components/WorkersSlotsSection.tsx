"use client";
import React, { useMemo, useState } from "react";
import Image from "next/image";
import type {
  WorkItem,
  Worker,
  WorkItemWorker,
  Professional,
} from "@/types/work";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import WorkerAddModal from "./WorkerAddModal";
import WorkerEditModal, { WorkerAssignment } from "./WorkerEditModal";
import { getWorkforce } from "@/actions/workforce-actions";
import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  updateWorkItemWorker,
  deleteWorkItemWorker,
} from "@/actions/update-workitemworker";
import { assignWorkerToWorkItemAndWork } from "@/actions/assign-worker-to-workitem-and-work";
import { addWorkerToRegistryAndAssign } from "@/actions/add-worker-to-registry-and-assign";
import { updateWorkersMaxRequiredAction } from "@/actions/update-workers-maxrequired";
import { removeWorkersFromWorkItem } from "@/actions/remove-workers-from-workitem";
import WorkerRemoveModal from "./WorkerRemoveModal";

interface Props {
  workId: number;
  workItems: WorkItem[];
  workers: Worker[]; // Worker rows for this work (professions)
  showAllWorkItems?: boolean; // If true, treat all workItems as active (for works/[id] page)
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
//   const okProfession = o.profession === undefined || typeof o.profession === "string";
//   const okAvatarUrl = o.avatarUrl === undefined || typeof o.avatarUrl === "string";
//   return okId && okWorkItemId && okName && okEmail && okPhone && okProfession && okAvatarUrl;
// }

const WorkersSlotsSection: React.FC<Props> = ({
  workId,
  workItems,
  workers,
  showAllWorkItems = false,
}) => {
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLock, setAddLock] = useState<{
    role?: string;
    workItemId?: number;
  } | null>(null);
  const [editAssignment, setEditAssignment] = useState<WorkerAssignment | null>(
    null
  );

  // Build required slots per profession from active workItems
  // Take maximum requirement per role across all active workItems
  const requiredPerProfession: Record<string, number> = useMemo(() => {
    const byRole: Record<string, number> = {};
    const activeItems = workItems.filter(
      (wi) => showAllWorkItems || wi.inProgress
    );

    // Find maximum requirement per role across all active workItems
    for (const wi of activeItems) {
      const roleQuantities: Record<string, number> = {};

      // From workItemWorkers
      for (const wiw of wi.workItemWorkers ?? []) {
        const worker = workers.find((w) => w.id === wiw.workerId);
        if (worker) {
          const role = worker.name || "Ismeretlen";
          const quantity = typeof wiw.quantity === "number" ? wiw.quantity : 1;
          roleQuantities[role] = (roleQuantities[role] || 0) + quantity;
        }
      }

      // From requiredProfessionals if available
      const requiredProfs = getRequiredProfessionals(wi);
      for (const rp of requiredProfs) {
        if (rp.type) {
          const quantity =
            typeof rp.quantity === "number" && rp.quantity > 0
              ? rp.quantity
              : 1;
          roleQuantities[rp.type] = (roleQuantities[rp.type] || 0) + quantity;
        }
      }

      // Update byRole with maximum values
      for (const [role, quantity] of Object.entries(roleQuantities)) {
        byRole[role] = Math.max(byRole[role] || 0, quantity);
      }
    }

    return byRole;
  }, [workItems, workers, showAllWorkItems]);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedRoleForRemoval, setSelectedRoleForRemoval] =
    useState<string>("");

  const handleRemoveRole = (role: string) => {
    setSelectedRoleForRemoval(role);
    setRemoveModalOpen(true);
  };

  const handleRemoveFromWorkItem = async (workItemId: number) => {
    await removeWorkersFromWorkItem(workItemId, selectedRoleForRemoval);
    await refreshAssignments();
  };

  // Compute per-Worker maximum required quantity across active workItems (mirror of ParticipantsSection)
  const workerIdToMaxNeeded: Record<number, number> = useMemo(() => {
    const map: Record<number, number> = {};
    for (const w of workers) {
      const workerId = w.id;
      let max = 0;
      for (const wi of workItems.filter(
        (wi) => showAllWorkItems || wi.inProgress
      )) {
        const sum = (wi.workItemWorkers ?? [])
          .filter((wiw) => wiw.workerId === workerId)
          .reduce(
            (acc, wiw) =>
              acc + (typeof wiw.quantity === "number" ? wiw.quantity : 1),
            0
          );
        if (sum > max) max = sum;
      }
      map[workerId] = max;
    }
    return map;
  }, [workItems, workers, showAllWorkItems]);

  // Persist latest maxima to the server whenever they change
  React.useEffect(() => {
    updateWorkersMaxRequiredAction(workId, workerIdToMaxNeeded);
    // eslint-disable-next-line
  }, [workId, JSON.stringify(workerIdToMaxNeeded)]);

  // Decide which single workItem's assignments should fill the slots for each role
  // Prefer an in-progress item with the max requirement; if none, fall back to any item with the max
  const roleBestWorkItemId: Record<string, number | undefined> = useMemo(() => {
    const bestAny: Record<string, { count: number; id: number } | undefined> =
      {};
    const bestInProg: Record<
      string,
      { count: number; id: number } | undefined
    > = {};
    const activeIds = new Set(activeWorkItemIds);
    for (const item of workItems) {
      const withinItem: Record<string, number> = {};
      const req = getRequiredProfessionals(item);
      if (req.length > 0) {
        for (const rp of req) {
          const role: string | undefined = rp.type ?? undefined;
          if (!role) continue;
          const qty =
            typeof rp.quantity === "number" && rp.quantity > 0
              ? rp.quantity
              : 1;
          withinItem[role] = (withinItem[role] || 0) + qty;
        }
      } else {
        // Fallback: count by workerId quantities in this item and map to role via workers list
        const byWorkerId: Record<number, number> = {};
        for (const wiw of item.workItemWorkers ?? []) {
          const q = typeof wiw.quantity === "number" ? wiw.quantity : 1;
          const id = wiw.workerId;
          byWorkerId[id] = (byWorkerId[id] || 0) + q;
        }
        for (const w of workers) {
          const role = w.name || "Ismeretlen";
          const cnt = byWorkerId[w.id] || 0;
          if (cnt > 0) withinItem[role] = (withinItem[role] || 0) + cnt;
        }
      }
      for (const role of Object.keys(withinItem)) {
        const count = withinItem[role];
        const currAny = bestAny[role];
        const currIn = bestInProg[role];
        if (!currAny || count > currAny.count)
          bestAny[role] = { count, id: item.id };
        if (activeIds.has(item.id)) {
          if (!currIn || count > currIn.count)
            bestInProg[role] = { count, id: item.id };
        }
      }
    }
    const out: Record<string, number | undefined> = {};
    const roles = new Set<string>([
      ...Object.keys(bestAny),
      ...Object.keys(bestInProg),
    ]);
    for (const role of roles)
      out[role] = (bestInProg[role] ?? bestAny[role])?.id;
    return out;
  }, [workItems, activeWorkItemIds, workers, showAllWorkItems]);

  // Denominator for the header: from the BEST work item per role only.
  // Sum quantities of null-email WorkItemWorkers that belong to that role.
  const denominatorRequiredPerProfession: Record<string, number> =
    useMemo(() => {
      const byRole: Record<string, number> = {};
      // Map workerId -> role name
      const workerIdToRole = new Map<number, string>();
      for (const w of workers) {
        workerIdToRole.set(w.id, w.name || "Ismeretlen");
      }
      // role -> allowed workerIds
      const roleToWorkerIds = new Map<string, Set<number>>();
      for (const [wid, role] of workerIdToRole.entries()) {
        if (!roleToWorkerIds.has(role))
          roleToWorkerIds.set(role, new Set<number>());
        roleToWorkerIds.get(role)!.add(wid);
      }
      const roles = new Set<string>([
        ...Object.keys(requiredPerProfession),
        ...Object.keys(roleBestWorkItemId),
      ]);
      for (const role of roles) {
        const bestId = roleBestWorkItemId[role];
        if (!bestId) {
          byRole[role] = 0;
          continue;
        }
        const item = workItems.find((it) => it.id === bestId);
        if (!item) {
          byRole[role] = 0;
          continue;
        }
        const allowedIds = roleToWorkerIds.get(role) || new Set<number>();
        let sum = 0;
        for (const wiw of item.workItemWorkers ?? []) {
          if (
            (wiw as AssignmentEx).email == null &&
            allowedIds.has(wiw.workerId)
          ) {
            sum += typeof wiw.quantity === "number" ? wiw.quantity : 1;
          }
        }
        byRole[role] = sum;
      }
      return byRole;
    }, [workItems, workers, roleBestWorkItemId, requiredPerProfession]);

  // Show all professions required (source of truth = requiredPerProfession)
  const professions = useMemo(() => {
    const keys = Object.keys(requiredPerProfession);
    if (keys.length > 0) return keys.sort((a, b) => a.localeCompare(b, "hu"));
    // If showAllWorkItems is true (main page), fallback to workers list
    // If showAllWorkItems is false (supply page), show empty if no active workItems
    if (showAllWorkItems) {
      const names = Array.from(
        new Set(workers.map((w) => w.name || "Ismeretlen").filter(Boolean))
      );
      return names.sort((a, b) => a.localeCompare(b, "hu"));
    }
    // Supply page with no active workItems - show empty
    return [];
  }, [requiredPerProfession, workers, showAllWorkItems]);

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
  }) => {
    try {
      // Always set workItemId to null - workers are assigned to work, not specific workItems
      const workItemId = null;

      // Check if a worker with this email already exists in the workforce
      const workforce = await getWorkforce();
      const existingWorker = workforce.find((w) => w.email === data.email);
      if (existingWorker) {
        // Worker exists in workforce registry, but we need to find or create Worker record
        // Find existing Worker record for this profession
        const workerRecord = workers.find((w) => w.name === data.profession);

        if (workerRecord) {
          // Worker record exists, use its ID for assignment
          await assignWorkerToWorkItemAndWork({
            workId,
            workItemId, // Always null
            workerId: workerRecord.id, // Use Worker.id, not workforceRegistry.id
            name: data.name,
            email: data.email,
            phone: data.phone,
            profession: data.profession,
            avatarUrl: data.avatarUrl,
            quantity: 1,
          });
        } else {
          // Worker record doesn't exist for this profession, create it first
          await addWorkerToRegistryAndAssign({
            workId,
            workItemId, // Always null
            name: data.name,
            email: data.email,
            phone: data.phone,
            profession: data.profession,
            avatarUrl: data.avatarUrl,
            quantity: 1,
          });
        }
      } else {
        // Worker doesn't exist, add to workforce first then assign
        await addWorkerToRegistryAndAssign({
          workId,
          workItemId, // Always null
          name: data.name,
          email: data.email,
          phone: data.phone,
          profession: data.profession,
          avatarUrl: data.avatarUrl,
          quantity: 1,
        });
      }

      toast.success("Munkás regisztrálva és hozzárendelve!");

      // Reload assignments from server using the new server action
      const { getWorkItemWorkersForWork } = await import(
        "@/actions/get-workitemworkers-for-work"
      );
      const workItemWorkerData = await getWorkItemWorkersForWork(workId);
      setAssignments(workItemWorkerData || []);
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt mentés közben.");
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
    try {
      await deleteWorkItemWorker(id);
      toast.success("Munkás eltávolítva!");

      // Reload assignments from server
      const { getWorkItemWorkersForWork } = await import(
        "@/actions/get-workitemworkers-for-work"
      );
      const data = await getWorkItemWorkersForWork(workId);
      setAssignments(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt törlés közben.");
    }
  };

  // State to manage dynamic slot counts per role
  const [extraSlots, setExtraSlots] = useState<Record<string, number>>({});
  const [reducedSlots, setReducedSlots] = useState<Record<string, number>>({});

  // Handle adding extra slots for a role
  const handleAddSlot = (role: string) => {
    setExtraSlots(prev => ({
      ...prev,
      [role]: (prev[role] || 0) + 1
    }));
  };

  // Handle removing empty slots dynamically
  const handleRemoveEmptySlot = (role: string, slotIndex: number) => {
    const currentExtra = extraSlots[role] || 0;
    const currentReduced = reducedSlots[role] || 0;
    
    if (currentExtra > 0) {
      // First remove extra slots
      setExtraSlots(prev => ({
        ...prev,
        [role]: Math.max(0, currentExtra - 1)
      }));
    } else {
      // Then allow reducing original required slots (temporarily)
      setReducedSlots(prev => ({
        ...prev,
        [role]: currentReduced + 1
      }));
    }
  };

  // Group all assignments by role (profession) for this work
  const grouped = useMemo(() => {
    const allByRole: Record<string, AssignmentEx[]> = {};
    for (const a of assignments) {
      const key = a.role || "Ismeretlen";
      const hasData = Boolean(a.name) || Boolean(a.email);
      if (!hasData) continue;
      if (!allByRole[key]) allByRole[key] = [];
      allByRole[key].push(a);
    }

    // Return all assignments grouped by role - no workItem filtering
    return allByRole;
  }, [assignments]);

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
        professions={professions}
        lockedProfession={addLock?.role}
        lockedWorkItemId={addLock?.workItemId}
        showAllWorkItems={showAllWorkItems}
      />
      <Button
        onClick={() => {
          setAddLock(null);
          setIsAddOpen(true);
        }}
        variant="outline"
        aria-label="Új munkás hozzáadása"
        className="absolute top-[14px] right-[18px] rounded-full border border-[#FF9900] text-[#FF9900] bg-white z-20 hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900] w-9 h-9 p-0 flex items-center justify-center"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <div className="h-8" />
      <div className="font-bold text-[17px] mb-2 tracking-[0.5px]">
        Munkások (
        {professions.reduce((sum, role) => {
          const list = grouped[role] || [];
          return sum + list.length;
        }, 0)}
        {" / "}
        {professions.reduce(
          (s, role) => s + (denominatorRequiredPerProfession[role] || 0),
          0
        )}
        )
      </div>

      <WorkerEditModal
        open={!!editAssignment}
        onOpenChange={(o) => {
          if (!o) setEditAssignment(null);
        }}
        worker={editAssignment}
        onSubmit={handleEdit}
        onDelete={async (args) => handleDelete(args)}
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
            <span className="text-[#666] font-medium">R.A.G. frissítés</span>
            <span className="text-[#888] text-sm">Augmented context update</span>
          </div>
        ) : (
          <>
            {professions.length === 0 && (
              <span className="text-[#bbb]">Nincs folyamatban munkafázis</span>
            )}
            {professions.map((role) => {
          const required = requiredPerProfession[role] || 0;
          const list = grouped[role] || []; // Only show workItemWorker connections
          // Use per-role denominator from best work item; fallback to required if missing/zero
          // const rawDenom = denominatorRequiredPerProfession[role] as
          //   | number
          //   | undefined;
          // const displayDenom =
          //   typeof rawDenom === "number" && rawDenom > 0 ? rawDenom : required;
          // Use the maximum of required workers and actually assigned workers to ensure all assigned workers are visible
          const assignedCount = list.length;
          const extraSlotCount = extraSlots[role] || 0;
          const reducedSlotCount = reducedSlots[role] || 0;
          const effectiveRequired = Math.max(0, required - reducedSlotCount);
          const slotCount = Math.max(effectiveRequired, assignedCount) + extraSlotCount;
          const slotArray = Array.from({ length: slotCount });
          return (
            <div key={role}>
              <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 font-semibold flex items-center gap-2">
                    {role}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRole(role);
                      }}
                      className="text-red-500 hover:text-red-700"
                      title={`${role} eltávolítása munkafázisból`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="font-semibold text-[14px] text-[#222]">
                      {list.length} / {required}
                    </div>
                    <button
                      onClick={() => {
                        handleAddSlot(role);
                      }}
                      className="text-orange-500 hover:text-orange-700 p-1 rounded hover:bg-orange-50"
                      title="Slot hozzáadása"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {slotArray.map((_, idx) => {
                    const w = list[idx] as AssignmentEx | undefined;
                    const hasData = !!(w && (w.name || w.email));
                    if (hasData) {
                      return (
                        <div
                          key={`${role}-filled-${w.id}`}
                          className="flex items-center bg-white rounded border border-[#eee] px-3 py-2 w-full"
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
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[13px] text-[#555] truncate max-w-[120px]">
                              {w.email || ""}
                            </div>
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
                      );
                    }
                    return (
                      <div
                        key={`${role}-empty-${idx}`}
                        className="flex items-center w-full"
                      >
                        <button
                          className="flex-grow flex items-center justify-center rounded-l border border-dashed border-[#aaa] text-[#222] bg-[#fafbfc] hover:bg-[#f5f7fa] px-3 py-2"
                          onClick={() => {
                            setAddLock({ role, workItemId: undefined }); // Always undefined workItemId
                            setIsAddOpen(true);
                          }}
                          title={role}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Remove this empty slot from view
                            handleRemoveEmptySlot(role, idx);
                          }}
                          className="text-red-500 hover:text-red-700 p-2 rounded-r border border-l-0 border-dashed border-[#aaa] bg-[#fafbfc] hover:bg-red-50"
                          title="Üres slot eltávolítása"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkersSlotsSection;
