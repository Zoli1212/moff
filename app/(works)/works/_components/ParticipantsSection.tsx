"use client";
import React, { useState, useRef } from "react";
import { toast } from "sonner";

import type { Worker, WorkItem } from "@/types/work";

import WorkerModal from "./WorkerModal";
import { registerAndUpdateWorkItemWorker } from "@/actions/workitemworker-actions";
import { getWorkforce, addWorkforceMember } from "@/actions/workforce-actions";
import { getWorkItemWorkerByWorkItemId } from "@/actions/get-workitemworker-by-workitemid";
import { updateWorkersMaxRequiredAction } from "@/actions/update-workers-maxrequired";

export default function ParticipantsSection({
  initialWorkers,
  workItems = [],
  workId,
}: {
  initialWorkers: Worker[];
  totalWorkers: number;
  workItems?: WorkItem[];
  workId: number;
}) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers as Worker[]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProfession, setModalProfession] = useState<string | null>(null);

  const handleOpenModal = (profession: string) => {
    setModalProfession(profession);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setModalProfession(null);
  };

  console.log("DEBUG workers:", workers, workItems);
  const handleSaveWorker = async (data: {
    name: string;
    email: string;
    mobile: string;
    profession: string;
    id?: number;
  }) => {
    try {
      
      let workforceRegistryId = data.id;
      // 1. Ha nincs id, keresd a WorkforceRegistry-ben (API)
      if (!workforceRegistryId) {
        const found = await getWorkforce();
        if (found && found.length > 0) {
          workforceRegistryId = found[0].id;
        }
      }
      // 2. Ha továbbra sincs, akkor regisztráld be (API)
      if (!workforceRegistryId) {
        const created = await addWorkforceMember({
          name: data.name,
          email: data.email,
          phone: data.mobile,
        });
        workforceRegistryId = created.id;
      }
      // 3. Most már biztosan van workforceRegistryId, hozzárendelés:
      const workItem = workItems.find(
        (wi) => wi.name === data.profession && wi.workId === workId
      );
      if (!workItem || typeof workItem.id !== 'number') return;
      // Keresd ki a WorkItemWorker rekordot szerver oldali action-nel
      const workItemWorker = await getWorkItemWorkerByWorkItemId({
        workItemId: workItem.id,
        workforceRegistryId,
      });
      
      if (!workItemWorker) return;
      if(typeof workItemWorker.id !== 'number' || !workforceRegistryId) return;
      await registerAndUpdateWorkItemWorker({
        id: workItemWorker.id,
        name: data.name,
        email: data.email,
        phone: data.mobile,
        workforceRegistryId,
      });
      setModalOpen(false);
      setModalProfession(null);
      toast.success("Sikeres mentés! A résztvevő elmentve.");
    } catch (e) {
      toast.error("Hiba történt a mentés során. Kérjük, próbáld újra!");
    }
  };
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  // const [newName, setNewName] = useState("");
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

  React.useEffect(() => {
    updateWorkersMaxRequiredAction(workId, workerIdToMaxNeeded);
    // eslint-disable-next-line
  }, [workId, JSON.stringify(workerIdToMaxNeeded)]);





  // Új: kattintható körök eseménykezelője
  // const handleClick = (worker: Worker) => {
  //   setSelectedWorker(worker);
  // };

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

  // const handleAdd = (idx: number) => {
  //   setAddingIdx(idx);
  //   setNewName("");
  // };

  // const handleSave = () => {
  //   if (newName.trim()) {
  //     setWorkers([
  //       ...workers,
  //       {
  //         id: Date.now(), // Unique ID, replace if you have a better generator
  //         name: newName.trim(),
  //         hired: false, // Default value for new worker
  //       },
  //     ]);
  //   }
  //   setAddingIdx(null);
  //   setNewName("");
  // };

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
      <>
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
            Munkások ({workers.filter((w) => w.hired).length} /{" "}
            {Object.values(workerIdToMaxNeeded).reduce((sum, n) => sum + n, 0)})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {professions.map((profession) => {
              // Az adott szakmához tartozó workerek
              const professionWorkers = workers.filter(
                (w) => w.name === profession
              );
              // Max szükséges ebből a szakmából (összes worker id alapján)
              const maxNeeded = Math.max(
                ...professionWorkers.map((w) => workerIdToMaxNeeded[w.id] || 0),
                1
              );
              // Slotok: meglévő workerek + üres helyek
              const slots = [];
              for (let i = 0; i < maxNeeded; i++) {
                slots.push(
                  <div
                    key={`plus-${profession}-${i}`}
                    className="worker-tile worker-plus"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 80,
                      height: 40,
                      border: "1px dashed #aaa",
                      borderRadius: 6,
                      marginRight: 6,
                      color: "#222",
                      cursor: "pointer",
                      background: "#fafbfc",
                      fontWeight: 600,
                      fontSize: 14,
                      gap: 0,
                    }}
                    onClick={() => {
                      if (!modalOpen) handleOpenModal(profession);
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#bbb",
                        marginBottom: 1,
                        opacity: 0.7,
                        textAlign: "center",
                        width: "100%",
                        lineHeight: 1.1,
                        whiteSpace: "pre-line",
                        pointerEvents: "none",
                      }}
                    >
                      {profession}
                    </span>
                    <span
                      style={{
                        fontSize: 22,
                        color: "#888",
                        fontWeight: 700,
                        lineHeight: 1,
                        textAlign: "center",
                        width: "100%",
                        pointerEvents: "none",
                      }}
                    >
                      +
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={profession}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: 16,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      marginBottom: 4,
                      color: "#222",
                      textAlign: "center",
                      width: "100%",
                      letterSpacing: 0.2,
                    }}
                  >
                    {profession}{" "}
                    <span
                      style={{ fontWeight: 400, fontSize: 15, color: "#888" }}
                    >
                      ({maxNeeded})
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    {slots}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <WorkerModal
          open={modalOpen}
          onClose={handleCloseModal}
          profession={modalProfession || ""}
          onSave={handleSaveWorker}
          relevantWorkItems={relevantWorkItems}
        />
      </>
    );
  }
}
