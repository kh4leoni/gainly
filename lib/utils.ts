import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Avatar palette — gradient (big avatars on cards) and solid hex (small
// avatars, dots) variants share an index + hash so the same person gets the
// same hue on every surface.
export const AVATAR_COLORS = [
  "from-pink-500 to-rose-400",
  "from-violet-500 to-purple-400",
  "from-sky-500 to-blue-400",
  "from-emerald-500 to-green-400",
  "from-amber-500 to-orange-400",
  "from-teal-500 to-cyan-400",
];

const AVATAR_HEXES = ["#ec4899", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#14b8a6"];

function avatarIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return h % AVATAR_COLORS.length;
}

export function avatarColor(name: string): string {
  return AVATAR_COLORS[avatarIndex(name)] as string;
}

export function avatarHex(name: string | null | undefined): string {
  return AVATAR_HEXES[avatarIndex(name || "?")] as string;
}

export function nameInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso));
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}

// Strip the "(kopio)" suffix that the coach editor appends to duplicated
// blocks/weeks. Used in client-facing views so the athlete doesn't see a
// week named e.g. "Voima (kopio)".
export function stripCopySuffix(name: string | null | undefined): string | null {
  if (!name) return name ?? null;
  return name.replace(/\s*\(kopio\)\s*$/i, "").trim() || null;
}

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // fallback (tests, old browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
