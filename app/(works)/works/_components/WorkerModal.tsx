import React, { useState, useEffect, useTransition } from "react";
import { getWorkforce, addWorkforceMember } from "@/actions/workforce-actions";
import type { WorkItem } from "@/types/work";

interface WorkerModalProps {
  open: boolean;
  onClose: () => void;
  profession: string;
  onSave: (data: { name: string; email: string; mobile: string; profession: string; avatarUrl?: string }) => void;
  relevantWorkItems: WorkItem[];
}

interface WorkforceMember {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role?: string;

}

const WorkerModal: React.FC<WorkerModalProps> = ({ open, onClose, profession, onSave, relevantWorkItems }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [workers, setWorkers] = useState<WorkforceMember[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [relevantWorkItemsWithWorkers, setRelevantWorkItemsWithWorkers] = useState<WorkItem[]>(relevantWorkItems);

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>("");


  console.log(relevantWorkItemsWithWorkers, 'relevantWorkItemsWithWorkers')
  useEffect(() => {
    if (open) {
      getWorkforce().then(setWorkers);
      setIsNew(true);
      setName("");
      setEmail("");
      setMobile("");
      setSelectedId(null);
    }
  }, [open]);

  console.log(workers, 'WORKERS')

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedId(id);
    setIsNew(false);
    const worker = workers.find(w => w.id === id);
    if (worker) {
      setName(worker.name);
      setEmail(worker.email ?? "");
      setMobile(worker.phone ?? "");
    }
  };

  const handleSave = () => {
    if (!isNew && selectedId) {
      // Existing worker selected
      const worker = workers.find(w => w.id === selectedId);
      if (worker) {
        onSave({ name: worker.name, email: worker.email ?? "", mobile: worker.phone ?? "", profession });
      }
    } else {
      // Add new worker (just pass data up, all logic in ParticipantsSection)
      console.log('Saving worker, avatarUrl:', avatarUrl);
      onSave({ name, email, mobile, profession, avatarUrl });
    }
    onClose();
  };


  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          minWidth: 340,
          maxWidth: 380,
          width: "100%",
          padding: 28,
          boxShadow: "0 4px 24px #0002",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            color: "#888",
          }}
          onClick={onClose}
        >
          ×
        </button>
        <h2 style={{ textAlign: "center", marginBottom: 18 }}>Új munkás hozzáadása vagy kiválasztása</h2>
        {/* Toggle between add/select */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: 'center' }}>
          <button
            style={{
              padding: '6px 14px',
              borderRadius: 5,
              border: isNew ? '2px solid #0070f3' : '1px solid #ccc',
              background: isNew ? '#eaf4ff' : '#fff',
              fontWeight: isNew ? 700 : 500,
              cursor: 'pointer'
            }}
            onClick={() => setIsNew(true)}
          >
            Új munkás
          </button>
          <button
            style={{
              padding: '6px 14px',
              borderRadius: 5,
              border: !isNew ? '2px solid #0070f3' : '1px solid #ccc',
              background: !isNew ? '#eaf4ff' : '#fff',
              fontWeight: !isNew ? 700 : 500,
              cursor: 'pointer'
            }}
            onClick={() => setIsNew(false)}
          >
            Létező kiválasztása
          </button>
        </div>
        {!isNew && (
          <div style={{ marginBottom: 14 }}>
            <label>Válassz munkást:</label>
            <select
              value={selectedId ?? ''}
              onChange={handleSelect}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 5, marginTop: 2 }}
            >
              <option value="">-- Válassz --</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.email}, {w.phone})</option>
              ))}
            </select>
          </div>
        )}
        {(isNew || selectedId === null) && (
          <>
            {/* Avatar upload UI restored */}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>Szakma</label>
              <input
                type="text"
                value={profession}
                readOnly
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 5,
                  background: "#f6f6f6",
                  marginTop: 2,
                  marginBottom: 10,
                  color: "#666",
                  fontWeight: 600,
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>Név</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Név"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 5, marginTop: 2 }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 5, marginTop: 2 }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label>Mobil</label>
              <input
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Telefonszám"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 5, marginTop: 2 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Profilkép</label>
              {avatarPreview ? (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview("");
                      setAvatarUrl("");
                    }}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: '#fff',
                      border: '1px solid #f00',
                      color: '#f00',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 16,
                      boxShadow: '0 1px 4px #ccc',
                      zIndex: 2
                    }}
                    title="Profilkép törlése"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarError("");
                    setAvatarUploading(true);
                    setAvatarPreview(URL.createObjectURL(file));
                    const formData = new FormData();
                    formData.append("file", file);
                    console.log('UPLOAD started')
                    try {
                      const res = await fetch("/api/upload-avatar", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();
                      console.log(data.url, 'DATAURL')
                      if (data.url) {
                        setAvatarUrl(data.url);
                      } else {
                        setAvatarError(data.error || "Hiba történt a feltöltésnél.");
                        setAvatarUrl("");
                      }
                    } catch (err) {
                      setAvatarError("Hiba a feltöltés során.");
                      setAvatarUrl("");
                    } finally {
                      setAvatarUploading(false);
                    }
                  }}
                  style={{ marginBottom: 8 }}
                />
              )}
              {avatarUploading && <div style={{ color: '#0070f3', marginBottom: 4 }}>Feltöltés...</div>}
              {avatarError && <div style={{ color: 'red', marginBottom: 4 }}>{avatarError}</div>}
            </div>
            <button
              style={{
                width: "100%",
                padding: "10px 0",
                background: isPending ? "#999" : "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                fontWeight: 600,
                fontSize: 17,
                cursor: isPending ? "not-allowed" : "pointer",
                marginTop: 8,
                opacity: isPending ? 0.7 : 1
              }}
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? "Mentés..." : "Mentés"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkerModal;
