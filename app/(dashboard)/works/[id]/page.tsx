import React from "react";

import { getWorkById, getWorkItemsWithWorkers } from "@/actions/work-actions";
import type {
  WorkItem,
  WorkItemFromDb,
  Tool,
  Material,
  Worker,
} from "@/types/work";
// WorkDiary interface remains here if not imported, but Tool, Material, Worker are now imported from '@/types/work'.

type WorkDiary = { id?: number | string; title?: string };

import ParticipantsSection from "../_components/ParticipantsSection";
import Link from "next/link";

export default async function WorkDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let work = null;
  let error = null;

  function hasMessage(obj: unknown): obj is { message: string } {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "message" in obj &&
      typeof (obj as { message: unknown }).message === "string"
    );
  }
  try {
    work = await getWorkById(Number(params.id));
  } catch (e: unknown) {
    let msg = "Hiba a munka lekérdezésekor";
    if (hasMessage(e)) {
      msg = e.message;
    } else if (typeof e === "string") {
      msg = e;
    }
    error = msg;
  }

  let workItemsWithWorkers: WorkItemFromDb[] = [];
  if (work && work.id) {
    try {
      // ÚJ: lekérjük a workItemeket a WorkItemWorker kapcsolattal
      workItemsWithWorkers = await getWorkItemsWithWorkers(work.id);
    } catch (err) {
      // Hiba esetén fallback az eredeti workItems-re
      workItemsWithWorkers = work.workItems || [];
    }
  }

  if (error)
    return <div style={{ padding: 40, color: "red" }}>Hiba: {error}</div>;
  if (!work) return <div style={{ padding: 40 }}>Nincs adat a munkához.</div>;

  // Progress calculations
  const progress = typeof work.progress === "number" ? work.progress : 0;
  const percent = Math.min(100, Math.round(progress));

  // Dates
  const startDate = work.startDate
    ? new Date(work.startDate).toLocaleDateString()
    : "-";
  const endDate = work.endDate
    ? new Date(work.endDate).toLocaleDateString()
    : "-";
  const createdAt = work.createdAt
    ? new Date(work.createdAt).toLocaleString()
    : "-";
  const updatedAt = work.updatedAt
    ? new Date(work.updatedAt).toLocaleString()
    : "-";

  // Related entities
  const workers: Worker[] = work.workers || [];
  const tools: Tool[] = work.tools || [];
  const materials: Material[] = work.materials || [];
  const workItems: WorkItem[] = (work.workItems || []).map(
    (item: WorkItemFromDb) => ({
      ...item,
      description: item.description ?? null,
      materialUnitPrice: item.materialUnitPrice ?? null,
      workTotal: item.workTotal ?? null,
      materialTotal: item.materialTotal ?? null,
      tools: item.tools ?? [],
      materials: item.materials ?? [],
      workers: item.workers ?? [],
      workItemWorkers: item.workItemWorkers ?? [],
    })
  );
  const workDiaries: WorkDiary[] = work.workDiaries || [];

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 420,
        margin: "0 auto",
        fontFamily: "inherit",
        background: "#fafafa",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Link
          href="/works"
          style={{
            border: "none",
            background: "none",
            fontSize: 28,
            cursor: "pointer",
            marginLeft: -12,
            marginRight: 8,
            fontWeight: "bold",
            textDecoration: "none",
            color: "#222",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            <polyline points="18,4 7,13 18,22" fill="none" />
          </svg>
        </Link>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
          {work.title || "Munka neve"}
        </div>
      </div>
      {/* Work summary card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 10px #eee",
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 600 }}>
          Azonosító: <span style={{ fontWeight: 400 }}>{work.id}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Státusz:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.status === "pending" ? "folyamatban" : "áll"}
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Ajánlat ID: <span style={{ fontWeight: 400 }}>{work.offerId}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Ajánlat leírás:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.offerDescription || "-"}
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Helyszín:{" "}
          <span style={{ fontWeight: 400 }}>{work.location || "-"}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Kezdés: <span style={{ fontWeight: 400 }}>{startDate}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Befejezés: <span style={{ fontWeight: 400 }}>{endDate}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Becsült időtartam:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.estimatedDuration || "-"}
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Aktív:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.isActive ? "Igen" : "Nem"}
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Létrehozva: <span style={{ fontWeight: 400 }}>{createdAt}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Módosítva: <span style={{ fontWeight: 400 }}>{updatedAt}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Tenant email:{" "}
          <span style={{ fontWeight: 400 }}>{work.tenantEmail}</span>
        </div>
        <div style={{ fontWeight: 600 }}>Előrehaladás:</div>
        <div
          style={{
            width: 92,
            height: 92,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "8px 0",
          }}
        >
          <svg width="92" height="92">
            <circle
              cx="46"
              cy="46"
              r="40"
              stroke="#eee"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="46"
              cy="46"
              r="40"
              stroke="#3498db"
              strokeWidth="8"
              fill="none"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - percent / 100)}
              style={{
                transition: "stroke-dashoffset 0.5s",
                transform: "rotate(-90deg)",
                transformOrigin: "center",
              }}
            />
            <text
              x="46"
              y="54"
              textAnchor="middle"
              fontSize="22"
              fontWeight="bold"
              fill="#333"
            >
              {percent}%
            </text>
          </svg>
        </div>
        <div style={{ fontWeight: 600 }}>
          Összes munkás:{" "}
          <span style={{ fontWeight: 400 }}>{work.totalWorkers}</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Munkaerő költség:{" "}
          <span style={{ fontWeight: 400 }}>{work.totalLaborCost ?? 0} Ft</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Összes eszköz:{" "}
          <span style={{ fontWeight: 400 }}>{work.totalTools} db</span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Anyag költség:{" "}
          <span style={{ fontWeight: 400 }}>
            {work.totalMaterialCost ?? 0} Ft
          </span>
        </div>
        <div style={{ fontWeight: 600 }}>
          Összes költség:{" "}
          <span style={{ fontWeight: 400 }}>
            {(work.totalMaterialCost ?? 0) + (work.totalLaborCost ?? 0)} Ft Ft
          </span>
        </div>
      </div>
      {/* Résztvevők */}
      <ParticipantsSection
        initialWorkers={workers}
        totalWorkers={work.totalWorkers}
        workItems={workItemsWithWorkers.map(item => ({
          ...item,
          tools: item.tools ?? [],
          materials: item.materials ?? [],
          workers: item.workers ?? [],
          workItemWorkers: item.workItemWorkers ?? [],
        }))}
        workId={work.id}
      />
      {/* Szegmensek (workItems) */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 5px #eee",
          padding: "14px 18px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          Szegmensek ({workItems.length})
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            minHeight: 36,
            flexWrap: "wrap",
          }}
        >
          {workItems.length === 0 && (
            <span style={{ color: "#bbb" }}>Nincs szegmens</span>
          )}
          {workItems.map((item: WorkItem, idx: number) => (
            <div
              key={item.id || idx}
              style={{
                padding: "4px 11px",
                background: "#f7f7f7",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 15,
                color: "#555",
                marginBottom: 4,
              }}
            >
              {item.name || item.id}
            </div>
          ))}
        </div>
      </div>
      {/* Eszközök */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 5px #eee",
          padding: "14px 18px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          Eszközök ({tools.length})
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            minHeight: 36,
            flexWrap: "wrap",
          }}
        >
          {tools.length === 0 && (
            <span style={{ color: "#bbb" }}>Nincs eszköz</span>
          )}
          {tools.map((tool: Tool, idx: number) => (
            <div
              key={tool.id || idx}
              style={{
                padding: "4px 11px",
                background: "#f1f8fe",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 15,
                color: "#3498db",
                marginBottom: 4,
              }}
            >
              {tool.name || tool.id}
            </div>
          ))}
        </div>
      </div>
      {/* Anyagok */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 5px #eee",
          padding: "14px 18px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          Anyagok ({materials.length})
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            minHeight: 36,
            flexWrap: "wrap",
          }}
        >
          {materials.length === 0 && (
            <span style={{ color: "#bbb" }}>Nincs anyag</span>
          )}
          {materials.map((material: Material, idx: number) => (
            <div
              key={material.id || idx}
              style={{
                padding: "4px 11px",
                background: "#fef7e0",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 15,
                color: "#e67e22",
                marginBottom: 4,
              }}
            >
              {material.name || material.id}
            </div>
          ))}
        </div>
      </div>
      {/* Naplók */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 5px #eee",
          padding: "14px 18px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 8,
            letterSpacing: 0.5,
          }}
        >
          Naplók ({workDiaries.length})
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minHeight: 24,
          }}
        >
          {workDiaries.length === 0 && (
            <span style={{ color: "#bbb" }}>Nincs napló</span>
          )}
          {workDiaries.map((diary: WorkDiary, idx: number) => (
            <div
              key={diary.id || idx}
              style={{
                padding: "4px 11px",
                background: "#f4f4fa",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 15,
                color: "#6363a2",
              }}
            >
              {diary.title || diary.id}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
    </div>
  );
}
