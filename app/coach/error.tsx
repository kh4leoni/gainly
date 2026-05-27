"use client";

// Mirror of /client/error.tsx for the coach tree. Same dual-case logic:
// distinguish offline / network errors from other render failures so the
// recovery copy isn't misleading.

import { useEffect, useState } from "react";

export default function CoachError({
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

  const looksLikeNetwork =
    !online || /fetch|network|load|chunk|RSC/i.test(error.message);

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
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 14, opacity: 0.5 }}>
        {looksLikeNetwork ? "📡" : "⚠️"}
      </div>
      <h2 className="text-lg font-bold mb-2">
        {looksLikeNetwork ? "Ei verkkoyhteyttä" : "Jokin meni pieleen"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">
        {looksLikeNetwork
          ? "Coach-näkymät vaativat verkkoyhteyden. Sivu päivittyy automaattisesti kun yhteys palaa."
          : "Sivua ei voitu näyttää. Voit yrittää uudelleen tai palata dashboardiin."}
      </p>
      <div className="flex gap-2 flex-wrap justify-center">
        {!looksLikeNetwork && (
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          >
            Yritä uudelleen
          </button>
        )}
        <a
          href="/coach/dashboard"
          className="rounded-md border bg-background px-4 py-2 text-sm font-medium"
        >
          Dashboardiin
        </a>
      </div>
    </div>
  );
}
