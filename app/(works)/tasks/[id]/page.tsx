"use client";
import React, { useEffect, useState } from "react";
import TaskCard from "../_components/TaskCard";
import { useParams } from "next/navigation";
import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";

interface WorkItem {
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
  offerItems?: any | null;
}

function normalizeWork(raw: any): Work {
  return {
    id: raw.id,
    title: raw.title,
    offerId: raw.offerId,
    offerDescription: raw.offerDescription ?? null,
    status: raw.status,
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
    isActive: raw.isActive,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    tenantEmail: raw.tenantEmail,
    offerItems: raw.offerItems ?? null,
  };
}

export default function TasksPage() {
  const params = useParams();
  const workId = Number(params.id);
  const [work, setWork] = useState<Work | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e: any) {
        setError(e.message || "Hiba történt a lekérdezéskor");
      } finally {
        setLoading(false);
      }
    }
    if (!isNaN(workId)) fetchWorkAndItems();
  }, [workId]);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Feladatok
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
            boxShadow: "0 4px 18px 0 #e3e8ef",
            padding: 24,
            border: "2px solid #e0e7ef",
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 20,
              marginBottom: 8,
              color: "#1b263b",
              letterSpacing: 0.2,
              textShadow: "0 1px 0 #f2f6fa",
            }}
          >
            {work.title}
          </div>
          {work.endDate && (
            <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
              Határidő: {work.endDate.toString()}
            </div>
          )}
          {work.offerDescription && (
            <div style={{ fontSize: 14, color: "#444", marginBottom: 10 }}>
              {work.offerDescription}
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
              </TaskCard>
            ))
          )}
        </div>
      )}
    </div>
  );
}
