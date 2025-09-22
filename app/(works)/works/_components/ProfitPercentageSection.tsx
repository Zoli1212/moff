"use client";

import { useState, useEffect, useCallback } from "react";
import { updateExpectedProfitPercent, getExpectedProfitPercent } from "@/actions/performance-actions";

interface ProfitPercentageSectionProps {
  workId: number;
}

export default function ProfitPercentageSection({ workId }: ProfitPercentageSectionProps) {
  const [percentage, setPercentage] = useState<number | string>(50);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const loadExistingPercentage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpectedProfitPercent(workId);
      if (result.success && result.expectedProfitPercent !== null) {
        setPercentage(result.expectedProfitPercent);
      } else {
        setPercentage(50); // Default to 50 if no value exists
      }
    } catch (error) {
      console.error("Hiba a százalék betöltésekor:", error);
      setMessage("❌ Hiba a betöltéskor");
    } finally {
      setIsLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    loadExistingPercentage();
  }, [loadExistingPercentage]);

  const handleSave = async () => {
    const numericPercentage = parseFloat(percentage.toString());

    if (isNaN(numericPercentage) || numericPercentage < 0 || numericPercentage > 100) {
      setMessage("A százalék 0 és 100 közötti szám kell legyen!");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const result = await updateExpectedProfitPercent(workId, numericPercentage);
      
      if (result.success) {
        setMessage("✅ Sikeresen mentve!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ Hiba: ${result.error}`);
      }
    } catch (error) {
      setMessage("❌ Hiba történt a mentés során");
      console.error("Mentési hiba:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPercentage(e.target.value);
  };

  if (isLoading) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 10px #eee",
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div style={{ textAlign: "center", color: "#666" }}>
          Elvárt profit betöltése...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#1F1F1F", // Dark background
        borderRadius: 18,
        boxShadow: "0 8px 32px rgba(255, 215, 0, 0.1)", // Subtle gold glow
        padding: 24,
        marginBottom: 24,
        color: "#FFD700", // Gold text
        border: "1px solid #FFD700",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 20,
          marginBottom: 8,
          textAlign: "center",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        Teljesítmény
      </div>
      
      <div
        style={{
          fontSize: 14,
          marginBottom: 20,
          textAlign: "center",
          color: "#FFFFFF",
          opacity: 0.8,
        }}
      >
        Adja meg az elvárt profit margin százalékát.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={percentage}
            onChange={handlePercentageChange}
            disabled={isSaving}
            style={{
              width: 70, // Kisebb input mező
              padding: "10px 14px",
              borderRadius: 12,
              border: "2px solid #FFD700",
              background: "#2a2a2a",
              color: "#FFD700",
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
            }}
          />
          <span style={{ fontSize: 22, fontWeight: 700, color: "#FFD700" }}>%</span>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#FFFFFF",
            opacity: 0.7,
            lineHeight: 1.2,
            maxWidth: '100px',
            textAlign: 'center'
          }}
        >
          Saját költségek / Ajánlat munkadíj
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            border: "none",
            background: isSaving ? "#555" : "#FFD700",
            color: isSaving ? "#aaa" : "#000000",
            fontSize: 14,
            fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {isSaving ? "Mentés..." : "Mentés"}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: "8px 12px",
            borderRadius: 8,
            background: message.startsWith("✅") ? "rgba(255, 215, 0, 0.2)" : "rgba(231, 76, 60, 0.2)",
            color: message.startsWith("✅") ? "#FFD700" : "#e74c3c",
            textAlign: "center",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}