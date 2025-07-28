"use client";
import React, { useState, useRef } from "react";

import type { Worker, WorkItem, WorkItemWorker } from "@/types/work";

// Accept any[] for initialWorkers to avoid TSX prop errors from parent
export default function ParticipantsSection({
  initialWorkers,
  totalWorkers,
  workItems = [],
  workId,
}: {
  initialWorkers: Worker[];
  totalWorkers: number;
  workItems?: WorkItem[];
  workId: number;
}) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers as Worker[]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Szakmák (worker name) kigyűjtése az adott Work-hoz tartozó workItems alapján
  const relevantWorkItems = workItems.filter((wi) => wi.workId === workId);
  const allWorkers = workers as Worker[];
  const professions = Array.from(
    new Set(allWorkers.map((w) => w.name).filter(Boolean))
  );

  // ÚJ: WorkerId szerinti maximum szükséglet (bármelyik workItem-ben a legtöbb)
  const workerIdToMaxNeeded: Record<number, number> = {};
  for (const worker of workers) {
    let max = 0;
    for (const wi of relevantWorkItems) {
      // Az adott workItem-ben mennyi kell ebből a workerből?
      const sum = wi.workItemWorkers
        .filter((wiw) => wiw.workerId === worker.id)
        .reduce((acc, wiw) => acc + (wiw.quantity ?? 1), 0);
      if (sum > max) max = sum;
    }
    workerIdToMaxNeeded[worker.id] = max;
  }

  // Új: kattintható körök eseménykezelője
  const handleClick = (worker: Worker) => {
    setSelectedWorker(worker);
  };

  // Szakmák UI renderelése
  // ... (a megfelelő helyen a JSX-ben, például a return előtt vagy a megfelelő szekcióban)
  // Példa:
  // {professions.map(profession => (
  //   <div key={profession}>
  //     <div>{profession}</div>
  //     <div style={{ display: "flex", gap: 4 }}>
  //       {Array.from({ length: professionMaxMap[profession] }).map((_, idx) => (
  //         <div key={idx} className="worker-plus">+</div>
  //       ))}
  //     </div>
  //   </div>
  // ))}

  React.useEffect(() => {
    if (addingIdx !== null && inputRef.current) inputRef.current.focus();
  }, [addingIdx]);

  const handleAdd = (idx: number) => {
    setAddingIdx(idx);
    setNewName("");
  };

  const handleSave = () => {
    if (newName.trim()) {
      setWorkers([
        ...workers,
        {
          id: Date.now(), // Unique ID, replace if you have a better generator
          name: newName.trim(),
          hired: false, // Default value for new worker
        },
      ]);
    }
    setAddingIdx(null);
    setNewName("");
  };

  // Csoportosítás szakma szerint
  // (megjegyzés: ne hagyjunk magában álló kifejezést, csak komment vagy érvényes kód lehet itt)

  // --- Modal megjelenítése ha van kiválasztott worker ---
  // Egyszerű overlay modal, bezárható kattintással vagy gombbal
  {
    (() =>
      selectedWorker ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSelectedWorker(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 300,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{ position: "absolute", top: 8, right: 8 }}
              onClick={() => setSelectedWorker(null)}
            >
              ✕
            </button>
            <h3>Részletek</h3>
            <div>
              <b>Név:</b> {selectedWorker.name}
            </div>

            {selectedWorker.id && (
              <div>
                <b>ID:</b> {selectedWorker.id}
              </div>
            )}
            {/* Itt bővítheted további mezőkkel is */}
          </div>
        </div>
      ) : null)();
    // 1. Compute max required professionals per profession
    const maxProfessionals: Record<string, number> = {};
    for (const item of workItems) {
      if (
        typeof item === "object" &&
        item !== null &&
        "requiredProfessionals" in item &&
        Array.isArray(
          (
            item as {
              requiredProfessionals?: { type?: string; quantity?: number }[];
            }
          ).requiredProfessionals
        )
      ) {
        const reqProfs = (
          item as {
            requiredProfessionals: { type?: string; quantity?: number }[];
          }
        ).requiredProfessionals;
        for (const prof of reqProfs) {
          if (!prof?.type) continue;
          const currMax = maxProfessionals[prof.type] || 0;
          if (typeof prof.quantity === "number" && prof.quantity > currMax)
            maxProfessionals[prof.type] = prof.quantity;
        }
      }
    }

    // 2. Group workers by profession (by name field, which should match prof.type)
    const grouped: Record<string, Worker[]> = {};
    for (const worker of workers) {
      const key = worker.name || "Ismeretlen szakma";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(worker);
    }

    return (
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
            textAlign: "center",
          }}
        >
          Munkások ({workers.filter((w) => w.hired).length} / {Object.values(workerIdToMaxNeeded).reduce((sum, n) => sum + n, 0)})
          <div>
            <ul>
              {workers.map((worker) => (
                <li key={worker.id}>
                  {worker.name}
                  {workerIdToMaxNeeded[worker.id] ? (
                    <span style={{ color: '#0070f3', marginLeft: 6 }}>
                      (szükséges: {workerIdToMaxNeeded[worker.id]})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
