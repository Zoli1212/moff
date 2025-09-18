"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { WorkItem } from "@/types/work";
import { getWorkersForWork, type WorkerForWork } from "@/actions/get-workers-for-work";

interface WorkerAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workId: number;
  workItems: WorkItem[];
  professions: string[];
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    profession: string;
    workItemId: number | null;
    avatarUrl?: string;
  }) => Promise<void> | void;
  // If provided, lock the profession to this value (per-slot add)
  lockedProfession?: string;
  // If provided, preselect and lock workItem to this id
  lockedWorkItemId?: number;
  // If true, show all workItems instead of only in-progress ones
  showAllWorkItems?: boolean;
}

// Lightweight custom dropdown (no external deps)
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`border rounded px-3 py-2 w-full max-w-full text-left flex items-center justify-between ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white cursor-pointer"}`}
      >
        <span className={`truncate ${!selected ? "text-gray-400" : ""}`}>
          {selected ? selected.label : placeholder || "Válassz..."}
        </span>
        <span aria-hidden className="ml-2 text-gray-500">
          ▾
        </span>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded shadow-lg z-[9999]">
          {options.map((opt) => (
            <div
              key={opt.value + opt.label}
              className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${opt.value === value ? "bg-gray-50 font-medium" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              role="option"
              aria-selected={opt.value === value}
            >
              <span className="truncate block">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const WorkerAddModal: React.FC<WorkerAddModalProps> = ({
  open,
  onOpenChange,
  workId,
  workItems,
  professions,
  onSubmit,
  lockedProfession,
  lockedWorkItemId,
  showAllWorkItems = false,
}) => {
  const [workerMode, setWorkerMode] = useState<"new" | "existing">("existing");
  const [existingWorkers, setExistingWorkers] = useState<WorkerForWork[]>([]);
  const [selectedExistingWorker, setSelectedExistingWorker] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState(lockedProfession ?? "");
  const [workItemId, setWorkItemId] = useState<number | string | "">(
    lockedWorkItemId ?? ""
  );
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing workers when modal opens
  useEffect(() => {
    if (open && workerMode === "existing") {
      const loadExistingWorkers = async () => {
        try {
          const workers = await getWorkersForWork(workId);
          setExistingWorkers(workers);
        } catch (error) {
          console.error("Error loading existing workers:", error);
          toast.error("Hiba a munkások betöltése során");
        }
      };
      loadExistingWorkers();
    }
  }, [open, workerMode, workId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (workerMode === "existing") {
      // Handle existing worker assignment
      if (!selectedExistingWorker) {
        toast.error("Kérjük válassz egy munkást!");
        return;
      }

      const worker = existingWorkers.find(w => w.id.toString() === selectedExistingWorker);
      if (!worker) {
        toast.error("A kiválasztott munkás nem található!");
        return;
      }

      // Always use null for workItemId
      const finalWorkItemId = null;

      setLoading(true);
      try {
        await onSubmit({
          name: worker.name || "",
          email: worker.email || "",
          phone: worker.phone || "",
          profession: worker.role || "",
          workItemId: null, // Always null
          avatarUrl: worker.avatarUrl || undefined,
        });

        // Reset form on success
        setSelectedExistingWorker("");
        setWorkItemId("");
        onOpenChange(false);
      } catch (error) {
        console.error("Error assigning existing worker:", error);
        toast.error("Hiba történt a munkás hozzárendelése során.");
      } finally {
        setLoading(false);
      }
    } else {
      // Handle new worker creation
      const finalProfession = lockedProfession || profession;
      // Always use null for workItemId
      const finalWorkItemId = null;

      if (!name || !finalProfession) {
        toast.error("Kérjük töltsd ki az összes kötelező mezőt!");
        return;
      }

      setLoading(true);
      try {
        await onSubmit({
          name,
          email,
          phone,
          profession: finalProfession,
          workItemId: null, // Always null
          avatarUrl: avatarUrl || undefined,
        });

        // Reset form on success
        setName("");
        setEmail("");
        setPhone("");
        setProfession("");
        setWorkItemId("");
        setAvatarUrl("");
        setAvatarPreview("");
        setAvatarError("");
        setAvatarUploading(false);
        onOpenChange(false);
      } catch (error) {
        console.error("Error saving worker:", error);
        toast.error("Hiba történt a mentés során. Kérlek próbáld újra.");
      } finally {
        setLoading(false);
      }
    }
  };

  const professionsForSelected = useMemo(() => {
    // Always allow all professions since workItemId is always null
    let options = professions.sort((a, b) => a.localeCompare(b, "hu"));
    
    // If profession is locked, restrict to only that one (if present)
    if (lockedProfession) {
      options = options.filter((p) => p === lockedProfession);
    }
    
    return options;
  }, [professions, lockedProfession]);

  // Keep profession consistent with the available options
  useEffect(() => {
    // Don't clear if user selected the generic "Egyéb"
    if (
      profession &&
      profession !== "Egyéb" &&
      !professionsForSelected.includes(profession)
    ) {
      setProfession("");
    }
  }, [professionsForSelected, profession]);

  // Reset/initialize when modal opens (handle locks)
  useEffect(() => {
    if (open) {
      // If no existing workers are available, default to "new" mode (orange)
      const shouldDefaultToNew = existingWorkers.length === 0;
      setWorkerMode(shouldDefaultToNew ? "new" : "existing");
      setProfession(lockedProfession ?? "");
      setWorkItemId(lockedWorkItemId ?? "");
      setSelectedExistingWorker("");
    } else {
      // clear fields on close
      setWorkerMode("existing");
      setName("");
      setEmail("");
      setPhone("");
      setProfession("");
      setWorkItemId("");
      setAvatarUrl("");
      setAvatarPreview("");
      setAvatarError("");
      setAvatarUploading(false);
      setSelectedExistingWorker("");
      setExistingWorkers([]);
    }
  }, [open, lockedProfession, lockedWorkItemId, existingWorkers.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Új munkás regisztrálása és hozzárendelése munkához
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Worker Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Munkás típusa
            </label>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setWorkerMode("new")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  workerMode === "new"
                    ? "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Új munkás
              </button>
              <button
                type="button"
                onClick={() => setWorkerMode("existing")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  workerMode === "existing"
                    ? "bg-[#FF9900] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Meglévő munkás
              </button>
            </div>
          </div>

          {/* Work Item Selection - Always null, but show info */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Munkafázis
            </label>
            <div className="p-2 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700">
              Általános hozzárendelés (nem konkrét munkafázishoz)
            </div>
          </div>

          {/* Existing Worker Selection */}
          {workerMode === "existing" && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Válassz munkást
              </label>
              <CustomSelect
                className="mt-2"
                value={selectedExistingWorker}
                onChange={setSelectedExistingWorker}
                placeholder="Válassz munkást..."
                options={existingWorkers.map((worker) => ({
                  value: worker.id.toString(),
                  label: `${worker.name || "Névtelen"} (${worker.role || "Ismeretlen szakma"}) - ${worker.email || "Nincs email"} - ${worker.phone || "Nincs telefon"}`,
                }))}
              />
            </div>
          )}

          {/* New Worker Form Fields */}
          {workerMode === "new" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Szakma</label>
                {lockedProfession ? (
                  <div className="p-2 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700">
                    {lockedProfession} (rögzítve)
                  </div>
                ) : (
                  <CustomSelect
                    value={profession}
                    onChange={setProfession}
                    disabled={professionsForSelected.length === 0}
                    placeholder="Válassz szakmát..."
                    options={[
                      { value: "", label: "Válassz szakmát..." },
                      ...professionsForSelected.map((p) => ({
                        value: p,
                        label: p,
                      })),
                    ]}
                  />
                )}
              </div>

              <input
                type="text"
                placeholder="Név"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="email"
                placeholder="Email (opcionális)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                type="tel"
                placeholder="Telefon (opcionális)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border rounded px-3 py-2"
              />
              {/* Avatar upload with preview - polished UI */}
              <div className="mt-2">
                <label className="block text-sm font-medium mb-2">Profilkép</label>
                <div className="flex items-center gap-4">
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
                        onClick={() => {
                          setAvatarPreview("");
                          setAvatarUrl("");
                          setAvatarError("");
                        }}
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
                          const res = await fetch("/api/upload-avatar", {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (data.url) {
                            setAvatarUrl(data.url);
                          } else {
                            setAvatarError(
                              data.error || "Hiba történt a feltöltésnél."
                            );
                            setAvatarUrl("");
                            setAvatarPreview("");
                          }
                        } catch (err) {
                          setAvatarError(
                            "Hiba a feltöltés során: " + (err as Error).message
                          );
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
                    {avatarError && (
                      <div className="text-red-600 text-xs mt-2">{avatarError}</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (workerMode === "new" && (!name || !(lockedProfession || profession))) ||
                (workerMode === "existing" && !selectedExistingWorker)
              }
              className="bg-[#FF9900] hover:bg-[#e68a00] text-white"
            >
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerAddModal;
