"use cliente";
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
  const [displayName, setDisplayName] = useState<string>(
    requiredToolName || ""
  );
  const [customDescription, setCustomDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState("");
  const [toolAvailable, setToolAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Tool image upload state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>("");

  console.log(tools, "RGT");

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

  const findToolInRegistryByName = async (name: string) => {
    const res = await import("../../../../actions/tools-registry-actions");
    const allTools = await res.getToolsRegistryByTenant();
    return allTools.find((t: Tool) => t.name === name);
  };

  // Csak a slothoz tartozó eszköz választható
  const filteredTools = requiredToolName
    ? tools.filter((t) => t.name === requiredToolName)
    : tools;
  const isOutOfStock = filteredTools.length === 0;

  const handleSave = async () => {
    // Validáció
    if (!toolName) {
      setError("Add meg az eszköz nevét!");
      return;
    }

    if (!quantity || quantity < 1 || quantity > maxQuantity) {
      setError(`A mennyiség 1 és ${maxQuantity} között kell legyen!`);
      return;
    }
    // Megnézzük, van-e ilyen nevű eszköz a filteredTools-ban
    const resolvedDisplayName = displayName || requiredToolName;
    let found = filteredTools.find(
      (t) => t.id === selectedToolId || t.name === selectedToolId
    );

    // Ha nem találtad a filteredTools-ban, akkor nézd meg a registry-ben (API hívás)
    if (!found) {
      found = await findToolInRegistryByName(toolName);
    }
    if (found) {
      // Már létező eszköz, csak hozzárendelés
      const tool = {
        ...found,
        name: toolName,
        displayName: resolvedDisplayName,
        description: customDescription,
        avatarUrl,
      };
      setError("");
      onSave(tool, quantity, customDescription);
      onClose();
    } else {
      // Nem létező eszköz: regisztráljuk, majd hozzárendeljük
      const newTool = {
        id: -1,
        name: toolName,
        displayName: resolvedDisplayName,
        description: customDescription,
        quantity,
        avatarUrl,
      };
      setError("");
      onSave(newTool, quantity, customDescription);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 6px 32px 0 rgba(0,0,0,0.15)",
          padding: 20,
          width: "100%",
          maxWidth: 370,
          minWidth: 0,
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            marginBottom: 4,
            textAlign: "center",
            letterSpacing: 0.2,
          }}
        >
          Eszköz kiválasztása
        </h2>
        {/* Tool image upload UI */}
        <div style={{ marginBottom: 0 }}>
          <label
            style={{
              fontWeight: 500,
              display: "block",
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            Kis kép (opcionális)
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
              marginBottom: 6,
            }}
          >
            <label
              htmlFor="tool-avatar-upload"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: avatarPreview ? "2px solid #0070f3" : "2px dashed #bbb",
                background: avatarPreview ? "#f5faff" : "#fafbfc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "border 0.2s",
                position: "relative",
                boxShadow: avatarPreview ? "0 2px 8px #0070f311" : "none",
              }}
              title="Kis kép kiválasztása"
            >
              {avatarPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setAvatarPreview("");
                    setAvatarUrl("");
                  }}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    background: "transparent",
                    border: ".5px solid #f00",
                    color: "#f00",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: 22,
                    zIndex: 2000,
                    pointerEvents: "auto",
                    transition: "box-shadow 0.15s",
                  }}
                  title="Kép törlése"
                >
                  ×
                </button>
              )}
              {avatarPreview ? (
                <span
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 64,
                    height: 64,
                    overflow: "visible",
                  }}
                >
                  <img
                    src={avatarPreview}
                    alt="Tool preview"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: "cover",
                      borderRadius: "50%",
                      display: "block",
                    }}
                  />
                </span>
              ) : (
                <span
                  style={{
                    color: "#bbb",
                    fontSize: 28,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    fill="none"
                    stroke="#bbb"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#888", marginTop: 3 }}>
                    Kép feltöltése
                  </span>
                </span>
              )}

              <input
                id="tool-avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarError("");
                  setAvatarUploading(true);
                  setAvatarPreview(URL.createObjectURL(file));
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await fetch("/api/upload-avatar", {
                      method: "POST",
                      body: formData,
                    });
                    const data = await res.json();
                    if (data.url) {
                      setAvatarUrl(data.url);
                    } else {
                      setAvatarError(
                        data.error || "Hiba történt a feltöltésnél."
                      );
                      setAvatarUrl("");
                    }
                  } catch (err) {
                    setAvatarError("Hiba a feltöltés során.");
                    setAvatarUrl("");
                    console.log(err);
                  } finally {
                    setAvatarUploading(false);
                  }
                }}
              />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, color: "#888" }}>
                Max 1 kép, 2 MB
              </span>
              {avatarUploading && (
                <span style={{ color: "#0070f3", fontSize: 13 }}>
                  Feltöltés...
                </span>
              )}
              {avatarError && (
                <span style={{ color: "red", fontSize: 13 }}>
                  {avatarError}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* End Tool image upload UI */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500, marginBottom: 2 }}>
            Választható eszköz:
          </label>
          <select
            value={
              toolAvailable === false && requiredToolName
                ? "nem_elérhető"
                : selectedToolId || requiredToolName || ""
            }
            onChange={(e) => setSelectedToolId(e.target.value)}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 16,
              background: toolAvailable === false ? "#fbeaea" : "#fafbfc",
              color: toolAvailable === false ? "#d32f2f" : "#222",
              outline: "none",
              width: "100%",
            }}
            disabled={loading}
          >
            {loading ? (
              <option value="">Ellenőrzés...</option>
            ) : toolAvailable === false && requiredToolName ? (
              <option value="nem_elérhető" disabled style={{ color: "red" }}>
                nem elérhető
              </option>
            ) : (
              <option value={requiredToolName}>{requiredToolName}</option>
            )}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500, marginBottom: 2 }}>Név:</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 16,
              background: !!requiredToolName ? "#f5f5f5" : "#fafbfc",
              outline: "none",
            }}
            required
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>
            Leírás <span style={{ color: "#e53935" }}>*</span>:
          </label>
          <textarea
            value={customDescription || ""}
            onChange={(e) => setCustomDescription(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 16,
              minHeight: 54,
              background: "#fafbfc",
              outline: "none",
              resize: "vertical",
            }}
            placeholder="Rövid leírás az eszközről"
            required
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontWeight: 500, minWidth: 72 }}>
            Mennyiség <span style={{ color: "#e53935" }}>*</span>:
          </label>
          <input
            type="number"
            value={quantity}
            min={1}
            max={maxQuantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={{
              width: 80,
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 16,
              background: isOutOfStock ? "#f5f5f5" : "#fafbfc",
              outline: "none",
            }}
            required
            disabled={isOutOfStock}
          />
          <span style={{ color: "#888", fontSize: 15 }}>
            (max: {maxQuantity})
          </span>
        </div>
        {error && (
          <div
            style={{
              color: "#e53935",
              fontWeight: 500,
              marginTop: 2,
              marginBottom: -8,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "#f2f2f2",
              color: "#333",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
              fontSize: 17,
              transition: "background 0.2s",
              marginRight: 2,
            }}
          >
            Mégse
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "12px 0",
              background: isOutOfStock ? "#bdbdbd" : "#1976d2",
              color: "#fff",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 17,
              boxShadow: isOutOfStock ? "none" : "0 2px 8px 0 #1976d233",
              cursor: isOutOfStock ? "not-allowed" : "pointer",
              opacity: isOutOfStock ? 0.7 : 1,
              marginLeft: 2,
            }}
            disabled={isOutOfStock}
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolRegisterModal;
