// Variantti 1: KALENTERI-GRID
// Viikot vaakasarakkeiksi (kuten taulukko), treenit niiden alla.
// Yksi rivi per päivä (ma/ti/to/pe). Klikkaa treeniä laajentaaksesi liikkeet.

function CalendarVariant() {
  const phase = window.PROGRAM_DATA.phases[0];
  const [activeWeekId, setActiveWeekId] = React.useState(phase.weeks.find(w => w.active)?.id);
  const [openCell, setOpenCell] = React.useState({ wId: phase.weeks[2].id, day: "ma" });

  return (
    <div className="app">
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SideNav />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar />
          <div style={{ flex: 1, overflow: "auto", padding: "18px 22px 28px" }}>

            {/* Phase header */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom: "1px solid var(--line)",
            }}>
              <div>
                <div className="tiny" style={{ color: "var(--pink)" }}>Jakso 1 · Akkumulaatio</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>7 viikkoa · 4 treeniä / vk</div>
                <div style={{ color: "var(--fg-2)", fontSize: 12, marginTop: 2 }}>
                  Aloituspäivä: 6.4.2026 · Aktiivinen viikko: <span style={{ color: "var(--pink)", fontWeight: 600 }}>Vk 3 — Volyymi ++</span>
                </div>
              </div>
              <div className="row gap-6">
                <button className="btn ghost">Monista jakso</button>
                <button className="btn">＋ Viikko</button>
              </div>
            </div>

            {/* Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `64px repeat(${phase.weeks.length}, minmax(190px, 1fr))`,
              gap: 0,
              border: "1px solid var(--line)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--bg-1)",
            }}>
              {/* Header row: week labels */}
              <div style={hdrCellStyle()}></div>
              {phase.weeks.map((w) => (
                <WeekHeader key={w.id} week={w} active={w.id === activeWeekId} onActivate={() => setActiveWeekId(w.id)} />
              ))}

              {/* Each day = one row */}
              {window.DAYS.map((day, dayIdx) => (
                <React.Fragment key={day}>
                  <DayLabel day={day} />
                  {phase.weeks.map((w) => {
                    const session = w.sessions.find(s => s.day === day);
                    const isOpen = openCell.wId === w.id && openCell.day === day;
                    return (
                      <SessionCell
                        key={w.id + day}
                        session={session}
                        weekActive={w.active}
                        open={isOpen}
                        onClick={() => setOpenCell(isOpen ? {} : { wId: w.id, day })}
                        bottomBorder={dayIdx < window.DAYS.length - 1}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <Legend />
          </div>
        </div>
      </div>
    </div>
  );
}

function hdrCellStyle() {
  return {
    background: "var(--bg-2)",
    borderBottom: "1px solid var(--line)",
  };
}

function WeekHeader({ week, active, onActivate }) {
  return (
    <div style={{
      ...hdrCellStyle(),
      borderLeft: "1px solid var(--line)",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      position: "relative",
    }}>
      {week.active && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--green)",
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="tiny" style={{ color: week.active ? "var(--green)" : "var(--pink)" }}>
          Vk {week.num}
        </div>
        <div className="row gap-4">
          {week.active && <span className="chip active dot">Aktiivinen</span>}
          <button className="btn ghost sm" title="Monista">⎘</button>
          <button className="btn ghost sm" title="Aseta aktiiviseksi">●</button>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{week.name}</div>
    </div>
  );
}

function DayLabel({ day }) {
  return (
    <div style={{
      background: "var(--bg-2)",
      padding: "12px 8px",
      borderTop: "1px solid var(--line)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
    }}>
      <div className="tiny" style={{ color: "var(--fg-2)" }}>{window.DAY_LABEL[day]}</div>
    </div>
  );
}

function SessionCell({ session, weekActive, open, onClick, bottomBorder }) {
  const c = window.COLORS[session.color];
  return (
    <div
      onClick={onClick}
      style={{
        borderTop: "1px solid var(--line)",
        borderLeft: "1px solid var(--line)",
        borderBottom: bottomBorder ? "none" : "none",
        padding: 8,
        cursor: "pointer",
        background: open ? "var(--bg-2)" : weekActive ? "rgba(46,207,139,0.025)" : "transparent",
        transition: "background 0.12s",
        position: "relative",
      }}
    >
      <div style={{
        background: c.bg,
        border: `1px solid ${c.line}`,
        borderRadius: 8,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: c.fg }}>{session.name}</div>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{session.exercises.length}</span>
        </div>

        {/* Exercise pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {session.exercises.slice(0, open ? session.exercises.length : 4).map((ex, i) => (
            <ExerciseRow key={i} ex={ex} expanded={open} c={c} />
          ))}
        </div>

        {open && (
          <button
            className="btn sm"
            style={{ marginTop: 4, alignSelf: "flex-start", borderColor: c.line, color: c.fg }}
            onClick={(e) => e.stopPropagation()}
          >
            ＋ Liike
          </button>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({ ex, expanded, c }) {
  // Tiivis muoto: "4×8 @8" tai eksplisiittinen pyramidi
  const summary = makeSummary(ex.sets);
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 6,
      padding: expanded ? "6px 8px" : "4px 8px",
      display: "flex",
      flexDirection: "column",
      gap: 3,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ex.name}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-2)", flex: "0 0 auto" }}>
          {summary}
        </div>
      </div>
      {expanded && (
        <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 32px", rowGap: 2, columnGap: 4, fontSize: 10.5, marginTop: 2 }}>
          <div style={{ gridColumn: "2 / 3", color: "var(--fg-3)" }}>kuorma</div>
          <div style={{ gridColumn: "3 / 4", color: "var(--fg-3)" }}>tois.</div>
          <div style={{ gridColumn: "4 / 5", color: "var(--fg-3)" }}>rpe</div>
          {ex.sets.map((s, idx) => (
            <React.Fragment key={idx}>
              <div className="mono" style={{ color: "var(--fg-3)" }}>{idx + 1}</div>
              <div className="mono" style={{ color: "var(--fg-1)" }}>{s.w ? s.w + " kg" : "—"}</div>
              <div className="mono" style={{ color: "var(--fg-1)" }}>{s.r}</div>
              <div className="mono" style={{ color: c.fg }}>{s.rpe}</div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function makeSummary(sets) {
  // Esim. "4×8 @8" jos kaikki samat; "4×5 @7-9" jos RPE vaihtelee
  const allSameReps = sets.every(s => s.r === sets[0].r);
  const allSameRpe = sets.every(s => s.rpe === sets[0].rpe);
  const minRpe = Math.min(...sets.map(s => s.rpe));
  const maxRpe = Math.max(...sets.map(s => s.rpe));
  const rpeStr = allSameRpe ? `@${sets[0].rpe}` : `@${minRpe}-${maxRpe}`;
  if (allSameReps) return `${sets.length}×${sets[0].r} ${rpeStr}`;
  const minR = Math.min(...sets.map(s => s.r));
  const maxR = Math.max(...sets.map(s => s.r));
  return `${sets.length}×${minR}-${maxR} ${rpeStr}`;
}

function Legend() {
  return (
    <div style={{ marginTop: 18, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", color: "var(--fg-2)", fontSize: 11.5 }}>
      <div className="tiny" style={{ color: "var(--fg-3)" }}>Treenityypit</div>
      {Object.entries({
        rose: "Voima — alavartalo",
        amber: "Hypertrofia — työntö",
        violet: "Hypertrofia — alavartalo",
        cyan: "Voima — veto",
      }).map(([k, label]) => {
        const c = window.COLORS[k];
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.bg, border: `1px solid ${c.line}` }} />
            <span>{label}</span>
          </div>
        );
      })}
      <div style={{ marginLeft: "auto" }} className="tiny">Klikkaa treeniä avataksesi sarjat</div>
    </div>
  );
}

window.CalendarVariant = CalendarVariant;
window.makeSummary = makeSummary;
