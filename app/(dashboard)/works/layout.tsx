import React from "react";

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#fff', borderRadius: 18, boxShadow: '0 1px 6px #eee', padding: '12px 0 8px 0', position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 420, margin: '0 auto', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <span role="img" aria-label="fooldal">🏠</span>
          <span style={{ fontSize: 12 }}>Főoldal</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <span role="img" aria-label="feladatok">☑️</span>
          <span style={{ fontSize: 12 }}>Feladatok</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <span role="img" aria-label="beszámoló">📁</span>
          <span style={{ fontSize: 12 }}>Beszámoló</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <span role="img" aria-label="naptar">📅</span>
          <span style={{ fontSize: 12 }}>Naptár</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 18 }}>
          <span role="img" aria-label="egyeb">⋯</span>
          <span style={{ fontSize: 12 }}>Egyéb</span>
        </div>
      </div>
    </div>
  );
}
