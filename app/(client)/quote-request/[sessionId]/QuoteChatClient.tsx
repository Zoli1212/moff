"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, FileText, Table2, ChevronDown } from "lucide-react";
import { exportToPDF, exportToExcel } from "./export-utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  sessionId: string;
  initialMessages: Message[];
}

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
    .replace(/\*\*/g, "")   // bold jelölők
    .replace(/\[/g, "")     // nyitó szögletes zárójel
    .replace(/\]/g, "")     // záró szögletes zárójel
    .replace(/^\*\s?/, "")  // sor eleji csillag (dőlt)
    .replace(/\*$/, "");    // sor végi csillag
}

function EstimateCard({
  estimate,
  onRefine,
}: {
  estimate: string;
  onRefine: () => void;
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
      <div className="mt-4 pt-3 border-t border-orange-200 flex flex-col sm:flex-row gap-2">
        <button
          onClick={onRefine}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all"
        >
          Kérem az ajánlat pontosítását
        </button>
        <div className="relative flex-1">
          <button
            onClick={() => setExportOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium py-2 px-3 rounded-lg border transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Exportálás
          </button>
          {exportOpen && (
            <div className="absolute bottom-full mb-1 right-0 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
              <button
                onClick={() => { exportToPDF(estimate); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-orange-400" />
                PDF letöltés
              </button>
              <button
                onClick={() => { exportToExcel(estimate); setExportOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors border-t border-gray-100"
              >
                <Table2 className="w-4 h-4 text-orange-400" />
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);

  // Auto-send the first user message to kick off the AI
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

  async function sendToAI(currentMessages: Message[]) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/client-quote-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages, sessionId }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([
          ...currentMessages,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch (e) {
      console.error("[QuoteChatClient] fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
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

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 rounded-t-xl">
        <Sparkles className="w-5 h-5 text-orange-500" />
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">AI Ajánlatkérő</h2>
          <p className="text-xs text-gray-400">
            Válaszoljon az AI kérdéseire az ajánlat elkészítéséhez
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gray-50">
        {messages.map((msg, i) => {
          const estimate =
            msg.role === "assistant" ? parseEstimate(msg.content) : null;
          const displayContent =
            msg.role === "assistant" ? cleanContent(msg.content) : msg.content;

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

              <div className="max-w-[75%] space-y-3">
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
                  />
                )}
              </div>
            </div>
          );
        })}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4 rounded-b-xl">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 leading-relaxed"
            placeholder="Írja be válaszát..."
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Enter = küldés &nbsp;•&nbsp; Shift+Enter = új sor
        </p>
      </div>
    </div>
  );
}
