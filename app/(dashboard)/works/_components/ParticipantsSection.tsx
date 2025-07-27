"use client";
import React, { useState, useRef } from "react";

type Worker = { id?: number|string, name?: string, email?: string };

// Accept any[] for initialWorkers to avoid TSX prop errors from parent
export default function ParticipantsSection({
  initialWorkers,
  totalWorkers
}: {
  initialWorkers: any[],
  totalWorkers: number
}) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [addingIdx, setAddingIdx] = useState<number|null>(null);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Új: kattintható körök eseménykezelője
  const handleClick = (worker: Worker) => {
    // Itt adhatsz hozzá bármilyen logikát, pl. részletek megnyitása, modal, stb.
    alert(`Kattintottál: ${worker.name || worker.email || worker.id}`);
  };

  React.useEffect(() => {
    if (addingIdx !== null && inputRef.current) inputRef.current.focus();
  }, [addingIdx]);

  const handleAdd = (idx: number) => {
    setAddingIdx(idx);
    setNewName("");
  };

  const handleSave = () => {
    if (newName.trim()) {
      setWorkers([...workers, { name: newName.trim() }]);
    }
    setAddingIdx(null);
    setNewName("");
  };

  // Helper to get initials or first 2 letters
  const getShort = (val?: string | number) => {
    if (!val) return "";
    const str = String(val);
    const parts = str.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return str.slice(0, 2).toUpperCase();
  };

  // Csoportosítás szakma szerint
  const grouped = workers.reduce((acc: Record<string, Worker[]>, curr) => {
    const key = curr.name || 'Ismeretlen szakma';
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 5px #eee', padding: '14px 18px', marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, letterSpacing: 0.5 }}>
        Résztvevők ({workers.length} / {totalWorkers})
      </div>
      {Object.entries(grouped).map(([profession, profWorkers]) => (
        <div key={profession} style={{ marginBottom: 2 }}>
          <div style={{ fontWeight: 600, fontSize: 20}}>{profession}</div>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end', minHeight: 80, flexWrap: 'nowrap', flexDirection: 'row',
            overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 10
          }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#e1e1e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, cursor: 'pointer', border: '2px dashed #d0d0d0', color: '#888', fontWeight: 600, userSelect: 'none',
                marginBottom: 2
              }}
              onClick={() => handleAdd(profWorkers.length)}
              title="Új résztvevő hozzáadása"
            >+</div>
            {addingIdx !== null && (
              <input
                ref={inputRef}
                style={{
                  width: 60, height: 40, borderRadius: '50%', background: '#f2f2f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: 16, border: '2px solid #e0e0e0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 2
                }}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setAddingIdx(null);
                }}
                placeholder="Új név..."
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
