"use client";
import React from "react";

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
}

const getUrgentColor = (level: "warning" | "danger") => {
  if (level === "danger") return "#e74c3c"; // red
  if (level === "warning") return "#f1c40f"; // yellow
  return "#bdc3c7";
};

const WorkCard: React.FC<WorkCardProps> = ({
  id,
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
      <span style={{ color: "#888", fontSize: 14 }}>Határidő: {deadline}</span>
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
      {/* Elkezd (Start) button */}
      <button
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
          cursor: "pointer",
        }}
        title="Elkezd"
        onClick={async (e) => {
          e.preventDefault();
          // MOCK: Replace with real data from props or context
          const workData = {
            location: "33. kerület, Tahi utca 45.",
            description: `Becsült kivitelezési idő: 14 nap.\nA helyszíni felmérés természetesen megoldható.\nA sötétkék fal pontos méreteit és a fürdőszobai zuhanykabin típusát (pl. sarok, íves, szögletes) szükséges lenne pontosítani.\nA következő tétel nem volt az adatbázisban: 'Hangszigetelés a hálószobában egy falon (10 m² – lehet bármi kreatív megoldás!) (egyedi tétel)'.`,
            estimatedDuration: "14 nap",
            offerItems: [
              {
                name: "*Helyszíni bejárás, területfelmérés",
                quantity: "1",
                unit: "db",
                unitPrice: "3000 Ft",
                materialUnitPrice: "5400 Ft",
                workTotal: "3000 Ft",
                materialTotal: "5400 Ft",
                totalPrice: "8 400 Ft",
              },
              {
                name: "*Belső falak festése diszperziós festékkel",
                quantity: "150",
                unit: "m²",
                unitPrice: "2800 Ft",
                materialUnitPrice: "5040 Ft",
                workTotal: "420000 Ft",
                materialTotal: "756000 Ft",
                totalPrice: "1 176 000 Ft",
              },
              {
                name: "*Belső falak festése színes festékkel",
                quantity: "1",
                unit: "m²",
                unitPrice: "2800 Ft",
                materialUnitPrice: "5040 Ft",
                workTotal: "2800 Ft",
                materialTotal: "5040 Ft",
                totalPrice: "7 840 Ft",
              },
              {
                name: "*Fali csempeburkolat készítése (20x20 – 30x60 cm)",
                quantity: "6",
                unit: "m²",
                unitPrice: "5500 Ft",
                materialUnitPrice: "9900 Ft",
                workTotal: "33000 Ft",
                materialTotal: "59400 Ft",
                totalPrice: "92 400 Ft",
              },
              {
                name: "*Gépészet szerelvényezése",
                quantity: "1",
                unit: "db",
                unitPrice: "8500 Ft",
                materialUnitPrice: "15300 Ft",
                workTotal: "8500 Ft",
                materialTotal: "15300 Ft",
                totalPrice: "23 800 Ft",
              },
              {
                name: "*Villanyszerelés szerelvényezése",
                quantity: "4",
                unit: "db",
                unitPrice: "6500 Ft",
                materialUnitPrice: "11700 Ft",
                workTotal: "26000 Ft",
                materialTotal: "46800 Ft",
                totalPrice: "72 800 Ft",
              },
              {
                name: "*Konyhabútor, egyéb beépített bútorok",
                quantity: "1",
                unit: "db",
                unitPrice: "9500 Ft",
                materialUnitPrice: "17100 Ft",
                workTotal: "9500 Ft",
                materialTotal: "17100 Ft",
                totalPrice: "26 600 Ft",
              },
              {
                name: "*Hangszigetelő burkolatok elhelyezése",
                quantity: "10",
                unit: "m²",
                unitPrice: "10000 Ft",
                materialUnitPrice: "18000 Ft",
                workTotal: "100000 Ft",
                materialTotal: "180000 Ft",
                totalPrice: "280 000 Ft",
              },
            ],
          };
          const res = await fetch("/api/start-work", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(workData),
          });
          const data = await res.json();
          // Log AI response to console instead of redirecting
          console.log("OpenAI válasz:", data);

          // --- ÚJ: Mentés DB-be szerver actionnel ---
          try {

            const saveRes = await fetch("/api/update-work-ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workId: id, aiResult: data }),
            });
            const dbResult = await saveRes.json();
            if (!dbResult.success) {
              alert(`Hiba a mentéskor: ${dbResult.error || 'Ismeretlen hiba'}`);
              console.error("DB mentés hiba:", dbResult);
            }
            console.log("DB mentés eredménye:", dbResult);
          } catch (err) {
            console.error("DB mentés hiba:", err);
          }
        }}
      >
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
      </button>
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

export default WorkCard;
