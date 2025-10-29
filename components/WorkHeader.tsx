"use client";

import React from "react";
import Link from "next/link";

interface WorkHeaderProps {
  title: string;
  onAddClick?: () => void;
  addButtonDisabled?: boolean;
}

export default function WorkHeader({
  title,
  onAddClick,
  addButtonDisabled,
}: WorkHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
        padding: "0 24px",
        paddingTop: 24,
      }}
    >
      <Link
        href="/works"
        style={{
          border: "none",
          background: "none",
          fontSize: 14,
          cursor: "pointer",
          marginLeft: -12,
          marginRight: 8,
          fontWeight: "bold",
          textDecoration: "none",
          color: "#FE9C00",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#FE9C00";
          e.currentTarget.style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#FE9C00";
          e.currentTarget.style.opacity = "1";
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <polyline points="18,4 7,13 18,22" fill="none" />
        </svg>
      </Link>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, flex: 1 }}>
        {title}
      </div>
      {onAddClick && (
        <button
          onClick={onAddClick}
          disabled={addButtonDisabled}
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            minHeight: 36,
            borderRadius: "50%",
            backgroundColor: "transparent",
            border: addButtonDisabled ? "2px solid #ccc" : "2px solid #f97316",
            color: addButtonDisabled ? "#ccc" : "#f97316",
            fontSize: 24,
            fontWeight: "normal",
            cursor: addButtonDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "border-color 0.2s, color 0.2s",
            flexShrink: 0,
            padding: 0,
            margin: 0,
            lineHeight: 0,
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            if (!addButtonDisabled) {
              e.currentTarget.style.borderColor = "#ea580c";
              e.currentTarget.style.color = "#ea580c";
            }
          }}
          onMouseLeave={(e) => {
            if (!addButtonDisabled) {
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.color = "#f97316";
            }
          }}
        >
          <span
            style={{
              display: "block",
              lineHeight: 0,
              transform: "translateY(-2px)",
            }}
          >
            {addButtonDisabled ? "..." : "+"}
          </span>
        </button>
      )}
    </div>
  );
}
