'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUserData } from "@/actions/user-actions";

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTenant, setIsTenant] = useState<boolean>(true);

  useEffect(() => {
    getCurrentUserData()
      .then(data => {
        setIsTenant(data.isTenant ?? true);
      })
      .catch(() => {
        setIsTenant(true);
      });
  }, []);

  // Extract workId from /works/:id if present
  let workId: number | null = null;
  if (pathname.startsWith('/works/') || pathname.startsWith('/tasks/') || pathname.startsWith('/supply/') || pathname.startsWith('/diary/') || pathname.startsWith('/others/')) {
    const param = pathname.split('/')[2];
    if (param && /^\d+$/.test(param)) {
      workId = parseInt(param, 10);
    }
  }

  const menu = [
    {
      href: workId ? `/works/${workId}` : "/works",
      label: "Főoldal",
      icon: (
        <svg
          width="24" height="24" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg" aria-label="fooldal"
          style={{ opacity: 0.6 }}
        >
          <path
            d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z"
            stroke="#111" strokeWidth="1.2" strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: `/tasks/${workId}`,
      label: "Feladatok",
      icon: (
        <svg
          width="24" height="24" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg" aria-label="feladatok"
          style={{ opacity: 0.6 }}
        >
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#111" strokeWidth="1.2" />
          <path
            d="M7 12l3 3 7-7"
            stroke="#111" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: `/supply/${workId}`,
      label: "Erőforrás",
      tenantOnly: true,
      icon: (
          <img 
      src="/munka.png" 
      alt="Erőforrás" 
      width="24" 
      height="24"
      style={{
  display: 'block',
  opacity: 1,
  filter: 'contrast(1.9)',
  WebkitFilter: 'none',
}}
    />
      ),
    },
    {
      href: `/diary/${workId}`,
      label: "Napló",
      icon: (
        <svg
          width="24" height="24" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg" aria-label="naptar"
          style={{ opacity: 0.6 }}
        >
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="#111" strokeWidth="1.2" />
          <path
            d="M16 3v4M8 3v4M3 9h18"
            stroke="#111" strokeWidth="1.2" strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      // href: `/others/${workId}`,
      href: `/seged`,
      label: "Egyéb",
      tenantOnly: true,
      icon: (
        <svg
          width="24" height="24" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg" aria-label="egyeb"
          style={{ opacity: 0.6 }}
        >
          <circle cx="6" cy="12" r="2" fill="#111" />
          <circle cx="12" cy="12" r="2" fill="#111" />
          <circle cx="18" cy="12" r="2" fill="#111" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {children}
      {workId !== null && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxWidth: 420,
            margin: '0 auto',
            zIndex: 10,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          <div style={{ height: 1, background: '#eee', width: '100%', marginBottom: 6 }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 1px 6px #eee',
              padding: '12px 0 8px 0',
              opacity: 1,
            }}
          >
            {menu
              .filter(item => {
                // Hide tenant-only items for workers
                if (!isTenant && item.tenantOnly) {
                  return false;
                }
                return true;
              })
              .map(({ href, label, icon }) => {
  // Use href directly, don't append id again
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      key={href}
      href={href}
      style={{ textDecoration: 'none', color: 'inherit' }}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }}
    >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      fontSize: 18,
                      background: 'transparent',
                      borderRadius: 10,
                      padding: '2px 8px',
                      color: '#000',
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
                          background: '#bbb',
                        }}
                      />
                    )}
                    {icon}
                    <span style={{ fontSize: 12 }}>{label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
