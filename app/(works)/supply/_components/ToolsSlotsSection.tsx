"use client";
import React, { useState } from "react";
import type { Tool as BaseTool, Tool } from "@/types/work";
import ToolRegisterModal from "./ToolRegisterModal";
// import { checkToolExists } from "../../../../actions/tool-exists.server";
import {
  addToolToRegistry,
  createWorkToolsRegistry,
  getAssignedToolsForWork,
  decrementWorkToolQuantity,
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

export type AssignedTool = {
  id: number;
  workId: number;
  toolId: number;
  toolName: string;
  displayName?: string | null;
  quantity: number;
  tool: Tool & { description: string | null };
};
import type { WorkItem } from "@/types/work";
type Props = { tools: Tool[]; workId: number; assignedTools: AssignedTool[]; workItems: WorkItem[] };

import ToolAddModal from "./ToolAddModal";
import { Button } from "@/components/ui/button";
const ToolsSlotsSection: React.FC<Props> = ({
  tools,
  workId,
  assignedTools: assignedToolsProp,
  workItems,
}) => {
  // Local state for assignedTools to enable instant UI update
  const [assignedTools, setAssignedTools] =
    useState<AssignedTool[]>(assignedToolsProp);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showToolDetailsModal, setShowToolDetailsModal] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState<number>(1);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [selectedTools, setSelectedTools] = useState<number[]>(() => {
  // Preselect based on required quantities aggregated from all work items (max per name)
  const requiredByName: Record<string, number> = {};
  workItems.forEach((wi) => {
    (wi.tools || []).forEach((t) => {
      const name = t.name;
      if (!name) return;
      const q = t.quantity ?? 1;
      requiredByName[name] = Math.max(requiredByName[name] || 0, q);
    });
  });
  return Object.entries(requiredByName)
    .map(([name, required]) => {
      const assignedCount = assignedTools
        .filter((at) => at.toolName === name)
        .reduce((sum, at) => sum + at.quantity, 0);
      const candidate = tools
        .filter((t) => t.name === name)
        .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0];
      return assignedCount >= required && candidate ? candidate.id : -1;
    })
    .filter((id) => id !== -1);
});

  // Checkbox toggle handler
  const handleToggle = async (id: number, toolName: string, required: number) => {
    const willBeChecked = !selectedTools.includes(id);
    setSelectedTools((prev) =>
      willBeChecked ? [...prev, id] : prev.filter((tid) => tid !== id)
    );

    // Increment logic when checking
    if (willBeChecked) {
      const assignments = assignedTools.filter(at => at.toolName === toolName);
      const assignedCount = assignments.reduce((sum, at) => sum + at.quantity, 0);
      const toAdd = required - assignedCount;
      if (toAdd > 0) {
        try {
          const tool = tools.find(t => t.id === id);
          if (!tool) {
            toast.error("Nem található a kiválasztott eszköz!");
            return;
          }
          await createWorkToolsRegistry(workId, tool.id, toAdd, tool.name);
          toast.success("A szükséges mennyiségre kiegészítve az eszköz hozzárendelése.");
          await fetchAssignedToolsAndUpdateState();
        } catch (err) {
          toast.error("Nem sikerült növelni az eszköz mennyiségét: " + (err as Error).message);
        }
      }
    } else {
      // Decrement logic when unchecking: remove all assignments for this tool
      const assignments = assignedTools.filter(at => at.toolName === toolName);
      let errors = 0;
      for (const at of assignments) {
        for (let i = 0; i < at.quantity; i++) {
          try {
            await decrementWorkToolQuantity(at.id);
          } catch (err) {
            errors++;
            toast.error("Nem sikerült törölni az eszköz hozzárendelését: " + (err as Error).message);
            break;
          }
        }
      }
      if (assignments.length > 0 && errors === 0) {
        toast.success("Az összes hozzárendelés eltávolítva az eszközből.");
      }
      await fetchAssignedToolsAndUpdateState();
    }
  };

  // Helper to fetch assignedTools from server and update state
  const fetchAssignedToolsAndUpdateState = async () => {
    try {
      const updated = await getAssignedToolsForWork(workId);
      setAssignedTools(updated);
    } catch (err) {
      toast.error(
        "Nem sikerült frissíteni az eszközök listáját! " +
          (err as Error).message
      );
    }
  };

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
          description,
          tool.displayName ?? ""
        );
        await createWorkToolsRegistry(
          workId,
          savedTool.id,
          quantity,
          savedTool.name
        );
        toast.success(
          "Sikeres mentés! Az eszköz elmentve és hozzárendelve a munkához."
        );
      }
      // Always refresh assignedTools after save
      await fetchAssignedToolsAndUpdateState();
    } catch (err) {
      toast.error("Hiba történt a mentés során. Kérjük, próbáld újra!");
      console.error("Tool save error:", err);
    }
  };

  if (!tools.length) return null;

  // Build display list from required tools across ALL work items (max quantity per name)
  type DisplayTool = { name: string; required: number; tool: Tool };
  const requiredByName: Record<string, number> = {};
  workItems.forEach((wi) => {
    (wi.tools || []).forEach((t) => {
      const name = t.name;
      if (!name) return;
      const q = t.quantity ?? 1;
      requiredByName[name] = Math.max(requiredByName[name] || 0, q);
    });
  });

  const displayTools: DisplayTool[] = Object.entries(requiredByName).map(
    ([name, required]) => {
      const registryCandidates = tools
        .filter((t) => t.name === name)
        .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));
      const candidate =
        registryCandidates[0] || ({ id: -1, name, quantity: required } as Tool);
      // Ensure the displayed quantity reflects requirement, not registry stock
      return { name, required, tool: { ...candidate, quantity: required } };
    }
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <ToolAddModal
        open={showAddToolModal}
        onOpenChange={setShowAddToolModal}
        onSubmit={async ({ name, quantity, workItemId }) => {
          // Itt kell meghívni a megfelelő szerver oldali függvényt (pl. addToolToRegistry és createWorkToolsRegistry)

          console.log(workItemId)
          try {
            const savedTool = await addToolToRegistry(name, quantity, '', name);
            await createWorkToolsRegistry(workId, savedTool.id, quantity, savedTool.name);
            toast.success("Új eszköz sikeresen hozzáadva!");
            await fetchAssignedToolsAndUpdateState();
          } catch (err) {
            toast.error("Hiba az eszköz hozzáadásakor: " + (err as Error).message);
          }
        }}
        workItems={workItems}
      />
    
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>Szükséges eszközök</span>
        <div style={{ flex: 1, height: 1 }} />
        <Button
          onClick={() => setShowAddToolModal(true)}
          variant="outline"
          aria-label="Új eszköz hozzáadása"
          className="border border-[#FF9900] text-[#FF9900] bg-white z-20 hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
          style={{ marginLeft: 8, width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}
        >
          +
        </Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {displayTools.map(({ name, required, tool }) => {
          const q = required;
          const assignedCount = assignedTools
            .filter((at) => at.toolName === name)
            .reduce((sum, at) => sum + at.quantity, 0);
          const hasRegistry = tools.some((t) => t.name === name);
          return (
            <div key={name}>
              <div
                className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1 cursor-pointer hover:bg-[#ececec]"
                onClick={() => {
                  setSelectedTool(tool);
                  setMaxQuantity(q);
                  setModalOpen(true);
                }}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool.id) || assignedCount >= q}
                    onChange={e => { e.stopPropagation(); handleToggle(tool.id, name, q); }}
                    className="mr-2.5 w-[18px] h-[18px]"
                    disabled={!hasRegistry}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-2 font-semibold flex items-center gap-2">
                    <span>{name}</span>
                    {!hasRegistry && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                        nincs regisztrálva
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {/* Tool image preview */}
                    {tool.avatarUrl && (
                      <img
                        src={tool.avatarUrl}
                        alt="tool"
                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid #ddd', background: '#fafafa' }}
                      />
                    )}
                    {/* No inline register button per request */}
                    <div className="font-semibold text-[14px] text-[#222] flex items-center">
                      <span>{assignedCount}</span>
                      <span className="mx-1">/</span>
                      <span>{q}</span>
                      <span className="ml-1">db</span>
                    </div>
                  </div>
                </div>
                <div className="w-2/3 mt-2">
                  <div className="bg-[#e0e0e0] rounded-lg h-4 w-full overflow-hidden relative">
                    {/* Filled green bar */}
                    <div
                      className="bg-green-400 h-4 absolute left-0 top-0 transition-all duration-300"
                      style={{ width: `${Math.min((assignedCount / q) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
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
      <ToolDetailsModal
        open={showToolDetailsModal}
        onClose={() => setShowToolDetailsModal(false)}
        tool={selectedTool}
      />
    </div>
  );
};

export default ToolsSlotsSection;
