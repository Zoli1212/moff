"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "../_components/TaskCard";
import { createWorkDiary } from "@/actions/workdiary-actions";
import { getWorkDiariesByWorkId } from "@/actions/get-workdiariesbyworkid-actions";
import { useParams } from "next/navigation";
import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";


export interface WorkItem {
  id: number;
  workId: number;
  name: string;
  description?: string;
  progress?: number;
  inProgress?: boolean;
  workItemWorkers?: { id: number; name?: string; role?: string }[];
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

function normalizeWork(raw: Partial<Work>): Work {
  return {
    id: raw.id!,
    title: raw.title!,
    offerId: raw.offerId!,
    offerDescription: raw.offerDescription ?? null,
    status: raw.status!,
    startDate: raw.startDate ? new Date(raw.startDate) : null,
    endDate: raw.endDate ? new Date(raw.endDate) : null,
    location: raw.location ?? null,
    totalWorkers: raw.totalWorkers ?? 0,
    totalLaborCost: raw.totalLaborCost ?? null,
    totalTools: raw.totalTools ?? 0,
    totalToolCost: raw.totalToolCost ?? null,
    totalMaterials: raw.totalMaterials ?? 0,
    totalMaterialCost: raw.totalMaterialCost ?? null,
    estimatedDuration: raw.estimatedDuration ?? null,
    progress: raw.progress ?? null,
    isActive: raw.isActive!,
    createdAt: new Date(raw.createdAt!),
    updatedAt: new Date(raw.updatedAt!),
    tenantEmail: raw.tenantEmail!,
  };
}



export default function TasksPage() {
  const params = useParams();
  const workId = Number(params.id);
  const [work, setWork] = useState<Work | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [diaryIds, setDiaryIds] = useState<number[]>([]); // Track assigned diary workItemIds
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null); // For loading spinner per task
  const [assignError, setAssignError] = useState<string | null>(null);
// Removed duplicate state declarations below


  // Fetch work, items, and assigned diaries
  useEffect(() => {
    async function fetchWorkAndItems() {
      setLoading(true);
      setError(null);
      try {
        const rawWork = await getWorkById(workId);
        const normWork = normalizeWork(rawWork);
        setWork(normWork);
        const items: WorkItem[] = (await getWorkItemsWithWorkers(workId)).map((item) => ({
          ...item,
          description: item.description ?? undefined,
          workItemWorkers: item.workItemWorkers?.map((w) => ({
            ...w,
            name: w.name ?? undefined,
            role: w.role ?? undefined,
          })),
        }));
        setWorkItems(items);
        // Fetch assigned diaries for this work
        try {
          const diaries = await getWorkDiariesByWorkId(workId);
          setDiaryIds(diaries.map((d: any) => d.workItemId));
        } catch {
          setDiaryIds([]);
        }
      } catch (e) {
        setError((e as Error).message || "Hiba történt a lekérdezéskor");
      } finally {
        setLoading(false);
      }
    }
    if (!isNaN(workId)) fetchWorkAndItems();
  }, [workId]);

  // Assign diary to workItem (checkbox)
  const handleAssignDiary = async (workItemId: number) => {
    setAssigning(workItemId);
    setAssignError(null);
    try {
      // Optimistic update
      setDiaryIds((prev) => prev.includes(workItemId) ? prev : [...prev, workItemId]);
      const result = await createWorkDiary({ workId, workItemId });
      if (!result.success) {
        setAssignError(result.message || "Nem sikerült naplót rendelni.");
        setDiaryIds((prev) => prev.filter((id) => id !== workItemId));
      }
    } catch (e) {
      setAssignError((e as Error).message || "Hiba történt a napló rendelésekor");
      setDiaryIds((prev) => prev.filter((id) => id !== workItemId));
    } finally {
      setAssigning(null);
    }
  };
// Removed duplicate useEffect and state declarations

  const router = useRouter();
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        <span
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            marginRight: 12,
            width: 28,
            height: 28,
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'background 0.15s',
          }}
          tabIndex={0}
          aria-label="Vissza"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.back(); }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polyline points="12,3 6,9 12,15" fill="none" stroke="#1b263b" strokeWidth="2.2" strokeLinejoin="round" />
</svg>
        </span>
        {work?.title}
      </h2>
      {loading ? (
        <div>Betöltés...</div>
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
            workItems.map((item: WorkItem) => (
              <TaskCard
                key={item.id}
                id={item.id}
                title={item.name}
                summary={item.description}
                progress={item.progress || 0}
                checked={diaryIds.includes(item.id)}
                onCheck={() => handleAssignDiary(item.id)}
              >
                {item.workItemWorkers && item.workItemWorkers.length > 0 && (
                  <ul
                    style={{
                      fontSize: 13,
                      margin: "4px 0 0 0",
                      paddingLeft: 18,
                      color: "#555",
                    }}
                  >
                    {item.workItemWorkers.map((w) => (
                      <li key={w.id}>
                        {w.name || "Dolgozó"} ({w.role || "munkás"})
                      </li>
                    ))}
                  </ul>
                )}
                {assigning === item.id && <span style={{ color: '#3498db', marginLeft: 8 }}>Mentés...</span>}
                {assignError && assigning === item.id && <span style={{ color: 'red', marginLeft: 8 }}>{assignError}</span>}
              </TaskCard>
            ))
          )}
        </div>
      )}
    </div>
  );
}
