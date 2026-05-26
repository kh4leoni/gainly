"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const THRESHOLD = 70;
const MAX_PULL = 120;
const RESISTANCE = 0.5;

// Vibration API is a no-op on iOS Safari, but works on Android Chrome
// and on iOS *when* installed as a PWA via the experimental Haptics
// path some shells expose. Cheap enough that we just fire it.
function buzz(ms: number) {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}

export function PullToRefresh({
  onRefresh,
  onScroll,
  disabled,
  className,
  style,
  children,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  onScroll?: (scrollTop: number) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const crossedRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);
  // Brief flag set right after refresh completes so the closing
  // transition uses a spring instead of ease-out.
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onScroll) return;
    let raf = 0;
    function handle() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => onScroll!(el!.scrollTop));
    }
    el.addEventListener("scroll", handle, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", handle);
    };
  }, [onScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (el!.scrollTop > 0) { startY.current = null; return; }
      startY.current = e.touches[0]?.clientY ?? null;
      crossedRef.current = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (refreshing || startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) {
        setPull(0);
        if (crossedRef.current) { crossedRef.current = false; setArmed(false); }
        return;
      }
      // Prevent rubber-band scroll while pulling
      if (e.cancelable) e.preventDefault();
      const next = Math.min(MAX_PULL, dy * RESISTANCE);
      setPull(next);
      // Light tick the first time the gesture crosses the threshold,
      // and again if the user backs off past it without releasing.
      const isPast = next >= THRESHOLD;
      if (isPast !== crossedRef.current) {
        crossedRef.current = isPast;
        setArmed(isPast);
        if (isPast) buzz(8);
      }
    }
    async function onTouchEnd() {
      if (refreshing || startY.current == null) return;
      startY.current = null;
      if (pull >= THRESHOLD) {
        buzz(14);
        setRefreshing(true);
        setArmed(false);
        crossedRef.current = false;
        setPull(THRESHOLD);
        try { await onRefresh(); }
        finally {
          setRefreshing(false);
          setBouncing(true);
          setPull(0);
          window.setTimeout(() => setBouncing(false), 360);
        }
      } else {
        setPull(0);
        setArmed(false);
        crossedRef.current = false;
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, refreshing, pull, onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);
  const visualPull = refreshing ? THRESHOLD : pull;
  const settling = pull === 0 && !refreshing;
  // Spring on snap-back after a successful refresh, ease-out otherwise.
  const settleTransition = bouncing
    ? "transform 360ms var(--ease-ios-spring, cubic-bezier(0.34,1.56,0.64,1))"
    : "transform 0.22s ease-out";

  return (
    <div
      ref={scrollRef}
      className={className}
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "sticky",
          top: 0,
          height: 0,
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: visualPull,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 10,
            opacity: refreshing ? 1 : progress,
            transition: settling
              ? `height ${bouncing ? "360ms var(--ease-ios-spring, cubic-bezier(0.34,1.56,0.64,1))" : "0.22s ease-out"}, opacity 0.22s`
              : "none",
          }}
        >
          <Spinner refreshing={refreshing} progress={progress} armed={armed} />
        </div>
      </div>
      <div
        style={{
          flex: "1 0 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          transform: `translateY(${visualPull}px)`,
          transition: settling || refreshing ? settleTransition : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner({ refreshing, progress, armed }: { refreshing: boolean; progress: number; armed: boolean }) {
  // Subtle scale pop the moment the gesture arms (crosses threshold),
  // similar to iOS's haptic tick.
  return (
    <div
      style={{
        width: 26, height: 26,
        borderRadius: "50%",
        border: "2px solid var(--c-border)",
        borderTopColor: "var(--c-pink)",
        animation: refreshing ? "spin 0.7s linear infinite" : "none",
        transform: refreshing
          ? "none"
          : `rotate(${progress * 270}deg) scale(${armed ? 1.15 : 1})`,
        transition: refreshing
          ? "none"
          : "transform 180ms var(--ease-ios-spring, cubic-bezier(0.34,1.56,0.64,1))",
      }}
    />
  );
}
