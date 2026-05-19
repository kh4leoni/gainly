function Bone({ w = "100%", h = 14, r = 8, style }: { w?: string | number; h?: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="c-shimmer"
      style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
    />
  );
}

function Row({ gap = 8, style, children }: { gap?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={{ display: "flex", gap, alignItems: "center", ...style }}>{children}</div>;
}

function Gap({ h }: { h: number }) {
  return <div style={{ height: h, flexShrink: 0 }} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div style={{ flex: 1, padding: "8px 20px 20px", display: "flex", flexDirection: "column" }}>
      {/* Greeting line + date */}
      <Row style={{ marginBottom: 14, justifyContent: "space-between", alignItems: "baseline" }}>
        <Bone w={140} h={17} r={6} />
        <Bone w={86} h={10} r={4} />
      </Row>

      {/* HERO: Next workout — pink-tinted */}
      <div style={{
        background: "linear-gradient(135deg,color-mix(in srgb, var(--c-pink) 14%, transparent) 0%,color-mix(in srgb, var(--c-pink) 9%, transparent) 100%)",
        border: "1px solid color-mix(in srgb, var(--c-pink) 22%, transparent)",
        borderRadius: "var(--r-2xl)",
        padding: "22px 22px 20px",
        marginBottom: 22,
        position: "relative",
      }}>
        <Bone w={92} h={9} r={4} style={{ marginBottom: 10 }} />
        <Bone w="55%" h={28} r={10} style={{ marginBottom: 18 }} />
        <Bone w="80%" h={12} r={4} style={{ marginBottom: 22 }} />
        <Bone w="100%" h={54} r={16} />
      </div>

      {/* Weekly stats — 2 cards */}
      <Row gap={12} style={{ marginBottom: 20, alignItems: "stretch" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            flex: 1,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--r-xl)",
            padding: 16,
          }}>
            <Bone w={84} h={9} r={4} style={{ marginBottom: 10 }} />
            <Bone w="55%" h={30} r={10} style={{ marginBottom: 8 }} />
            <Bone w="40%" h={10} r={4} style={{ marginBottom: 10 }} />
            <Bone h={4} r={2} />
          </div>
        ))}
      </Row>

      {/* Latest PRs */}
      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--r-xl)",
        padding: 20,
      }}>
        <Bone w={140} h={10} r={4} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Row key={i} style={{ justifyContent: "space-between" }}>
              <Bone w={`${48 + i * 6}%`} h={13} r={6} />
              <Bone w={70} h={13} r={6} />
            </Row>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ohjelma ──────────────────────────────────────────────────────────────────

