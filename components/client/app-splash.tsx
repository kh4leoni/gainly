"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function AppSplash({ coBrandLabel }: { coBrandLabel?: string | null }) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("out"), 850);
    const t2 = window.setTimeout(() => setPhase("gone"), 1300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

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
