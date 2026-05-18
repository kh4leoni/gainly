"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Edge-swipe-back gesture for PWA standalone mode.
 *
 * iOS Safari running in standalone mode has no built-in back gesture, so the
 * app has to provide one. This hook listens for a touchstart within the first
 * ~24px from the left edge of the viewport, tracks the drag, and calls
 * `router.back()` when the user crosses a distance or velocity threshold.
 *
 * Disabled on browsers that handle their own swipe-back (Chrome/Edge on
 * Android: standard back gesture from the system). Only triggers in
 * iOS standalone PWAs and when the swipe is dominantly horizontal so it
 * doesn't fight vertical scroll.
 */
export function useEdgeSwipeBack({
  enabled = true,
  edgePx = 24,
  triggerPx = 80,
  triggerVelocityPxPerMs = 0.5,
}: {
  enabled?: boolean;
  edgePx?: number;
  triggerPx?: number;
  triggerVelocityPxPerMs?: number;
} = {}) {
  const router = useRouter();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startT = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX > edgePx) {
        startX.current = null;
        return;
      }
      startX.current = t.clientX;
      startY.current = t.clientY;
      startT.current = performance.now();
    }

    function onEnd(e: TouchEvent) {
      const sx = startX.current;
      const sy = startY.current;
      if (sx == null || sy == null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = Math.abs(t.clientY - sy);
      const dt = performance.now() - startT.current;
      const vel = dt > 0 ? dx / dt : 0;
      startX.current = null;
      startY.current = null;
      // Must be a dominantly horizontal swipe, started near the left edge,
      // and either pass the distance or velocity threshold.
      if (dx > triggerPx && dx > dy * 1.5 && (dx > 100 || vel > triggerVelocityPxPerMs)) {
        router.back();
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, edgePx, triggerPx, triggerVelocityPxPerMs, router]);
}
