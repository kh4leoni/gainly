// Shared chrome: sidebar + topbar
const { useState } = React;

function SideNav({ active = "Ohjelmat" }) {
  const items = ["Dashboard", "Asiakkaat", "Ohjelmat", "Liikepankki", "Viestit"];
  return (
    <aside style={{
      width: 168,
      flex: "0 0 auto",
      background: "var(--bg-1)",
      borderRight: "1px solid var(--line)",
      display: "flex",
      flexDirection: "column",
      padding: "16px 10px",
      gap: 14,
    }}>
      <div style={{ padding: "6px 10px 14px", borderBottom: "1px solid var(--line)" }}>
        <div className="logo">gainly</div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2, letterSpacing: "0.05em" }}>x FANNI SAVELA</div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => (
          <div key={it} style={{
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            color: it === active ? "var(--fg-0)" : "var(--fg-2)",
            background: it === active ? "rgba(255,61,138,0.10)" : "transparent",
            borderLeft: it === active ? "2px solid var(--pink)" : "2px solid transparent",
            paddingLeft: it === active ? 12 : 14,
            fontWeight: it === active ? 600 : 500,
          }}>{it}</div>
        ))}
      </nav>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div className="avatar">VX</div>
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>Valmentaja</div>
          <div style={{ color: "var(--fg-3)", fontSize: 10 }}>Fanni S.</div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ client = "Jaakko Parkkali", program = "Voimaharjoittelu — kevät '26", extra }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Ohjelmat</span>
        <span style={{ opacity: 0.4 }}>›</span>
        <span>{client}</span>
        <span style={{ opacity: 0.4 }}>›</span>
        <strong>{program}</strong>
      </div>
      <div className="actions">
        {extra}
        <button className="btn"><span style={{ fontSize: 14 }}>＋</span> Lisää jakso</button>
        <button className="btn primary">Tallenna</button>
      </div>
    </div>
  );
}

window.SideNav = SideNav;
window.TopBar = TopBar;
