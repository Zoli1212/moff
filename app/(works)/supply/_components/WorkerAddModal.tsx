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

interface WorkerAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  workItems,
  professions,
  onSubmit,
  lockedProfession,
  lockedWorkItemId,
  showAllWorkItems = false,
}) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use locked values if they exist, otherwise use form values
    const finalProfession = lockedProfession || profession;
    const finalWorkItemId = lockedWorkItemId || workItemId;

    if (!name || !email || !phone || !finalProfession || !finalWorkItemId) {
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
        workItemId: finalWorkItemId === "general" ? null : Number(finalWorkItemId),
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
  };

  const professionsForSelected = useMemo(() => {
    // No selection: empty list (prompt user)
    if (workItemId === "") return [] as string[];

    // If "general" is selected, allow all professions
    if (workItemId === "general") {
      return professions.sort((a, b) => a.localeCompare(b, "hu"));
    }

    // With a selected workItem: allow any profession from all active workItems
    const selected = workItems.find((w) => w.id === Number(workItemId));
    // Only allow adding workers to active workItems (based on showAllWorkItems flag)
    if (!selected || (!showAllWorkItems && !selected.inProgress)) return [];

    // Collect all professions from ALL active workItems (not just selected one)
    const allActiveProfessions = new Set<string>();
    const activeItems = workItems.filter(
      (wi) => showAllWorkItems || wi.inProgress
    );

    for (const item of activeItems) {
      // From workers
      (item.workers ?? []).forEach((w) => {
        const role = w.role ?? w.name;
        if (role && typeof role === "string" && role.trim().length > 0) {
          allActiveProfessions.add(role);
        }
      });

      // From workItemWorkers
      (item.workItemWorkers ?? []).forEach((w) => {
        if (w.role && typeof w.role === "string" && w.role.trim().length > 0) {
          allActiveProfessions.add(w.role);
        }
      });
    }

    // Also include all available professions to allow new ones
    professions.forEach((p) => allActiveProfessions.add(p));

    let options = Array.from(allActiveProfessions).sort((a, b) =>
      a.localeCompare(b, "hu")
    );
    // If profession is locked, restrict to only that one (if present)
    if (lockedProfession)
      options = options.filter((p) => p === lockedProfession);
    return options;
  }, [workItemId, workItems, professions, lockedProfession]);

  // Keep profession consistent with the available options for the selected work item
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
      setProfession(lockedProfession ?? "");
      setWorkItemId(lockedWorkItemId ?? "");
    } else {
      // clear fields on close
      setName("");
      setEmail("");
      setPhone("");
      setProfession("");
      setWorkItemId("");
      setAvatarUrl("");
      setAvatarPreview("");
      setAvatarError("");
      setAvatarUploading(false);
    }
  }, [open, lockedProfession, lockedWorkItemId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Új munkás regisztrálása és hozzárendelése munkafázishoz
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Work Item Selection - Disabled if locked */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Munkafázis
            </label>
            <CustomSelect
              className="mt-2"
              value={workItemId === "" ? "" : String(workItemId)}
              onChange={(val) => {
                if (val === "general") {
                  setWorkItemId("general");
                } else {
                  setWorkItemId(val ? Number(val) : "");
                }
              }}
              disabled={!!lockedWorkItemId}
              placeholder="Válassz munkafázist..."
              options={[
                ...workItems
                  .filter((item) => showAllWorkItems || item.inProgress)
                  .map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  })),
                { value: "general", label: "Általános feladatok (nem konkrét fázishoz)" },
              ]}
            />
          </div>

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
                placeholder={
                  professionsForSelected.length === 0
                    ? "Először válassz munkafázist"
                    : "Válassz szakmát..."
                }
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
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="tel"
            placeholder="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border rounded px-3 py-2"
            required
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
                !name ||
                !email ||
                !phone ||
                !(lockedProfession || profession) ||
                !(lockedWorkItemId || workItemId)
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
