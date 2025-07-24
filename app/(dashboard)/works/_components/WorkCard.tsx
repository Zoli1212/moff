import React from "react";

export interface WorkCardProps {
  title: string;
  deadline: string;
  summary: string;
  progress: number;
  progressPlanned: number;
  financial: number;
  financialPlanned: number;
  urgentTask: string;
  urgentLevel: "warning" | "danger";
}

const getUrgentColor = (level: "warning" | "danger") => {
  if (level === "danger") return "#e74c3c"; // red
  if (level === "warning") return "#f1c40f"; // yellow
  return "#bdc3c7";
};

const WorkCard: React.FC<WorkCardProps> = ({
  title,
  deadline,
  summary,
  progress,
  progressPlanned,
  financial,
  financialPlanned,
  urgentTask,
  urgentLevel,
}) => (
  <div style={{
    border: "1px solid #ccc",
    borderRadius: 12,
    marginBottom: 24,
    padding: 20,
    background: "#fff",
    boxShadow: "0 2px 8px #eee",
    maxWidth: 420,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontWeight: 600, fontSize: 18 }}>{title}</span>
      <span style={{ color: "#888", fontSize: 14 }}>Határidő: {deadline}</span>
    </div>
    <div style={{ margin: "12px 0 10px 0", color: "#333", fontSize: 15, whiteSpace: "pre-line" }}>{summary}</div>
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: "#666" }}>Elvégzett / Tervezett munka</div>
      <div style={{ background: "#eee", borderRadius: 6, height: 10, width: "100%", marginTop: 2 }}>
        <div style={{ width: `${progressPlanned > 0 ? (progress / progressPlanned) * 100 : 0}%`, background: "#3498db", height: "100%", borderRadius: 6 }} />
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{progress} / {progressPlanned}</div>
    </div>
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: "#666" }}>Pénzügyi teljesítés</div>
      <div style={{ background: "#eee", borderRadius: 6, height: 10, width: "100%", marginTop: 2 }}>
        <div style={{ width: `${financialPlanned > 0 ? (financial / financialPlanned) * 100 : 0}%`, background: "#2ecc71", height: "100%", borderRadius: 6 }} />
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{financial} / {financialPlanned}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
      <span style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={urgentLevel === 'danger' ? '#e74c3c' : '#f1c40f'}
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'inline', verticalAlign: 'middle' }}
        >
          <path d="M12 3L2 21h20L12 3z" />
          <circle cx="12" cy="16" r="1.2" fill="#fff" />
          <rect x="11.2" y="9" width="1.6" height="5" rx="0.8" fill="#fff" />
        </svg>
      </span>
      <span style={{ fontSize: 14, color: getUrgentColor(urgentLevel), fontWeight: 500 }}>{urgentTask}</span>
    </div>
  </div>
);

export default WorkCard;
