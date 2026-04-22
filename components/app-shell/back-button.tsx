"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({ rootPaths }: { rootPaths: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = rootPaths.some((p) => pathname === p || pathname === p + "/");

  return (
    <button
      aria-label="Takaisin"
      onClick={() => !isRoot && router.back()}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
        "active:scale-90 transition-transform duration-150",
        isRoot ? "pointer-events-none opacity-30" : "text-foreground"
      )}
    >
      <ArrowLeft className="h-5 w-5" />
      <span>Takaisin</span>
    </button>
  );
}