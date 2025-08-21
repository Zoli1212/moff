import React, { useState, useEffect, useTransition, useRef } from "react";
import { getWorkforce } from "@/actions/workforce-actions";
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

export const WorkerModal: React.FC<WorkerModalProps> = ({ open, onClose, profession, onSave, relevantWorkItems }) => {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);


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

  console.log(workers, 'WORKERS', startTransition, setRelevantWorkItemsWithWorkers)

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
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Profilkép</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={avatarPreview || avatarUrl || '/worker.jpg'}
                    alt="Avatar preview"
                    style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e6e6e6', boxShadow: '0 2px 8px #0001' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#111',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 16,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: '0 1px 6px #0002'
                    }}
                  >
                    {avatarPreview || avatarUrl ? 'Csere' : 'Kép feltöltése'}
                  </button>
                  {(avatarPreview || avatarUrl) && (
                    <button
                      type="button"
                      onClick={() => { setAvatarPreview(""); setAvatarUrl(""); setAvatarError(""); }}
                      title="Profilkép törlése"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#fff',
                        border: '1px solid #ddd',
                        color: '#d00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px #0002',
                        fontWeight: 700
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    ref={fileInputRef}
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
                      try {
                        const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
                        const data = await res.json();
                        if (data.url) {
                          setAvatarUrl(data.url);
                        } else {
                          setAvatarError(data.error || "Hiba történt a feltöltésnél.");
                          setAvatarUrl("");
                          setAvatarPreview("");
                        }
                      } catch (err) {
                        setAvatarError("Hiba a feltöltés során.");
                        setAvatarUrl("");
                        setAvatarPreview("");
                      } finally {
                        setAvatarUploading(false);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: 12, color: '#666' }}>PNG vagy JPG, max 5MB</div>
                  {avatarUploading && (
                    <div style={{ marginTop: 8, height: 6, background: '#f1f1f1', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #0070f3, #42a5f5)', animation: 'progressSlide 1.2s infinite linear' }}></div>
                    </div>
                  )}
                  {avatarError && <div style={{ color: 'red', marginTop: 6, fontSize: 12 }}>{avatarError}</div>}
                </div>
              </div>
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


