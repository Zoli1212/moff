"use client";
import React, { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkItem } from "@/types/work";

interface ToolAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    quantity: number;
    workItemId: number;
  }) => Promise<void>;
  workItems: WorkItem[];
}

const ToolAddModal: React.FC<ToolAddModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  workItems,
}) => {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [workItemId, setWorkItemId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !workItemId) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        quantity,
        workItemId,
      });
      // Reset form
      setName("");
      setDescription("");
      setQuantity(1);
      setWorkItemId(null);
      onOpenChange(false);
    } catch (err) {
      console.error("Tool add error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setQuantity(1);
    setWorkItemId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("ts.addTool")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("x.toolNameRequired")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Csiszolópapír"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("od.description")}</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="pl. P120-as szemcseméret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">{t("aoi.quantityRequired")}</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workItem">Feladat *</Label>
            <Select
              value={workItemId?.toString() || ""}
              onValueChange={(value) => setWorkItemId(parseInt(value))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={t("x.chooseTask")} />
              </SelectTrigger>
              <SelectContent>
                {workItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name || item.description || `Feladat ${item.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !workItemId || isSubmitting}
            >
              {isSubmitting ? t("od.saving") : t("aoi.add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ToolAddModal;
