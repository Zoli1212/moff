'use cliente'
import React, { useState } from "react";
import type { Tool } from "@/types/work";

interface ToolRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tool: Tool, quantity: number, description: string) => void;
  tools: Tool[];
  maxQuantity: number;
  requiredToolName?: string; // ÚJ: csak ezt lehet kiválasztani
}

import { checkToolExists } from "../../../../actions/tool-exists.server";

const ToolRegisterModal: React.FC<ToolRegisterModalProps> = ({
  open,
  onClose,
  onSave,
  tools,
  maxQuantity,
  requiredToolName,
}) => {
  const [selectedToolId, setSelectedToolId] = useState<string | number>("");
  const [toolName, setToolName] = useState<string>(requiredToolName || "");
  const [customDescription, setCustomDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState("");
  const [toolAvailable, setToolAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  
  React.useEffect(() => {
    if (open && requiredToolName) {
      setLoading(true);
      checkToolExists(requiredToolName)
      .then((exists) => setToolAvailable(exists))
      .catch(() => setToolAvailable(false))
      .finally(() => setLoading(false));
    } else {
      setToolAvailable(null);
    }
  }, [open, requiredToolName]);
  
  React.useEffect(() => {
    if (requiredToolName) setToolName(requiredToolName);
  }, [requiredToolName]);
  if (!open) return null;

  // Csak a slothoz tartozó eszköz választható
  const filteredTools = requiredToolName
    ? tools.filter(t => t.name === requiredToolName)
    : tools;
  const isOutOfStock = filteredTools.length === 0;

  const handleSave = () => {
    // Validáció
    if (!toolName) {
      setError("Add meg az eszköz nevét!");
      return;
    }
    if (!customDescription) {
      setError("A leírás kötelező!");
      return;
    }
    if (!quantity || quantity < 1 || quantity > maxQuantity) {
      setError(`A mennyiség 1 és ${maxQuantity} között kell legyen!`);
      return;
    }
    // Megnézzük, van-e ilyen nevű eszköz a filteredTools-ban
    const found = filteredTools.find((t) => t.id === selectedToolId || t.name === selectedToolId);
    if (found) {
      // Már létező eszköz, csak hozzárendelés
      const tool = { ...found, description: customDescription };
      setError("");
      onSave(tool, quantity, customDescription);
      onClose();
    } else {
      // Nem létező eszköz: regisztráljuk, majd hozzárendeljük
      const newTool = { id: -1, name: toolName, description: customDescription, quantity };
      setError("");
      onSave(newTool, quantity, customDescription);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 28, minWidth: 340, maxWidth: 400 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Eszköz kiválasztása</h2>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontWeight: 500, marginBottom: 0, minWidth: 120 }}>Választható eszköz:</label>
          <select
            value={toolAvailable === false && requiredToolName ? 'nem_elérhető' : (selectedToolId || requiredToolName || '')}
            onChange={e => setSelectedToolId(e.target.value)}
            style={{ flex: 1, minWidth: 120 }}
          >
            {loading ? (
              <option value="">Ellenőrzés...</option>
            ) : toolAvailable === false && requiredToolName ? (
              <option value="nem_elérhető" disabled style={{ color: 'red' }}>nem elérhető</option>
            ) : (
              <option value={requiredToolName}>{requiredToolName}</option>
            )}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 500, marginBottom: 0, minWidth: 40 }}>Név:</label>
          <input
            value={toolName}
            onChange={e => setToolName(e.target.value)}
            disabled={!!requiredToolName}
            style={{ width: '100%' }}
            required
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 500 }}>Leírás <span style={{ color: "red" }}>*</span>:</label>
          <textarea
            value={customDescription || ""}
            onChange={e => setCustomDescription(e.target.value)}
            style={{ width: "100%", marginTop: 6, minHeight: 50 }}
            placeholder="Rövid leírás az eszközről"
            required
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500 }}>Mennyiség <span style={{ color: "red" }}>*</span>:</label>
          <input
            type="number"
            value={quantity}
            min={1}
            max={maxQuantity}
            onChange={e => setQuantity(Number(e.target.value))}
            style={{ width: 80, marginLeft: 8 }}
            required
            disabled={isOutOfStock}
          />
          <span style={{ marginLeft: 8, color: "#888" }}>(max: {maxQuantity})</span>
        </div>
        {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "6px 16px", background: "#eee", borderRadius: 6, border: "none" }}>Mégse</button>
          <button onClick={handleSave} style={{ padding: "6px 16px", background: isOutOfStock ? '#aaa' : '#007bff', color: "#fff", borderRadius: 6, border: "none" }} disabled={isOutOfStock}>
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolRegisterModal;
