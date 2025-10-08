import React from "react";
import Link from "next/link";

interface WorkHeaderProps {
  title: string;
}

export default function WorkHeader({ title }: WorkHeaderProps) {
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
          color: "#222",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
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
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
        {title}
      </div>
    </div>
  );
}
