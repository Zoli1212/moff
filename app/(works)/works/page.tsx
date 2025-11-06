"use client";
import React, { useState, useCallback, useEffect } from "react";
import { getUserWorks, initializeAllWorkTotals } from "@/actions/work-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import { checkStuckProcessingWorks } from "@/actions/work-cleanup-actions";
import WorkCard, { WorkCardProps } from "./_components/WorkCard";
import Link from "next/link";
import WorksAutoUpdater from "./_components/WorksAutoUpdater";
import WorksSkeletonLoader from "../_components/WorksSkeletonLoader";
import { useRouter } from "next/navigation";

// Minimal Work típus, hogy ne legyen 'any'
export type Work = {
  id: string | number;
  title: string;
  deadline?: string;
  summary?: string;
  progress?: number | null;
  progressPlanned?: number | null;
  financial?: number | null;
  financialPlanned?: number | null;
  urgentTask?: string;
  urgentLevel?: "warning" | "danger";
  processingByAI?: boolean;
  [key: string]: unknown;
};

function toCardProps(
  work: Work,
  workStates: Record<string | number, string>,
  isTenant: boolean,
  isStuck: boolean = false
): WorkCardProps {
  const workState = workStates[work.id];
  const isUpdating = workState === "updating";
  const isDisabled = isUpdating || work.processingByAI === true;

  return {
    ...work,
    id: Number(work.id),
    title: work.title || "(Névtelen munka)",
    deadline: work.deadline || "2025-08-01",
    summary: work.summary || "Ez egy rövid összefoglaló. Ez a második sor.",
    progress:
      typeof work.progress === "number" && work.progress !== null
        ? work.progress
        : 0,
    progressPlanned:
      typeof work.progressPlanned === "number" && work.progressPlanned !== null
        ? work.progressPlanned
        : 100,
    financial:
      typeof work.financial === "number" && work.financial !== null
        ? work.financial
        : 0,
    financialPlanned:
      typeof work.financialPlanned === "number" &&
      work.financialPlanned !== null
        ? work.financialPlanned
        : 100,
    urgentTask: work.urgentTask || "",
    urgentLevel: work.urgentLevel || "warning",
    workSummary: (work.workSummary as string) || "",
    // Új aggregált értékek
    totalCompleted: (work.totalCompleted as number) || 0,
    totalBilled: (work.totalBilled as number) || 0,
    totalBillable: (work.totalBillable as number) || 0,
    totalQuantity: (work.totalQuantity as number) || 0,
    isUpdating,
    isDisabled,
    processingByAI: work.processingByAI === true,
    isStuck,
    isTenant,
  };
}

const WorkListPage = () => {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [workStates, setWorkStates] = useState<Record<string | number, string>>(
    {}
  );
  const [stuckWorkIds, setStuckWorkIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTenant, setIsTenant] = useState<boolean>(true);

  const fetchWorks = useCallback(async () => {
    try {
      const fetchedWorks = await getUserWorks();
      setWorks(fetchedWorks);
    } catch {
      setWorks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Get user tenant status
    getCurrentUserData()
      .then((data) => {
        setIsTenant(data.isTenant ?? true);
      })
      .catch(() => {
        setIsTenant(true);
      });

    fetchWorks();
  }, [fetchWorks]);

  // Auto-refresh every 3 seconds if there are works being processed
  useEffect(() => {
    const hasProcessingWorks = works.some(
      (w) => w.processingByAI === true || w.updatedByAI !== true
    );

    if (!hasProcessingWorks) return;

    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000; // 5 minutes in milliseconds

    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      // Stop after 5 minutes
      if (elapsed >= maxDuration) {
        console.log("⏱️ Auto-refresh stopped after 5 minutes");
        clearInterval(interval);
        return;
      }

      console.log("🔄 Auto-refreshing works...");
      
      // Check for stuck works every 30 seconds
      if (Math.floor(elapsed / 1000) % 30 === 0) {
        console.log("🔍 Checking for stuck works...");
        const checkResult = await checkStuckProcessingWorks();
        if (checkResult.success && checkResult.stuckWorkIds.length > 0) {
          console.log(`⚠️ Found ${checkResult.stuckWorkIds.length} stuck work(s)`);
          setStuckWorkIds(checkResult.stuckWorkIds);
        }
      }
      
      router.refresh();
      fetchWorks();
    }, 3000);

    return () => clearInterval(interval);
  }, [works, router, fetchWorks]);

  const handleWorkStateChange = useCallback(
    (
      workId: number | string,
      state: "updating" | "done" | "failed" | "idle"
    ) => {
      setWorkStates((prev) => ({
        ...prev,
        [workId]: state,
      }));
    },
    []
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await initializeAllWorkTotals();
      if (result.success) {
        // Újratöltjük a munkákat
        const fetchedWorks = await getUserWorks();
        setWorks(fetchedWorks);
        alert(result.message);
      } else {
        alert("Hiba: " + result.message);
      }
    } catch (error) {
      alert("Hiba történt a frissítés során");
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <WorksSkeletonLoader />;
  }

  const activeWorks = works.filter((w) => w.active !== false);

  return (
    <div
      style={{
        padding: 32,
        background: "#f9fafb",
        minHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 32,
          gap: 16,
        }}
      >
        <a
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "#FE9C00",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </a>
        <h2
          style={{ margin: 0, fontSize: 20, fontWeight: 500, color: "#000000" }}
        >
          Munkák
        </h2>
      </div>
      {/* Automatically update all works that have not been AI-updated */}
      <WorksAutoUpdater
        works={activeWorks}
        onWorkStateChange={handleWorkStateChange}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          paddingBottom: "20px",
          justifyContent: "center",
        }}
      >
        {activeWorks.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "2px solid #ff4444",
              borderRadius: 12,
              padding: "32px 24px",
              textAlign: "center",
              maxWidth: 400,
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#000000",
                marginBottom: 8,
              }}
            >
              Munkák nem elérhetőek
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#666666",
              }}
            >
              Forduljon az üzemeltetőhöz
            </div>
          </div>
        ) : (
          activeWorks.map((work) => {
            const isStuck = stuckWorkIds.includes(Number(work.id));
            const cardProps = toCardProps(work, workStates, isTenant, isStuck);
            const isDisabled = cardProps.isDisabled;

            if (isDisabled) {
              return (
                <div
                  key={work.id}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <WorkCard {...cardProps} />
                </div>
              );
            }

            return (
              <Link
                key={work.id}
                href={`/works/${work.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <WorkCard {...cardProps} />
              </Link>
            );
          })
        )}
      </div>
      {/* Frissítés gomb az oldal alján - csak tenanteknek */}
      {isTenant && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 20,
            paddingBottom: 120,
          }}
        >
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "transparent",
              color: refreshing ? "#999" : "#FFC107",
              border: refreshing ? "2px solid #999" : "2px solid #FFC107",
              borderRadius: 6,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              cursor: refreshing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!refreshing) {
                e.currentTarget.style.background = "#FFC107";
                e.currentTarget.style.color = "#000";
              }
            }}
            onMouseLeave={(e) => {
              if (!refreshing) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#FFC107";
              }
            }}
          >
            {refreshing ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #999",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Frissítés...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Frissítés
              </>
            )}
          </button>
        </div>
      )}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default WorkListPage;
