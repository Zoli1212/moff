"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileText, Table2, ChevronDown, Paperclip, X, Trash2, Download, Check, Bell } from "lucide-react";
import { exportToPDF, exportToExcel } from "./export-utils";
import { deleteClientQuoteData, exportClientQuoteData } from "@/actions/client-quote-actions";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  sessionId: string;
  initialMessages: Message[];
}

const ACCEPTED_FILE_TYPES = ".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.dwg";
const MAX_FILE_SIZE_MB = 10;

function parseEstimate(content: string): string | null {
  const start = content.indexOf("---AJÁNLAT_KEZDET---");
  const end = content.indexOf("---AJÁNLAT_VÉGE---");
  if (start === -1 || end === -1) return null;
  return content.slice(start + "---AJÁNLAT_KEZDET---".length, end).trim();
}

function cleanContent(content: string): string {
  return content
    .replace("---AJÁNLAT_KEZDET---", "")
    .replace(/- \[.*?\]:.*\n/g, "")
    .replace("---AJÁNLAT_VÉGE---", "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/^\*\s?/, "")
    .replace(/\*$/, "");
}

function FileBubble({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-2 bg-orange-400 text-white text-xs px-3 py-2 rounded-xl rounded-br-sm w-fit">
      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{fileName}</span>
    </div>
  );
}

function EstimateCard({
  estimate,
  onRefine,
  onDecline,
  onNotifyAll,
  emailSending,
  emailSent,
  emailResult,
}: {
  estimate: string;
  onRefine: () => void;
  onDecline: () => void;
  onNotifyAll: () => void;
  emailSending: boolean;
  emailSent: boolean;
  emailResult: string;
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const lines = estimate.split("\n").filter(Boolean);
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-gray-700">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-200">
        <Sparkles className="w-4 h-4 text-orange-500" />
        <span className="font-semibold text-orange-700">Becsült ajánlat</span>
      </div>
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          const isBullet = trimmed.startsWith("- ");
          const isBold = trimmed.startsWith("**");
          const isItalic = trimmed.startsWith("*") && !trimmed.startsWith("**");
          const clean = cleanMarkdown(isBullet ? trimmed.slice(2) : trimmed);

          if (isBullet) {
            return (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-orange-400 flex-shrink-0 mt-0.5">•</span>
                <span>{clean}</span>
              </div>
            );
          }
          return (
            <p
              key={i}
              className={
                isBold
                  ? "font-semibold text-gray-800 mt-2"
                  : isItalic
                  ? "text-gray-400 text-xs mt-1"
                  : ""
              }
            >
              {clean}
            </p>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-orange-200 flex flex-col gap-2">
        {emailSent ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg">
            <Check className="w-4 h-4" />
            {emailResult}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2">
          {!emailSent && (
            <button
              onClick={onNotifyAll}
              disabled={emailSending}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              {emailSending ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              Értesítés a kivitelezőknek
            </button>
          )}
          <button
            onClick={onRefine}
            className="flex-1 bg-white hover:bg-orange-50 text-orange-600 text-xs font-medium py-2 px-3 rounded-lg border border-orange-200 transition-all"
          >
            Ajánlat pontosítása a chatben
          </button>
          <button
            onClick={onDecline}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-500 text-xs font-medium py-2 px-3 rounded-lg border border-gray-200 transition-all"
          >
            Nem kérem, köszönöm
          </button>
        </div>

        <div className="relative flex-1">
          <button
            onClick={() => setExportOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium py-2 px-3 rounded-lg border transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Exportálás
          </button>
          {exportOpen && (
            <div className="absolute bottom-full mb-1 right-0 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
              <div className="px-3 py-2 bg-gray-50 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Tételek + árak</div>
              <button
                onClick={() => { exportToPDF(estimate, true); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-orange-400" />
                PDF letöltés
              </button>
              <button
                onClick={() => { exportToExcel(estimate, true); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-t border-gray-100"
              >
                <Table2 className="w-4 h-4 text-orange-400" />
                Excel letöltés
              </button>
              <div className="px-3 py-2 bg-gray-50 text-[10px] text-gray-400 font-semibold uppercase tracking-wide border-t">Csak tételek (ár nélkül)</div>
              <button
                onClick={() => { exportToPDF(estimate, false); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                PDF letöltés
              </button>
              <button
                onClick={() => { exportToExcel(estimate, false); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-t border-gray-100"
              >
                <Table2 className="w-4 h-4 text-gray-400" />
                Excel letöltés
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start items-end gap-3">
      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function QuoteChatClient({ sessionId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailResult, setEmailResult] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    if (!hasAutoSent.current && messages.length === 1 && messages[0].role === "user") {
      hasAutoSent.current = true;
      sendToAI(messages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendToAI(currentMessages: Message[], retryCount = 0) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/client-quote-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages, sessionId }),
      });
      if (!res.ok && retryCount < 2) {
        console.warn(`[QuoteChatClient] retry ${retryCount + 1}/2`);
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
        return sendToAI(currentMessages, retryCount + 1);
      }
      const data = await res.json();
      if (data.reply) {
        setMessages([
          ...currentMessages,
          { role: "assistant", content: data.reply },
        ]);
      } else if (data.error) {
        setMessages([
          ...currentMessages,
          { role: "assistant", content: "Hiba történt, kérjük próbálja újra." },
        ]);
      }
    } catch (e) {
      console.error("[QuoteChatClient] fetch error:", e);
      if (retryCount < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
        return sendToAI(currentMessages, retryCount + 1);
      }
      setMessages([
        ...currentMessages,
        { role: "assistant", content: "Nem sikerült kapcsolódni a szerverhez. Kérjük próbálja újra." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || isParsingFile) return;
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendToAI(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  // Rate limiting for file uploads
  const lastUploadTime = useRef<number>(0);
  const UPLOAD_COOLDOWN = 2000; // 2 seconds between uploads

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastUploadTime.current < UPLOAD_COOLDOWN) {
      setFileError("Túl gyakori feltöltés. Kérjük várjon 2 másodpercet.");
      return;
    }
    lastUploadTime.current = now;

    setFileError("");

    const oversized = fileArray.find(
      (f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024
    );
    if (oversized) {
      setFileError(
        `"${oversized.name}" mérete meghaladja a ${MAX_FILE_SIZE_MB} MB-os limitet.`
      );
      return;
    }

    setIsParsingFile(true);
    try {
      const results = await Promise.all(
        fileArray.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/parse-file", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(
              `"${file.name}": ${data.error || "Feldolgozási hiba"}`
            );
          }
          return `📎 Feltöltött dokumentum (${file.name}):\n\n${data.extractedText}`;
        })
      );

      const combined = results.join("\n\n---\n\n");
      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: combined },
      ];
      setMessages(newMessages);
      await sendToAI(newMessages);
    } catch (err: unknown) {
      setFileError(
        err instanceof Error ? err.message : "Hiba történt a feltöltés során."
      );
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) await processFiles(files);
  };

  const isDisabled = isLoading || isParsingFile;

  return (
    <div
      className="relative flex flex-col"
      style={{ height: "calc(100vh - 80px)" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">AI Ajánlatkérő</h2>
            <p className="text-xs text-gray-400">
              Válaszoljon az AI kérdéseire az ajánlat elkészítéséhez
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Adataim exportálása (GDPR)"
            onClick={async () => {
              try {
                const data = await exportClientQuoteData(sessionId);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `ajanlatkeres-${sessionId.slice(0, 8)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { /* ignore */ }
            }}
            className="p-2 text-gray-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-gray-100"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            title="Adataim törlése (GDPR)"
            onClick={async () => {
              if (!confirm("Biztosan törölni szeretné az összes adatát ehhez az ajánlatkéréshez? Ez a művelet nem visszavonható.")) return;
              try {
                await deleteClientQuoteData(sessionId);
                window.location.href = "/quote-request";
              } catch { /* ignore */ }
            }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-orange-50/90 border-2 border-dashed border-orange-400 rounded-xl pointer-events-none">
          <Paperclip className="w-10 h-10 text-orange-400 mb-3" />
          <p className="text-orange-600 font-semibold text-sm">
            Húzza ide a fájlokat
          </p>
          <p className="text-orange-400 text-xs mt-1">
            PDF, DWG, JPG, PNG, DOCX
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gray-50">
        {messages.map((msg, i) => {
          const estimate =
            msg.role === "assistant" ? parseEstimate(msg.content) : null;
          const displayContent =
            msg.role === "assistant" ? cleanContent(msg.content) : msg.content;

          const isFileMessage =
            msg.role === "user" && msg.content.startsWith("📎 Feltöltött dokumentum");
          const fileNameMatch = isFileMessage
            ? msg.content.match(/📎 Feltöltött dokumentum \((.+?)\)/)
            : null;
          const fileDisplayName = fileNameMatch?.[1] ?? null;
          const fileTextContent = isFileMessage
            ? msg.content.replace(/^📎 Feltöltött dokumentum \(.+?\):\n\n/, "")
            : null;

          return (
            <div
              key={i}
              className={`flex items-end gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="max-w-[75%] space-y-2">
                {isFileMessage && fileDisplayName ? (
                  <>
                    <FileBubble fileName={fileDisplayName} />
                    {fileTextContent && (
                      <div className="px-4 py-3 rounded-2xl rounded-br-sm text-xs whitespace-pre-wrap leading-relaxed bg-orange-500 text-white max-h-32 overflow-y-auto">
                        {fileTextContent.substring(0, 300)}
                        {fileTextContent.length > 300 && "…"}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {displayContent && (
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                          msg.role === "user"
                            ? "bg-orange-500 text-white rounded-br-sm"
                            : "bg-white text-gray-800 shadow-sm rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "assistant"
                          ? cleanMarkdown(displayContent)
                          : displayContent}
                      </div>
                    )}
                  </>
                )}
                {estimate && (
                  <EstimateCard
                    estimate={estimate}
                    onRefine={() => {
                      const refineMsg = "Kérem az ajánlat pontosítását.";
                      const newMessages: Message[] = [
                        ...messages,
                        { role: "user", content: refineMsg },
                      ];
                      setMessages(newMessages);
                      sendToAI(newMessages);
                    }}
                    onDecline={() => {
                      const declineMsg = "Köszönöm, nem kérem az ajánlat pontosítását.";
                      const newMessages: Message[] = [
                        ...messages,
                        { role: "user", content: declineMsg },
                      ];
                      setMessages(newMessages);
                      sendToAI(newMessages);
                    }}
                    onNotifyAll={async () => {
                      setEmailSending(true);
                      try {
                        const allText = messages.map((m) => m.content).join(" ");
                        const workTypes = allText.match(/festés|burkolás|villanyszerelés|vízszerelés|gipszkarton|tetőfedés|asztalos|kőműves|bádogos|vakolás|szigetelés|laminált|padló|ajtó/gi) || ["általános felújítás"];
                        const uniqueWorkTypes = [...new Set(workTypes.map((w) => w.toLowerCase()))];
                        const clientName = messages.find((m) => m.role === "user" && /vagyok|nevem/i.test(m.content))?.content.match(/([A-ZÁÉÍÓÖŐÜŰ][a-záéíóöőüű]+\s[A-ZÁÉÍÓÖŐÜŰ][a-záéíóöőüű]+)/)?.[1] || "Megrendelő";

                        const { notifyAllContractors } = await import("@/actions/quote-request-actions");
                        const result = await notifyAllContractors(
                          sessionId,
                          clientName,
                          estimate.replace(/[\d.,]+\s*Ft/g, "—"),
                          uniqueWorkTypes
                        );
                        setEmailResult(result.message);
                        setEmailSent(true);
                      } catch {
                        setEmailResult("Hiba történt a küldés során. Kérjük próbálja újra.");
                        setEmailSent(true);
                      } finally {
                        setEmailSending(false);
                      }
                    }}
                    emailSending={emailSending}
                    emailSent={emailSent}
                    emailResult={emailResult}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isParsingFile && (
          <div className="flex justify-end">
            <div className="flex items-center gap-2 bg-orange-100 text-orange-600 text-xs px-4 py-2 rounded-xl">
              <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Fájl feldolgozása...
            </div>
          </div>
        )}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4 rounded-b-xl">
        {fileError && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">
            <span>{fileError}</span>
            <button onClick={() => setFileError("")}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isDisabled}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            title="Fájl feltöltése (PDF, Excel, DOCX, JPG, PNG)"
            className="text-gray-400 hover:text-orange-500 disabled:text-gray-200 disabled:cursor-not-allowed p-3 rounded-xl border border-gray-200 hover:border-orange-300 transition-all flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 leading-relaxed"
            placeholder="Írja be válaszát..."
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isDisabled}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isDisabled}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Enter = küldés &nbsp;•&nbsp; Shift+Enter = új sor &nbsp;•&nbsp; 📎 PDF, DWG, DOCX, JPG, PNG – húzd ide vagy kattints
        </p>
      </div>
    </div>
  );
}
