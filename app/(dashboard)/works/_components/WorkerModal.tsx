import React, { useState } from "react";

interface WorkerModalProps {
  open: boolean;
  onClose: () => void;
  profession: string;
  onSave: (data: { name: string; email: string; mobile: string; profession: string }) => void;
}

const WorkerModal: React.FC<WorkerModalProps> = ({ open, onClose, profession, onSave }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

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
        <h2 style={{ textAlign: "center", marginBottom: 18 }}>Új munkás hozzáadása</h2>
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
        <button
          style={{
            width: "100%",
            padding: "10px 0",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            fontWeight: 600,
            fontSize: 17,
            cursor: "pointer",
            marginTop: 8,
          }}
          onClick={() => {
            onSave({ name, email, mobile, profession });
          }}
        >
          Mentés
        </button>
      </div>
    </div>
  );
};

export default WorkerModal;
