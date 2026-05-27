"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Only play once per browser session. Without this flag, every cached-HTML
// load (eg. offline navigation between tabs) remounts React and re-runs
// the splash animation.
const SHOWN_KEY = "gainly_splash_shown";

export function AppSplash({ coBrandLabel }: { coBrandLabel?: string | null }) {
  // Never render anything during SSR or before the mount effect runs.
  // The previous approach checked sessionStorage in the useState
  // initializer, but that still flashed the splash on every cached-HTML
  // load: SSR rendered `phase="in"` (no window available there), the
  // browser painted the splash from the static HTML, and only then did
  // React hydrate, see the sessionStorage flag, and remove it. The flash
  // was that ~16-32 ms gap. Render-after-mount fixes it cleanly.
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");

  useEffect(() => {
    let alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem(SHOWN_KEY) === "1"; } catch { /* ignore */ }
    if (alreadyShown) return;
    try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* private mode etc. */ }
    setPhase("in");
    const t1 = window.setTimeout(() => setPhase("out"), 850);
    const t2 = window.setTimeout(() => setPhase("hidden"), 1300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (phase === "hidden") return null;

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
