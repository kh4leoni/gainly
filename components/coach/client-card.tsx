import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { nameInitials } from "@/lib/utils";

// Soft neumorphic raise — light highlight + dark shadow, with dark-mode variants.
const SOFT =
  "shadow-[5px_5px_12px_rgba(0,0,0,0.10),-5px_-5px_12px_rgba(255,255,255,0.85)] dark:shadow-[5px_5px_12px_rgba(0,0,0,0.45),-5px_-5px_12px_rgba(255,255,255,0.04)]";

export function ClientCard({
  id, name, status, nextName, pendingCount, pendingLabel,
}: {
  id: string;
  name: string;
  status: string;
  nextName: string | null;
  pendingCount: number;
  pendingLabel: string;
}) {
  const isActive = status === "active";
  // Programming health → green ok, amber low, red none.
  const tone = pendingCount === 0 ? "var(--coach-danger)" : pendingCount < 4 ? "var(--coach-gold)" : "var(--coach-ok)";
  const dotColor = isActive ? "var(--coach-ok)" : status === "pending" ? "var(--coach-gold)" : "#94a3b8";

  return (
    <Link
      href={`/coach/clients/${id}`}
      prefetch
      className={cn(
        "group flex items-center gap-3 rounded-2xl bg-card p-3.5 transition-all duration-300 ease-out hover:-translate-y-0.5",
        SOFT,
        "hover:shadow-[8px_8px_18px_rgba(0,0,0,0.13),-8px_-8px_18px_rgba(255,255,255,0.92)] dark:hover:shadow-[8px_8px_18px_rgba(0,0,0,0.5),-8px_-8px_18px_rgba(255,255,255,0.05)]",
      )}
    >
      {/* Initials — neumorphic inset disc */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-sm font-bold tracking-wide text-foreground shadow-[inset_3px_3px_6px_rgba(0,0,0,0.10),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.04)]">
        {nameInitials(name)}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} />
          <h3 className="truncate text-sm font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
            {name}
          </h3>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {nextName ? <>Seuraava: <span className="font-medium text-foreground/80">{nextName}</span></> : "Ei tulevia treenejä"}
        </p>
        <span
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
          {pendingLabel}
        </span>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}
