"use client";
import React, { useEffect, useState, useRef } from "react";
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
  // Use refs instead of state to avoid infinite loop
  const updatingIdsRef = useRef<Set<number | string>>(new Set());
  const doneIdsRef = useRef<Set<number | string>>(new Set());
  const failedIdsRef = useRef<Set<number | string>>(new Set());
  const processedRef = useRef(false);

  const [showStatus, setShowStatus] = useState(false);
  const [hideBar, setHideBar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const notUpdated = works.filter((w) => w.updatedByAI !== true);
    if (notUpdated.length === 0) {
      setShowStatus(false);
      processedRef.current = false;
      return;
    }
    setShowStatus(true);

    // Process multiple works concurrently, but limit to 2 at a time to avoid overwhelming
    const updateNext = async () => {
      const currentlyUpdating = updatingIdsRef.current.size;
      const maxConcurrent = 2;

      if (currentlyUpdating >= maxConcurrent) return;

      const next = notUpdated.find(
        (work) =>
          !updatingIdsRef.current.has(work.id) &&
          !doneIdsRef.current.has(work.id) &&
          !failedIdsRef.current.has(work.id)
      );

      if (!next) return;

      updatingIdsRef.current.add(next.id);
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
            failedIdsRef.current.add(next.id);
            onWorkStateChange?.(next.id, "failed");
            setErrorMsg(msg);
          } else {
            toast.success(`Work ${next.id} AI-updated!`);
            doneIdsRef.current.add(next.id);
            onWorkStateChange?.(next.id, "done");
          }
        } else {
          const msg = `Work ${next.id}: ${data?.error || "AI processing error!"}`;
          toast.error(msg);
          failedIdsRef.current.add(next.id);
          onWorkStateChange?.(next.id, "failed");
          setErrorMsg(msg);
        }
      } catch (err) {
        const msg = `Work ${next.id} network error: ${(err as Error).message}`;
        toast.error(msg);
        failedIdsRef.current.add(next.id);
        onWorkStateChange?.(next.id, "failed");
        setErrorMsg(msg);
      } finally {
        updatingIdsRef.current.delete(next.id);
      }
    };

    // Start multiple updates if possible
    const startUpdates = async () => {
      for (let i = 0; i < 2; i++) {
        await updateNext();
      }
    };

    startUpdates();
  }, [works, onWorkStateChange]);

  useEffect(() => {
    // Hide status bar when all are done
    const notUpdated = works.filter((w) => w.updatedByAI !== true);
    const done = doneIdsRef.current.size;
    const failed = failedIdsRef.current.size;
    
    if (
      notUpdated.length > 0 &&
      done + failed === notUpdated.length
    ) {
      setTimeout(() => setShowStatus(false), 2000); // Hide after 2s
    }
  }, [works]);

  const notUpdated = works.filter((w) => w.updatedByAI !== true);
  const total = notUpdated.length;
  const done = doneIdsRef.current.size;

  useEffect(() => {
    if (done === total && total > 0) {
      const timeout = setTimeout(() => setHideBar(true), 1500);
      return () => clearTimeout(timeout);
    } else {
      setHideBar(false);
    }
  }, [done, total]);

  // Ha minden munka frissítve van, ne jelenítsünk semmit
  if (total === 0) {
    return null;
  }
  console.log(showStatus, errorMsg)

  // Fade out when done
  if (hideBar) return null;

  // Don't render the progress bar - only use spinner on individual cards
  return null;
};

export default WorksAutoUpdater;