function OhjelmaSkeleton() {
  return (
    <div style={{ flex: 1, padding: "0 0 24px", display: "flex", flexDirection: "column" }}>
      {/* "X viikkoa · Y treeniä" — right-aligned caption */}
      <div style={{ padding: "0 20px", marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
        <Bone w={130} h={10} r={4} />
      </div>

      {/* Block + week heading */}
      <div style={{ padding: "0 20px 12px" }}>
        <Row style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <Bone w={120} h={9} r={4} />
          <Bone w={42} h={10} r={4} />
        </Row>
        <Row gap={8} style={{ alignItems: "center" }}>
          <Bone w={130} h={20} r={8} />
          <Bone w={70} h={16} r={999} />
        </Row>
      </div>

      {/* Week chips row */}
      <div style={{ padding: "0 20px", marginBottom: 16 }}>
        <Row gap={8}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Bone key={i} w={64} h={32} r={999} />
          ))}
        </Row>
      </div>

      {/* Day rows (ios-group) */}
      <div style={{ padding: "0 20px" }}>
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}>
          {[0, 1, 2, 3, 4].map((i, idx, arr) => (
            <div key={i} style={{
              padding: "14px 16px",
              borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--c-border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <Bone w={32} h={32} r={999} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <Bone w={`${52 + i * 6}%`} h={13} r={6} />
                <Bone w={`${68 + i * 4}%`} h={10} r={4} />
              </div>
              <Bone w={18} h={18} r={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Gains / Progress ─────────────────────────────────────────────────────────

function ProgressSkeleton() {
  return (
    <div style={{ flex: 1, padding: "8px 20px 24px", display: "flex", flexDirection: "column" }}>
      <Bone w="70%" h={11} r={4} style={{ marginBottom: 18 }} />

      {/* Searchable select */}
      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--r-md)",
        padding: "12px 14px",
        marginBottom: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Bone w="45%" h={13} r={6} />
        <Bone w={14} h={14} r={3} />
      </div>

      {/* Section label */}
      <Bone w={170} h={11} r={4} style={{ marginBottom: 10 }} />

      {/* Best exercises list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <Bone w={`${44 + i * 6}%`} h={14} r={6} />
            <Bone w={64} h={14} r={6} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Historia ─────────────────────────────────────────────────────────────────

function HistoriaSkeleton() {
  return (
    <div style={{ flex: 1, padding: "8px 16px 32px", display: "flex", flexDirection: "column" }}>
      <Bone w={130} h={12} r={4} style={{ marginBottom: 16 }} />

      {/* Search input */}
      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: "var(--r-md)",
        padding: "11px 14px",
        marginBottom: 22,
      }}>
        <Bone w="55%" h={13} r={6} />
      </div>

      {/* Workout cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--r-lg)",
            padding: "14px 16px",
          }}>
            <Row gap={12} style={{ marginBottom: 10 }}>
              <Bone w={36} h={36} r={10} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Bone w={`${50 + i * 7}%`} h={13} r={6} />
                <Bone w={`${30 + i * 4}%`} h={10} r={4} />
              </div>
            </Row>
            <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 10, display: "flex", gap: 10 }}>
              <Bone w={70} h={10} r={4} />
              <Bone w={56} h={10} r={4} />
              <Bone w={82} h={10} r={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Workout Logger ───────────────────────────────────────────────────────────

function WorkoutSkeleton() {
  return (
    <div style={{ flex: 1, padding: "20px 14px 32px", display: "flex", flexDirection: "column" }}>
      {/* Week eyebrow + description (day name is the shell title, not part of body) */}
      <div style={{ marginBottom: 18 }}>
        <Bone w={70} h={10} r={4} style={{ marginBottom: 8 }} />
        <Bone w="85%" h={11} r={4} />
      </div>

      {/* Exercise cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--r-xl)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
              <Bone w={36} h={36} r={999} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <Row gap={6}>
                  <Bone w={`${45 + i * 7}%`} h={14} r={6} />
                  <Bone w={30} h={30} r={999} />
                  <Bone w={56} h={30} r={10} />
                </Row>
                {/* Target lines */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                  {[0, 1, 2].map((s) => (
                    <Bone key={s} w={`${50 + s * 6}%`} h={10} r={4} />
                  ))}
                </div>
              </div>
            </div>
            {/* Table header */}
            <div style={{
              padding: "0 10px 6px",
              display: "grid",
              gridTemplateColumns: "16px 1.5fr 1fr 1fr 40px",
              gap: 4,
              borderBottom: "1px solid var(--c-border)",
            }}>
              <Bone w={8} h={8} r={2} />
              <Bone h={9} r={3} />
              <Bone h={9} r={3} />
              <Bone h={9} r={3} />
              <Bone h={9} r={3} />
            </div>
            {/* Set rows */}
            <div style={{ padding: "6px 6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
              {[0, 1, 2].map((s) => (
                <div key={s} style={{
                  display: "grid",
                  gridTemplateColumns: "16px 1.5fr 1fr 1fr 40px",
                  gap: 4,
                  alignItems: "center",
                  padding: "4px",
                }}>
                  <Bone w={10} h={10} r={2} />
                  <Bone h={36} r={8} />
                  <Bone h={36} r={8} />
                  <Bone h={36} r={8} />
                  <Bone w={28} h={28} r={999} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Messages (client mobile) ─────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
      {/* Header: coach avatar + name + online */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--c-border)",
        background: "var(--c-surface)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        <Bone w={44} h={44} r={999} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <Bone w="55%" h={14} r={6} />
          <Bone w="30%" h={10} r={4} />
        </div>
        <Bone w={56} h={10} r={4} />
      </div>

      {/* Message bubbles */}
      <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
        {[
          { w: 180, side: "left" as const },
          { w: 120, side: "right" as const },
          { w: 220, side: "left" as const },
          { w: 90,  side: "right" as const },
          { w: 160, side: "left" as const },
          { w: 140, side: "right" as const },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.side === "right" ? "flex-end" : "flex-start" }}>
            <Bone w={m.w} h={36} r={16} />
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--c-border)",
        background: "var(--c-surface)",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexShrink: 0,
      }}>
        <Bone h={38} r={12} />
        <Bone w={64} h={38} r={12} />
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function RouteSkeleton({ href }: { href: string }) {
  if (href.startsWith("/client/dashboard")) return <DashboardSkeleton />;
  if (href.startsWith("/client/ohjelma"))   return <OhjelmaSkeleton />;
  if (href.startsWith("/client/progress"))  return <ProgressSkeleton />;
  if (href.startsWith("/client/history"))   return <HistoriaSkeleton />;
  if (href.startsWith("/client/messages"))  return <MessagesSkeleton />;
  if (href.startsWith("/client/workout"))   return <WorkoutSkeleton />;
  return null;
}
