"use client";

import React, { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl shadow-xl border border-orange-500/20 p-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full bg-transparent border-none p-2 cursor-pointer hover:bg-gray-600/30 rounded-xl transition-colors duration-200"
      >
        <div className="font-bold text-lg text-white flex items-center gap-3">
          <div className="w-3 h-3 bg-orange-500 rounded-full shadow-lg"></div>
          {title}
          {typeof count !== "undefined" && (
            <span className="font-semibold text-orange-400"> ({count})</span>
          )}
        </div>
        <span
          aria-hidden
          className={`inline-block transition-transform duration-200 text-orange-500 text-lg ${
            open ? "rotate-90" : "rotate-0"
          }`}
        >
          ▶
        </span>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          open ? "opacity-100 pt-4" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        {open && <div className="text-white">{children}</div>}
      </div>
    </div>
  );
}
