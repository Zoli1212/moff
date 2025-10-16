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
import { getActiveWorkforce } from "@/actions/get-active-workforce";

interface WorkerAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workId: number;
  workItems?: WorkItem[]; // Made optional since not used
  professions: string[];
  workers?: Array<{ id: number; name: string | null }>; // Workers list for role selection
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    profession: string;
    workItemId: number | null;
    avatarUrl?: string;
    dailyRate?: number; // Optional, csak új munkásnál van
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
  professions,
  workers = [],
  onSubmit,
  lockedProfession,
}) => {
  const [workerMode, setWorkerMode] = useState<"existing" | "new">("existing");
  const [existingWorkers, setExistingWorkers] = useState<
    Array<{
      id: number;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      role?: string;
      avatarUrl?: string | null;
    }>
  >([]);
  const [selectedExistingWorker, setSelectedExistingWorker] =
    useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>(""); // New state for role selection
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState(lockedProfession ?? "");
  const [dailyRate, setDailyRate] = useState<string>("");
  // workItemId is always null in current implementation
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
          const workers = await getActiveWorkforce();
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

      // Meglévő munkásnál nem kérjük a napi díjat

      const worker = existingWorkers.find(
        (w) => w.id.toString() === selectedExistingWorker
      );
      if (!worker) {
        toast.error("A kiválasztott munkás nem található!");
        return;
      }

      // Always use null for workItemId

      setLoading(true);
      try {
        await onSubmit({
          name: worker.name || "",
          email: worker.email || "",
          phone: worker.phone || "",
          profession: "általános", // Always "általános"
          workItemId: null, // Always null
          avatarUrl: worker.avatarUrl || undefined,
          // dailyRate nincs megadva, mert meglévő munkásnak már van
        });

        // Reset form on success
        setSelectedExistingWorker("");
        setSelectedRole("");
        onOpenChange(false);
      } catch (error) {
        console.error("Error assigning existing worker:", error);
        toast.error("Hiba történt a munkás hozzárendelése során.");
      } finally {
        setLoading(false);
      }
    } else {
      // Handle new worker creation
      const finalProfession = "általános"; // Always "általános"
      // Always use null for workItemId

      if (!name || !finalProfession) {
        toast.error("Kérjük töltsd ki az összes kötelező mezőt!");
        return;
      }

      if (!dailyRate || isNaN(Number(dailyRate)) || Number(dailyRate) <= 0) {
        toast.error("Kérjük adj meg egy érvényes napi díjat!");
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
          dailyRate: Number(dailyRate),
        });

        // Reset form on success
        setName("");
        setEmail("");
        setPhone("");
        setProfession("");
        setDailyRate("");
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

  // Get available roles from workers list
  const availableRoles = useMemo(() => {
    const roles = workers
      .map((w) => w.name)
      .filter((name): name is string => Boolean(name))
      .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates
      .sort((a, b) => a.localeCompare(b, "hu"));
    return roles;
  }, [workers]);

  const professionsForSelected = useMemo(() => {
    // If profession is locked (slot-based), use only that profession
    if (lockedProfession) {
      return professions.filter((p) => p === lockedProfession);
    }

    // If not locked (top + button), use availableRoles like "Meglévő munkás" tab
    return availableRoles.sort((a, b) => a.localeCompare(b, "hu"));
  }, [professions, lockedProfession, availableRoles]);

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
      // Only set default mode when first opening, don't override user selection
      setProfession(lockedProfession ?? "általános");
      setSelectedRole("általános"); // Always default to "általános"
      setSelectedExistingWorker("");
    } else {
      // clear fields on close
      setWorkerMode("existing"); // Megtartjuk az alapértelmezett "existing" módot
      setName("");
      setEmail("");
      setPhone("");
      setProfession("");
      setDailyRate("");
      setAvatarUrl("");
      setAvatarPreview("");
      setAvatarError("");
      setAvatarUploading(false);
      setSelectedExistingWorker("");
      setSelectedRole("");
      setExistingWorkers([]);
    }
  }, [open, lockedProfession]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Új munkás regisztrálása és hozzárendelése munkához
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Worker Mode Selection */}
          {workerMode === "existing" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setWorkerMode("new")}
                className="w-10 h-10 rounded-full border-2 border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white flex items-center justify-center transition-colors font-bold text-xl"
                title="Új munkás hozzáadása"
              >
                <span style={{ display: "block", lineHeight: 0, transform: "translateY(-2px)" }}>+</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setWorkerMode("existing")}
                className="w-10 h-10 rounded-full border-2 border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white flex items-center justify-center transition-colors font-bold text-xl"
                title="Vissza a listához"
              >
                <span style={{ display: "block", lineHeight: 0, transform: "translateY(-1px)" }}>←</span>
              </button>
            </div>
          )}

          {/* Work Item Selection - Always null, but show info */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Munkafázis
            </label>
            <div className="p-2 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700">
              Általános hozzárendelés (nem konkrét munkafázishoz)
            </div>
          </div>

          {/* Existing Worker Selection - megjelenik először */}
          {workerMode === "existing" && (
            <>
              <div className="space-y-2" style={{ display: "none" }}>
                <label className="text-sm font-medium leading-none">
                  Szerepkör
                </label>
                <CustomSelect
                  className="mt-2"
                  value={selectedRole}
                  onChange={setSelectedRole}
                  placeholder="Válassz szerepkört..."
                  options={[
                    { value: "általános", label: "általános" },
                    ...availableRoles.map((role) => ({
                      value: role,
                      label: role,
                    })),
                  ]}
                />
              </div>
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
            </>
          )}

          {/* New Worker Form Fields - Hidden duplicate section */}
          {workerMode === "new" && (
            <>
              <div className="space-y-2" style={{ display: "none" }}>
                <label className="text-sm font-medium leading-none">
                  Szerepkör
                </label>
                <CustomSelect
                  className="mt-2"
                  value={selectedRole}
                  onChange={setSelectedRole}
                  placeholder="Válassz szerepkört..."
                  options={[
                    { value: "általános", label: "általános" },
                    ...availableRoles.map((role) => ({
                      value: role,
                      label: role,
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2" style={{ display: "none" }}>
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
            </>
          )}

          {/* New Worker Form Fields */}
          {workerMode === "new" && (
            <>
              <div className="space-y-2" style={{ display: "none" }}>
                <label className="text-sm font-medium leading-none">
                  Szakma
                </label>
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
                      { value: "általános", label: "általános" },
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

              {/* Daily Rate Input - Only for new workers */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Napi díj (Ft) *
                </label>
                <input
                  type="number"
                  placeholder="25000"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                  min="0"
                  step="1000"
                />
                <div className="text-xs text-gray-500">
                  8 órás munkanapra vonatkozó díj
                </div>
              </div>

              {/* Avatar upload with preview - polished UI */}
              <div className="mt-2">
                <label className="block text-sm font-medium mb-2">
                  Profilkép
                </label>
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
                    <div className="text-xs text-[#666]">
                      PNG vagy JPG, max 5MB
                    </div>
                    {avatarUploading && (
                      <div className="mt-2 h-1.5 bg-[#f1f1f1] rounded-full overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-[#0070f3] to-[#42a5f5] animate-pulse"></div>
                      </div>
                    )}
                    {avatarError && (
                      <div className="text-red-600 text-xs mt-2">
                        {avatarError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter className="mt-4">
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                Mégse
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  (workerMode === "new" &&
                    (!dailyRate ||
                      isNaN(Number(dailyRate)) ||
                      Number(dailyRate) <= 0)) ||
                  (workerMode === "new" && !name) ||
                  (workerMode === "existing" && !selectedExistingWorker)
                }
                className="bg-[#FF9900] hover:bg-[#e68a00] text-white flex-1"
              >
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerAddModal;
