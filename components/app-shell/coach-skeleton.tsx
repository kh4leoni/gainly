import { cn } from "@/lib/utils";

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("c-shimmer rounded-md", className)}
      style={style}
    />
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <Bone className="h-8 w-36 mb-6" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <Bone className="h-3 w-16 mb-3" />
            <Bone className="h-7 w-12" />
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Client list */}
        <Card className="lg:col-span-3">
          <Bone className="h-4 w-32 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b last:border-0 py-3">
              <Bone className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1">
                <Bone className="h-3 w-28 mb-2" />
                <Bone className="h-2.5 w-20" />
              </div>
              <Bone className="h-2.5 w-16" />
            </div>
          ))}
        </Card>

        {/* Side column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <Bone className="h-4 w-28 mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                <Bone className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1">
                  <Bone className="h-3 w-24 mb-2" />
                  <Bone className="h-2 w-16" />
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <Bone className="h-4 w-24 mb-4" />
            <Bone className="h-32 w-full rounded-lg" />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function ClientsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <Bone className="h-8 w-32" />
        <Bone className="h-9 w-36 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <div className="flex items-start gap-4 mb-4">
              <Bone className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Bone className="h-4 w-24" />
                  <Bone className="h-4 w-16 rounded-full" />
                </div>
                <Bone className="h-3 w-28" />
              </div>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-4/5" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Programs ─────────────────────────────────────────────────────────────────

function ProgramsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Bone className="h-8 w-32" />
        <Bone className="h-9 w-36 rounded-lg" />
      </div>
      <Bone className="h-20 w-full rounded-lg mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <div>
                <Bone className="h-4 w-40 mb-2" />
                <Bone className="h-3 w-56" />
              </div>
              <Bone className="h-8 w-8 rounded-full shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────

function ExercisesSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Bone className="h-8 w-24" />
        <Bone className="h-9 w-32 rounded-lg" />
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Bone className="h-10 w-full max-w-xs rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, 157px)", gridAutoRows: "82px" }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <Bone key={i} className="rounded-xl" style={{ height: "82px" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread sidebar */}
      <div className="w-60 border-r flex-shrink-0 p-3">
        <Bone className="h-3 w-16 mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Bone className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1">
              <Bone className="h-3 w-24 mb-2" />
              <Bone className="h-2.5 w-32" />
            </div>
          </div>
        ))}
      </div>
      {/* Chat area */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        {[140, 100, 180, 120, 90].map((w, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Bone className="h-9 rounded-2xl" style={{ width: w }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Program Editor ───────────────────────────────────────────────────────────

function ProgramEditorSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Sticky header bar */}
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:gap-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Bone className="h-3.5 w-24 hidden md:block" />
          <Bone className="h-3.5 w-3.5 hidden md:block rounded-full" />
          <Bone className="h-4 w-40" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Bone className="h-8 w-24 rounded-lg" />
          <Bone className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      {/* Content */}
      <div className="p-3 md:p-6 space-y-5">
        {/* Week block */}
        {[1, 2].map((w) => (
          <div key={w} className="rounded-2xl border bg-card">
            {/* Week header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Bone className="h-4 w-20" />
              <Bone className="h-7 w-7 rounded-full" />
            </div>
            {/* Days */}
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((d) => (
                <div key={d} className="rounded-xl border bg-background">
                  <div className="flex items-center justify-between px-4 py-3">
                    <Bone className="h-3.5 w-24" />
                    <Bone className="h-3 w-16" />
                  </div>
                  <div className="px-4 pb-3 space-y-2">
                    {[1, 2].map((e) => (
                      <div key={e} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                        <Bone className="h-3 w-3.5 rounded-full shrink-0" />
                        <Bone className={`h-3 w-${32 + e * 8}`} />
                        <Bone className="h-3 w-10 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Client Detail ────────────────────────────────────────────────────────────

function ClientDetailSkeleton() {
  return (
    <div className="p-4 md:p-6">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Bone className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1">
          <Bone className="h-5 w-36 mb-2" />
          <Bone className="h-3 w-24" />
        </div>
        <Bone className="h-9 w-24 rounded-lg" />
        <Bone className="h-9 w-24 rounded-lg" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <Bone className="h-3 w-16 mb-3" />
            <Bone className="h-7 w-12" />
          </Card>
        ))}
      </div>
      {/* Training section */}
      <Card className="mb-4">
        <Bone className="h-4 w-32 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b last:border-0 py-3">
            <Bone className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1">
              <Bone className="h-3 w-32 mb-2" />
              <Bone className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function CoachSkeleton({ href }: { href: string }) {
  if (href.startsWith("/coach/dashboard"))       return <DashboardSkeleton />;
  if (href.startsWith("/coach/clients"))         return <ClientsSkeleton />;
  if (href.startsWith("/coach/client-programs")) return <ProgramEditorSkeleton />;
  if (href.startsWith("/coach/programs"))        return <ProgramsSkeleton />;
  if (href.startsWith("/coach/exercises"))       return <ExercisesSkeleton />;
  if (href.startsWith("/coach/messages"))        return <MessagesSkeleton />;
  return null;
}
