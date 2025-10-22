"use client";
import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { removeGeneralWorkerFromWork } from "@/actions/workitemworker-actions";
import { Trash2 } from "lucide-react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import type {
  WorkItem,
  Worker,
  WorkItemWorker,
  Professional,
} from "@/types/work";

export interface GeneralWorkerFromDB {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  workerId: number | null;
  workItemId: number | null;
  quantity: number | null;
  avatarUrl: string | null;
  worker: {
    workId: number;
  } | null;
}

interface WorkerFromJSON {
  workforceRegistryId?: number;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

interface Props {
  workId: number;
  workItems: WorkItem[];
  workers: Worker[]; // Worker rows for this work (professions)
  generalWorkersFromDB?: GeneralWorkerFromDB[]; // General workers from workItemWorkers table (workItemId = null)
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

const WorkersSummary: React.FC<Props> = ({
  workId,
  workItems,
  workers,
  generalWorkersFromDB = [],
  showAllWorkItems = false,
}) => {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    workerId: number;
    workerName: string;
  }>({
    isOpen: false,
    workerId: 0,
    workerName: "",
  });

  const handleRemoveGeneralWorker = (
    workItemWorkerId: number,
    workerName: string
  ) => {
    setConfirmDialog({
      isOpen: true,
      workerId: workItemWorkerId,
      workerName: workerName,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await removeGeneralWorkerFromWork(confirmDialog.workerId, workId);
      setConfirmDialog({ isOpen: false, workerId: 0, workerName: "" });
      router.refresh();
    } catch (error) {
      console.error("Hiba a munkás törlése során:", error);
      setConfirmDialog({ isOpen: false, workerId: 0, workerName: "" });
    }
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, workerId: 0, workerName: "" });
  };

  // Filter work items based on showAllWorkItems flag
  const activeWorkItemIds = useMemo(
    () =>
      showAllWorkItems
        ? workItems.map((w) => w.id)
        : workItems.filter((w) => w.inProgress).map((w) => w.id),
    [workItems, showAllWorkItems]
  );

  // Show assignments from active workItems (based on showAllWorkItems flag)
  // Also include general workers (workItemId = null) that belong to this work
  const assignments = useMemo(() => {
    // Get assignments from specific workItems
    const workItemAssignments = workItems
      .filter((wi) => showAllWorkItems || wi.inProgress)
      .flatMap((wi) =>
        (wi.workItemWorkers ?? []).map((w) => ({ ...w }) as AssignmentEx)
      );

    // Get general workers (workItemId = null) for this work
    const generalWorkers = workers
      .filter((w) => w.workItemId === null)
      .flatMap((w) => {
        try {
          const workersArray = w.workers ? JSON.parse(w.workers as string) : [];
          return workersArray.map(
            (worker: WorkerFromJSON) =>
              ({
                id: worker.workforceRegistryId || 0,
                workerId: w.id,
                workItemId: null,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                role: w.name,
                quantity: 1,
                avatarUrl: worker.avatarUrl,
              }) as AssignmentEx
          );
        } catch (e) {
          console.log(e)
          return [];
        }
      });

    return [...workItemAssignments, ...generalWorkers];
  }, [workItems, workers, showAllWorkItems]);

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
    // Fallback: from workers list
    const names = Array.from(
      new Set(workers.map((w) => w.name || "Ismeretlen").filter(Boolean))
    );
    return names.sort((a, b) => a.localeCompare(b, "hu"));
  }, [requiredPerProfession, workers]);

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

  return (
    <div className="relative bg-white rounded-xl shadow-sm px-5 py-3 mb-5">
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

      <div className="flex flex-col gap-3 max-h=[calc(100vh-250px)] overflow-y-auto pb-4">
        {professions.length === 0 && (
          <span className="text-[#bbb]">Nincs szükség meghatározva</span>
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

          return (
            <div key={role}>
              <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex-2 font-semibold">{role}</div>
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="font-semibold text-[14px] text-[#222]">
                      {Math.min(list.length, required)} / {displayDenom}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {list.map((w) => {
                    const hasData = !!(w && (w.name || w.email));
                    if (hasData) {
                      return (
                        <div
                          key={`${role}-filled-${w.id}`}
                          className="flex items-center bg-white rounded border border-[#eee] px-3 py-2 w-full"
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
                    return null;
                  })}
                  {list.length === 0 && (
                    <div className="text-[#bbb] text-[14px] italic px-3 py-2">
                      Nincs hozzárendelt munkás
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* General Workers Section */}
        {generalWorkersFromDB.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="font-bold text-[16px] mb-3 text-gray-700">
              Általános munkások
            </div>
            {(() => {
              // Group general workers by role
              const generalByRole: Record<string, GeneralWorkerFromDB[]> = {};
              generalWorkersFromDB.forEach((worker) => {
                const role = worker.role || "Ismeretlen";
                if (!generalByRole[role]) generalByRole[role] = [];
                generalByRole[role].push(worker);
              });

              return Object.entries(generalByRole).map(([role, workers]) => (
                <div key={`general-${role}`} className="mb-3">
                  <div className="bg-[#f0f8ff] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex-2 font-semibold text-blue-700">
                        {role}
                      </div>
                      <div className="text-[14px] text-blue-600 font-medium">
                        {workers.length} fő
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {workers.map((worker, idx) => (
                        <div
                          key={`${role}-general-${worker.id || idx}`}
                          className="flex items-center bg-white rounded border border-blue-200 px-3 py-2 w-full"
                        >
                          <div className="flex items-center gap-2">
                            <Image
                              src={worker.avatarUrl || "/worker.jpg"}
                              alt={worker.name ?? ""}
                              width={28}
                              height={28}
                              className="rounded-full object-cover border border-blue-200"
                            />
                            <div className="text-[14px] text-[#333] font-medium">
                              {worker.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="text-[13px] text-[#555] truncate max-w-[120px]">
                              {worker.email || ""}
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveGeneralWorker(
                                  worker.id,
                                  worker.name || "Névtelen munkás"
                                )
                              }
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Munkás eltávolítása"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Munkás eltávolítása"
        description={`Biztosan el szeretnéd távolítani ${confirmDialog.workerName || "ezt a"} munkást az általános munkások közül?`}
      />
    </div>
  );
};

export default WorkersSummary;
