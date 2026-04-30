"use client";

import type { ReactNode } from "react";

export function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: "grid-template-rows 220ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div style={{ overflow: "hidden" }}>{children}</div>
    </div>
  );
}
