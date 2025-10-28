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

      {/* Desktop Table View */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
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
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4" style={{ color: '#FE9C00' }} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
          <Checkbox
            id="select-all-mobile"
            checked={items.length > 0 && items.every(item => item.isSelected)}
            onCheckedChange={(checked) => handleToggleSelectAll(checked === 'indeterminate' ? false : !!checked)}
          />
          <label htmlFor="select-all-mobile" className="font-medium text-sm text-gray-700">
            Összes kijelölése
          </label>
        </div>

        {items.map((item, index) => {
          const isEditing = editingIndex === index;
          const currentItem = isEditing && editedItem ? editedItem : item;

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-4 ${item.isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/50'}`}
            >
              {isEditing ? (
                // EDITING CARD
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-800">Tétel szerkesztése</h4>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={saveItem}>
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEditing}>
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Megnevezés</label>
                      <Input 
                        value={currentItem.name} 
                        onChange={e => handleFieldChange('name', e.target.value)} 
                        placeholder="Tétel neve" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Mennyiség</label>
                        <Input 
                          value={currentItem.quantity} 
                          onChange={e => handleFieldChange('quantity', e.target.value)} 
                          placeholder="0" 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Egység</label>
                        <Input 
                          value={currentItem.unit} 
                          onChange={e => handleFieldChange('unit', e.target.value)} 
                          placeholder="db" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Anyag egységár</label>
                        <Input 
                          value={String(currentItem.materialUnitPrice)} 
                          onChange={e => handleFieldChange('materialUnitPrice', e.target.value)} 
                          placeholder="0" 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Díj egységár</label>
                        <Input 
                          value={String(currentItem.unitPrice)} 
                          onChange={e => handleFieldChange('unitPrice', e.target.value)} 
                          placeholder="0" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Anyag összesen</label>
                        <div className="font-semibold">{formatCurrency(parseCurrency(currentItem.materialTotal || '0'))}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Díj összesen</label>
                        <div className="font-semibold">{formatCurrency(parseCurrency(currentItem.workTotal || '0'))}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // DISPLAY CARD
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={item.isSelected}
                        onCheckedChange={(checked) => handleToggleSelect(index, !!checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEditing(index, item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" style={{ color: '#FE9C00' }} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">ANYAG</div>
                      <div>{formatCurrency(parseCurrency(item.materialUnitPrice || '0'))}/db</div>
                      <div className="font-semibold text-gray-900">{formatCurrency(parseCurrency(item.materialTotal || '0'))}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">DÍJ</div>
                      <div>{formatCurrency(parseCurrency(item.unitPrice || '0'))}/db</div>
                      <div className="font-semibold text-gray-900">{formatCurrency(parseCurrency(item.workTotal || '0'))}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
