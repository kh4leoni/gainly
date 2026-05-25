"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function AppSplash() {
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

  return (
    <div className={`app-splash app-splash-${phase}`} aria-hidden>
      <div className="app-splash-logo">
        <Image
          src="/LOGO_gainly.png"
          alt=""
          width={260}
          height={104}
          priority
          className="logo-adaptive"
        />
        <span className="app-splash-shine" aria-hidden />
      </div>
    </div>
  );
}
