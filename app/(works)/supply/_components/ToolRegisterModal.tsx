"use client";
import React, { useState } from "react";
import type { Tool } from "@/types/work";
import { checkToolExists } from "../../../../actions/tool-exists.server";

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ImagePlus } from "lucide-react";

interface ToolRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tool: Tool, quantity: number, description: string) => void;
  tools: Tool[];
  maxQuantity: number;
  requiredToolName?: string; // ÚJ: csak ezt lehet kiválasztani
}

const ToolRegisterModal: React.FC<ToolRegisterModalProps> = ({
  open,
  onClose,
  onSave,
  tools,
  maxQuantity,
  requiredToolName,
}) => {
  const [selectedToolId, setSelectedToolId] = useState<string | number>("");
  const [toolName, setToolName] = useState<string>(requiredToolName || "");
  const [displayName, setDisplayName] = useState<string>(requiredToolName || "");
  const [customDescription, setCustomDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState("");
  const [toolAvailable, setToolAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Tool image upload state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>("");

  console.log(tools, "RGT");

  React.useEffect(() => {
    if (open && requiredToolName) {
      setLoading(true);
      checkToolExists(requiredToolName)
        .then((exists) => setToolAvailable(exists))
        .catch(() => setToolAvailable(false))
        .finally(() => setLoading(false));
    } else {
      setToolAvailable(null);
    }
  }, [open, requiredToolName]);

  React.useEffect(() => {
    if (requiredToolName) setToolName(requiredToolName);
  }, [requiredToolName]);
  if (!open) return null;

  const findToolInRegistryByName = async (name: string) => {
    const res = await import("../../../../actions/tools-registry-actions");
    const allTools = await res.getToolsRegistryByTenant();
    return allTools.find((t: Tool) => t.name === name);
  };

  // Csak a slothoz tartozó eszköz választható
  const filteredTools = requiredToolName ? tools.filter((t) => t.name === requiredToolName) : tools;
  const isOutOfStock = filteredTools.length === 0;

  const handleSave = async () => {
    // Validáció
    if (!toolName) {
      setError("Add meg az eszköz nevét!");
      return;
    }

    if (!quantity || quantity < 1 || quantity > maxQuantity) {
      setError(`A mennyiség 1 és ${maxQuantity} között kell legyen!`);
      return;
    }
    // Megnézzük, van-e ilyen nevű eszköz a filteredTools-ban
    const resolvedDisplayName = displayName || requiredToolName;
    let found = filteredTools.find((t) => t.id === selectedToolId || t.name === selectedToolId);

    // Ha nem találtad a filteredTools-ban, akkor nézd meg a registry-ben (API hívás)
    if (!found) {
      found = await findToolInRegistryByName(toolName);
    }
    if (found) {
      // Már létező eszköz, csak hozzárendelés
      const tool = {
        ...found,
        name: toolName,
        displayName: resolvedDisplayName,
        description: customDescription,
        avatarUrl,
      } as Tool;
      setError("");
      onSave(tool, quantity, customDescription);
      onClose();
    } else {
      // Nem létező eszköz: regisztráljuk, majd hozzárendeljük
      const newTool = {
        id: -1,
        name: toolName,
        displayName: resolvedDisplayName,
        description: customDescription,
        quantity,
        avatarUrl,
      } as unknown as Tool;
      setError("");
      onSave(newTool, quantity, customDescription);
      onClose();
    }
  };

  // Select value sosem legyen üres string: undefined-ként hagyjuk, hogy a placeholder látszódjon
  const selectValue: string | undefined =
    toolAvailable === false && requiredToolName
      ? "nem_elérhető"
      : selectedToolId
      ? String(selectedToolId)
      : requiredToolName
      ? String(requiredToolName)
      : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl sm:text-2xl tracking-tight">Eszköz kiválasztása</DialogTitle>
        </DialogHeader>

        {/* Tool image upload UI */}
        <div className="space-y-2">
          <Label className="text-center">Kis kép (opcionális)</Label>
          <div className="flex items-center justify-center gap-3">
            <label
              htmlFor="tool-avatar-upload"
              className={`relative inline-flex h-16 w-16 items-center justify-center rounded-full border ${avatarPreview ? "border-primary bg-primary/5 shadow-sm" : "border-dashed border-muted-foreground/40 bg-muted"} cursor-pointer transition`}
              title="Kis kép kiválasztása"
            >
              {avatarPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setAvatarPreview("");
                    setAvatarUrl("");
                  }}
                  className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-destructive text-destructive bg-background hover:shadow"
                  title="Kép törlése"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {avatarPreview ? (
                <span className="relative block h-16 w-16 overflow-visible">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarPreview} alt="Tool preview" className="h-16 w-16 rounded-full object-cover" />
                </span>
              ) : (
                <span className="flex flex-col items-center text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="mt-1 text-xs">Kép feltöltése</span>
                </span>
              )}
              <input
                id="tool-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarError("");
                  setAvatarUploading(true);
                  setAvatarPreview(URL.createObjectURL(file));
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await fetch("/api/upload-avatar", {
                      method: "POST",
                      body: formData,
                    });
                    const data = await res.json();
                    if (data.url) {
                      setAvatarUrl(data.url);
                    } else {
                      setAvatarError(data.error || "Hiba történt a feltöltésnél.");
                      setAvatarUrl("");
                    }
                  } catch (err) {
                    setAvatarError("Hiba a feltöltés során.");
                    setAvatarUrl("");
                    console.log(err);
                  } finally {
                    setAvatarUploading(false);
                  }
                }}
              />
            </label>
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-muted-foreground">Max 1 kép, 2 MB</span>
              {avatarUploading && <span className="text-primary text-xs">Feltöltés...</span>}
              {avatarError && <span className="text-destructive text-xs">{avatarError}</span>}
            </div>
          </div>
        </div>
        {/* End Tool image upload UI */}

        <div className="space-y-2">
          <Label>Választható eszköz:</Label>
          <Select
            disabled={loading}
            value={selectValue}
            onValueChange={(val) => setSelectedToolId(val)}
          >
            <SelectTrigger className={`${toolAvailable === false ? "bg-destructive/10 text-destructive" : ""}`}>
              <SelectValue placeholder={loading ? "Ellenőrzés..." : "Válassz eszközt"} />
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <SelectItem value="ellenorzes">Ellenőrzés...</SelectItem>
              ) : toolAvailable === false && requiredToolName ? (
                <SelectItem value="nem_elérhető" disabled>nem elérhető</SelectItem>
              ) : requiredToolName ? (
                <SelectItem value={requiredToolName}>{requiredToolName}</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Név:</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>
            Leírás <span className="text-destructive">*</span>:
          </Label>
          <Textarea
            value={customDescription || ""}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Rövid leírás az eszközről"
            className="min-h-14"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Label className="min-w-20">Mennyiség <span className="text-destructive">*</span>:</Label>
          <Input
            type="number"
            value={quantity}
            min={1}
            max={maxQuantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={`w-24 ${isOutOfStock ? "bg-muted" : ""}`}
            required
            disabled={isOutOfStock}
          />
          <span className="text-sm text-muted-foreground">(max: {maxQuantity})</span>
        </div>

        {error && (
          <div className="text-center font-medium text-destructive -mt-1">{error}</div>
        )}

        <DialogFooter className="mt-2 flex gap-3 sm:gap-4">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Mégse</Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isOutOfStock}
          >
            Mentés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToolRegisterModal;
