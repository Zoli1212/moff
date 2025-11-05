"use client";
import React, { useState, useEffect } from "react";
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

          {/* Worker info display with editable avatar */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b">
            <div className="relative">
              {avatarPreview || avatarUrl ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarPreview || avatarUrl}
                    alt="Worker avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => { 
                      setAvatarPreview(""); 
                      setAvatarUrl(""); 
                      setAvatarError(""); 
                    }}
                    className="absolute -top-2 -right-2 bg-white border border-red-500 text-red-500 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-50 transition"
                    title="Kép törlése"
                  >
                    ×
                  </button>
                  <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-white text-sm font-medium">Csere</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarUploading}
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
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-full cursor-pointer hover:bg-gray-50 transition">
                  <span className="text-xs text-gray-500 text-center px-2">
                    {avatarUploading ? "Feltöltés..." : "Kép hozzáadása"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={avatarUploading}
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
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              )}
            </div>
            {avatarError && (
              <div className="text-red-600 text-xs">{avatarError}</div>
            )}
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
