import React from "react";
import { getUserWorks } from "@/actions/work-actions";
import WorkCard, { WorkCardProps } from "./_components/WorkCard";
import Link from "next/link";

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

// Helper: mockolja a hiányzó mezőket
function toCardProps(work: Work): WorkCardProps {
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
    urgentTask:
      work.urgentTask ||
      (Math.random() > 0.5
        ? "Szerződés aláírása szükséges!"
        : "Hiányzik a pénzügyi jelentés!"),
    urgentLevel:
      work.urgentLevel || (Math.random() > 0.5 ? "warning" : "danger"),
  };
}

const WorkListPage = async () => {
  let works: Work[] = [];
  try {
    works = await getUserWorks();

    console.log("WORKS", works);
  } catch {
    works = [];
  }
  let activeWorks = works.filter((w) => w.active !== false);

  console.log(activeWorks, "ACTIVE WORKS");

  // Ha nincs valós adat, adjunk két példát, egy warning és egy danger mockot
  if (activeWorks.length === 0) {
    activeWorks = [
      {
        id: "mock-warning-1",
        title: "Sárga példa munka 1",
        deadline: "2025-08-10",
        summary: "Ez egy sárga (warning) mock példa.",
        progress: 60,
        progressPlanned: 100,
        financial: 50,
        financialPlanned: 100,
        urgentTask: "Határidő közeleg!",
        urgentLevel: "warning",
      },
      {
        id: "mock-warning-2",
        title: "Sárga példa munka 2",
        deadline: "2025-07-30",
        summary: "Ez is egy sárga (warning) mock példa.",
        progress: 80,
        progressPlanned: 100,
        financial: 10,
        financialPlanned: 100,
        urgentTask: "Közeleg a határidő!",
        urgentLevel: "warning",
      },
    ];
  }

  return (
    <div style={{ padding: 32, background: "#f8f9fa", minHeight: "100vh" }}>
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
            color: "#222",
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
              stroke="#222"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Munkák</h2>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
        {activeWorks.length === 0 ? (
          <div>Nincs aktív munka.</div>
        ) : (
          activeWorks.map((work) => (
            <Link key={work.id} href={`/works/${work.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <WorkCard {...toCardProps(work)} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkListPage;
