"use client";
import React from "react";
// import { updateWorkWithAIResult } from "@/actions/work-actions";
// import { Loader2 } from "lucide-react";
// import { toast } from "sonner";

import type { OfferItem } from "@/types/offer.types";

export interface WorkCardProps {
  id: number;
  title: string;
  deadline: string;
  summary: string;
  progress: number;
  progressPlanned: number;
  financial: number;
  financialPlanned: number;
  urgentTask: string;
  urgentLevel: "warning" | "danger";
  offerItems?: OfferItem[];
  location?: string;
  offerDescription?: string;
  estimatedDuration?: string;
}

const getUrgentColor = (level: "warning" | "danger") => {
  if (level === "danger") return "#e74c3c";
  if (level === "warning") return "#f1c40f";
  return "#bdc3c7";
};

const WorkCard: React.FC<WorkCardProps> = (props) => {
  console.log("WorkCard props:", props);

  // const [loading, setLoading] = useState(false);

  const {
    // id,
    title,
    deadline,
    summary,
    progress,
    progressPlanned,
    financial,
    financialPlanned,
    urgentTask,
    urgentLevel,
    // offerItems = [],
    // location = "",
    // offerDescription = "",
    // estimatedDuration = "",
  } = props;

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 12,
        marginBottom: 24,
        padding: 20,
        background: "#fff",
        boxShadow: "0 2px 8px #eee",
        maxWidth: 420,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 18 }}>{title}</span>
        <span style={{ color: "#888", fontSize: 14 }}>
          Határidő: {deadline}
        </span>
      </div>
      <div
        style={{
          margin: "12px 0 10px 0",
          color: "#333",
          fontSize: 15,
          whiteSpace: "pre-line",
        }}
      >
        {summary}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Elvégzett / Tervezett munka
        </div>
        <div
          style={{
            background: "#eee",
            borderRadius: 6,
            height: 10,
            width: "100%",
            marginTop: 2,
          }}
        >
          <div
            style={{
              width: `${progressPlanned > 0 ? (progress / progressPlanned) * 100 : 0}%`,
              background: "#3498db",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {progress} / {progressPlanned}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Pénzügyi teljesítés</div>
        <div
          style={{
            background: "#eee",
            borderRadius: 6,
            height: 10,
            width: "100%",
            marginTop: 2,
          }}
        >
          <div
            style={{
              width: `${financialPlanned > 0 ? (financial / financialPlanned) * 100 : 0}%`,
              background: "#2ecc71",
              height: "100%",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {financial} / {financialPlanned}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
        {/* <button
          style={{
            background: "#2ecc71",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
          title="Elkezd"
          disabled={loading}
          onClick={async (e) => {
            e.preventDefault();
            setLoading(true);
            const workData = {
              location,
              offerDescription,
              estimatedDuration,
              offerItems,
            };
            try {
              const aiResponse = await fetch("/api/start-work", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(workData),
              });
              const data = await aiResponse.json();
              if (data && !data.error) {
                try {
                  const dbResult = await updateWorkWithAIResult(id, data);
                  if (!dbResult.success) {
                    toast.error(`Hiba a mentéskor: ${dbResult.error || "Ismeretlen hiba"}`);
                    console.error("DB mentés hiba:", dbResult);
                  } else {
                    toast.success("Feldolgozás kész!");
                  }
                  console.log("DB mentés eredménye:", dbResult);
                } catch (err) {
                  toast.error("DB mentés hiba!");
                  console.error("DB mentés hiba:", err);
                }
              } else {
                toast.error(data?.error || "AI feldolgozás hiba!");
              }
            } catch (err) {
              toast.error("Hálózati vagy szerver hiba!");
              console.error("AI feldolgozás hiba:", err);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <span style={{ fontSize: 20, color: "#fff" }}>▶</span>}
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="#fff"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="10" cy="10" r="9" fill="#27ae60" />
            <path
              d="M7 10.5l2 2 4-4"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button> */}
        <span style={{ display: "flex", alignItems: "center", marginRight: 8 }}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={urgentLevel === "danger" ? "#e74c3c" : "#f1c40f"}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "inline", verticalAlign: "middle" }}
          >
            <path d="M12 3L2 21h20L12 3z" />
            <circle cx="12" cy="16" r="1.2" fill="#fff" />
            <rect x="11.2" y="9" width="1.6" height="5" rx="0.8" fill="#fff" />
          </svg>
        </span>
        <span
          style={{
            fontSize: 14,
            color: getUrgentColor(urgentLevel),
            fontWeight: 500,
          }}
        >
          {urgentTask}
        </span>
      </div>
    </div>
  );
};

export default WorkCard;
