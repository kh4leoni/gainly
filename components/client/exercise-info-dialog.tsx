"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type ExerciseInfo = {
  name: string;
  instructions: string | null;
  video_path: string | null;
};

function getEmbedSrc(url: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\s?/]+)/);
  if (yt?.[1]) {
    const id = yt[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&loop=1&playlist=${id}&rel=0`;
  }
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi?.[1]) {
    return `https://player.vimeo.com/video/${vi[1]}?autoplay=1&controls=0&loop=1`;
  }
  return null;
}

function ExerciseAccordion({ ex, expanded, onToggle }: { ex: ExerciseInfo; expanded: boolean; onToggle: () => void }) {
  const src = getEmbedSrc(ex.video_path);
  const hasContent = !!(src ?? ex.instructions);
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      borderLeft: expanded ? "3px solid var(--c-pink)" : "3px solid rgba(255,255,255,0.08)",
      overflow: "hidden",
      background: "var(--c-surface2)",
      boxShadow: expanded ? "0 4px 20px rgba(255,29,140,0.07)" : "0 2px 8px rgba(0,0,0,0.18)",
      transition: "box-shadow 0.2s, border-left-color 0.2s",
    }}>
      <button
        type="button"
        onClick={hasContent ? onToggle : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%", padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: expanded ? "var(--c-surface3)" : hovered && hasContent ? "rgba(255,255,255,0.03)" : "var(--c-surface2)",
          cursor: hasContent ? "pointer" : "default",
          border: 0, textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)" }}>{ex.name}</span>
        {hasContent && (
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={expanded ? "var(--c-pink)" : "var(--c-text-muted)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transition: "transform 0.2s, stroke 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {expanded && hasContent && (
        <div style={{
          padding: "12px 16px 16px",
          display: "flex", flexDirection: "column", gap: 12,
          background: "var(--c-surface3)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          {src && (
            <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 10, overflow: "hidden", background: "#000" }}>
              <iframe
                src={src}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          )}
          {ex.instructions && (
            <div style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {ex.instructions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ExerciseInfoDialogProps {
  exercises: ExerciseInfo[];
  title?: string;
  trigger: React.ReactNode;
}

export function ExerciseInfoDialog({ exercises, title, trigger }: ExerciseInfoDialogProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) setExpandedIdx(null);
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-h-[85vh] flex flex-col overflow-hidden text-[#f0eef5]"
        style={{
          background: "#0f0f12",
          border: "1px solid rgba(255,255,255,0.12)",
          "--c-surface": "#0f0f12",
          "--c-surface2": "#161619",
          "--c-surface3": "#1e1e23",
          "--c-border": "rgba(255,255,255,0.07)",
          "--c-border-hover": "rgba(255,255,255,0.13)",
          "--c-pink": "#FF1D8C",
          "--c-text": "#f0eef5",
          "--c-text-muted": "rgba(240,238,245,0.48)",
        } as React.CSSProperties}
      >
        <DialogHeader style={{ flexShrink: 0 }}>
          <DialogTitle style={{ color: "#f0eef5" }}>{title ?? "Harjoitteet"}</DialogTitle>
        </DialogHeader>
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {exercises.map((ex, i) => (
            <ExerciseAccordion
              key={i}
              ex={ex}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
