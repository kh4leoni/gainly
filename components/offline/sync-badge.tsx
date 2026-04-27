"use client";

import type { SyncedFlag } from "@/lib/offline/types";

type Variant = "icon" | "pill";

export function SyncBadge({
  synced,
  size = 12,
  variant = "pill",
}: {
  synced: SyncedFlag | boolean;
  size?: number;
  variant?: Variant;
}) {
  const isSynced = synced === 1 || synced === true;
  const label = isSynced ? "Synkronoitu" : "Odottaa synkronointia";

  if (variant === "icon") {
    return (
      <span
        title={label}
        aria-label={label}
        style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      >
        {isSynced ? (
          <svg
            width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="#3ECF8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 14" />
          </svg>
        )}
      </span>
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.3px",
        textTransform: "uppercase",
        background: isSynced ? "rgba(62,207,142,0.12)" : "rgba(245,166,35,0.14)",
        color: isSynced ? "#3ECF8E" : "#F5A623",
        border: isSynced ? "1px solid rgba(62,207,142,0.28)" : "1px solid rgba(245,166,35,0.32)",
        flexShrink: 0,
      }}
    >
      {isSynced ? (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      )}
      {isSynced ? "Synkr." : "Odottaa"}
    </span>
  );
}
