"use client";

import { useEffect, useState } from "react";

export function AppSplash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("out"), 650);
    const t2 = window.setTimeout(() => setPhase("gone"), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`app-splash app-splash-${phase}`} aria-hidden>
      <div className="app-splash-text">Gainly</div>
    </div>
  );
}
