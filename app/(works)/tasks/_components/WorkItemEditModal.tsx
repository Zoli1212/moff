"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface WorkItemEditData {
  id: number;
  name: string;
  description?: string | undefined;
  quantity?: number | undefined;
  unit?: string | undefined;
  unitPrice?: number | undefined;
  materialUnitPrice?: number | undefined;
  totalPrice?: number | undefined;
  // completedQuantity removed - read-only, only from diary entries
}

interface WorkItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: WorkItemEditData | null;
  onSave: (
    workItemId: number,
    updatedData: Partial<WorkItemEditData>
  ) => Promise<void>;
}

export function WorkItemEditModal({
  isOpen,
  onClose,
  workItem,
  onSave,
}: WorkItemEditModalProps) {
  const [formData, setFormData] = useState<WorkItemEditData>({
    id: 0,
    name: "",
    description: "",
    quantity: 0,
    unit: "db",
    unitPrice: 0,
    materialUnitPrice: 0,
    totalPrice: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when workItem changes
  useEffect(() => {
    if (workItem) {
      setFormData({
        id: workItem.id,
        name: workItem.name || "",
        description: workItem.description || "",
        quantity: workItem.quantity || 0,
        unit: workItem.unit || "db",
        unitPrice: workItem.unitPrice || 0,
        materialUnitPrice: workItem.materialUnitPrice || 0,
        totalPrice: workItem.totalPrice || 0,
      });
    }
  }, [workItem]);

  // Calculate totalPrice when unitPrice, materialUnitPrice or quantity changes
  useEffect(() => {
    const quantity = formData.quantity || 0;
    const unitPrice = formData.unitPrice || 0;
    const materialUnitPrice = formData.materialUnitPrice || 0;
    const calculatedTotal = quantity * (unitPrice + materialUnitPrice);

    setFormData((prev) => ({
      ...prev,
      totalPrice: calculatedTotal,
    }));
  }, [formData.quantity, formData.unitPrice, formData.materialUnitPrice]);

  const handleInputChange = (
    field: keyof WorkItemEditData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!workItem) return;

    // Validation
    if (!formData.name.trim()) {
      toast.error("A tétel neve kötelező!");
      return;
    }

    if (formData.quantity !== undefined && formData.quantity < 0) {
      toast.error("A mennyiség nem lehet negatív!");
      return;
    }


    console.log("Saving work item with data:", formData);

    setIsSaving(true);
    try {
      await onSave(workItem.id, {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        quantity: formData.quantity,
        unit: formData.unit,
        unitPrice: formData.unitPrice,
        materialUnitPrice: formData.materialUnitPrice,
        totalPrice: formData.totalPrice,
        // completedQuantity removed - only diary entries can modify this
      });

      toast.success("A tétel sikeresen módosítva!");
      onClose();
    } catch (error) {
      console.error("Error saving work item:", error);
      toast.error("Hiba történt a mentés során!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // Format number with space as thousand separator
  const formatNumberWithSpace = (
    value: string | number | null | undefined
  ): string => {
    if (value === null || value === undefined) return "";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/\s+/g, "").replace(",", ".")) || 0
        : value;
    return num.toLocaleString("hu-HU", {
      useGrouping: true,
      maximumFractionDigits: 2,
    });
  };

  if (!workItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tétel szerkesztése</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right font-medium">
              Megnevezés *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="col-span-3"
              placeholder="Tétel megnevezése"
            />
          </div>

          {/* Description field */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label
              htmlFor="description"
              className="text-right font-medium pt-2"
            >
              Leírás
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="col-span-3 min-h-[80px]"
              placeholder="Részletes leírás (opcionális)"
            />
          </div>

          {/* Quantity and Unit fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right font-medium">
              Mennyiség
            </Label>
            <Input
              id="quantity"
              type="number"
              value={formData.quantity || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  handleInputChange("quantity", undefined);
                } else {
                  const numValue = parseFloat(value);
                  handleInputChange("quantity", isNaN(numValue) ? 0 : numValue);
                }
              }}
              className="col-span-1"
              placeholder="0"
              step="0.01"
              min="0"
            />
            <Label htmlFor="unit" className="text-right font-medium">
              Egység
            </Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => handleInputChange("unit", e.target.value)}
              className="col-span-1"
              placeholder="db"
            />
          </div>

          {/* Unit Price field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unitPrice" className="text-right font-medium">
              Munka egységár
            </Label>
            <Input
              id="unitPrice"
              type="number"
              value={formData.unitPrice || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  handleInputChange("unitPrice", undefined);
                } else {
                  const numValue = parseFloat(value);
                  handleInputChange(
                    "unitPrice",
                    isNaN(numValue) ? 0 : numValue
                  );
                }
              }}
              className="col-span-1"
              placeholder="0"
              step="0.01"
              min="0"
            />
            <Label
              htmlFor="materialUnitPrice"
              className="text-right font-medium"
            >
              Anyag egységár
            </Label>
            <Input
              id="materialUnitPrice"
              type="number"
              value={formData.materialUnitPrice || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  handleInputChange("materialUnitPrice", undefined);
                } else {
                  const numValue = parseFloat(value);
                  handleInputChange(
                    "materialUnitPrice",
                    isNaN(numValue) ? 0 : numValue
                  );
                }
              }}
              className="col-span-1"
              placeholder="0"
              step="0.01"
              min="0"
            />
          </div>

          {/* Total Price display */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Összár</Label>
            <div className="col-span-3 p-2 bg-gray-50 rounded border text-lg font-semibold">
              {formatNumberWithSpace(formData.totalPrice)} Ft
            </div>
          </div>

          {/* Completed Quantity field - READ ONLY */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="completedQuantity"
              className="text-right font-medium"
            >
              Teljesítve
            </Label>
            <div className="col-span-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
              {(workItem as any)?.completedQuantity || 0}
            </div>
            <div className="col-span-2 text-sm text-gray-500">
              {formData.quantity && (workItem as any)?.completedQuantity !== undefined ? (
                <span>
                  Progress:{" "}
                  {Math.round(
                    (((workItem as any)?.completedQuantity || 0) / formData.quantity) * 100
                  )}
                  % (csak napló alapján módosítható)
                </span>
              ) : (
                <span className="text-gray-400">Csak napló alapján módosítható</span>
              )}
            </div>
          </div>

          {/* Progress display */}
          {formData.quantity && (workItem as any)?.completedQuantity !== undefined && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Haladás</Label>
              <div className="col-span-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (((workItem as any)?.completedQuantity || 0) / formData.quantity) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatNumberWithSpace((workItem as any)?.completedQuantity || 0)} /{" "}
                  {formatNumberWithSpace(formData.quantity)} {formData.unit}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Mégse
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? "Mentés..." : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
