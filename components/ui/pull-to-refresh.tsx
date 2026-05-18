"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const THRESHOLD = 70;
const MAX_PULL = 120;
const RESISTANCE = 0.5;

export function PullToRefresh({
  onRefresh,
  disabled,
  className,
  style,
  children,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (el!.scrollTop > 0) { startY.current = null; return; }
      startY.current = e.touches[0]?.clientY ?? null;
    }
    function onTouchMove(e: TouchEvent) {
      if (refreshing || startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // Prevent rubber-band scroll while pulling
      if (e.cancelable) e.preventDefault();
      setPull(Math.min(MAX_PULL, dy * RESISTANCE));
    }
    async function onTouchEnd() {
      if (refreshing || startY.current == null) return;
      startY.current = null;
      if (pull >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try { await onRefresh(); }
        finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
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
            transition: settling ? "height 0.22s ease-out, opacity 0.22s" : "none",
          }}
        >
          <Spinner refreshing={refreshing} progress={progress} />
        </div>
      </div>
      <div
        style={{
          flex: "1 0 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          transform: `translateY(${visualPull}px)`,
          transition: settling || refreshing ? "transform 0.22s ease-out" : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner({ refreshing, progress }: { refreshing: boolean; progress: number }) {
  return (
    <div
      style={{
        width: 26, height: 26,
        borderRadius: "50%",
        border: "2px solid var(--c-border)",
        borderTopColor: "var(--c-pink)",
        animation: refreshing ? "spin 0.7s linear infinite" : "none",
        transform: refreshing ? "none" : `rotate(${progress * 270}deg)`,
        transition: refreshing ? "none" : "transform 0.08s linear",
      }}
    />
  );
}
