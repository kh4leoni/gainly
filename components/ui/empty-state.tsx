import type { ComponentType, ReactNode } from "react";

type IconComponent = ComponentType<{ size?: number; weight?: "thin" | "light" | "regular" | "bold" | "fill"; color?: string }>;

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "32px 24px" : "48px 24px",
        gap: 12,
        color: "var(--c-text-muted)",
      }}
    >
      <Icon size={compact ? 40 : 52} weight="thin" color="var(--c-text-subtle)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-0.2px" }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--c-text-muted)", maxWidth: 280 }}>
            {description}
          </div>
        )}
      </div>
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
