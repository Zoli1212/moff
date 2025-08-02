import React from "react";

export interface WorkerDetailsModalProps {
  open: boolean;
  onClose: () => void;
  worker: {
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    profession?: string;
    id?: number;
  } | null;
  onDelete?: () => void;
}

const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({ open, onClose, worker, onDelete }) => {
  if (!open || !worker) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 12,
          minWidth: 340,
          maxWidth: 400,
          position: "relative",
          boxShadow: "0 4px 32px #0002",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontSize: 22,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#888",
          }}
          onClick={onClose}
          aria-label="Bezárás"
        >
          ✕
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <img
            src={worker.avatarUrl && worker.avatarUrl !== '' ? worker.avatarUrl : "/worker.jpg"}
            alt={worker.name}
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #eee", marginBottom: 10 }}
          />
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>{worker.name}</div>
          {worker.profession && <div style={{ color: "#555", fontSize: 15 }}>{worker.profession}</div>}
          {worker.email && <div style={{ color: "#333", fontSize: 15 }}><b>Email:</b> {worker.email}</div>}
          {worker.phone && <div style={{ color: "#333", fontSize: 15 }}><b>Telefon:</b> {worker.phone}</div>}
          {worker.id && <div style={{ color: "#888", fontSize: 14 }}><b>ID:</b> {worker.id}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <button
            style={{
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 22px',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onClick={onDelete}
            disabled={!onDelete}
          >
            Törlés
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailsModal;
