"use client";
import React, { useMemo, useState } from "react";
import type { WorkItem, Worker, WorkItemWorker } from "@/types/work";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import WorkerAddModal from "./WorkerAddModal";
import WorkerEditModal, { WorkerAssignment } from "./WorkerEditModal";
import { getWorkforce, addWorkforceMember } from "@/actions/workforce-actions";
import { updateWorkerJsonArray } from "@/actions/update-worker-json-array";
import { assignWorkerToWorkItem } from "@/actions/assign-worker-to-workitem";
import { getWorkItemsWithWorkers } from "@/actions/work-actions";
import {
  updateWorkItemWorker,
  deleteWorkItemWorker,
} from "@/actions/update-workitemworker";
import { updateWorkersMaxRequiredAction } from "@/actions/update-workers-maxrequired";

interface Props {
  workId: number;
  workItems: WorkItem[];
  workers: Worker[]; // Worker rows for this work (professions)
}

const WorkersSlotsSection: React.FC<Props> = ({
  workId,
  workItems,
  workers,
}) => {
  // Only in-progress work items
  const inProgressWorkItemIds = useMemo(
    () => workItems.filter((w) => w.inProgress).map((w) => w.id),
    [workItems]
  );
  // We want to SEE assignments regardless of inProgress (UI parity with front page)
  const initialAssignments = useMemo(
    () =>
      workItems.flatMap((wi) =>
        (wi.workItemWorkers ?? []).map((w) => ({ ...w }))
      ),
    [workItems]
  );

  const [assignments, setAssignments] =
    useState<WorkItemWorker[]>(initialAssignments);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addLock, setAddLock] = useState<{
    role?: string;
    workItemId?: number;
  } | null>(null);
  const [editAssignment, setEditAssignment] = useState<WorkerAssignment | null>(
    null
  );

  // Build required slots per profession EXACTLY like ParticipantsSection:
  // derive from workItemWorkers per workerId -> per-item SUM, then across items MAX; min 1.
  const requiredPerProfession: Record<string, number> = useMemo(() => {
    const byRole: Record<string, number> = {};
    for (const w of workers as any[]) {
      const role = (w?.name as string) || "Ismeretlen";
      let maxForThisWorker = 0;
      for (const wi of workItems as any[]) {
        const sum = ((wi?.workItemWorkers ?? []) as any[])
          .filter((wiw) => wiw?.workerId === w?.id)
          .reduce(
            (acc, wiw) =>
              acc + (typeof wiw?.quantity === "number" ? wiw.quantity : 1),
            0
          );
        if (sum > maxForThisWorker) maxForThisWorker = sum;
      }
      const needed = Math.max(maxForThisWorker, 1);
      byRole[role] = Math.max(byRole[role] || 0, needed);
    }
    return byRole;
  }, [workItems, workers]);

  // Compute per-Worker maximum required quantity across all workItems (mirror of ParticipantsSection)
  const workerIdToMaxNeeded: Record<number, number> = useMemo(() => {
    const map: Record<number, number> = {};
    for (const w of workers as any[]) {
      const workerId = (w as any)?.id as number | undefined;
      if (typeof workerId !== "number") continue;
      let max = 0;
      for (const wi of workItems as any[]) {
        const sum = ((wi?.workItemWorkers ?? []) as any[])
          .filter((wiw) => wiw?.workerId === workerId)
          .reduce(
            (acc, wiw) =>
              acc + (typeof wiw?.quantity === "number" ? wiw.quantity : 1),
            0
          );
        if (sum > max) max = sum;
      }
      map[workerId] = max;
    }
    return map;
  }, [workItems, workers]);

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
    const inProgIds = new Set(inProgressWorkItemIds);
    for (const item of workItems as any[]) {
      const withinItem: Record<string, number> = {};
      const req = Array.isArray((item as any)?.requiredProfessionals)
        ? (item as any).requiredProfessionals
        : [];
      if (req.length > 0) {
        for (const rp of req) {
          const role: string | undefined = (rp?.type ?? undefined) as any;
          if (!role) continue;
          const qty =
            typeof rp?.quantity === "number" && rp.quantity > 0
              ? rp.quantity
              : 1;
          withinItem[role] = (withinItem[role] || 0) + qty;
        }
      } else {
        // Fallback: count by workerId quantities in this item and map to role via workers list
        const byWorkerId: Record<number, number> = {};
        for (const wiw of ((item as any)?.workItemWorkers ?? []) as any[]) {
          const q = typeof wiw?.quantity === "number" ? wiw.quantity : 1;
          const id = wiw?.workerId;
          if (typeof id === "number")
            byWorkerId[id] = (byWorkerId[id] || 0) + q;
        }
        for (const w of workers as any[]) {
          if (!w?.id) continue;
          const role = (w?.name as string) || "Ismeretlen";
          const cnt = byWorkerId[w.id] || 0;
          if (cnt > 0) withinItem[role] = (withinItem[role] || 0) + cnt;
        }
      }
      for (const role of Object.keys(withinItem)) {
        const count = withinItem[role];
        const currAny = bestAny[role];
        const currIn = bestInProg[role];
        if (!currAny || count > currAny.count)
          bestAny[role] = { count, id: (item as any).id };
        if (inProgIds.has((item as any).id)) {
          if (!currIn || count > currIn.count)
            bestInProg[role] = { count, id: (item as any).id };
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
  }, [workItems, inProgressWorkItemIds, workers]);

  // Denominator for the header: from the BEST work item per role only.
  // Sum quantities of null-email WorkItemWorkers that belong to that role.
  const denominatorRequiredPerProfession: Record<string, number> = useMemo(() => {
    const byRole: Record<string, number> = {};
    // Map workerId -> role name
    const workerIdToRole = new Map<number, string>();
    for (const w of workers as any[]) {
      if (typeof (w as any)?.id === "number") {
        workerIdToRole.set((w as any).id, (w?.name as string) || "Ismeretlen");
      }
    }
    // role -> allowed workerIds
    const roleToWorkerIds = new Map<string, Set<number>>();
    for (const [wid, role] of workerIdToRole.entries()) {
      if (!roleToWorkerIds.has(role)) roleToWorkerIds.set(role, new Set<number>());
      roleToWorkerIds.get(role)!.add(wid);
    }
    const roles = new Set<string>([
      ...Object.keys(requiredPerProfession),
      ...Object.keys(roleBestWorkItemId),
    ]);
    for (const role of roles) {
      const bestId = roleBestWorkItemId[role];
      if (!bestId) { byRole[role] = 0; continue; }
      const item = (workItems as any[]).find((it) => (it as any)?.id === bestId);
      if (!item) { byRole[role] = 0; continue; }
      const allowedIds = roleToWorkerIds.get(role) || new Set<number>();
      let sum = 0;
      for (const wiw of (((item as any)?.workItemWorkers ?? []) as any[])) {
        if (wiw?.email == null && typeof wiw?.workerId === "number" && allowedIds.has(wiw.workerId)) {
          sum += typeof wiw?.quantity === "number" ? wiw.quantity : 1;
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
      new Set(
        (workers as any[])
          .map((w) => (w?.name as string) || "Ismeretlen")
          .filter(Boolean)
      )
    );
    return names.sort((a, b) => a.localeCompare(b, "hu"));
  }, [requiredPerProfession, workers]);

  const refreshAssignments = async () => {
    try {
      const items = await getWorkItemsWithWorkers(workId);
      const list: WorkItemWorker[] = items.flatMap(
        (wi: any) => wi.workItemWorkers ?? []
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
    workItemId: number;
    avatarUrl?: string;
  }) => {
    try {
      // 1) Find or create workforce registry member
      const all = await getWorkforce();
      let member = all.find(
        (m) =>
          m.email?.toLowerCase() === data.email.toLowerCase() &&
          m.name?.toLowerCase() === data.name.toLowerCase()
      );
      if (!member) {
        member = await addWorkforceMember({
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.profession,
          avatarUrl: data.avatarUrl,
        });
      }

      // 2) Find the Worker row (profession) for this work
      const workerRow = workers.find(
        (w) => w.name === (member?.role || data.profession)
      );
      if (!workerRow || typeof workerRow.id !== "number") {
        toast.error(
          "Nincs megfelelő 'Worker' rekord ehhez a szakmához a munkán belül."
        );
        return;
      }

      // 3) Update Worker.workers JSON (registry)
      await updateWorkerJsonArray({
        workerId: workerRow.id,
        workId,
        workerData: {
          workforceRegistryId: member!.id,
          name: member!.name,
          email: member!.email,
          phone: member!.phone,
          profession: member!.role || data.profession,
          avatarUrl: data.avatarUrl || "",
        },
      });

      // 4) Assign to selected workItem via WorkItemWorker
      await assignWorkerToWorkItem({
        workItemId: data.workItemId,
        workerId: workerRow.id,
        workforceRegistryId: member!.id,
        name: member!.name,
        email: member!.email,
        phone: member!.phone,
        role: member!.role || data.profession,
        avatarUrl: data.avatarUrl,
        quantity: 1,
      });

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
      const effectiveEmail = (email || (assignment as any)?.email || "").trim();
      const effectiveName = (name || (assignment as any)?.name || "").trim();
      const effectiveRole = role || (assignment as any)?.role || null;
      if (effectiveEmail) {
        try {
          const workerIdFromAssignment = (assignment as any)?.workerId as
            | number
            | undefined;
          let parentWorkerId: number | undefined = workerIdFromAssignment;
          if (typeof parentWorkerId !== "number" && effectiveRole) {
            const workerRow = workers.find(
              (w: any) => (w?.name as string) === effectiveRole
            );
            if (workerRow && typeof (workerRow as any).id === "number") {
              parentWorkerId = (workerRow as any).id;
            }
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
    const allByRole: Record<string, WorkItemWorker[]> = {};
    for (const a of assignments) {
      const key = a.role || "Ismeretlen";
      const hasData = Boolean((a as any).name) || Boolean((a as any).email);
      if (!hasData) continue;
      if (!allByRole[key]) allByRole[key] = [];
      allByRole[key].push(a);
    }

    const result: Record<string, WorkItemWorker[]> = {};
    for (const role of Object.keys(allByRole)) {
      const bestId = roleBestWorkItemId[role];
      if (bestId) {
        const filtered = allByRole[role].filter(
          (a: any) => a.workItemId === bestId
        );
        result[role] = filtered.length > 0 ? filtered : allByRole[role];
      } else {
        result[role] = allByRole[role];
      }
    }
    return result;
  }, [assignments, roleBestWorkItemId]);

  // Fallback list built from Worker.workers registry (ParticipantsSection parity)
  const registryByRole: Record<string, WorkItemWorker[]> = useMemo(() => {
    const map: Record<string, WorkItemWorker[]> = {};
    for (const w of workers as any[]) {
      const role = (w?.name as string) || "Ismeretlen";
      const arr = Array.isArray((w as any).workers) ? (w as any).workers : [];
      for (const reg of arr) {
        if (!map[role]) map[role] = [];
        // Shape into WorkItemWorker-like object for rendering consistency
        map[role].push({
          id: reg.id ?? Math.random(),
          workItemId: reg.workItemId ?? 0,
          workerId: w.id,
          name: reg.name ?? null,
          email: reg.email ?? null,
          phone: reg.phone ?? null,
          role: reg.profession ?? role,
          avatarUrl: reg.avatarUrl ?? null,
          quantity: 1,
        } as any);
      }
    }
    return map;
  }, [workers]);

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
          const primary = grouped[role] || [];
          const fallback = registryByRole[role] || [];
          const list = primary.length > 0 ? primary : fallback;
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
          <span className="text-[#bbb]">Nincs szükség meghatározva</span>
        )}
        {professions.map((role) => {
          const required = requiredPerProfession[role] || 0;
          const primary = grouped[role] || [];
          const fallback = registryByRole[role] || [];
          const list = primary.length > 0 ? primary : fallback;
          // Use per-role denominator from best work item; fallback to required if missing/zero
          const rawDenom = denominatorRequiredPerProfession[role] as number | undefined;
          const displayDenom = typeof rawDenom === "number" && rawDenom > 0 ? rawDenom : required;
          const slots = Array.from({ length: required });
          return (
            <div key={role}>
              <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex-2 font-semibold">{role}</div>
                  <div className="ml-auto font-semibold text-[14px] text-[#222]">
                    {Math.min(list.length, required)} / {displayDenom}
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {slots.map((_, idx) => {
                    const w = list[idx];
                    const hasData = !!(
                      w &&
                      ((w as any).name || (w as any).email)
                    );
                    if (hasData) {
                      return (
                        <div
                          key={`${role}-filled-${w.id}`}
                          className="flex items-center bg-white rounded border border-[#eee] px-3 py-2 cursor-pointer hover:bg-[#fafafa] w-full"
                          onClick={() =>
                            setEditAssignment({
                              id: w.id,
                              name: w.name ?? undefined,
                              email: (w as any).email ?? undefined,
                              phone: (w as any).phone ?? undefined,
                              role: w.role ?? undefined,
                              quantity: w.quantity ?? undefined,
                              avatarUrl: (w as any).avatarUrl ?? null,
                            })
                          }
                        >
                          <div className="flex items-center gap-2">
                            {(w as any).avatarUrl ? (
                              <img
                                src={(w as any).avatarUrl}
                                alt={w.name ?? ""}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: "1px solid #eee",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "#eee",
                                }}
                              />
                            )}
                            <div className="text-[14px] text-[#333] font-medium">
                              {w.name}
                            </div>
                          </div>
                          <div className="ml-auto text-[13px] text-[#555] truncate max-w-[55%]">
                            {(w as any).email || ""}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={`${role}-empty-${idx}`}
                        className="w-full flex items-center rounded border border-dashed border-[#aaa] text-[#222] bg-[#fafbfc] hover:bg-[#f5f7fa] px-3 py-2"
                        onClick={() => {
                          const bestId = roleBestWorkItemId[role];
                          setAddLock({ role, workItemId: bestId });
                          setIsAddOpen(true);
                        }}
                        title={role}
                      >
                        <span className="text-lg leading-none">+</span>
                      </button>
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
