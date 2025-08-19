"use client";
import React, { useState } from "react";
import type { WorkDiaryWithItem } from "@/actions/get-workdiariesbyworkid-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface WorkerDiaryEditFormProps {
  diary: WorkDiaryWithItem;
  onSave: (updated: Partial<WorkDiaryWithItem>) => void;
  onCancel: () => void;
}

export default function WorkerDiaryEditForm({ diary, onSave, onCancel }: WorkerDiaryEditFormProps) {
  const [date, setDate] = useState<string>(diary.date ? new Date(diary.date).toISOString().substring(0, 10) : "");
  const [description, setDescription] = useState(diary.description || "");
  const [progress, setProgress] = useState<number | "">(typeof diary.progress === "number" ? diary.progress : "");
  const [images, setImages] = useState<string[]>(diary.images || []);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Handle image upload (adapted from ToolRegisterModal)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    setImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImages((prev) => [...prev, data.url]);
      } else {
        setImageError(data.error || "Hiba történt a feltöltésnél.");
      }
    } catch (err) {
      setImageError("Hiba a feltöltés során.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    onSave({
      ...diary,
      date: new Date(date),
      description,
      progress: progress === "" ? null : Number(progress),
      images,
    });
  };

  return (
    <form className="space-y-6 max-w-4xl mx-auto" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="diary-date">Dátum <Calendar className="inline ml-1 h-4 w-4" /></Label>
        <Input
          id="diary-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="diary-description">Leírás</Label>
          <Textarea
            id="diary-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
        </div>
        <div>
          <Label htmlFor="diary-progress">Mennyiség (haladás)</Label>
          <Input
            id="diary-progress"
            type="number"
            min={0}
            step={0.01}
            placeholder="Pl. 12.5"
            value={progress}
            onChange={e => setProgress(e.target.value === "" ? "" : Number(e.target.value))}
            required
          />
        </div>
      </div>
      <div>
        <Label>Képek feltöltése</Label>
        <div className="flex flex-wrap gap-3 items-center">
          {images.map((img, idx) => (
            <div key={img} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`napló kép ${idx + 1}`} className="w-20 h-20 object-cover rounded shadow" />
              <button
                type="button"
                onClick={() => handleRemoveImage(img)}
                className="absolute -top-2 -right-2 bg-white border border-destructive text-destructive rounded-full w-6 h-6 flex items-center justify-center opacity-70 group-hover:opacity-100"
                title="Kép törlése"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded cursor-pointer hover:bg-muted-foreground/10 transition">
            <span className="text-xs text-muted-foreground">Kép hozzáadása</span>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={imageUploading}
            />
          </label>
        </div>
        {imageUploading && <div className="text-blue-600 text-xs mt-1">Feltöltés...</div>}
        {imageError && <div className="text-red-600 text-xs mt-1">{imageError}</div>}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Mégsem
        </Button>
        <Button type="submit" disabled={!date || imageUploading}>
          Mentés
        </Button>
      </div>
    </form>
  );
}
