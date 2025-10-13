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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between w-full bg-transparent border-none p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors duration-200"
      >
        <div className="font-bold text-lg text-gray-900 flex items-center gap-3">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          {title}
          {typeof count !== "undefined" && (
            <span className="font-semibold text-gray-600"> ({count})</span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 text-gray-600 ${
            open ? "rotate-90" : "rotate-0"
          }`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          open ? "opacity-100 pt-4" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        {open && <div className="text-gray-900">{children}</div>}
      </div>
    </div>
  );
}
