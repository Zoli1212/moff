"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  updateWorkforceRegistry,
  WorkforceRegistryData,
} from "@/actions/workforce-registry-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import WorkforceSalarySection from "./WorkforceSalarySection";

interface WorkforceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkforceRegistryData;
  onWorkerUpdated: (worker: WorkforceRegistryData) => void;
}

export default function WorkforceEditModal({
  isOpen,
  onClose,
  worker,
  onWorkerUpdated,
}: WorkforceEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    contactInfo: "",
    hiredDate: "",
    leftDate: "",
    isActive: true,
    notes: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name || "",
        role: worker.role || "",
        email: worker.email || "",
        phone: worker.phone || "",
        contactInfo: worker.contactInfo || "",
        hiredDate: worker.hiredDate
          ? new Date(worker.hiredDate).toISOString().split("T")[0]
          : "",
        leftDate: worker.leftDate
          ? new Date(worker.leftDate).toISOString().split("T")[0]
          : "",
        isActive: worker.isActive,
        notes: worker.notes || "",
        avatarUrl: worker.avatarUrl || "",
      });
    }
  }, [worker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        hiredDate: formData.hiredDate
          ? new Date(formData.hiredDate)
          : undefined,
        leftDate: formData.leftDate ? new Date(formData.leftDate) : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        contactInfo: formData.contactInfo || undefined,
        notes: formData.notes || undefined,
        avatarUrl: formData.avatarUrl || undefined,
      };

      const result = await updateWorkforceRegistry(worker.id!, dataToSubmit);

      if (result.success && result.data) {
        toast.success("Munkás sikeresen frissítve");
        onWorkerUpdated(result.data);
      } else {
        toast.error(result.error || "Hiba történt a munkás frissítése során");
      }
    } catch (error) {
      console.log((error as Error).message);
      toast.error("Hiba történt a munkás frissítése során");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError("");
    setImageUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();

      if (data.url) {
        setFormData((prev) => ({ ...prev, avatarUrl: data.url }));
        toast.success("Kép sikeresen feltöltve");
      } else {
        throw new Error(data.error || "Hiba történt a feltöltésnél.");
      }
    } catch (err) {
      setImageError("Hiba a feltöltés során: " + (err as Error).message);
      toast.error("Hiba a kép feltöltése során");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] sm:!max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl !p-3 sm:!p-6 !gap-3">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base sm:text-lg">Munkás szerkesztése</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6 overflow-x-hidden">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b">
            <div className="relative">
              {formData.avatarUrl ? (
                <div className="relative group">
                  <img
                    src={formData.avatarUrl}
                    alt="Profilkép"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: "" }))}
                    className="absolute -top-2 -right-2 bg-white border border-red-500 text-red-500 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-50 transition"
                    title="Kép törlése"
                  >
                    ×
                  </button>
                  <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-white text-sm font-medium">Csere</span>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-full cursor-pointer hover:bg-gray-50 transition">
                  <span className="text-xs text-gray-500 text-center px-2">
                    {imageUploading ? "Feltöltés..." : "Kép hozzáadása"}
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                  />
                </label>
              )}
            </div>
            {imageError && (
              <div className="text-red-600 text-xs">{imageError}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name - Required */}
            <div>
              <Label htmlFor="name">Név *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Teljes név"
                required
                className="mt-1"
              />
            </div>

            {/* Role - Required */}
            <div>
              <Label htmlFor="role">Szerepkör *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                placeholder="pl. festő, burkoló, villanyszerelő"
                required
                className="mt-1"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+36 30 123 4567"
                className="mt-1"
              />
            </div>

            {/* Hired Date */}
            <div>
              <Label htmlFor="hiredDate">Felvétel dátuma</Label>
              <Input
                id="hiredDate"
                type="date"
                value={formData.hiredDate}
                onChange={(e) => handleInputChange("hiredDate", e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Left Date */}
            <div>
              <Label htmlFor="leftDate">Távozás dátuma</Label>
              <Input
                id="leftDate"
                type="date"
                value={formData.leftDate}
                onChange={(e) => handleInputChange("leftDate", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Fizetés kezelő szekció */}
          <div className="mt-4">
            <WorkforceSalarySection
              worker={worker}
              onSalaryUpdated={() => {
                // Ne hívjunk semmit - a WorkforceSalarySection saját maga kezeli a fizetés adatokat
                // és saját toast üzeneteket jelenít meg
              }}
            />
          </div>

          {/* Contact Info */}
          <div>
            <Label htmlFor="contactInfo">További elérhetőség</Label>
            <Input
              id="contactInfo"
              value={formData.contactInfo}
              onChange={(e) => handleInputChange("contactInfo", e.target.value)}
              placeholder="Cím, további telefonszám, stb."
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Megjegyzések</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="További információk, megjegyzések..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Switches */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                handleInputChange("isActive", checked)
              }
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Aktív munkás
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            <button
              type="submit"
              disabled={
                isLoading || !formData.name.trim() || !formData.role.trim()
              }
              className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "#FE9C00",
              }}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
              Mentés
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Mégse
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
