"use client";

import { useState } from "react";
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

interface InvoiceItemsTableProps {
  items: OfferItem[];
  onItemsChange: (items: OfferItem[]) => void;
}

export function InvoiceItemsTable({
  items,
  onItemsChange,
}: InvoiceItemsTableProps) {
  const [editingItem, setEditingItem] = useState<{
    index: number;
    item: OfferItem;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const parseCurrency = (value: string | number): number => {
    if (typeof value === "number") return value;
    const numericValue = String(value)
      .replace(/[^0-9,-]+/g, "")
      .replace(",", ".");
    return parseFloat(numericValue) || 0;
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
      materialUnitPrice: "0",
      unitPrice: "0",
      materialTotal: "0",
      workTotal: "0",
      isSelected: true,
    };
    const updatedItems = [...items, newItem];
    onItemsChange(updatedItems);
    startEditing(updatedItems.length - 1);
  };

  const handleRemoveItem = (index: number) => {
    setItemToDelete(index);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete !== null) {
      onItemsChange(items.filter((_, i) => i !== itemToDelete));
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      toast.success("Tétel törölve");
    }
  };

  const startEditing = (index: number) => {
    setEditingItem({ index, item: { ...items[index] } });
    setIsModalOpen(true);
  };

  const handleModalChange = (field: string, value: string) => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem.item, [field]: value };

    if (["quantity", "materialUnitPrice", "unitPrice"].includes(field)) {
      const quantity = parseCurrency(updatedItem.quantity || "0");
      const materialUnitPrice = parseCurrency(
        updatedItem.materialUnitPrice || "0"
      );
      const workUnitPrice = parseCurrency(updatedItem.unitPrice || "0");

      updatedItem.materialTotal = (quantity * materialUnitPrice).toString();
      updatedItem.workTotal = (quantity * workUnitPrice).toString();
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

  return (
    <>
      {/* Szerkesztő modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="sm:max-w-[425px] rounded-2xl p-6"
          style={{ width: "min(90vw, 425px)" }}
        >
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
                value={editingItem?.item.quantity || "0"}
                onChange={(e) => handleModalChange("quantity", e.target.value)}
                className="col-span-1"
              />
              <Label htmlFor="unit" className="text-right">
                Egység
              </Label>
              <Input
                id="unit"
                value={editingItem?.item.unit || ""}
                onChange={(e) => handleModalChange("unit", e.target.value)}
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
                    editingItem?.item.materialUnitPrice || ""
                  )}
                  onChange={(e) =>
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
                    editingItem?.item.unitPrice || ""
                  )}
                  onChange={(e) =>
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
                {formatNumberWithSpace(editingItem?.item.materialTotal || "")}{" "}
                Ft
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Díj összesen</Label>
              <div className="col-span-3 font-medium">
                {formatNumberWithSpace(editingItem?.item.workTotal || "")} Ft
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Mégse
            </Button>
            <Button
              onClick={saveItem}
              style={{ backgroundColor: "#FE9C00", color: "white" }}
              className="hover:opacity-90"
            >
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Törlés megerősítő modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent
          className="sm:max-w-[425px] rounded-2xl p-6"
          style={{ width: "min(90vw, 425px)" }}
        >
          <DialogHeader>
            <DialogTitle>Biztosan ki szeretnéd törölni?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              onClick={confirmDelete}
              className="w-full"
              style={{ backgroundColor: "#EF4444", color: "white" }}
            >
              Törlés
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="w-full"
            >
              Mégse
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Tételek</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            style={{ color: "#FE9C00", borderColor: "#FE9C00" }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Új tétel
          </Button>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
            <Checkbox
              id="select-all-mobile"
              checked={
                items.length > 0 && items.every((item) => item.isSelected)
              }
              onCheckedChange={(checked) =>
                handleToggleSelectAll(
                  checked === "indeterminate" ? false : !!checked
                )
              }
            />
            <label
              htmlFor="select-all-mobile"
              className="font-medium text-sm text-gray-700"
            >
              Összes kijelölése
            </label>
          </div>

          {items.map((item, index) => (
            <div
              key={item.id}
              className={`border rounded-lg p-4 ${item.isSelected ? "bg-blue-50/50 border-blue-200" : "bg-gray-50/50"}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={item.isSelected}
                    onCheckedChange={(checked) =>
                      handleToggleSelect(index, !!checked)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">
                      {index + 1}. {item.name}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEditing(index)}
                  >
                    <Pencil className="h-4 w-4" style={{ color: "#FE9C00" }} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" style={{ color: "#FE9C00" }} />
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Anyag
                        </th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Díj
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-2 py-1 whitespace-nowrap text-sm font-normal text-gray-900">
                          Egységár ({item.unit})
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-right">
                          {parseCurrency(
                            item.materialUnitPrice || "0"
                          ).toLocaleString("hu-HU")}{" "}
                          Ft
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-right">
                          {parseCurrency(item.unitPrice || "0").toLocaleString(
                            "hu-HU"
                          )}{" "}
                          Ft
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="text-sm text-gray-500 mt-1">
                            <div className="text-gray-900 font-bold">
                              {item.quantity} {item.unit}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap font-bold text-right">
                          {parseCurrency(
                            item.materialTotal || "0"
                          ).toLocaleString("hu-HU")}{" "}
                          Ft
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap font-bold text-right">
                          {parseCurrency(item.workTotal || "0").toLocaleString(
                            "hu-HU"
                          )}{" "}
                          Ft
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
