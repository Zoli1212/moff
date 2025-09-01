"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { OfferItem } from "@/types/offer.types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BillingItemsProps {
  items: OfferItem[];
  onItemsChange: (items: OfferItem[]) => void;
}

export function BillingItems({ items, onItemsChange }: BillingItemsProps) {
  const [editingItem, setEditingItem] = useState<{
    index: number;
    item: OfferItem;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const parseCurrency = (value: string): number => {
    const numericValue = String(value)
      .replace(/[^0-9,-]+/g, "")
      .replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("hu-HU") + " Ft";
  };

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
      maximumFractionDigits: 0,
    });
  };

  const handleAddItem = () => {
    const newItem: OfferItem = {
      id: Date.now(),
      name: "Új tétel",
      quantity: "1",
      unit: "db",
      materialUnitPrice: "0 Ft",
      unitPrice: "0 Ft",
      materialTotal: "0 Ft",
      workTotal: "0 Ft",
      isSelected: true,
    };
    const updatedItems = [...items, newItem];
    onItemsChange(updatedItems);
    startEditing(updatedItems.length - 1);
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingItem({ index, item: { ...items[index] } });
    setIsModalOpen(true);
  };

  const handleModalChange = (field: string, value: string) => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem.item, [field]: value };

    if (["quantity", "materialUnitPrice", "unitPrice"].includes(field)) {
      const quantity = parseFloat(String(updatedItem.quantity)) || 0;
      const materialUnitPrice = parseCurrency(
        updatedItem.materialUnitPrice || "0"
      );
      const workUnitPrice = parseCurrency(updatedItem.unitPrice || "0");

      updatedItem.materialTotal = formatCurrency(quantity * materialUnitPrice);
      updatedItem.workTotal = formatCurrency(quantity * workUnitPrice);
    }

    setEditingItem({ ...editingItem, item: updatedItem });
  };

  const saveItem = () => {
    if (!editingItem) return;

    const { index, item } = editingItem;

    if (!item.name || !item.quantity || !item.unit) {
      toast.error("Kérem töltse ki az összes kötelező mezőt");
      return;
    }

    const newItems = [...items];
    newItems[index] = item;
    onItemsChange(newItems);
    setIsModalOpen(false);
    toast.success("Tétel módosítva");
  };

  const handleToggleSelect = (index: number, checked: boolean) => {
    onItemsChange(
      items.map((item, i) =>
        i === index ? { ...item, isSelected: checked } : item
      )
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    onItemsChange(items.map((item) => ({ ...item, isSelected: checked })));
  };

  const calculateTotals = useCallback(() => {
    return (items || [])
      .filter((item) => item.isSelected)
      .reduce(
        (totals, item) => {
          const materialTotal = parseCurrency(item.materialTotal || "0");
          const workTotal = parseCurrency(item.workTotal || "0");
          return {
            material: totals.material + materialTotal,
            work: totals.work + workTotal,
            total: totals.total + materialTotal + workTotal,
          };
        },
        { material: 0, work: 0, total: 0 }
      );
  }, [items]);

  const totals = calculateTotals();

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tétel szerkesztése</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Megnevezés
              </Label>
              <Input
                id="name"
                value={editingItem?.item.name || ""}
                onChange={(e) => handleModalChange("name", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Mennyiség
              </Label>
              <Input
                id="quantity"
                type="number"
                value={editingItem?.item.quantity || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleModalChange("quantity", e.target.value)
                }
                className="col-span-1"
              />
              <Label htmlFor="unit" className="text-right">
                Egység
              </Label>
              <Input
                id="unit"
                value={editingItem?.item.unit || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleModalChange("unit", e.target.value)
                }
                className="col-span-1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="materialUnitPrice" className="text-right">
                Anyag egységár
              </Label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="materialUnitPrice"
                  value={formatNumberWithSpace(
                    editingItem?.item.materialUnitPrice?.replace(/\s*Ft$/, "")
                  )}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleModalChange(
                      "materialUnitPrice",
                      e.target.value.replace(/\s+/g, "")
                    )
                  }
                  className="text-right"
                />
                <span className="ml-2">Ft</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workUnitPrice" className="text-right">
                Díj egységár
              </Label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="workUnitPrice"
                  value={formatNumberWithSpace(
                    editingItem?.item.unitPrice?.replace(/\s*Ft$/, "")
                  )}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleModalChange(
                      "unitPrice",
                      e.target.value.replace(/\s+/g, "")
                    )
                  }
                  className="text-right"
                />
                <span className="ml-2">Ft</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 pt-4 border-t">
              <Label className="text-right font-medium">Anyag összesen</Label>
              <div className="col-span-3 font-medium">
                {formatNumberWithSpace(
                  editingItem?.item.materialTotal?.replace(/\s*Ft$/, "")
                )}{" "}
                Ft
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Díj összesen</Label>
              <div className="col-span-3 font-medium">
                {formatNumberWithSpace(
                  editingItem?.item.workTotal?.replace(/\s*Ft$/, "")
                )}{" "}
                Ft
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button onClick={saveItem}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            Tételek
          </h2>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Új tétel
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-4 pl-4 py-2 border rounded-md bg-gray-50">
          <Checkbox
            id="select-all"
            checked={
              (items || []).length > 0 &&
              (items || []).every((item) => item.isSelected)
            }
            onCheckedChange={(checked) =>
              handleToggleSelectAll(
                checked === "indeterminate" ? false : !!checked
              )
            }
          />
          <Label
            htmlFor="select-all"
            className="font-medium text-sm text-gray-700 select-none"
          >
            Összes kijelölése
          </Label>
        </div>

        <div className="space-y-4">
          {(items || []).map((item, index) => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 transition-colors ${item.isSelected ? "bg-blue-50/50 border-blue-200" : "bg-gray-50/50"}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4 flex-1">
                  <Checkbox
                    id={`item-${index}`}
                    checked={item.isSelected ?? false}
                    onCheckedChange={(checked) =>
                      handleToggleSelect(index, !!checked)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 pr-4">
                      {index + 1}. {item.name}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="col-span-1 font-medium text-gray-500">
                  Egységár ({item.unit})
                </div>
                <div className="col-span-1 text-right text-gray-700">ANYAG</div>
                <div className="col-span-1 text-right text-gray-700">DÍJ</div>

                <div></div>
                <div className="text-right">
                  {formatCurrency(parseCurrency(item.materialUnitPrice || "0"))}
                </div>
                <div className="text-right">
                  {formatCurrency(parseCurrency(item.unitPrice || "0"))}
                </div>

                <div className="col-span-1 font-medium text-gray-500">
                  {item.quantity} {item.unit}
                </div>
                <div className="col-span-1 text-right font-semibold text-gray-900">
                  {formatCurrency(parseCurrency(item.materialTotal || "0"))}
                </div>
                <div className="col-span-1 text-right font-semibold text-gray-900">
                  {formatCurrency(parseCurrency(item.workTotal || "0"))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-600">Anyagköltség összesen:</span>
            <span className="font-medium text-gray-800">
              {formatCurrency(totals.material)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-600">Munkadíj összesen:</span>
            <span className="font-medium text-gray-800">
              {formatCurrency(totals.work)}
            </span>
          </div>
          <div className="flex justify-between items-center text-base font-bold mt-4">
            <span className="text-gray-900">Mindösszesen:</span>
            <span className="text-gray-900">
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
