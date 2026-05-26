"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Scales } from "@phosphor-icons/react";
import { logBodyweight } from "@/app/client/actions";

const STEP = 0.1;
const DEFAULT_VALUE = 75.0;
const MIN = 20;
const MAX = 350;

function formatKg(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

function howLongAgo(iso: string | null): string {
  if (!iso) return "Et ole vielä loggannut painoasi";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days === 0) return "Loggattu tänään";
  if (days === 1) return "Loggattu eilen";
  if (days < 7) return `Loggattu ${days} päivää sitten`;
  if (days < 30) return `Loggattu ${Math.floor(days / 7)} viikkoa sitten`;
  return `Loggattu ${Math.floor(days / 30)} kuukautta sitten`;
}

export function BodyweightQuickLog({
  latestKg,
  latestLoggedAt,
}: {
  latestKg: number | null;
  latestLoggedAt: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<number>(latestKg ?? DEFAULT_VALUE);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(latestLoggedAt);
  const [pending, startTransition] = useTransition();
  const [pulse, setPulse] = useState(0);
  const popRef = useRef<HTMLDivElement>(null);

  // If server data changes (e.g. after a refresh elsewhere), sync the counter
  // unless the user has already nudged the value locally.
  useEffect(() => {
    if (!dirty && latestKg !== null) setValue(latestKg);
  }, [latestKg, dirty]);

  function bump(delta: number) {
    setValue((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      if (next < MIN || next > MAX) return prev;
      return next;
    });
    setDirty(true);
    setPulse((k) => k + 1);
  }

  function save() {
    if (!dirty && latestKg !== null && Math.abs(value - latestKg) < 0.001) return;
    startTransition(async () => {
      try {
        const res = await logBodyweight(value);
        setSavedAt(res.logged_at);
        setDirty(false);
        const node = popRef.current;
        if (node) {
          node.classList.remove("bw-quick-save-pop");
          void node.offsetWidth;
          node.classList.add("bw-quick-save-pop");
        }
        router.refresh();
      } catch {}
    });
  }

  const isSameAsLatest =
    latestKg !== null && !dirty && Math.abs(value - latestKg) < 0.001;
  const saveDisabled = pending || isSameAsLatest;

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--r-xl)",
        padding: "16px 18px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Scales size={15} color="var(--c-text-muted)" weight="regular" />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--c-text-muted)",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
          }}>
            Paino
          </span>
        </div>
        <span style={{ fontSize: 11, color: "var(--c-text-subtle)" }}>
          {howLongAgo(savedAt)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <button
          type="button"
          aria-label="Vähennä 100 g"
          onClick={() => bump(-STEP)}
          disabled={pending}
          className="bw-quick-step"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "1px solid var(--c-border)",
            background: "var(--c-surface2)",
            color: "var(--c-text)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 150ms ease, transform 120ms ease",
          }}
        >
          <Minus size={18} weight="bold" />
        </button>

        <div ref={popRef} style={{ display: "flex", alignItems: "baseline", gap: 4, lineHeight: 1 }}>
          <span
            key={pulse}
            className="bw-quick-value"
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-1.6px",
              color: dirty ? "var(--c-pink)" : "var(--c-text)",
              transition: "color 200ms ease",
            }}
          >
            {formatKg(value)}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text-muted)" }}>kg</span>
        </div>

        <button
          type="button"
          aria-label="Lisää 100 g"
          onClick={() => bump(STEP)}
          disabled={pending}
          className="bw-quick-step"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "1px solid var(--c-border)",
            background: "var(--c-surface2)",
            color: "var(--c-text)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 150ms ease, transform 120ms ease",
          }}
        >
          <Plus size={18} weight="bold" />
        </button>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saveDisabled}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "11px 14px",
          borderRadius: "var(--r-md)",
          fontSize: 13,
          fontWeight: 700,
          border: "1px solid transparent",
          background: saveDisabled
            ? "var(--c-surface2)"
            : "var(--c-pink)",
          color: saveDisabled
            ? "var(--c-text-subtle)"
            : "var(--c-pink-fg, #fff)",
          cursor: saveDisabled ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
          transition: "background 150ms ease, color 150ms ease",
        }}
      >
        {pending
          ? "Tallennetaan…"
          : isSameAsLatest
          ? "Tallennettu"
          : "Tallenna"}
      </button>
    </div>
  );
}
