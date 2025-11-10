"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { WorkItem } from "@/types/work";

// Extended WorkItem for billing with additional properties
interface BillingWorkItem extends WorkItem {
  isSelected?: boolean;
  billableQuantity?: number;
  totalQuantity?: number;
  billedQuantity?: number;
  paidQuantity?: number;
}
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
import { ProgressBar } from "@/components/ui/ProgressBar";

interface BillingItemsProps {
  items: BillingWorkItem[];
  onItemsChange: (items: BillingWorkItem[]) => void;
}

export function BillingItems({ items, onItemsChange }: BillingItemsProps) {
  const [editingItem, setEditingItem] = useState<{
    index: number;
    item: BillingWorkItem;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

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
    const newItem: BillingWorkItem = {
      id: Date.now(),
      workId: 0,
      name: "Új tétel",
      quantity: 1,
      unit: "db",
      materialUnitPrice: 0,
      unitPrice: 0,
      materialTotal: 0,
      workTotal: 0,
      totalPrice: 0,
      tools: [],
      materials: [],
      workers: [],
      workItemWorkers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantEmail: "",
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
      const quantity =
        typeof updatedItem.quantity === "number"
          ? updatedItem.quantity
          : parseFloat(String(updatedItem.quantity)) || 0;
      const materialUnitPrice =
        typeof updatedItem.materialUnitPrice === "number"
          ? updatedItem.materialUnitPrice
          : parseCurrency(String(updatedItem.materialUnitPrice || 0));
      const workUnitPrice =
        typeof updatedItem.unitPrice === "number"
          ? updatedItem.unitPrice
          : parseCurrency(String(updatedItem.unitPrice || 0));

      updatedItem.materialTotal = quantity * materialUnitPrice;
      updatedItem.workTotal = quantity * workUnitPrice;
      updatedItem.totalPrice =
        updatedItem.materialTotal + updatedItem.workTotal;
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

  const calculateTotals = useCallback(() => {
    return (items || [])
      .filter((item) => item.isSelected)
      .reduce(
        (totals, item) => {
          const materialTotal =
            typeof item.materialTotal === "number"
              ? item.materialTotal
              : parseCurrency(String(item.materialTotal || 0));
          const workTotal =
            typeof item.workTotal === "number"
              ? item.workTotal
              : parseCurrency(String(item.workTotal || 0));
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
                    typeof editingItem?.item.materialUnitPrice === "number"
                      ? editingItem.item.materialUnitPrice
                      : String(
                          editingItem?.item.materialUnitPrice ?? ""
                        ).replace(/\s*Ft$/, "")
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
                    typeof editingItem?.item.unitPrice === "number"
                      ? editingItem.item.unitPrice
                      : String(editingItem?.item.unitPrice ?? "").replace(
                          /\s*Ft$/,
                          ""
                        )
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
                  typeof editingItem?.item.materialTotal === "number"
                    ? editingItem.item.materialTotal
                    : String(editingItem?.item.materialTotal ?? "").replace(
                        /\s*Ft$/,
                        ""
                      )
                )}{" "}
                Ft
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Díj összesen</Label>
              <div className="col-span-3 font-medium">
                {formatNumberWithSpace(
                  typeof editingItem?.item.workTotal === "number"
                    ? editingItem.item.workTotal
                    : String(editingItem?.item.workTotal ?? "").replace(
                        /\s*Ft$/,
                        ""
                      )
                )}{" "}
                Ft
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            Tételek
          </h2>
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

        <div className="space-y-4">
          {(items || [])
            .sort((a, b) => {
              // Calculate billable quantity for each item
              const billableA = Math.max(
                0,
                (a.completedQuantity || 0) -
                  ((a.billedQuantity || 0) + (a.paidQuantity || 0))
              );
              const billableB = Math.max(
                0,
                (b.completedQuantity || 0) -
                  ((b.billedQuantity || 0) + (b.paidQuantity || 0))
              );
              // Items with billable quantity > 0 come first
              return billableB - billableA;
            })
            .map((item, index) => (
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
                        {index + 1}. {item.name.replace(/^\*+\s*/, "")}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEditing(index)}
                    >
                      <Pencil className="h-4 w-4 text-orange-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2
                        className="h-4 w-4"
                        style={{ color: "#FE9C00" }}
                      />
                    </Button>
                  </div>
                </div>

                {/* Price Grid - Same layout as offer-detail-mobile */}
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
                            {formatNumberWithSpace(
                              typeof item.materialUnitPrice === "number"
                                ? item.materialUnitPrice
                                : parseCurrency(
                                    String(item.materialUnitPrice || 0)
                                  )
                            )}{" "}
                            Ft
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-right">
                            {formatNumberWithSpace(
                              typeof item.unitPrice === "number"
                                ? item.unitPrice
                                : parseCurrency(String(item.unitPrice || 0))
                            )}{" "}
                            Ft
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 text-sm font-normal text-gray-900">
                            <div className="text-xs text-black leading-tight">
                              Számlázható<br />mennyiség
                            </div>
                            <div className="text-sm font-bold text-black">
                              {Math.max(
                                0,
                                (item.completedQuantity || 0) -
                                  ((item.billedQuantity || 0) + (item.paidQuantity || 0))
                              )} {item.unit}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right">
                            <div className="text-sm font-bold text-black pt-6">
                              {(() => {
                                const billableQty = Math.max(
                                  0,
                                  (item.completedQuantity || 0) -
                                    ((item.billedQuantity || 0) + (item.paidQuantity || 0))
                                );
                                const materialUnitPrice =
                                  typeof item.materialUnitPrice === "number"
                                    ? item.materialUnitPrice
                                    : parseCurrency(String(item.materialUnitPrice || 0));
                                const billableMaterialTotal = billableQty * materialUnitPrice;
                                return (
                                  formatNumberWithSpace(billableMaterialTotal) + " Ft"
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right">
                            <div className="text-sm font-bold text-black pt-6">
                              {(() => {
                                const billableQty = Math.max(
                                  0,
                                  (item.completedQuantity || 0) -
                                    ((item.billedQuantity || 0) + (item.paidQuantity || 0))
                                );
                                const workUnitPrice =
                                  typeof item.unitPrice === "number"
                                    ? item.unitPrice
                                    : parseCurrency(String(item.unitPrice || 0));
                                const billableWorkTotal = billableQty * workUnitPrice;
                                return (
                                  formatNumberWithSpace(billableWorkTotal) + " Ft"
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1"></td>
                          <td className="px-2 py-1"></td>
                          <td className="px-2 py-1 whitespace-nowrap text-right">
                            <div className="text-sm font-bold text-black">
                              {(() => {
                                const billableQty = Math.max(
                                  0,
                                  (item.completedQuantity || 0) -
                                    ((item.billedQuantity || 0) + (item.paidQuantity || 0))
                                );
                                const materialUnitPrice =
                                  typeof item.materialUnitPrice === "number"
                                    ? item.materialUnitPrice
                                    : parseCurrency(String(item.materialUnitPrice || 0));
                                const workUnitPrice =
                                  typeof item.unitPrice === "number"
                                    ? item.unitPrice
                                    : parseCurrency(String(item.unitPrice || 0));
                                const billableMaterialTotal = billableQty * materialUnitPrice;
                                const billableWorkTotal = billableQty * workUnitPrice;
                                const total = billableMaterialTotal + billableWorkTotal;
                                return (
                                  formatNumberWithSpace(total) + " Ft"
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <ProgressBar
                    label="Teljesített"
                    value={item.completedQuantity || 0}
                    max={
                      typeof item.quantity === "number"
                        ? item.quantity
                        : Number(item.quantity) || 0
                    }
                    unit={item.unit}
                    color="bg-blue-500"
                  />
                  <ProgressBar
                    label="Számlázott"
                    value={
                      (item.billedQuantity || 0) + (item.paidQuantity || 0)
                    }
                    max={
                      typeof item.quantity === "number"
                        ? item.quantity
                        : Number(item.quantity) || 0
                    }
                    unit={item.unit}
                    color="bg-green-500"
                  />
                  <ProgressBar
                    label="Számlázható"
                    value={Math.max(
                      0,
                      (item.completedQuantity || 0) -
                        ((item.billedQuantity || 0) + (item.paidQuantity || 0))
                    )}
                    max={
                      typeof item.quantity === "number"
                        ? item.quantity
                        : Number(item.quantity) || 0
                    }
                    unit={item.unit}
                    color="bg-yellow-500"
                  />
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
