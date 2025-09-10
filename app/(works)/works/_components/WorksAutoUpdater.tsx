"use client";
import React, { useEffect, useState } from "react";
import { updateWorkWithAIResult } from "@/actions/work-actions";
import { toast } from "sonner";
import { OfferItem } from "@/types/offer.types";

// You may want to adjust this type if your actual Work type is richer
export interface Work {
  id: number | string;
  updatedByAI?: boolean;
  location?: string;
  offerDescription?: string;
  estimatedDuration?: string;
  offerItems?: OfferItem[];
  [key: string]: unknown;
}

interface WorksAutoUpdaterProps {
  works: Work[];
  onWorkStateChange?: (
    workId: number | string,
    state: "updating" | "done" | "failed" | "idle"
  ) => void;
}

const WorksAutoUpdater: React.FC<WorksAutoUpdaterProps> = ({
  works,
  onWorkStateChange,
}) => {
  const [updatingIds, setUpdatingIds] = useState<(number | string)[]>([]);
  const [doneIds, setDoneIds] = useState<(number | string)[]>([]);
  const [failedIds, setFailedIds] = useState<(number | string)[]>([]);
  const [showStatus, setShowStatus] = useState(false);
  const [hideBar, setHideBar] = useState(false);

  // Remove stopOnError - we want to continue processing other works
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  console.log(showStatus);

  useEffect(() => {
    const notUpdated = works.filter((w) => w.updatedByAI !== true);
    if (notUpdated.length === 0) {
      setShowStatus(false);
      return;
    }
    setShowStatus(true);

    // Process multiple works concurrently, but limit to 2 at a time to avoid overwhelming
    const updateNext = async () => {
      const currentlyUpdating = updatingIds.length;
      const maxConcurrent = 2;

      if (currentlyUpdating >= maxConcurrent) return;

      const next = notUpdated.find(
        (work) =>
          !updatingIds.includes(work.id) &&
          !doneIds.includes(work.id) &&
          !failedIds.includes(work.id)
      );

      if (!next) return;

      setUpdatingIds((ids) => [...ids, next.id]);
      onWorkStateChange?.(next.id, "updating");
      try {
        const workData = {
          location: next.location || "",
          offerDescription: next.offerDescription || "",
          estimatedDuration: next.estimatedDuration || "",
          offerItems: next.offerItems || [],
        };
        const aiResponse = await fetch("/api/start-work", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workData),
        });
        const data = await aiResponse.json();
        if (data && !data.error) {
          const dbResult = await updateWorkWithAIResult(Number(next.id), data);
          if (!dbResult.success) {
            const msg = `Work ${next.id} save error: ${dbResult.error || "Unknown error"}`;
            toast.error(msg);
            setFailedIds((ids) => [...ids, next.id]);
            onWorkStateChange?.(next.id, "failed");
            setErrorMsg(msg);
          } else {
            toast.success(`Work ${next.id} AI-updated!`);
            setDoneIds((ids) => [...ids, next.id]);
            onWorkStateChange?.(next.id, "done");
          }
        } else {
          const msg = `Work ${next.id}: ${data?.error || "AI processing error!"}`;
          toast.error(msg);
          setFailedIds((ids) => [...ids, next.id]);
          onWorkStateChange?.(next.id, "failed");
          setErrorMsg(msg);
        }
      } catch (err) {
        const msg = `Work ${next.id} network error: ${(err as Error).message}`;
        toast.error(msg);
        setFailedIds((ids) => [...ids, next.id]);
        onWorkStateChange?.(next.id, "failed");
        setErrorMsg(msg);
      } finally {
        setUpdatingIds((ids) => ids.filter((id) => id !== next.id));
      }
    };

    // Start multiple updates if possible
    const startUpdates = async () => {
      for (let i = 0; i < 2; i++) {
        await updateNext();
      }
    };

    startUpdates();
    // eslint-disable-next-line
  }, [works, updatingIds, doneIds, failedIds, onWorkStateChange]);

  useEffect(() => {
    // Hide status bar when all are done
    const notUpdated = works.filter((w) => w.updatedByAI !== true);
    if (
      notUpdated.length > 0 &&
      doneIds.length + failedIds.length === notUpdated.length
    ) {
      setTimeout(() => setShowStatus(false), 2000); // Hide after 2s
    }
  }, [doneIds, failedIds, works]);

  const notUpdated = works.filter((w) => w.updatedByAI !== true);
  const total = notUpdated.length;
  const done = doneIds.length;

  useEffect(() => {
    if (done === total && total > 0) {
      const timeout = setTimeout(() => setHideBar(true), 1500);
      return () => clearTimeout(timeout);
    } else {
      setHideBar(false);
    }
  }, [done, total]);
  // DEBUG: Log to console how many works need update
  if (typeof window !== "undefined") {
    console.log("WorksAutoUpdater: notUpdated count:", total, notUpdated);
  }

  // Mobile-friendly bottom sheet style
  const [hideNoUpdateMsg, setHideNoUpdateMsg] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 600;
  const fontSize = isMobile ? 17 : 15;
  const iconSize = isMobile ? 28 : 22;

  console.log(errorMsg);

  if (total === 0 && !hideNoUpdateMsg) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 18,
          left: 0,
          width: "100vw",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          transition: "opacity 0.6s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.85)",
            color: "#222",
            borderRadius: 20,
            boxShadow: "0 2px 16px #0002",
            backdropFilter: "blur(8px)",
            padding: isMobile ? "14px 18px 14px 16px" : "12px 30px 12px 22px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 220,
            maxWidth: 420,
            fontSize,
            pointerEvents: "auto",
            opacity: 0.95,
          }}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="12" fill="#27ae60" />
            <path
              d="M8 12.5l2.2 2L16 9.5"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontWeight: 600 }}>Minden munka AI-frissítve!</span>
          <button
            onClick={() => setHideNoUpdateMsg(true)}
            style={{
              marginLeft: 8,
              background: "none",
              border: "none",
              color: "#888",
              fontSize: iconSize - 4,
              cursor: "pointer",
              borderRadius: 8,
              padding: 2,
              transition: "background 0.15s",
            }}
            aria-label="Bezárás"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Fade out when done

  if (total === 0) return null;
  if (hideBar) return null;

  // Don't render the progress bar - only use spinner on individual cards
  return null;
};

export default WorksAutoUpdater;
