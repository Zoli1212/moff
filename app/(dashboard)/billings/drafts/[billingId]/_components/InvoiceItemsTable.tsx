"use client";

import { useState } from "react";
import { toast } from "sonner";
import { OfferItem } from "@/types/offer.types";
import { Pencil, Plus, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InvoiceItemsTableProps {
  items: OfferItem[];
  onItemsChange: (items: OfferItem[]) => void;
}

export function InvoiceItemsTable({ items, onItemsChange }: InvoiceItemsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedItem, setEditedItem] = useState<OfferItem | null>(null);

  const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    const numericValue = String(value).replace(/[^0-9,-]+/g, "").replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("hu-HU", { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(value);
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
    startEditing(updatedItems.length - 1, newItem);
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const startEditing = (index: number, item: OfferItem) => {
    setEditingIndex(index);
    setEditedItem({ ...item });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditedItem(null);
  };

  const handleFieldChange = (field: keyof OfferItem, value: string) => {
    if (!editedItem) return;

    const updatedItem = { ...editedItem, [field]: value };

    if (['quantity', 'materialUnitPrice', 'unitPrice'].includes(field)) {
      const quantity = parseCurrency(updatedItem.quantity || '0');
      const materialUnitPrice = parseCurrency(updatedItem.materialUnitPrice || '0');
      const workUnitPrice = parseCurrency(updatedItem.unitPrice || '0');

      updatedItem.materialTotal = (quantity * materialUnitPrice).toString();
      updatedItem.workTotal = (quantity * workUnitPrice).toString();
    }

    setEditedItem(updatedItem);
  };

  const saveItem = () => {
    if (editingIndex === null || !editedItem) return;

    if (!editedItem.name || !editedItem.quantity || !editedItem.unit) {
      toast.error("Kérjük, töltse ki a megnevezés, mennyiség és egység mezőket.");
      return;
    }

    const newItems = [...items];
    newItems[editingIndex] = editedItem;
    onItemsChange(newItems);
    cancelEditing();
    toast.success("Tétel sikeresen mentve.");
  };

  const handleToggleSelect = (index: number, checked: boolean) => {
    onItemsChange(items.map((item, i) => i === index ? { ...item, isSelected: checked } : item));
  };

  const handleToggleSelectAll = (checked: boolean) => {
    onItemsChange(items.map((item) => ({ ...item, isSelected: checked })));
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Tételek</h3>
        <Button variant="outline" size="sm" onClick={handleAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Új tétel hozzáadása
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox
                  id="select-all"
                  checked={items.length > 0 && items.every(item => item.isSelected)}
                  onCheckedChange={(checked) => handleToggleSelectAll(checked === 'indeterminate' ? false : !!checked)}
                />
              </TableHead>
              <TableHead>Megnevezés</TableHead>
              <TableHead className="text-right">Mennyiség</TableHead>
              <TableHead>Egység</TableHead>
              <TableHead className="text-right">Anyag egységár</TableHead>
              <TableHead className="text-right">Díj egységár</TableHead>
              <TableHead className="text-right">Anyag összesen</TableHead>
              <TableHead className="text-right">Díj összesen</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const isEditing = editingIndex === index;
              const currentItem = isEditing && editedItem ? editedItem : item;

              return isEditing ? (
                // EDITING ROW
                <TableRow key={item.id} className="bg-blue-50/50">
                  <TableCell className="text-center align-middle"></TableCell>
                  <TableCell className="align-middle"><Input value={currentItem.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="Tétel neve" /></TableCell>
                  <TableCell className="align-middle"><Input value={currentItem.quantity} onChange={e => handleFieldChange('quantity', e.target.value)} className="text-right" placeholder="0" /></TableCell>
                  <TableCell className="align-middle"><Input value={currentItem.unit} onChange={e => handleFieldChange('unit', e.target.value)} placeholder="db" /></TableCell>
                  <TableCell className="align-middle"><Input value={String(currentItem.materialUnitPrice)} onChange={e => handleFieldChange('materialUnitPrice', e.target.value)} className="text-right" placeholder="0" /></TableCell>
                  <TableCell className="align-middle"><Input value={String(currentItem.unitPrice)} onChange={e => handleFieldChange('unitPrice', e.target.value)} className="text-right" placeholder="0" /></TableCell>
                  <TableCell className="text-right font-medium align-middle">{formatCurrency(parseCurrency(currentItem.materialTotal || '0'))}</TableCell>
                  <TableCell className="text-right font-medium align-middle">{formatCurrency(parseCurrency(currentItem.workTotal || '0'))}</TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={saveItem}><Save className="h-5 w-5 text-green-600" /></Button>
                      <Button size="icon" variant="ghost" onClick={cancelEditing}><X className="h-5 w-5 text-gray-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // DISPLAY ROW
                <TableRow key={item.id} className={`${item.isSelected ? '' : 'bg-gray-50 text-gray-400'}`}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={item.isSelected}
                      onCheckedChange={(checked) => handleToggleSelect(index, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseCurrency(item.materialUnitPrice || '0'))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseCurrency(item.unitPrice || '0'))}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(parseCurrency(item.materialTotal || '0'))}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(parseCurrency(item.workTotal || '0'))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => startEditing(index, item)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
