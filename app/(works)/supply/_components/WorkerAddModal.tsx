"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    workItemId: number;
    avatarUrl?: string;
  }) => Promise<void> | void;
  // If provided, lock the profession to this value (per-slot add)
  lockedProfession?: string;
  // If provided, preselect and lock workItem to this id
  lockedWorkItemId?: number;
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`border rounded px-3 py-2 w-full max-w-full text-left flex items-center justify-between ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
      >
        <span className={`truncate ${!selected ? 'text-gray-400' : ''}`}>
          {selected ? selected.label : (placeholder || 'Válassz...')}
        </span>
        <span aria-hidden className="ml-2 text-gray-500">▾</span>
      </button>
      {open && !disabled && (
        <div
          className="absolute left-0 top-full mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded shadow-lg z-50"
        >
          {options.map(opt => (
            <div
              key={opt.value + opt.label}
              className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${opt.value === value ? 'bg-gray-50 font-medium' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
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

const WorkerAddModal: React.FC<WorkerAddModalProps> = ({ open, onOpenChange, workItems, professions, onSubmit, lockedProfession, lockedWorkItemId }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState(lockedProfession ?? "");
  const [workItemId, setWorkItemId] = useState<number | "">(lockedWorkItemId ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !profession || !workItemId) return;
    setLoading(true);
    await onSubmit({
      name,
      email,
      phone,
      profession,
      workItemId: Number(workItemId),
      avatarUrl: avatarUrl || undefined,
    });
    setLoading(false);
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
  };

  const professionsForSelected = useMemo(() => {
    // No selection: empty list (prompt user)
    if (workItemId === "") return [] as string[];
    // Special case: 0 => show ALL professions
    if (Number(workItemId) === 0) {
      let all = [...professions].sort((a, b) => a.localeCompare(b, 'hu'));
      if (lockedProfession) all = all.filter(p => p === lockedProfession);
      return all;
    }

    // With a selected workItem: restrict strictly to that phase
    const selected = workItems.find(w => w.id === Number(workItemId));
    const fromWorkers = (selected?.workers ?? [])
      .map(w => w.role ?? w.name)
      .filter((r): r is string => !!r && typeof r === 'string' && r.trim().length > 0);
    const fromAssignments = (selected?.workItemWorkers ?? [])
      .map(w => w.role ?? undefined)
      .filter((r): r is string => !!r && typeof r === 'string' && r.trim().length > 0);
    let options = Array.from(new Set([...fromWorkers, ...fromAssignments])).sort((a,b) => a.localeCompare(b, 'hu'));
    // If profession is locked, restrict to only that one (if present)
    if (lockedProfession) options = options.filter(p => p === lockedProfession);
    return options;
  }, [workItemId, workItems, professions, lockedProfession]);

  // Keep profession consistent with the available options for the selected work item
  useEffect(() => {
    // Don't clear if user selected the generic "Egyéb"
    if (profession && profession !== "Egyéb" && !professionsForSelected.includes(profession)) {
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
          <DialogTitle>Új munkás regisztrálása és hozzárendelése munkafázishoz</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Select work phase first to filter professions */}
          <CustomSelect
            className="mt-2"
            value={workItemId === "" ? "" : String(workItemId)}
            onChange={(val) => setWorkItemId(val ? Number(val) : "")}
            disabled={typeof lockedWorkItemId === 'number'}
            placeholder="Válassz munkafázist..."
            options={[
              { value: "", label: "Válassz munkafázist..." },
              ...workItems.map((item) => ({ value: String(item.id), label: item.name })),
              { value: "0", label: "Egyéb munkafázis" },
            ]}
          />

          <CustomSelect
            value={profession}
            onChange={(val) => setProfession(val)}
            disabled={workItemId === "" || (!!workItemId && professionsForSelected.length === 0) || !!lockedProfession}
            placeholder="Válassz szakmát..."
            options={[
              { value: "", label: "Válassz szakmát..." },
              ...professionsForSelected.map((p) => ({ value: p, label: p })),
              ...(!lockedProfession ? [{ value: "Egyéb", label: "Egyéb" }] : []),
            ]}
          />
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
          
          <DialogFooter className="flex gap-2">
            <Button type="submit" disabled={loading || !name || !email || !phone || !profession || !workItemId}>
              {loading ? "Mentés..." : "Hozzáadás"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégsem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerAddModal;
