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
import { useWorkerSlotsStore } from "@/store/useWorkerSlotsStore";

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
  // Show assignments from active workItems (based on showAllWorkItems flag)
  const initialAssignments = useMemo(
    () =>
      workItems
        .filter((wi) => showAllWorkItems || wi.inProgress)
        .flatMap((wi) =>
          (wi.workItemWorkers ?? []).map((w) => ({ ...w }) as AssignmentEx)
        ),
    [workItems, showAllWorkItems]
  );

  const [assignments, setAssignments] =
    useState<AssignmentEx[]>(initialAssignments);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLock, setAddLock] = useState<{
    role?: string;
    workItemId?: number;
  } | null>(null);
  const [editAssignment, setEditAssignment] = useState<WorkerAssignment | null>(
    null
  );

  // Build required slots per profession from active workItems
  // Only show roles that are actually needed by active workItems
  const requiredPerProfession: Record<string, number> = useMemo(() => {
    const byRole: Record<string, number> = {};
    const activeItems = workItems.filter(
      (wi) => showAllWorkItems || wi.inProgress
    );

    // Collect all required roles from active workItems
    for (const wi of activeItems) {
      // From workItemWorkers
      for (const wiw of wi.workItemWorkers ?? []) {
        const worker = workers.find((w) => w.id === wiw.workerId);
        if (worker) {
          const role = worker.name || "Ismeretlen";
          const quantity = typeof wiw.quantity === "number" ? wiw.quantity : 1;
          byRole[role] = Math.max(byRole[role] || 0, quantity);
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
          byRole[rp.type] = Math.max(byRole[rp.type] || 0, quantity);
        }
      }
    }

    return byRole;
  }, [workItems, workers, showAllWorkItems]);

  const { slots, setSlots, addSlot, removeSlot } = useWorkerSlotsStore();

  // Initialize the store with the calculated required slots
  React.useEffect(() => {
    if (Object.keys(requiredPerProfession).length > 0) {
      setSlots(requiredPerProfession);
    }
  }, [requiredPerProfession, setSlots]);

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
      // Include workers from active workItems (based on showAllWorkItems flag)
      const list: AssignmentEx[] = items
        .filter((wi) => showAllWorkItems || wi.inProgress)
        .flatMap(
          (wi: WorkItem) => wi.workItemWorkers ?? ([] as AssignmentEx[])
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
      // Validate that workItemId is provided
      if (data.workItemId === null) {
        toast.error("Munkafázis kiválasztása kötelező!");
        return;
      }

      // Check if a worker with this email already exists in the workforce
      const workforce = await getWorkforce();
      const existingWorker = workforce.find((w) => w.email === data.email);
      if (existingWorker) {
        // Worker exists, just assign to work item and work
        await assignWorkerToWorkItemAndWork({
          workId,
          workItemId: data.workItemId,
          workerId: existingWorker.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          profession: data.profession,
          avatarUrl: data.avatarUrl,
          quantity: 1,
        });
      } else {
        // Worker doesn't exist, add to workforce first then assign
        await addWorkerToRegistryAndAssign({
          workId,
          workItemId: data.workItemId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          profession: data.profession,
          avatarUrl: data.avatarUrl,
          quantity: 1,
        });
      }

      toast.success("Munkás regisztrálva és hozzárendelve!");
      await refreshAssignments();
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

  // Group assignments by role (profession). Prefer the best workItem per role,
  // but if azon a tételen nincs hozzárendelés, essünk vissza az összes hozzárendelésre.
  const grouped = useMemo(() => {
    const allByRole: Record<string, AssignmentEx[]> = {};
    for (const a of assignments) {
      const key = a.role || "Ismeretlen";
      const hasData = Boolean(a.name) || Boolean(a.email);
      if (!hasData) continue;
      if (!allByRole[key]) allByRole[key] = [];
      allByRole[key].push(a);
    }

    // Return all assignments grouped by role, don't filter by workItemId
    return allByRole;
  }, [assignments, roleBestWorkItemId]);

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
          return sum + Math.min(list.length, requiredPerProfession[role] || 0);
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

      <div className="flex flex-col gap-3 max-h=[calc(100vh-250px)] overflow-y-auto pb-20">
        {professions.length === 0 && (
          <span className="text-[#bbb]">Nincs folyamatban munkafázis</span>
        )}
        {professions.map((role) => {
          const required = requiredPerProfession[role] || 0;
          const list = grouped[role] || []; // Only show workItemWorker connections
          // Use per-role denominator from best work item; fallback to required if missing/zero
          const rawDenom = denominatorRequiredPerProfession[role] as
            | number
            | undefined;
          const displayDenom =
            typeof rawDenom === "number" && rawDenom > 0 ? rawDenom : required;
          const slotCount = slots[role] ?? required;
          const slotArray = Array.from({ length: slotCount });
          return (
            <div key={role}>
              <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex-2 font-semibold">{role}</div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => addSlot(role)}
                      className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="font-semibold text-[14px] text-[#222]">
                      {Math.min(list.length, required)} / {displayDenom}
                    </div>
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
                          className="flex items-center bg-white rounded border border-[#eee] px-3 py-2 cursor-pointer hover:bg-[#fafafa] w-full"
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
                          <div className="flex items-center gap-2">
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
                          <div className="ml-auto text-[13px] text-[#555] truncate max-w-[55%]">
                            {w.email || ""}
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
                            setAddLock({ role });
                            setIsAddOpen(true);
                          }}
                          title={role}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSlot(role)}
                          className="px-2 py-2 rounded-r border border-dashed border-l-0 border-[#aaa] bg-[#fafbfc] hover:bg-red-100"
                          title="Slot törlése"
                        >
                          <Trash2 className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkersSlotsSection;
