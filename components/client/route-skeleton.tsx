function Bone({ w = "100%", h = 14, r = 8, style }: { w?: string | number; h?: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="c-shimmer"
      style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
    />
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 16,
      padding: "16px",
      ...style,
    }}>
      {children}
    </div>
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
    <div style={{ flex: 1, padding: "20px 20px 24px", display: "flex", flexDirection: "column" }}>
      {/* Date + greeting */}
      <Bone w="30%" h={10} />
      <Gap h={8} />
      <Bone w="55%" h={26} r={10} />
      <Gap h={16} />

      {/* Quote card */}
      <Card style={{ marginBottom: 16 }}>
        <Bone w="20%" h={8} style={{ marginBottom: 10 }} />
        <Bone h={14} style={{ marginBottom: 6 }} />
        <Bone w="75%" h={14} />
      </Card>

      {/* Next workout card */}
      <div style={{
        background: "linear-gradient(135deg,rgba(255,29,140,0.08) 0%,rgba(155,77,202,0.06) 100%)",
        border: "1px solid rgba(255,29,140,0.15)",
        borderRadius: 18,
        padding: 20,
        marginBottom: 16,
      }}>
        <Bone w="28%" h={9} style={{ marginBottom: 10 }} />
        <Bone w="50%" h={22} r={10} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <Row key={i} gap={10}>
              <Bone w={28} h={28} r={8} style={{ flexShrink: 0 }} />
              <Bone w={`${55 + i * 8}%`} h={12} />
            </Row>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <Row gap={12}>
        <Card style={{ flex: 1 }}>
          <Bone w="60%" h={9} style={{ marginBottom: 8 }} />
          <Bone w="40%" h={22} r={8} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Bone w="60%" h={9} style={{ marginBottom: 8 }} />
          <Bone w="40%" h={22} r={8} />
        </Card>
      </Row>
    </div>
  );
}

// ─── Ohjelma ──────────────────────────────────────────────────────────────────

function OhjelmaSkeleton() {
  return (
    <div style={{ flex: 1, padding: "24px 20px 20px", display: "flex", flexDirection: "column" }}>
      <Bone w="40%" h={26} r={10} />
      <Gap h={8} />
      <Bone w="50%" h={10} style={{ marginBottom: 24 }} />

      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 12,
        }}>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Bone w={100 + i * 20} h={13} />
              <Bone w={60} h={10} />
            </div>
            <Bone w={24} h={24} r={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ennätykset ───────────────────────────────────────────────────────────────

function ProgressSkeleton() {
  return (
    <div style={{ flex: 1, padding: "24px 20px 20px", display: "flex", flexDirection: "column" }}>
      <Bone w="45%" h={26} r={10} />
      <Gap h={8} />
      <Bone w="70%" h={10} style={{ marginBottom: 24 }} />

      {/* Search select */}
      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Bone w="40%" h={12} />
        <Bone w={16} h={16} r={4} />
      </div>

      {/* PR table */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <Bone w="35%" h={13} />
          <Bone w="25%" h={11} />
        </div>
        {/* header row */}
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {[1, 2, 3].map((i) => <Bone key={i} h={9} />)}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <Bone h={30} r={8} />
            <Bone h={30} r={8} />
            <Bone h={30} r={8} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Historia ─────────────────────────────────────────────────────────────────

function HistoriaSkeleton() {
  return (
    <div style={{ flex: 1, padding: "24px 20px 20px", display: "flex", flexDirection: "column" }}>
      <Bone w="35%" h={26} r={10} style={{ marginBottom: 20 }} />

      {[1, 2, 3, 4].map((i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          <Row gap={10}>
            <Bone w={36} h={36} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Bone w={`${50 + i * 7}%`} h={13} />
              <Bone w="35%" h={10} />
            </div>
          </Row>
          <Gap h={12} />
          <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: 10, display: "flex", gap: 8 }}>
            <Bone w="30%" h={10} />
            <Bone w="25%" h={10} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Thread list */}
      <div style={{ width: 260, borderRight: "1px solid var(--c-border)", flexShrink: 0, padding: "16px 12px" }}>
        {[1, 2, 3].map((i) => (
          <Row key={i} gap={10} style={{ marginBottom: 16 } as React.CSSProperties}>
            <Bone w={38} h={38} r={999} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Bone w="60%" h={12} />
              <Bone w="80%" h={10} />
            </div>
          </Row>
        ))}
      </div>
      {/* Chat area */}
      <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[120, 80, 160, 100, 80].map((w, i) => (
          <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-start" : "flex-end" }}>
            <Bone w={w} h={36} r={14} />
          </div>
        ))}
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
  return null;
}
