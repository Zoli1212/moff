"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface UpdateWorkItemQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newQuantity: number) => void;
  initialQuantity: string;
  workItemName: string;
}

export default function UpdateWorkItemQuantityModal({
  isOpen,
  onClose,
  onSave,
  initialQuantity,
  workItemName,
}: UpdateWorkItemQuantityModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    setQuantity(initialQuantity);
  }, [initialQuantity]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    const newQuantity = parseFloat(quantity);
    if (!isNaN(newQuantity)) {
      onSave(newQuantity);
      onClose();
    } else {
      console.error('[Modal] Invalid quantity:', quantity);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Mennyiség módosítása</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Feladat: <span className="font-medium">{workItemName}</span>
            </p>
            <Label htmlFor="quantity">Új mennyiség</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Adja meg a mennyiséget..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Mégse
            </Button>
            <Button type="button" onClick={handleSave}>
              Mentés
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
