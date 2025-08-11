"use client";
import React, { useState } from "react";
import type { Tool as BaseTool } from "@/types/work";
import ToolRegisterModal from "./ToolRegisterModal";
import { checkToolExists } from "../../../../actions/tool-exists.server";
import {
  addToolToRegistry,
  createWorkToolsRegistry,
} from "../../../../actions/tools-registry-actions";
import { toast } from "sonner";

// ToolDetailsModal for viewing tool details
const ToolDetailsModal = ({
  open,
  onClose,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  tool: BaseTool | null;
}) => {
  if (!open || !tool) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1000,
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          minWidth: 260,
          boxShadow: "0 4px 24px #0002",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
          {tool.name}
        </h2>
        <div style={{ fontSize: 16, marginBottom: 8 }}>
          Mennyiség: <b>{tool.quantity}</b> db
        </div>
      </div>
    </div>
  );
};

type Tool = BaseTool;
type AssignedTool = {
  id: number;
  workId: number;
  toolId: number;
  toolName: string;
  quantity: number;
  tool: Tool & { description?: string };
};
type Props = { tools: Tool[]; workId: number; assignedTools: AssignedTool[] };

const ToolsSlotsSection: React.FC<Props> = ({
  tools,
  workId,
  assignedTools: assignedToolsProp,
}) => {
  // Local state for assignedTools to enable instant UI update
  const [assignedTools, setAssignedTools] =
    useState<AssignedTool[]>(assignedToolsProp);
  // DEBUG: Log fóliavágó tool.id and assignedTools
  const foliavagotool = tools.find((t) => t.name === "fóliavágó");
  if (foliavagotool) {
    console.log(
      "DEBUG fóliavágó tool:",
      foliavagotool,
      "assignedTools:",
      assignedTools
    );
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showToolDetailsModal, setShowToolDetailsModal] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState<number>(1);

  const handleSave = async (
    tool: Tool,
    quantity: number,
    description: string
  ) => {
    try {
      if (tool.id && tool.id !== -1) {
        // Már létező eszköz, csak hozzárendelés
        await createWorkToolsRegistry(workId, tool.id, quantity, tool.name);
        toast.success("Az eszköz sikeresen hozzárendelve a munkához!");
      } else {
        // Nem létező eszköz: regisztráljuk, majd hozzárendeljük
        const savedTool = await addToolToRegistry(
          tool.name,
          quantity,
          description
        );
        await createWorkToolsRegistry(
          workId,
          savedTool.id,
          quantity,
          tool.name
        );
        toast.success(
          "Sikeres mentés! Az eszköz elmentve és hozzárendelve a munkához."
        );
      }
    } catch (err) {
      toast.error("Hiba történt a mentés során. Kérjük, próbáld újra!");
      console.error("Tool save error:", err);
    }
  };

  if (!tools.length) return null;

  // Group tools by name, but only keep the one with the highest quantity for each name
  const grouped: Record<string, Tool> = {};
  tools.forEach((tool) => {
    if (
      !grouped[tool.name] ||
      (tool.quantity ?? 1) > (grouped[tool.name].quantity ?? 1)
    ) {
      grouped[tool.name] = tool;
    }
  });

  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Szükséges eszközök
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {Object.entries(grouped).map(([name, tool]) => {
          const q = tool.quantity ?? 1;
          return (
            <div
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 6,
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
                {name}{" "}
                <span style={{ fontWeight: 400, fontSize: 15, color: "#888" }}>
                  ({q})
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 8,
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                {Array.from({ length: q }).map((_, idx) => {
                  // DEBUG LOGGING
                  console.log("SLOT: tool.id", tool.id, "tool.name", tool.name);
                  console.log(
                    "assignedTools:",
                    assignedTools.map((at) => ({
                      toolId: at.toolId,
                      quantity: at.quantity,
                    }))
                  );
                  const assigned = assignedTools.find(
                    (at) => at.toolName === tool.name
                  );
                  console.log(
                    "assigned for slot tool.id",
                    tool.id,
                    ":",
                    assigned
                  );
                  const filledCount = assigned ? assigned.quantity : 0;
                  const isFilled = idx < filledCount;
                  return (
                    <button
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 80,
                        height: 40,
                        border: isFilled
                          ? "2px solid #27ae60"
                          : "1px dashed #aaa",
                        borderRadius: 6,
                        color: isFilled ? "#27ae60" : "#888",
                        background: isFilled ? "#eafbe7" : "#fafbfc",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "background .2s",
                        position: "relative",
                      }}
                      onClick={() => {
                        setSelectedTool(tool);
                        setMaxQuantity(tool.quantity ?? 1);
                        setModalOpen(true);
                      }}
                      title={tool.name}
                    >
                      {tool.name}
                      {isFilled ? (
                        <span
                          style={{
                            fontSize: 28,
                            fontWeight: 900,
                            color: "#e74c3c",
                            cursor: "pointer",
                            opacity: 0.7,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            left: 0,
                            top: '20%',
                            zIndex: 10,
                            background: "transparent",
                            transition: "opacity 0.2s",
                          }}
                          title="Slot törlése"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!assigned) return;
                            try {
                              const res = await import("../../../../actions/tools-registry-actions");
                              await res.decrementWorkToolQuantity(assigned.id);
                              toast.success("Slot törölve!");
                              setAssignedTools((prev) => {
                                return prev.map((at) =>
                                  at.id === assigned.id && at.quantity > 1
                                    ? { ...at, quantity: at.quantity - 1 }
                                    : at
                                ).filter((at) => at.id !== assigned.id || at.quantity > 0);
                              });
                            } catch (err) {
                              toast.error("Nem sikerült törölni a slotot!");
                            }
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
                        >
                          ×
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#888",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            left: 0,
                            top: '30%',
                            zIndex: 5,
                          }}
                        >
                          +
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {modalOpen && (
        <ToolRegisterModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          tools={
            selectedTool
              ? tools.filter((t) => t.name === selectedTool.name)
              : []
          }
          maxQuantity={maxQuantity}
          requiredToolName={selectedTool?.name}
        />
      )}
      {modalOpen &&
        selectedTool &&
        tools.filter((t) => t.name === selectedTool.name).length === 0 && (
          <div style={{ color: "red", textAlign: "center", marginTop: 12 }}>
            Nincs raktáron ilyen eszköz!
          </div>
        )}
      <ToolDetailsModal
        open={showToolDetailsModal}
        onClose={() => setShowToolDetailsModal(false)}
        tool={selectedTool}
      />
    </div>
  );
};

export default ToolsSlotsSection;
