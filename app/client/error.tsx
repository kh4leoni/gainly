"use client";

// Per-route-segment error boundary for the entire /client/* tree.
//
// Two situations land here in practice:
//   1) Server-rendered RSC throws (unexpected exception in a server
//      component) — show a generic recovery affordance.
//   2) Client-side router can't fetch the RSC payload — typical when
//      the user navigates to a page they haven't visited online yet
//      while offline. Network failure aborts the navigation and React
//      surfaces it through this boundary instead of leaving the user
//      with a blank screen.
//
// We special-case the offline branch because the recovery is just
// "wait for connectivity" — `reset()` would simply re-fail.

import { useEffect, useState } from "react";

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // The fetch errors React surfaces here have generic shapes — look at
  // a few common signals so we can phrase the message for the dominant
  // case.
  const looksLikeNetwork =
    !online ||
    /fetch|network|load|chunk|RSC/i.test(error.message);

  return (
    <div
      style={{
        flex: 1,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
        background: "var(--c-bg)",
        color: "var(--c-text)",
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 14, opacity: 0.5 }}>
        {looksLikeNetwork ? "📡" : "⚠️"}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {looksLikeNetwork ? "Ei verkkoyhteyttä" : "Jokin meni pieleen"}
      </h2>
      <p style={{ fontSize: 13, color: "var(--c-text-muted)", maxWidth: 320, lineHeight: 1.5, marginBottom: 22 }}>
        {looksLikeNetwork
          ? "Tämä näkymä vaatii verkkoyhteyden. Kun olet taas verkossa, sivu päivittyy automaattisesti."
          : "Sivua ei voitu näyttää. Voit yrittää uudelleen tai palata etusivulle."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {!looksLikeNetwork && (
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--r-md)",
              background: "var(--c-pink)",
              color: "var(--c-pink-fg, #fff)",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Yritä uudelleen
          </button>
        )}
        <a
          href="/client/dashboard"
          style={{
            padding: "10px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--c-surface2)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Etusivulle
        </a>
      </div>
    </div>
  );
}
