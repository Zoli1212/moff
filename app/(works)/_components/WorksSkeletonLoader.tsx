"use client";

export default function WorksSkeletonLoader() {
  return (
    <div
      style={{
        padding: "16px",
        maxWidth: 420,
        margin: "0 auto",
        minHeight: "100vh",
        background: "#fff",
      }}
    >
      {/* 3 kártyás skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: "#f5f5f5",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          {/* Cím skeleton */}
          <div
            style={{
              height: 24,
              background: "#e0e0e0",
              borderRadius: 6,
              marginBottom: 12,
              width: "70%",
            }}
          />
          
          {/* Tartalom skeleton */}
          <div
            style={{
              height: 16,
              background: "#e0e0e0",
              borderRadius: 4,
              marginBottom: 8,
              width: "90%",
            }}
          />
          <div
            style={{
              height: 16,
              background: "#e0e0e0",
              borderRadius: 4,
              marginBottom: 8,
              width: "60%",
            }}
          />
          
          {/* Alsó rész skeleton */}
          <div
            style={{
              height: 14,
              background: "#e0e0e0",
              borderRadius: 4,
              marginTop: 12,
              width: "40%",
            }}
          />
        </div>
      ))}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
