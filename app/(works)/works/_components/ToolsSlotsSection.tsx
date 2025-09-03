"use client";
import React, { useState } from "react";
import type { Tool as BaseTool, Tool } from "@/types/work";
import ToolRegisterModal from "./ToolRegisterModal";
// import { checkToolExists } from "../../../../actions/tool-exists.server";
import {
  addToolToRegistry,
  createWorkToolsRegistry,
  getAssignedToolsForWork,
} from "../../../../actions/tools-registry-actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ToolAddModal from "./ToolAddModal";

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
type Props = { tools: Tool[]; workId: number; assignedTools: AssignedTool[]; workItems?: any[] };

const ToolsSlotsSection: React.FC<Props> = ({
  tools,
  workId,
  assignedTools: assignedToolsProp,
  workItems = [],
}) => {
  // Local state for assignedTools to enable instant UI update
  const [assignedTools, setAssignedTools] =
    useState<AssignedTool[]>(assignedToolsProp);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showToolDetailsModal, setShowToolDetailsModal] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState<number>(1);
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);

  // Helper to fetch assignedTools from server and update state
  const fetchAssignedToolsAndUpdateState = async () => {
    try {
      const updated = await getAssignedToolsForWork(workId);
      setAssignedTools(updated);
    } catch (err) {
      toast.error("Nem sikerült frissíteni az eszközök listáját! " + (err as Error).message);
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

  const handleAddNewTool = async (data: {
    name: string;
    description: string;
    quantity: number;
    workItemId: number;
  }) => {
    try {
      // Create new tool in registry
      const savedTool = await addToolToRegistry(
        data.name,
        data.quantity,
        data.description,
        data.name
      );
      
      // Assign to work
      await createWorkToolsRegistry(
        workId,
        savedTool.id,
        data.quantity,
        savedTool.name
      );
      
      toast.success("Új eszköz sikeresen hozzáadva!");
      await fetchAssignedToolsAndUpdateState();
    } catch (err) {
      toast.error("Hiba történt az eszköz hozzáadásakor!");
      console.error("Tool add error:", err);
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
    <div className="relative bg-white rounded-xl shadow-sm px-5 py-3 mb-5">
      <Button
        onClick={() => setIsAddToolOpen(true)}
        variant="outline"
        aria-label="Új eszköz hozzáadása"
        className="absolute top-[14px] right-[18px] rounded-full border border-[#FF9900] text-[#FF9900] bg-white z-20 hover:bg-[#FF9900]/10 hover:border-[#FF9900] hover:text-[#FF9900] focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900] w-9 h-9 p-0 flex items-center justify-center"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <div className="h-8" />
      <div className="font-bold text-[17px] mb-2 tracking-[0.5px]">
        Szükséges eszközök
      </div>

      <div className="flex flex-col gap-3 max-h=[calc(100vh-250px)] overflow-y-auto pb-20">
        {Object.entries(grouped).map(([name, tool]) => {
          const q = tool.quantity ?? 1;
          const assignedList = assignedTools.filter(at => at.toolName === tool.name);
          const slotArray = Array.from({ length: q });
          
          return (
            <div key={name}>
              <div className="bg-[#f7f7f7] rounded-lg font-medium text-[15px] text-[#555] mb-[2px] px-3 pt-2 pb-5 min-h-[44px] flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex-2 font-semibold">{name}</div>
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="font-semibold text-[14px] text-[#222]">
                      {Math.min(assignedList.length, q)} / {q}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {slotArray.map((_, idx) => {
                    const assigned = assignedList[idx];
                    const isFilled = !!assigned;
                    
                    if (isFilled) {
                      return (
                        <div
                          key={`${name}-filled-${idx}`}
                          className="flex items-center bg-white rounded border border-[#eee] px-3 py-2 cursor-pointer hover:bg-[#fafafa] w-full"
                          onClick={() => {
                            setSelectedTool(tool);
                            setMaxQuantity(tool.quantity ?? 1);
                            setModalOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "#eee",
                              }}
                            />
                            <div className="text-[14px] text-[#333] font-medium">
                              {assigned.tool?.displayName || tool.name}
                            </div>
                          </div>
                          <div className="ml-auto text-[13px] text-[#555] truncate max-w-[55%]">
                            {assigned.tool?.description || ""}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={`${name}-empty-${idx}`} className="flex items-center w-full">
                        <button
                          className="flex-grow flex items-center justify-center rounded-l border border-dashed border-[#aaa] text-[#222] bg-[#fafbfc] hover:bg-[#f5f7fa] px-3 py-2"
                          onClick={() => {
                            setSelectedTool(tool);
                            setMaxQuantity(tool.quantity ?? 1);
                            setModalOpen(true);
                          }}
                          title={tool.name}
                        >
                          <span className="w-4 h-4">+</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (assignedList.length > 0) {
                              const lastAssigned = assignedList[assignedList.length - 1];
                              try {
                                const res = await import(
                                  "../../../../actions/tools-registry-actions"
                                );
                                await res.decrementWorkToolQuantity(lastAssigned.id);
                                toast.success("Slot törölve!");
                                await fetchAssignedToolsAndUpdateState();
                              } catch (err) {
                                toast.error(
                                  `Nem sikerült törölni a slotot! ${(err as Error).message}`
                                );
                              }
                            }
                          }}
                          className="px-2 py-2 rounded-r border border-dashed border-l-0 border-[#aaa] bg-[#fafbfc] hover:bg-red-100"
                          title="Slot törlése"
                        >
                          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <ToolAddModal
        open={isAddToolOpen}
        onOpenChange={setIsAddToolOpen}
        onSubmit={handleAddNewTool}
        workItems={workItems}
      />
      
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
