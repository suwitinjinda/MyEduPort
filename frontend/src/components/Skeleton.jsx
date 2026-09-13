import React from "react";

/**
 * Editorial loading skeleton. Use in place of "Loading..." text.
 *
 *   <Skeleton lines={3} />
 *   <SkeletonCard />
 *   <SkeletonStats count={4} />
 */
export default function Skeleton({ lines = 3, width = "100%" }) {
  return (
    <div style={{ display: "grid", gap: "0.5rem", width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-bar"
          style={{
            height: "14px",
            background: "linear-gradient(90deg, var(--paper-warm), var(--paper-deep), var(--paper-warm))",
            backgroundSize: "200% 100%",
            animation: "skeletonShimmer 1.6s ease infinite",
            width: i === lines - 1 ? "60%" : "100%",
            borderRadius: "2px"
          }}
        />
      ))}
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard({ height = "120px" }) {
  return (
    <div
      className="card"
      style={{
        height,
        background: "linear-gradient(90deg, var(--paper-warm), var(--paper-deep), var(--paper-warm))",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.6s ease infinite",
        border: "1px solid var(--rule)"
      }}
    >
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height="120px" />
      ))}
    </div>
  );
}

/**
 * Editorial empty state. Use when a list is empty.
 *
 *   <EmptyState title="No activities yet." hint="..." action={...} />
 */
export function EmptyState({ title, hint, action, icon = "✦" }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 1.5rem",
        border: "1px dashed var(--rule)",
        background: "var(--surface-warm)"
      }}
    >
      <div style={{ fontSize: "2rem", color: "var(--gold)", marginBottom: "0.75rem" }}>{icon}</div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.25rem",
          color: "var(--ink)",
          fontStyle: "italic",
          marginBottom: hint ? "0.5rem" : 0
        }}
      >
        {title}
      </div>
      {hint && <p className="muted" style={{ fontSize: "0.9rem", maxWidth: "44ch", margin: "0 auto 1.25rem" }}>{hint}</p>}
      {action}
    </div>
  );
}
