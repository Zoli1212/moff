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
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 1px 5px #eee",
        padding: "10px 12px",
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "6px 6px",
          cursor: "pointer",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.3 }}>
          {title}
          {typeof count !== "undefined" && (
            <span style={{ fontWeight: 600 }}> ({count})</span>
          )}
        </div>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            transition: "transform 0.2s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: "#888",
          }}
        >
          ▶
        </span>
      </button>
      <div
        style={{
          height: open ? "auto" : 0,
          overflow: "hidden",
          transition: "height 0.2s ease",
          padding: open ? "8px 6px 2px" : "0 6px",
        }}
      >
        {open && children}
      </div>
    </div>
  );
}
