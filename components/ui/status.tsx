"use client";

import { Check, Star, Circle } from "@phosphor-icons/react";

export type StatusKind = "done" | "pending" | "pr";

export const STATUS = {
  done: {
    fg: "var(--c-success)",
    bg: "color-mix(in srgb, var(--c-success) 12%, transparent)",
    border: "color-mix(in srgb, var(--c-success) 30%, transparent)",
    label: "Tehty",
  },
  pending: {
    fg: "var(--c-text-muted)",
    bg: "var(--c-surface3)",
    border: "var(--c-border)",
    label: "Odottaa",
  },
  pr: {
    fg: "var(--c-warning)",
    bg: "color-mix(in srgb, var(--c-warning) 14%, transparent)",
    border: "color-mix(in srgb, var(--c-warning) 32%, transparent)",
    label: "PR",
  },
} as const;

type Props = {
  kind: StatusKind;
  label?: string;
  compact?: boolean;
  hideIcon?: boolean;
  hideLabel?: boolean;
};

export function StatusPill({ kind, label, compact, hideIcon, hideLabel }: Props) {
  const t = STATUS[kind];
  const Icon = kind === "done" ? Check : kind === "pr" ? Star : Circle;
  const iconSize = compact ? 10 : 12;
  const text = label ?? t.label;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: hideLabel ? 0 : 4,
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        padding: compact ? "2px 7px" : "3px 9px",
        borderRadius: 20,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.fg,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      {!hideIcon && <Icon size={iconSize} weight={kind === "pr" ? "fill" : "bold"} />}
      {!hideLabel && <span>{text}</span>}
    </span>
  );
}
