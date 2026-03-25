"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClientQuoteSession } from "@/actions/client-quote-actions";
import { Sparkles, Paperclip, X, FileText, Shield } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

const ACCEPTED_FILE_TYPES = ".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.dwg";
const MAX_FILE_SIZE_MB = 10;

export default function QuoteRequestPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStart = async () => {
    if (!turnstileToken) {
      setError("Kérjük igazolja, hogy nem robot.");
      return;
    }
    if (!gdprConsent) {
      setError("Az adatkezelési tájékoztató elfogadása szükséges.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Kérjük írjon legalább 10 karaktert a projekt leírásához.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await createClientQuoteSession(description.trim());
      if (result.success && result.sessionId) {
        router.push(`/quote-request/${result.sessionId}`);
      }
    } catch {
      setError("Hiba történt. Kérjük próbálja újra.");
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = async (file: File) => {
    setFileError("");
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`A fájl mérete nem lehet nagyobb ${MAX_FILE_SIZE_MB} MB-nál.`);
      return;
    }
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-file", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFileError(data.error || "Nem sikerült feldolgozni a fájlt.");
        return;
      }
      setDescription(data.extractedText.slice(0, 2000));
      setUploadedFileName(file.name);
      setError("");
    } catch {
      setFileError("Hiba történt a fájl feltöltése során.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading && !isParsing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading || isParsing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const isDisabled = isLoading || isParsing;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div
        className={`relative w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 transition-all ${
          isDragging ? "ring-2 ring-orange-400 bg-orange-50/50" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-orange-50/90 border-2 border-dashed border-orange-400 pointer-events-none">
            <Paperclip className="w-10 h-10 text-orange-400 mb-2" />
            <p className="text-orange-600 font-semibold text-sm">Húzza ide a dokumentumot</p>
            <p className="text-orange-400 text-xs mt-1">PDF, DWG, DOCX, JPG, PNG</p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Új ajánlatkérés</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Illessze be az ajánlatkérést, írja le részletesen, vagy töltsön fel dokumentumot
        </p>

        {/* File upload area */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={handleFileSelect}
          disabled={isDisabled}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="w-full mb-4 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-4 text-sm text-gray-400 hover:text-orange-500 transition-all"
        >
          {isParsing ? (
            <>
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Dokumentum feldolgozása...
            </>
          ) : (
            <>
              <Paperclip className="w-4 h-4" />
              Dokumentum feltöltése (PDF, DWG, DOCX, JPG, PNG) — vagy húzza ide
            </>
          )}
        </button>

        {/* Uploaded file badge */}
        {uploadedFileName && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs px-3 py-2 rounded-lg mb-4">
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate flex-1">{uploadedFileName}</span>
            <button
              onClick={() => { setUploadedFileName(""); setDescription(""); }}
              className="hover:text-orange-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {fileError && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">
            <span>{fileError}</span>
            <button onClick={() => setFileError("")}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="relative mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">vagy írja le</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>

        <textarea
          className="w-full h-48 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 placeholder-gray-400 text-sm"
          placeholder="Például: 50m²-es lakás felújítása, burkolással, festéssel és villanyszerelésssel..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
            if (!e.target.value) setUploadedFileName("");
          }}
          maxLength={2000}
          disabled={isDisabled}
        />

        <div className="flex justify-between items-start mt-2 mb-6 gap-4">
          <div className="text-xs text-gray-400 space-y-1">
            {error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <>
                <p>• Minden fontos információt írjon le</p>
                <p>• Adja meg a pontos helyszínt</p>
                <p>• Mikorra lenne szüksége a munkákra?</p>
              </>
            )}
          </div>
          <span className="text-xs text-gray-300 flex-shrink-0">
            {description.length}/2000
          </span>
        </div>

        {/* GDPR Consent */}
        <label className="flex items-start gap-2 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={gdprConsent}
            onChange={(e) => {
              setGdprConsent(e.target.checked);
              if (e.target.checked) setError("");
            }}
            className="mt-0.5 w-4 h-4 accent-orange-500 rounded"
            disabled={isDisabled}
          />
          <span className="text-xs text-gray-500">
            <Shield className="w-3 h-3 inline-block mr-1 text-orange-500" />
            Elfogadom az{" "}
            <a href="/adatkezelesi-tajekoztato" target="_blank" className="text-orange-500 underline hover:text-orange-600">
              adatkezelési tájékoztatót
            </a>
            . Tudomásul veszem, hogy megadott adataimat a rendszer kizárólag az ajánlatkérés feldolgozásához
            tárolja, és bármikor kérhetem azok törlését.
          </span>
        </label>

        {/* Cloudflare Turnstile */}
        <div className="mb-6">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            options={{ theme: "light", size: "normal", language: "hu" }}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleStart}
            disabled={isDisabled || !gdprConsent || !turnstileToken || description.trim().length < 10}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? "Indítás..." : "Elemzés indítása"}
          </button>
        </div>
      </div>
    </div>
  );
}
