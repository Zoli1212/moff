"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Save, X } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { addSalaryChange } from "@/utils/salary-helper";
import { WorkforceRegistryData } from "@/actions/workforce-registry-actions";
import { toast } from "sonner";

interface SalaryHistoryItem {
  id: number;
  dailyRate: number;
  validFrom: Date;
  createdAt: Date;
}

interface SalaryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkforceRegistryData;
  currentSalary: number;
  existingSalaryEntry?: SalaryHistoryItem | null;
  onSalaryUpdated: () => void;
}

export default function SalaryEditModal({
  isOpen,
  onClose,
  worker,
  currentSalary,
  existingSalaryEntry,
  onSalaryUpdated,
}: SalaryEditModalProps) {
  const [newSalary, setNewSalary] = useState(
    existingSalaryEntry ? existingSalaryEntry.dailyRate.toString() : currentSalary.toString()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [validFromStr, setValidFromStr] = useState(
    existingSalaryEntry 
      ? format(new Date(existingSalaryEntry.validFrom), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );

  // Update form fields when existingSalaryEntry changes
  useEffect(() => {
    if (existingSalaryEntry) {
      setNewSalary(existingSalaryEntry.dailyRate.toString());
      setValidFromStr(format(new Date(existingSalaryEntry.validFrom), "yyyy-MM-dd"));
    } else {
      setNewSalary(currentSalary.toString());
      setValidFromStr(format(new Date(), "yyyy-MM-dd"));
    }
  }, [existingSalaryEntry, currentSalary]);

  // Check if there are any changes (amount or date)
  const hasChanges = () => {
    const salaryAmount = parseFloat(newSalary) || 0;
    
    if (existingSalaryEntry) {
      // Editing existing entry - check if anything changed from the original
      const originalDateStr = format(new Date(existingSalaryEntry.validFrom), "yyyy-MM-dd");
      return salaryAmount !== existingSalaryEntry.dailyRate || validFromStr !== originalDateStr;
    } else {
      // Creating new entry - check if different from current salary or not today's date
      const currentDateStr = format(new Date(), "yyyy-MM-dd");
      return salaryAmount !== currentSalary || validFromStr !== currentDateStr;
    }
  };

  const handleSave = async () => {
    const salaryAmount = parseFloat(newSalary);

    if (isNaN(salaryAmount) || salaryAmount < 0) {
      toast.error("Érvénytelen fizetés összeg");
      return;
    }

    if (!worker.id) {
      toast.error("Munkás ID hiányzik");
      return;
    }

    // Convert date string to Date object
    const validFromDate = new Date(validFromStr);
    if (isNaN(validFromDate.getTime())) {
      toast.error("Érvénytelen dátum");
      return;
    }

    setIsLoading(true);
    try {
      const result = await addSalaryChange(
        worker.id,
        salaryAmount,
        validFromDate
      );

      if (result.success) {
        toast.success("Fizetés sikeresen frissítve");
        onSalaryUpdated();
        onClose();
      } else {
        toast.error(result.error || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error saving salary:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form to initial values
    setNewSalary(
      existingSalaryEntry ? existingSalaryEntry.dailyRate.toString() : currentSalary.toString()
    );
    setValidFromStr(
      existingSalaryEntry 
        ? format(new Date(existingSalaryEntry.validFrom), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd")
    );
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const salaryAmount = parseFloat(newSalary) || 0;
  const hourlyRate = salaryAmount / 8;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {existingSalaryEntry ? "Fizetés szerkesztése" : "Fizetés módosítása"} - {worker.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Jelenlegi fizetés */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Jelenlegi napi díj</p>
            <p className="text-xl font-semibold text-gray-900">
              {formatCurrency(currentSalary)}
            </p>
            <p className="text-xs text-gray-500">
              Órabér: {formatCurrency(currentSalary / 8)} / óra
            </p>
          </div>

          {/* Új fizetés */}
          <div className="space-y-2">
            <Label htmlFor="newSalary">Új napi díj (Ft)</Label>
            <Input
              id="newSalary"
              type="number"
              value={newSalary}
              onChange={(e) => setNewSalary(e.target.value)}
              placeholder="Pl. 25000"
              min="0"
              step="1000"
            />
            {salaryAmount > 0 && (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Napi díj: {formatCurrency(salaryAmount)}</p>
                <p>Órabér: {formatCurrency(hourlyRate)} / óra</p>
                <p>
                  Havi becslés (22 nap): {formatCurrency(salaryAmount * 22)}
                </p>
              </div>
            )}
          </div>

          {/* Érvényesség dátuma */}
          <div className="space-y-2">
            <Label htmlFor="validFrom">Érvényes mikortól</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="validFrom"
                type="date"
                value={validFromStr}
                onChange={(e) => setValidFromStr(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              A fizetésváltozás ettől a dátumtól lesz érvényes
            </p>
          </div>

          {/* Változás összefoglalása */}
          {hasChanges() && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                {existingSalaryEntry ? "Módosítások" : "Változás összefoglalása"}
              </p>
              <div className="space-y-1 text-sm text-blue-800">
                {existingSalaryEntry ? (
                  <>
                    <p>Eredeti fizetés: {formatCurrency(existingSalaryEntry.dailyRate)}</p>
                    <p>Új fizetés: {formatCurrency(salaryAmount)}</p>
                    <p>Eredeti dátum: {format(new Date(existingSalaryEntry.validFrom), "yyyy. MM. dd.")}</p>
                    <p>Új dátum: {format(new Date(validFromStr), "yyyy. MM. dd.")}</p>
                  </>
                ) : (
                  <>
                    <p>Régi fizetés: {formatCurrency(currentSalary)}</p>
                    <p>Új fizetés: {formatCurrency(salaryAmount)}</p>
                    <p
                      className={`font-medium ${
                        salaryAmount > currentSalary
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      Változás: {salaryAmount > currentSalary ? "+" : ""}
                      {formatCurrency(salaryAmount - currentSalary)}
                      {salaryAmount > currentSalary ? " (emelés)" : " (csökkentés)"}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Gombok */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Mégse
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges()}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Mentés..." : "Mentés"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
