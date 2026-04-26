"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Valitse…",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (open) {
      computePos();
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open, computePos]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onReposition = () => computePos();
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, computePos]);

  const dropdown = (
    <div
      style={{ position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
      <div className="p-1.5 pb-0">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hae…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) { onChange(filtered[0].value); setOpen(false); }
            if (e.key === "Escape") setOpen(false);
          }}
          className="h-8 w-full rounded-md border border-border bg-muted/30 px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Ei tuloksia</p>
      ) : (
        <ul className="max-h-52 overflow-auto p-1">
          {filtered.map((o) => (
            <li
              key={o.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
              className={cn(
                "cursor-pointer rounded-[4px] px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                o.value === value && "bg-accent/50 font-medium"
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div ref={triggerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:border-primary/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20",
          open && "border-primary/40 ring-1 ring-primary/20",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
