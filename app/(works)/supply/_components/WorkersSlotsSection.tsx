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
import { updateWorkItemWorker, deleteWorkItemWorker } from "@/actions/update-workitemworker";

interface Props {
  workId: number;
  workItems: WorkItem[];
  workers: Worker[]; // Worker rows for this work (professions)
}

const WorkersSlotsSection: React.FC<Props> = ({ workId, workItems, workers }) => {
  // Only in-progress work items
  const inProgressWorkItemIds = useMemo(() => workItems.filter(w => w.inProgress).map(w => w.id), [workItems]);
  const filteredItems = useMemo(() => workItems.filter(w => inProgressWorkItemIds.includes(w.id)), [workItems, inProgressWorkItemIds]);

  const initialAssignments = useMemo(() =>
    filteredItems.flatMap((wi) => (wi.workItemWorkers ?? []).map((w) => ({...w}))),
    [filteredItems]
  );

  const [assignments, setAssignments] = useState<WorkItemWorker[]>(initialAssignments);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<WorkerAssignment | null>(null);

  const professions = useMemo(() => {
    // Prefer roles appearing in WorkItemWorker entries across work items
    const fromAssignments = workItems
      .flatMap((wi: any) => (wi.workItemWorkers ?? []))
      .map((w: any) => w?.role)
      .filter((r: any): r is string => !!r && typeof r === 'string' && r.trim().length > 0);
    if (fromAssignments.length > 0) {
      return Array.from(new Set(fromAssignments)).sort((a, b) => a.localeCompare(b, 'hu'));
    }
    // Fallback: worker rows (professions) attached to the work
    const fromWorkerRows = workers.map(w => w.name).filter((n): n is string => !!n && n.trim().length > 0);
    return Array.from(new Set(fromWorkerRows)).sort((a, b) => a.localeCompare(b, 'hu'));
  }, [workItems, workers]);

  const refreshAssignments = async () => {
    try {
      const items = await getWorkItemsWithWorkers(workId);
      const list: WorkItemWorker[] = items.flatMap((wi: any) => wi.workItemWorkers ?? []);
      setAssignments(list);
    } catch (err) {
      console.error(err);
      toast.error("Nem sikerült frissíteni a munkások listáját!");
    }
  };

  const handleAdd = async (data: { name: string; email: string; phone: string; profession: string; workItemId: number; avatarUrl?: string; }) => {
    try {
      // 1) Find or create workforce registry member
      const all = await getWorkforce();
      let member = all.find(m => m.email?.toLowerCase() === data.email.toLowerCase() && m.name?.toLowerCase() === data.name.toLowerCase());
      if (!member) {
        member = await addWorkforceMember({ name: data.name, email: data.email, phone: data.phone, role: data.profession, avatarUrl: data.avatarUrl });
      }

      // 2) Find the Worker row (profession) for this work
      const workerRow = workers.find(w => w.name === (member?.role || data.profession));
      if (!workerRow || typeof workerRow.id !== 'number') {
        toast.error("Nincs megfelelő 'Worker' rekord ehhez a szakmához a munkán belül.");
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
        }
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

  const handleEdit = async (data: { id: number; name?: string; email?: string; phone?: string; role?: string; quantity?: number; avatarUrl?: string | null; }) => {
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

  const handleDelete = async (id: number) => {
    try {
      await deleteWorkItemWorker(id);
      toast.success("Hozzárendelés törölve!");
      setEditAssignment(null);
      await refreshAssignments();
    } catch (err) {
      console.error(err);
      toast.error("Hiba történt törlés közben.");
    }
  };

  // Group assignments by role (profession)
  const grouped = useMemo(() => {
    const map: Record<string, WorkItemWorker[]> = {};
    for (const a of assignments) {
      const key = a.role || "Ismeretlen";
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [assignments]);

  return (
    <div className="relative bg-white rounded-xl shadow-sm px-5 py-3 mb-5">
      <WorkerAddModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleAdd}
        workItems={workItems}
        professions={professions}
      />
      <Button
        onClick={() => setIsAddOpen(true)}
        variant="outline"
        aria-label="Új munkás hozzáadása"
        className="absolute top-[14px] right-[18px] rounded-full border border-[#FF9900] text-[#FF9900] bg-white z-20 hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900] w-9 h-9 p-0 flex items-center justify-center"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <div className="h-8" />
      <div className="font-bold text-[17px] mb-2 tracking-[0.5px]">Munkások</div>

      <WorkerEditModal
        open={!!editAssignment}
        onOpenChange={(o) => { if (!o) setEditAssignment(null); }}
        worker={editAssignment}
        onSubmit={handleEdit}
        onDelete={async (id) => handleDelete(id)}
      />

      <div className="flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pb-20">
        {Object.entries(grouped).length === 0 && (
          <span className="text-[#bbb]">Nincs hozzárendelés</span>
        )}
        {Object.entries(grouped).map(([role, list]) => (
          <div key={role}>
            <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="flex-2 font-semibold">{role}</div>
                <div className="ml-auto font-semibold text-[14px] text-[#222]">{list.length} fő</div>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {list.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between bg-white rounded border border-[#eee] px-3 py-2 cursor-pointer hover:bg-[#fafafa]"
                    onClick={() => setEditAssignment({ id: w.id, name: w.name ?? undefined, email: (w as any).email ?? undefined, phone: (w as any).phone ?? undefined, role: w.role ?? undefined, quantity: w.quantity ?? undefined, avatarUrl: (w as any).avatarUrl ?? null })}
                  >
                    <div className="flex items-center gap-2">
                      {(w as any).avatarUrl ? (
                        <img src={(w as any).avatarUrl} alt={w.name ?? ''} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eee', display: 'inline-block' }} />
                      )}
                      <div className="text-[14px] text-[#333] font-medium">{w.name}</div>
                    </div>
                    <div className="text-[13px] text-[#666]">{(w as any).email}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkersSlotsSection;
