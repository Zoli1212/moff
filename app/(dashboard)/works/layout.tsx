import React from "react";

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#fff', borderRadius: 18, boxShadow: '0 1px 6px #eee', padding: '12px 0 8px 0', position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 420, margin: '0 auto', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="fooldal"><path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" stroke="#111" strokeWidth="2" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 12 }}>Főoldal</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="feladatok"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#111" strokeWidth="2"/><path d="M7 12l3 3 7-7" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 12 }}>Feladatok</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="beszámoló"><rect x="3" y="7" width="18" height="13" rx="2" stroke="#111" strokeWidth="2"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2" stroke="#111" strokeWidth="2"/></svg>
          <span style={{ fontSize: 12 }}>Beszámoló</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="naptar"><rect x="3" y="5" width="18" height="16" rx="2" stroke="#111" strokeWidth="2"/><path d="M16 3v4M8 3v4M3 9h18" stroke="#111" strokeWidth="2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 12 }}>Napló</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="egyeb"><circle cx="6" cy="12" r="2" fill="#111"/><circle cx="12" cy="12" r="2" fill="#111"/><circle cx="18" cy="12" r="2" fill="#111"/></svg>
          <span style={{ fontSize: 12 }}>Egyéb</span>
        </div>
      </div>
    </div>
  );
}
