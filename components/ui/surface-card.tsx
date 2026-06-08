import * as React from "react";

/**
 * Client-side surface card primitive.
 *
 * The client UI is built on the `--c-*` token system (not the shadcn/Tailwind
 * `bg-card` tokens used by `components/ui/card.tsx`). The same recipe —
 * surface background + hairline border + rounded corner + padding — was
 * copy-pasted across ~15 inline style objects. This centralises it.
 *
 * Two entry points:
 *  - `surfaceCardStyle()` — a CSSProperties helper for elements that must keep
 *    their own tag (e.g. a `<Link>` card or a `<button>` card). Spread it and
 *    override as needed.
 *  - `<SurfaceCard>` — a plain `<div>` for the common static-card case.
 *
 * Press feedback is already global (`.client-app …:active` in globals.css);
 * `interactive` only adds the pointer-device hover-grow (`.card-grow`).
 */

type Radius = "md" | "lg" | "xl" | "2xl";

const RADIUS: Record<Radius, string> = {
  md: "var(--r-md)",
  lg: "var(--r-lg)",
  xl: "var(--r-xl)",
  "2xl": "var(--r-2xl)",
};

export function surfaceCardStyle(opts?: {
  radius?: Radius;
  padding?: number | string;
}): React.CSSProperties {
  return {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border)",
    borderRadius: RADIUS[opts?.radius ?? "lg"],
    padding: opts?.padding ?? 16,
  };
}

export const SurfaceCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    radius?: Radius;
    padding?: number | string;
    /** Adds pointer-device hover-grow. Press feedback is already global. */
    interactive?: boolean;
  }
>(({ radius, padding, interactive, className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={[interactive ? "card-grow" : "", className ?? ""].filter(Boolean).join(" ") || undefined}
    style={{ ...surfaceCardStyle({ radius, padding }), ...style }}
    {...props}
  />
));
SurfaceCard.displayName = "SurfaceCard";
