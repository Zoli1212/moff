'use client';
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, ListChecks } from "lucide-react";

export default function BillingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menu = [
    {
      href: "/billings",
      label: "Számlázható",
      icon: <ListChecks size={24} />,
    },
    {
      href: "/billings/my-invoices",
      label: "Számlázott",
      icon: <FileText size={24} />,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", position: "relative", paddingBottom: 80 }}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: 420,
          margin: '0 auto',
          zIndex: 10,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "transform",
        }}
      >
        <div
          style={{
            height: 1,
            background: "#eee",
            width: "100%",
            marginBottom: 2,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            background: '#fff',
            borderRadius: 18,
            boxShadow: "0 1px 6px #eee",
            padding: '12px 0 8px 0',
            opacity: 1,
          }}
        >
          {menu.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontSize: 18,
                    background: "transparent",
                    borderRadius: 10,
                    padding: '2px 8px',
                    color: '#FE9C00',
                    fontWeight: '600',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 28,
                        height: 3,
                        borderRadius: 3,
                        background: '#FE9C00',
                      }}
                    />
                  )}
                  {icon}
                  <span style={{ fontSize: 12, marginTop: 4 }}>{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
