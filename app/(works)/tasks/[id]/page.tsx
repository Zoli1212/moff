"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "../_components/TaskCard";
import { createWorkDiary, deleteWorkDiary } from "@/actions/workdiary-actions";
import { useParams } from "next/navigation";
import {
  fetchWorkAndItems,
} from "@/actions/work-actions";

import { WorkDiary } from "@/types/work-diary";

export interface WorkItem {
  id: number;
  workId: number;
  name: string;
  description?: string;
  progress?: number;
  inProgress?: boolean;
  workItemWorkers?: { id: number; name?: string; role?: string }[];
  workDiaryEntries?: WorkDiary[];
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

export default function TasksPage() {
  const params = useParams();
  const workId = Number(params.id);
  const [work, setWork] = useState<Work | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null); // For loading spinner per task
  const [assignError, setAssignError] = useState<string | null>(null);
  // Removed duplicate state declarations below

  // Fetch work, items, and assigned diaries
  useEffect(() => {
    if (isNaN(workId)) return;
    let mounted = true;
    const doFetchWorkAndItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const { work, workItems } = await fetchWorkAndItems(workId);
        if (!mounted) return;
        setWork(work);
        setWorkItems(workItems);
      } catch (e) {
        if (!mounted) return;
        setError((e as Error).message || "Hiba történt a lekérdezéskor");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    doFetchWorkAndItems();

    const onFocus = () => doFetchWorkAndItems();
    const onVisibility = () => {
      if (document.visibilityState === "visible") doFetchWorkAndItems();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Optional light polling (comment out if not needed)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") doFetchWorkAndItems();
    }, 15000);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [workId]);

  // Assign diary to workItem (checkbox)
  const handleAssignDiary = async (workItemId: number, checked: boolean) => {
    setAssigning(workItemId);
    setAssignError(null);
    try {
      let result;
      if (checked) {
        result = await createWorkDiary({ workId, workItemId });
      } else {
        result = await deleteWorkDiary({ workId, workItemId });
      }
      if (!result.success) {
        setAssignError(
          result.message ||
            (checked
              ? "Nem sikerült naplót rendelni."
              : "Nem sikerült eltávolítani a naplót.")
        );
      } else {
        // Re-fetch work items to update UI (no global loading)
        try {
          const { work, workItems } = await fetchWorkAndItems(workId);
          setWork(work);
          setWorkItems(workItems);
        } catch (e) {
          setError((e as Error).message || "Hiba történt a lekérdezéskor");
        }
      }
    } catch (e) {
      setAssignError(
        (e as Error).message ||
          (checked
            ? "Hiba történt a napló rendelésekor"
            : "Hiba történt a napló eltávolításakor")
      );
    } finally {
      setAssigning(null);
    }
  };

  const router = useRouter();
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
            marginRight: 12,
            width: 28,
            height: 28,
            justifyContent: "center",
            borderRadius: 6,
            transition: "background 0.15s",
          }}
          tabIndex={0}
          aria-label="Vissza"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.back();
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polyline
              points="12,3 6,9 12,15"
              fill="none"
              stroke="#1b263b"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {work?.title}
      </h2>
      {loading ? (
        <div>Frissítés...</div>
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
            workItems.map((item: WorkItem) => {
              const p = Math.max(0, Math.min(100, Math.round(item.progress || 0)));
              return (
              <TaskCard
                key={item.id}
                id={item.id}
                title={item.name}
                summary={item.description}
                progress={p}
                checked={
                  item.workDiaryEntries && item.workDiaryEntries.length > 0
                }
                className={
                  item.workDiaryEntries && item.workDiaryEntries.length > 0
                    ? "border-green-500 border-2 bg-green-50"
                    : ""
                }
                onCheck={(checked) => handleAssignDiary(item.id, checked)}
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
                {assigning === item.id && (
                  <span style={{ color: "#3498db", marginLeft: 8 }}>
                    Mentés...
                  </span>
                )}
                {assignError && assigning === item.id && (
                  <span style={{ color: "red", marginLeft: 8 }}>
                    {assignError}
                  </span>
                )}
              </TaskCard>
            );})
          )}
        </div>
      )}
    </div>
  );
}
