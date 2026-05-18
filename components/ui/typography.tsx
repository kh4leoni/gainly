import type { CSSProperties, ReactNode } from "react";

type Common = { children: ReactNode; style?: CSSProperties; className?: string };

/**
 * Small uppercase label (kicker). Sits above headings, on stat cards, badges.
 * 10px / 700 / 0.8px letter-spacing / muted.
 */
export function Eyebrow({ children, style, className, tone = "muted" }: Common & { tone?: "muted" | "subtle" | "accent" }) {
  const color = tone === "accent" ? "var(--c-pink)" : tone === "subtle" ? "var(--c-text-subtle)" : "var(--c-text-muted)";
  return (
    <div
      className={className}
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        color,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Section label between content blocks. Slightly larger than Eyebrow.
 * 11px / 700 / 1px letter-spacing / muted.
 */
export function SectionLabel({ children, style, className }: Common) {
  return (
    <div
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1px",
        color: "var(--c-text-muted)",
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Content-level heading inside a view (the shell renders the page-level H1).
 * 20px / 800 / -0.4px.
 */
export function H2({ children, style, className }: Common) {
  return (
    <h2
      className={className}
      style={{
        margin: 0,
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: "-0.4px",
        color: "var(--c-text)",
        lineHeight: 1.15,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

/**
 * Descriptive subtitle. Pairs with a title above.
 * 13px / 500 / muted, 1.5 line-height.
 */
export function Subtitle({ children, style, className }: Common) {
  return (
    <div
      className={className}
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--c-text-muted)",
        lineHeight: 1.5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Tiny supporting text. Captions, timestamps, meta info.
 * 11px / 500 / subtle.
 */
export function Caption({ children, style, className }: Common) {
  return (
    <div
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: "var(--c-text-subtle)",
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
