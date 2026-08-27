"use client";
import React, { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { WorkItem } from "@/types/work";
interface MaterialAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    workItemId: number;
  }) => void;
  workItems: WorkItem[];
}

const MaterialAddModal: React.FC<MaterialAddModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  workItems,
}) => {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [workItemId, setWorkItemId] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !unit || !unitPrice || !workItemId) return;
    setLoading(true);
    await onSubmit({
      name,
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
      workItemId: Number(workItemId),
    });
    setLoading(false);
    setName("");
    setQuantity("");
    setUnit("");
    setUnitPrice("");
    setWorkItemId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90%] sm:max-w-md rounded-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("mat.addNew")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Anyag neve"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="number"
            placeholder={t("od.quantity")}
            value={quantity}
            onChange={(e) =>
              setQuantity(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border rounded px-3 py-2"
            required
            min={0}
            step={0.01}
          />
          <input
            type="text"
            placeholder={t("x.unitExampleShort")}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="number"
            placeholder={t("x.unitPriceHuf")}
            value={unitPrice}
            onChange={(e) =>
              setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border rounded px-3 py-2"
            required
            min={0}
            step={0.01}
          />
          <select
            value={workItemId}
            onChange={(e) =>
              setWorkItemId(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">{t("x.choosePart")}</option>
            {workItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !name || !quantity || !unit}
              className="w-full px-4 py-2 bg-[#FE9C00] hover:bg-[#FE9C00]/90 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? t("x.adding") : t("aoi.add")}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialAddModal;
