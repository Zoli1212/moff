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
          background: '#fff',
          borderTop: '1px solid #eee',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '12px 0 8px 0',
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
                    padding: '2px 8px',
                    color: isActive ? '#FF9900' : '#333',
                    transition: 'color 0.2s',
                    position: 'relative',
                  }}
                >
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
