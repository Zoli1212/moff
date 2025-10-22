"use client";
import React, { useState, useCallback } from "react";
import { getUserWorks, initializeAllWorkTotals } from "@/actions/work-actions";
import { getCurrentUserData } from "@/actions/user-actions";
import WorkCard, { WorkCardProps } from "./_components/WorkCard";
import Link from "next/link";
import WorksAutoUpdater from "./_components/WorksAutoUpdater";
import WorksSkeletonLoader from "../_components/WorksSkeletonLoader";

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
  [key: string]: unknown;
};

function toCardProps(
  work: Work,
  workStates: Record<string | number, string>,
  isTenant: boolean
): WorkCardProps {
  const workState = workStates[work.id];
  const isUpdating = workState === "updating";
  const isDisabled = isUpdating;

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
    isTenant,
  };
}

const WorkListPage = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [workStates, setWorkStates] = useState<Record<string | number, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTenant, setIsTenant] = useState<boolean>(true);

  React.useEffect(() => {
    // Get user tenant status
    getCurrentUserData()
      .then(data => {
        setIsTenant(data.isTenant ?? true);
      })
      .catch(() => {
        setIsTenant(true);
      });

    const fetchWorks = async () => {
      try {
        const fetchedWorks = await getUserWorks();
        setWorks(fetchedWorks);
      } catch {
        setWorks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWorks();
  }, []);

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

  let activeWorks = works.filter((w) => w.active !== false);

  return (
    <div style={{ padding: 32, background: "#f9fafb", minHeight: "100vh", overflowY: "auto" }}>
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
            color: "#000000",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.5 9L12 14L16.5 19"
              stroke="#000000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: "#000000" }}>Munkák</h2>
      </div>
      {/* Automatically update all works that have not been AI-updated */}
      <WorksAutoUpdater
        works={activeWorks}
        onWorkStateChange={handleWorkStateChange}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, paddingBottom: "20px", justifyContent: "center" }}>
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
            const cardProps = toCardProps(work, workStates, isTenant);
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
