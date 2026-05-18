"use client";

import { useEffect, type RefObject } from "react";

/**
 * iOS-style drag-to-dismiss for sheet-like dialogs.
 *
 * Attach the `handleRef` to a drag affordance at the top of the dialog
 * (e.g. the .ios-drag-handle element). The hook listens for vertical drags
 * on the handle, translates the `contentRef` element downward, and calls
 * `onDismiss` when the user crosses a distance or velocity threshold.
 * On miss it springs back.
 */
export function useDragToDismiss({
  handleRef,
  contentRef,
  onDismiss,
  enabled = true,
  threshold = 110,
  velocityThreshold = 0.5,
}: {
  handleRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  enabled?: boolean;
  threshold?: number;
  velocityThreshold?: number;
}) {
  useEffect(() => {
    if (!enabled) return;
    const handle = handleRef.current;
    const content = contentRef.current;
    if (!handle || !content) return;

    let startY = 0;
    let startT = 0;
    let dy = 0;
    let dragging = false;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      startY = t.clientY;
      startT = performance.now();
      dy = 0;
      dragging = true;
      content!.style.transition = "none";
    }
    function onMove(e: TouchEvent) {
      if (!dragging) return;
      const t = e.touches[0];
      if (!t) return;
      dy = Math.max(0, t.clientY - startY);
      // Rubber-band slightly past the start point for downward overshoot only.
      content!.style.transform = `translate(-50%, calc(-50% + ${dy}px))`;
    }
    function onEnd(e: TouchEvent) {
      if (!dragging) return;
      dragging = false;
      const dt = performance.now() - startT;
      const vel = dt > 0 ? dy / dt : 0;
      content!.style.transition = "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)";
      if (dy > threshold || vel > velocityThreshold) {
        content!.style.transform = `translate(-50%, 110vh)`;
        // Wait for the slide-down to mostly complete before unmounting via
        // onDismiss so the user sees the dialog leave the screen.
        window.setTimeout(() => {
          onDismiss();
          window.setTimeout(() => {
            if (content) {
              content.style.transform = "";
              content.style.transition = "";
            }
          }, 60);
        }, 200);
      } else {
        content!.style.transform = "";
      }
    }

    handle.addEventListener("touchstart", onStart, { passive: true });
    handle.addEventListener("touchmove", onMove, { passive: true });
    handle.addEventListener("touchend", onEnd, { passive: true });
    handle.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      handle.removeEventListener("touchstart", onStart);
      handle.removeEventListener("touchmove", onMove);
      handle.removeEventListener("touchend", onEnd);
      handle.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, handleRef, contentRef, onDismiss, threshold, velocityThreshold]);
}
