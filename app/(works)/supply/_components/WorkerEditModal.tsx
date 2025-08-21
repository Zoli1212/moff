"use client";
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface WorkerAssignment {
  id: number; // WorkItemWorker id
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null; // profession
  quantity?: number | null;
  avatarUrl?: string | null;
}

interface WorkerEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: WorkerAssignment | null;
  onSubmit: (data: { id: number; name?: string; email?: string; phone?: string; role?: string; quantity?: number; avatarUrl?: string | null }) => Promise<void>;
  onDelete: (args: { id: number; name?: string | null; email?: string | null; role?: string | null }) => Promise<void>;
}

const WorkerEditModal: React.FC<WorkerEditModalProps> = ({ open, onOpenChange, worker, onSubmit, onDelete }) => {
  const [name, setName] = useState(worker?.name ?? "");
  const [email, setEmail] = useState(worker?.email ?? "");
  const [phone, setPhone] = useState(worker?.phone ?? "");
  const [role, setRole] = useState(worker?.role ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>(worker?.avatarUrl ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(worker?.name ?? "");
    setEmail(worker?.email ?? "");
    setPhone(worker?.phone ?? "");
    setRole(worker?.role ?? "");
    setAvatarUrl(worker?.avatarUrl ?? "");
    setAvatarPreview("");
    setAvatarError("");
    setAvatarUploading(false);
  }, [worker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    setLoading(true);
    await onSubmit({
      id: worker.id,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      role: role || undefined,
      avatarUrl: avatarUrl || null,
    });
    setLoading(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!worker) return;
    setLoading(true);
    await onDelete({
      id: worker.id,
      name: worker.name ?? null,
      email: worker.email ?? null,
      role: worker.role ?? null,
    });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Munkás hozzárendelés szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Név</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Szakma</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          {/* Avatar upload with preview - polished UI */}
          <div>
            <label className="block text-sm font-medium mb-1">Profilkép</label>
            <div className="flex items-center gap-4 mt-1">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview || avatarUrl || "/worker.jpg"}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border border-[#e6e6e6] shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black text-white rounded-full px-3 py-0.5 text-[12px] shadow"
                >
                  {avatarPreview || avatarUrl ? "Csere" : "Kép feltöltése"}
                </button>
                {(avatarPreview || avatarUrl) && (
                  <button
                    type="button"
                    onClick={() => { setAvatarPreview(""); setAvatarUrl(""); setAvatarError(""); }}
                    title="Profilkép törlése"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-[#ddd] text-red-600 inline-flex items-center justify-center shadow"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarError("");
                    setAvatarUploading(true);
                    setAvatarPreview(URL.createObjectURL(file));
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.url) {
                        setAvatarUrl(data.url);
                      } else {
                        setAvatarError(data.error || "Hiba történt a feltöltésnél.");
                        setAvatarUrl("");
                        setAvatarPreview("");
                      }
                    } catch (err) {
                      setAvatarError("Hiba a feltöltés során.");
                      setAvatarUrl("");
                      setAvatarPreview("");
                    } finally {
                      setAvatarUploading(false);
                    }
                  }}
                  className="hidden"
                />
                <div className="text-xs text-[#666]">PNG vagy JPG, max 5MB</div>
                {avatarUploading && (
                  <div className="mt-2 h-1.5 bg-[#f1f1f1] rounded-full overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-[#0070f3] to-[#42a5f5] animate-pulse"></div>
                  </div>
                )}
                {avatarError && <div className="text-red-600 text-xs mt-2">{avatarError}</div>}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-between mt-2 gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              Mentés
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1"
            >
              Törlés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerEditModal;
