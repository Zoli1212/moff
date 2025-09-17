"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkItem } from "@/types/work";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  workItems: WorkItem[];
  onRemove: (workItemId: number) => Promise<void>;
}

const WorkerRemoveModal: React.FC<Props> = ({
  open,
  onOpenChange,
  role,
  workItems,
  onRemove,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  // Filter to only in-progress workItems that have workers with the specified role
  const availableWorkItems = workItems.filter((wi) => {
    if (!wi.inProgress) return false;
    
    const hasRoleWorkers = (wi.workItemWorkers ?? []).some((wiw) => wiw.role === role);
    return hasRoleWorkers;
  });

  const handleRemove = async (workItemId: number) => {
    try {
      setIsRemoving(true);
      await onRemove(workItemId);
      toast.success(`${role} munkás eltávolítva a munkafázisból`);
      onOpenChange(false);
    } catch (error) {
      console.error('Hiba történt a munkás eltávolítása közben:', error);
      toast.error('Hiba történt a munkás eltávolítása közben');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {role} munkás eltávolítása
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Válaszd ki azt a munkafázist, amelyből el szeretnéd távolítani a {role} munkást:
          </p>
          
          {availableWorkItems.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Nincs folyamatban lévő munkafázis {role} munkással.
            </p>
          ) : (
            <div className="space-y-2">
              {availableWorkItems.map((wi) => {
                const roleWorkers = (wi.workItemWorkers ?? []).filter(
                  (wiw) => wiw.role === role
                );
                const totalQuantity = roleWorkers.reduce(
                  (sum, wiw) => sum + (wiw.quantity ?? 1),
                  0
                );
                
                return (
                  <div
                    key={wi.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{wi.name}</div>
                      <div className="text-xs text-gray-500">
                        {role} munkások: {totalQuantity} db
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemove(wi.id)}
                      disabled={isRemoving}
                      variant="destructive"
                      size="sm"
                    >
                      {isRemoving ? "Törlés..." : "Eltávolít"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isRemoving}
            >
              Mégse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerRemoveModal;
