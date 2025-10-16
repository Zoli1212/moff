"use client";
import React, { useState, useEffect, useRef } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
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
  const [isConfirmOpen, setConfirmOpen] = useState(false);

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
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>Munkás adatok</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Contact buttons at the top */}
          <div className="flex gap-6 justify-center pb-3">
            {email && (
              <a
                href={`mailto:${email}`}
                className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md transition-colors"
                title="Email küldése"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-colors"
                title="Hívás indítása"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </a>
            )}
          </div>

          {/* Worker info display - non-editable */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarPreview || avatarUrl || "/worker.jpg"}
              alt="Worker avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-md"
            />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{name || "Névtelen munkás"}</h3>
              {phone && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">📞</span> {phone}
                </p>
              )}
              {email && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">✉️</span> {email}
                </p>
              )}
            </div>
          </div>

          {/* Editable fields below - HIDDEN */}
          <div style={{ display: "none" }}>
            <label className="block text-sm font-medium mb-1">Név</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: "none" }}>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ display: "none" }}>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div style={{ display: "none" }}>
            <label className="block text-sm font-medium mb-1">Szakma</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          {/* Avatar upload with preview - polished UI - HIDDEN */}
          <div style={{ display: "none" }}>
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
                      setAvatarError("Hiba a feltöltés során: " + (err as Error).message);
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
          <DialogFooter className="flex flex-row justify-center mt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
              className="w-full max-w-xs"
            >
              Törlés
            </Button>
            <Button type="submit" disabled={loading} className="flex-1" style={{ display: "none" }}>
              Mentés
            </Button>
          </DialogFooter>
        </form>
        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Munkás törlése"
          description="Biztos, hogy törlöd ezt a munkást? A művelet nem vonható vissza."
        />
      </DialogContent>
    </Dialog>
    </>
  );
};

export default WorkerEditModal;
