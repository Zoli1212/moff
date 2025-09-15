"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TaskCard from "../_components/TaskCard";
import { createWorkDiary } from "@/actions/workdiary-actions";
import { useParams } from "next/navigation";
import { fetchWorkAndItems, updateWorkItemInProgress } from "@/actions/work-actions";

import { WorkDiary } from "@/types/work-diary";

export interface WorkItem {
  id: number;
  workId: number;
  name: string;
  description?: string;
  progress?: number;
  quantity?: number;
  completedQuantity?: number;
  unit?: string;
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

const getMonogram = (name?: string): string => {
  if (!name) return "D"; // Default for 'Dolgozó'
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function TasksPage() {
  const params = useParams();
  const workId = useMemo(() => Number(params.id), [params.id]);

  const [work, setWork] = useState<Work | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null); // For loading spinner per task
  const [assignError, setAssignError] = useState<string | null>(null);

  const doFetchWorkAndItems = useCallback(async () => {
    if (isNaN(workId)) {
      setLoading(false);
      setError("Érvénytelen munkalap azonosító");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { work, workItems } = await fetchWorkAndItems(workId);
      setWork(work);
      setWorkItems(workItems || []);
    } catch (e) {
      console.error("Error fetching work items:", e);
      setError(
        "Nem sikerült betölteni a munkalapot. Kérjük, próbálja újra később."
      );
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    doFetchWorkAndItems();

    const onFocus = () => doFetchWorkAndItems();
    const onVisibility = () => {
      if (document.visibilityState === "visible") doFetchWorkAndItems();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, [doFetchWorkAndItems]);

  // Toggle workItem inProgress status (checkbox)
  const handleAssignDiary = async (workItemId: number, checked: boolean) => {
    setAssigning(workItemId);
    setAssignError(null);

    try {
      // Update workItem inProgress status
      const inProgressResult = await updateWorkItemInProgress({
        workItemId,
        inProgress: checked,
      });
      
      if (!inProgressResult.success) {
        setAssignError(inProgressResult.message || "Nem sikerült frissíteni a munkafázis állapotát.");
        return;
      }

      // Only create diary if checking and no diary exists for this work yet
      if (checked) {
        const hasExistingDiaryForWork = workItems.some(item => 
          item.workDiaryEntries && item.workDiaryEntries.length > 0
        );
        
        if (!hasExistingDiaryForWork) {
          const result = await createWorkDiary({ workId, workItemId });
          
          if (result.success) {
            setWorkItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id === workItemId) {
                  return {
                    ...item,
                    inProgress: true,
                    workDiaryEntries: [
                      {
                        id: result.data?.id || Date.now(),
                        workItemId,
                        workId,
                      },
                    ] as WorkDiary[],
                  };
                }
                return item;
              })
            );
          } else {
            setAssignError("Nem sikerült naplót létrehozni.");
            return;
          }
        } else {
          // Just update inProgress status in UI
          setWorkItems((prevItems) =>
            prevItems.map((item) => {
              if (item.id === workItemId) {
                return {
                  ...item,
                  inProgress: true,
                };
              }
              return item;
            })
          );
        }
      } else {
        // Just update inProgress status in UI - never delete diary
        setWorkItems((prevItems) =>
          prevItems.map((item) => {
            if (item.id === workItemId) {
              return {
                ...item,
                inProgress: false,
              };
            }
            return item;
          })
        );
      }
    } catch (e) {
      setAssignError(
        (e as Error).message || "Hiba történt a munkafázis állapot frissítésekor"
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
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
          <span>Betöltés...</span>
        </div>
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
            [...workItems]
              .sort((a, b) => {
                const aInProgress = a.inProgress === true;
                const bInProgress = b.inProgress === true;
                return (bInProgress ? 1 : 0) - (aInProgress ? 1 : 0);
              })
              .map((item: WorkItem) => {
                const p = Math.max(
                  0,
                  Math.min(100, Math.round(item.progress || 0))
                );
                return (
                  <TaskCard
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    summary={item.description}
                    progress={p}
                    quantity={item.quantity}
                    completedQuantity={item.completedQuantity}
                    unit={item.unit}
                    isLoading={assigning === item.id}
                    checked={item.inProgress === true}
                    className={
                      item.inProgress === true
                        ? "border-green-500 border-2 bg-green-50"
                        : ""
                    }
                    onCheck={(checked) => handleAssignDiary(item.id, checked)}
                  >
                    {item.workItemWorkers &&
                      item.workItemWorkers.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginTop: "8px",
                          }}
                        >
                          {item.workItemWorkers
                            .filter((w) => w.name && w.name.trim() !== "")
                            .map((w) => (
                              <div
                                key={w.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  backgroundColor: "#f0f0f0",
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                }}
                              >
                                <Image
                                  src="/worker.jpg"
                                  alt="worker avatar"
                                  width={24}
                                  height={24}
                                  style={{ borderRadius: "50%" }}
                                />
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "11px",
                                    lineHeight: "1.2",
                                  }}
                                >
                                  {getMonogram(w.name)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    {assignError && assigning === item.id && (
                      <span style={{ color: "red", marginLeft: 8 }}>
                        {assignError}
                      </span>
                    )}
                  </TaskCard>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
