"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Only play once per browser session. Without this flag, every cached-HTML
// load (eg. offline navigation between tabs) remounts React and re-runs
// the splash animation.
const SHOWN_KEY = "gainly_splash_shown";

export function AppSplash({ coBrandLabel }: { coBrandLabel?: string | null }) {
  // Compute initial visibility synchronously so we never flash the splash
  // on subsequent mounts within the same session.
  const [phase, setPhase] = useState<"in" | "out" | "gone">(() => {
    if (typeof window === "undefined") return "in";
    try {
      return sessionStorage.getItem(SHOWN_KEY) === "1" ? "gone" : "in";
    } catch {
      return "in";
    }
  });

  useEffect(() => {
    if (phase === "gone") return;
    try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* private mode etc. */ }
    const t1 = window.setTimeout(() => setPhase("out"), 850);
    const t2 = window.setTimeout(() => setPhase("gone"), 1300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase]);

  if (phase === "gone") return null;

  const cobrand = !!coBrandLabel;
  const src = cobrand ? "/fs%20collab.png" : "/LOGO_gainly.png";
  // Collab logo is roughly twice as wide as the solo Gainly mark; keep
  // the same on-screen height by scaling the width up to compensate.
  const width = cobrand ? 360 : 260;

  return (
    <div className={`app-splash app-splash-${phase}`} aria-hidden>
      <div className="app-splash-logo">
        <Image
          src={src}
          alt=""
          width={width}
          height={104}
          priority
          className="logo-adaptive"
        />
        <span className="app-splash-shine" aria-hidden />
      </div>
    </div>
  );
}
