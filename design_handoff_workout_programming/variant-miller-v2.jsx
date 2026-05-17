// Variantti 3 v2: MILLER COLUMNS — viimeistelty pääversio
// Lisäykset v1:een:
//  - selvempi aktiivinen viikko (pystypilkku + tausta + chip)
//  - drag-kahvat viikoilla ja liikkeillä
//  - "Monista" -inline-toiminto viikkoriville (kopioi + progressio)
//  - viikon yhteenveto (volyymijakauma) sarakkeen päässä
//  - tweaks: tiheys, korostusväri, oikea yhteenvetorail
//  - asiakkaan suoritus-merkki (vihreä piste tehdyille treeneille)

const { useState, useEffect, useMemo } = React;

const DENSITY = {
  compact:    { rowY: 5, rowFs: 12,   subFs: 9.5,  titleFs: 22, tableFs: 12,   pad: "12px 18px 18px", colPad: "4px 4px 10px" },
  balanced:   { rowY: 8, rowFs: 13,   subFs: 10,   titleFs: 26, tableFs: 13,   pad: "20px 26px 30px", colPad: "6px 6px 14px" },
  airy:       { rowY: 11, rowFs: 14,  subFs: 11,   titleFs: 30, tableFs: 14,   pad: "26px 32px 38px", colPad: "10px 8px 16px" },
};

const ACCENTS = {
  pink:   { fg: "#ff3d8a", soft: "rgba(255,61,138,0.12)", line: "rgba(255,61,138,0.4)", contrast: "#1a0410" },
  amber:  { fg: "#f5a623", soft: "rgba(245,166,35,0.12)", line: "rgba(245,166,35,0.4)", contrast: "#1a0f00" },
  cyan:   { fg: "#22d3ee", soft: "rgba(34,211,238,0.12)", line: "rgba(34,211,238,0.4)", contrast: "#001417" },
  lime:   { fg: "#a3e635", soft: "rgba(163,230,53,0.12)", line: "rgba(163,230,53,0.4)", contrast: "#0a1500" },
};

// Mark some sessions as completed for "asiakkaan suoritus" indicator.
// VK1+VK2 fully done, VK3 partial.
function isSessionDone(weekNum, day) {
  if (weekNum < 3) return "done";
  if (weekNum === 3 && (day === "ma" || day === "ti")) return "done";
  if (weekNum === 3 && day === "to") return "today";
  return "future";
}

function MillerV2() {
  const phase = window.PROGRAM_DATA.phases[0];
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "density": "balanced",
    "accent": "pink",
    "phaseView": "expanded",
    "showSummaryRail": true,
    "showProgression": true,
    "showCompletion": true
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const d = DENSITY[tweaks.density] || DENSITY.balanced;
  const accent = ACCENTS[tweaks.accent] || ACCENTS.pink;

  // Live-applied accent on the root container
  const rootStyle = {
    "--accent-fg": accent.fg,
    "--accent-soft": accent.soft,
    "--accent-line": accent.line,
    "--accent-contrast": accent.contrast,
  };

  const [selWeekId, setSelWeekId] = useState(phase.weeks[2].id);
  const [selDay, setSelDay] = useState("to");
  const [selExIdx, setSelExIdx] = useState(0);
  const [copyMenu, setCopyMenu] = useState(null); // weekId being copied
  const [toast, setToast] = useState(null);

  const week = phase.weeks.find(w => w.id === selWeekId);
  const session = week.sessions.find(s => s.day === selDay);
  const exercise = session.exercises[selExIdx];

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCopyWeek = (sourceId, mode) => {
    const src = phase.weeks.find(w => w.id === sourceId);
    setCopyMenu(null);
    const msg = mode === "progress"
      ? `Vk ${src.num} kopioitu vk ${phase.weeks.length + 1} (+2.5 % painoja)`
      : `Vk ${src.num} kopioitu vk ${phase.weeks.length + 1}`;
    setToast(msg);
  };

  return (
    <div className="app miller-v2" style={rootStyle}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <window.SideNav />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <MillerTopBar />

          {/* Phase strip */}
          <PhaseStrip phase={phase} />

          {/* Phase overview — expanded grid OR compact ribbon */}
          {tweaks.phaseView === "expanded" ? (
            <PhaseOverview
              phase={phase}
              selWeekId={selWeekId}
              selDay={selDay}
              onPick={(wid, day) => {
                setSelWeekId(wid);
                const w = phase.weeks.find(x => x.id === wid);
                setSelDay(day || w.sessions[0].day);
                setSelExIdx(0);
              }}
              showCompletion={tweaks.showCompletion}
              onCollapse={() => setTweak("phaseView", "compact")}
            />
          ) : tweaks.phaseView === "compact" ? (
            <PhaseRibbon
              phase={phase}
              selWeekId={selWeekId}
              selDay={selDay}
              onPick={(wid, day) => {
                setSelWeekId(wid);
                const w = phase.weeks.find(x => x.id === wid);
                setSelDay(day || w.sessions[0].day);
                setSelExIdx(0);
              }}
              showCompletion={tweaks.showCompletion}
              onExpand={() => setTweak("phaseView", "expanded")}
            />
          ) : null}

          {/* Columns */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <SessionsColumn
              week={week}
              selDay={selDay}
              onSelect={(day) => { setSelDay(day); setSelExIdx(0); }}
              showCompletion={tweaks.showCompletion}
              d={d}
            />

            <ExercisesColumn
              session={session}
              selExIdx={selExIdx}
              onSelect={setSelExIdx}
              d={d}
            />

            {/* Detail */}
            <div style={{ flex: 1, minWidth: 0, overflow: "auto", background: "var(--bg-0)" }}>
              <ExerciseDetail ex={exercise} session={session} week={week} phase={phase} idx={selExIdx} total={session.exercises.length} d={d} showProgression={tweaks.showProgression} onJumpWeek={(wid) => { setSelWeekId(wid); }} />
            </div>

            {tweaks.showSummaryRail && <SummaryRail week={week} />}
          </div>
        </div>
      </div>

      {/* Tweaks panel + floating opener */}
      <TweaksOpener />
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Esitys">
          <window.TweakRadio
            label="Tiheys"
            value={tweaks.density}
            options={[{ value: "compact", label: "Tiivis" }, { value: "balanced", label: "Tasap." }, { value: "airy", label: "Ilmava" }]}
            onChange={(v) => setTweak("density", v)}
          />
          <window.TweakColor
            label="Korostusväri"
            value={tweaks.accent}
            options={[
              { value: "pink", color: ACCENTS.pink.fg },
              { value: "amber", color: ACCENTS.amber.fg },
              { value: "cyan", color: ACCENTS.cyan.fg },
              { value: "lime", color: ACCENTS.lime.fg },
            ]}
            onChange={(v) => setTweak("accent", v)}
          />
        </window.TweakSection>
        <window.TweakSection label="Paneelit">
          <window.TweakRadio
            label="Jakson yleiskuva"
            value={tweaks.phaseView}
            options={[{ value: "expanded", label: "Iso" }, { value: "compact", label: "Riband" }, { value: "off", label: "Pois" }]}
            onChange={(v) => setTweak("phaseView", v)}
          />
          <window.TweakToggle label="Viikkoyhteenveto oikealla" value={tweaks.showSummaryRail} onChange={(v) => setTweak("showSummaryRail", v)} />
          <window.TweakToggle label="Progressiokaavio liikkeellä" value={tweaks.showProgression} onChange={(v) => setTweak("showProgression", v)} />
          <window.TweakToggle label="Asiakkaan suoritusmerkit" value={tweaks.showCompletion} onChange={(v) => setTweak("showCompletion", v)} />
        </window.TweakSection>
      </window.TweaksPanel>

      {/* Toast */}
      {toast && <Toast text={toast} />}

      {/* CSS for accent variable hooks */}
      <style>{`
        .miller-v2 .acc-fg { color: var(--accent-fg); }
        .miller-v2 .acc-bg { background: var(--accent-soft); }
        .miller-v2 .acc-bd { border-color: var(--accent-line); }
        .miller-v2 input.cell:focus { border-color: var(--accent-line); background: var(--accent-soft); }
        .miller-v2 .btn.primary { background: var(--accent-fg); border-color: var(--accent-fg); color: var(--accent-contrast); }
      `}</style>
    </div>
  );
}

function MillerTopBar() {
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Ohjelmat</span>
        <span style={{ opacity: 0.4 }}>›</span>
        <span>Jaakko Parkkali</span>
        <span style={{ opacity: 0.4 }}>›</span>
        <strong>Voimaharjoittelu — kevät '26</strong>
      </div>
      <div className="actions">
        <div style={{ position: "relative", marginRight: 8 }}>
          <input
            placeholder="Hae liikettä, viikkoa…"
            style={{
              background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 7,
              color: "var(--fg-0)", padding: "6px 10px 6px 28px", fontSize: 12, width: 220, fontFamily: "inherit",
            }}
          />
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)", fontSize: 12 }}>⌕</span>
        </div>
        <button className="btn ghost">Esikatsele asiakkaan näkymä</button>
        <button className="btn">＋ Jakso</button>
        <button className="btn primary">Tallenna</button>
      </div>
    </div>
  );
}

function PhaseStrip({ phase }) {
  const totalSets = phase.weeks.reduce((a, w) => a + w.sessions.reduce((b, s) => b + s.exercises.reduce((c, e) => c + e.sets.length, 0), 0), 0);
  return (
    <div style={{
      padding: "12px 22px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      borderBottom: "1px solid var(--line)",
      background: "var(--bg-1)",
    }}>
      <div className="row gap-8">
        <span className="tiny acc-fg">JAKSO 1</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Akkumulaatio</span>
      </div>
      <div style={{ width: 1, height: 18, background: "var(--line)" }} />
      <div className="row gap-12" style={{ color: "var(--fg-2)", fontSize: 12 }}>
        <span><b style={{ color: "var(--fg-0)" }}>{phase.weeks.length}</b> viikkoa</span>
        <span><b style={{ color: "var(--fg-0)" }}>{phase.weeks.length * 4}</b> treeniä</span>
        <span><b style={{ color: "var(--fg-0)" }}>{totalSets}</b> sarjaa</span>
        <span>· 6.4. – 24.5.2026</span>
      </div>
      <div style={{ marginLeft: "auto" }} className="row gap-6">
        <button className="btn ghost sm">Monista jakso</button>
        <button className="btn ghost sm">⋯</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// COL 1: WEEKS
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Phase OVERVIEW — big grid: weeks × days, each cell shows session content
// ─────────────────────────────────────────────────────────────────────────
function PhaseOverview({ phase, selWeekId, selDay, onPick, showCompletion, onCollapse }) {
  return (
    <div style={{
      borderBottom: "1px solid var(--line)",
      background: "var(--bg-1)",
      padding: "12px 18px 14px",
      flex: "0 0 auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="row gap-8">
          <span className="tiny" style={{ color: "var(--accent-fg)" }}>JAKSON YLEISKUVA</span>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>kaikki treenit kerralla · klikkaa solua avataksesi alle</span>
        </div>
        <div className="row gap-12">
          <span className="row gap-12" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
            <span className="row gap-4"><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} /> tehty</span>
            <span className="row gap-4"><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-fg)" }} /> tänään</span>
            <span className="row gap-4"><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} /> tuleva</span>
          </span>
          <button className="btn ghost sm" onClick={onCollapse} title="Tiivistä yleiskuva">⇡ Tiivistä</button>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: `28px repeat(${phase.weeks.length}, minmax(0, 1fr)) 72px`,
        gridTemplateRows: `26px repeat(${window.DAYS.length}, 1fr)`,
        gap: 5,
        minHeight: 380,
      }}>
        {/* Top-left corner */}
        <div></div>
        {/* Week headers */}
        {phase.weeks.map((w) => {
          const sel = w.id === selWeekId;
          return (
            <div
              key={w.id}
              onClick={() => onPick(w.id)}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                background: sel ? "var(--accent-soft)" : "transparent",
                border: sel ? "1px solid var(--accent-line)" : "1px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span className="mono tiny" style={{ color: sel ? "var(--accent-fg)" : "var(--fg-2)" }}>VK{w.num}</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: sel ? "var(--fg-0)" : "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
              {w.active && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flex: "0 0 auto" }} />}
            </div>
          );
        })}
        {/* + new week column header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, border: "1px dashed var(--line)",
          color: "var(--fg-3)", fontSize: 10.5, cursor: "pointer",
        }}>＋ Viikko</div>

        {/* Day rows */}
        {window.DAYS.map((day) => (
          <React.Fragment key={day}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "var(--fg-3)", fontWeight: 700, letterSpacing: "0.05em",
            }}>
              {window.DAY_LABEL[day]}
            </div>
            {phase.weeks.map((w) => {
              const session = w.sessions.find(s => s.day === day);
              const sel = w.id === selWeekId && day === selDay;
              const status = showCompletion ? isSessionDone(w.num, day) : "future";
              return (
                <OverviewCell
                  key={w.id + day}
                  week={w}
                  session={session}
                  selected={sel}
                  status={status}
                  onClick={() => onPick(w.id, day)}
                />
              );
            })}
            <div></div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function OverviewCell({ week, session, selected, status, onClick }) {
  const c = window.COLORS[session.color];
  const isFuture = status === "future";
  const isDone = status === "done";
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? c.bg : "var(--bg-2)",
        border: `1px solid ${selected ? c.fg : "var(--line)"}`,
        borderLeft: `3px solid ${c.fg}`,
        borderRadius: 7,
        padding: "7px 9px 8px 10px",
        cursor: "pointer",
        opacity: isFuture ? 0.85 : 1,
        transition: "background 0.12s, border-color 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = c.line; e.currentTarget.style.borderLeftColor = c.fg; } }}
      onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.borderLeftColor = c.fg; } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 5, paddingBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: selected ? "var(--fg-0)" : "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.name}
        </span>
        {isDone && (
          <span style={{ flex: "0 0 auto", color: "var(--green)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em" }}>✓ TEHTY</span>
        )}
        {status === "today" && (
          <span style={{ flex: "0 0 auto", color: "var(--accent-fg)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em" }}>● TÄNÄÄN</span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {session.exercises.map((ex, i) => (
          <OverviewExerciseRow key={i} ex={ex} accent={c.fg} isDone={isDone} />
        ))}
      </div>
    </div>
  );
}

function OverviewExerciseRow({ ex, accent, isDone }) {
  const reps = repsLabel(ex.sets);
  const plannedW = weightLabel(ex.sets);
  const plannedR = rpeLabel(ex.sets);
  const actualW = isDone ? achievedWeightLabel(ex.sets) : null;
  const actualR = isDone ? achievedRpeLabel(ex.sets) : null;

  // Color when done: planned row dims to fg-3 to draw the eye to the actual row
  const plannedColor = isDone ? "var(--fg-3)" : "var(--fg-2)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.25 }}>
      <div style={{ fontSize: 10.5, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shortenExName(ex.name)}
      </div>
      {/* Planned row — always shown */}
      <div className="mono" style={{ fontSize: 9.5, display: "flex", justifyContent: "space-between", gap: 4 }}>
        <span style={{ color: plannedColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {reps}<span style={{ opacity: 0.6 }}> · </span>{plannedW}
        </span>
        <span style={{ flex: "0 0 auto", color: plannedColor }}>{plannedR}</span>
      </div>
      {/* Actual row — only for done sessions */}
      {isDone && (
        <div className="mono" style={{ fontSize: 9.5, display: "flex", justifyContent: "space-between", gap: 4 }}>
          <span style={{ color: accent, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ marginRight: 3 }}>✓</span>
            {reps}<span style={{ opacity: 0.55 }}> · </span>{actualW}
          </span>
          <span style={{ flex: "0 0 auto", color: accent, fontWeight: 600 }}>@{actualR}</span>
        </div>
      )}
    </div>
  );
}

function repsLabel(sets) {
  const all = sets.map(s => s.r);
  const min = Math.min(...all), max = Math.max(...all);
  return min === max ? `${sets.length}×${min}` : `${sets.length}×${min}-${max}`;
}
function weightLabel(sets) {
  const ws = sets.map(s => s.w).filter(w => w > 0);
  if (!ws.length) return "oma p.";
  const min = Math.min(...ws), max = Math.max(...ws);
  return min === max ? `${min}kg` : `${min}-${max}kg`;
}
function rpeLabel(sets) {
  const all = sets.map(s => s.rpe);
  const min = Math.min(...all), max = Math.max(...all);
  return min === max ? `@${min}` : `@${min}-${max}`;
}
function achievedWeightLabel(sets) {
  // Mock: actual = planned + 2.5kg (small overshoot)
  const ws = sets.map(s => s.w).filter(w => w > 0);
  if (!ws.length) return "oma p.";
  const min = Math.min(...ws) + 2.5;
  const max = Math.max(...ws) + 2.5;
  return min === max ? `${min}kg` : `${min}-${max}kg`;
}
function achievedRpeLabel(sets) {
  // Mock: planned avg + 0.5, rounded to 0.5
  const avg = sets.reduce((a, s) => a + s.rpe, 0) / sets.length;
  return Math.round((avg + 0.5) * 2) / 2;
}

function shortenExName(name) {
  return name
    .replace("Romanian maastav.", "Rom. maasto")
    .replace("Bulgarian askel", "Bulg. askel")
    .replace("Vinopenkki kahvak.", "Vinopenkki kk.")
    .replace("Pystypunnerrus", "Pystypunn.")
    .replace("Triceps push-down", "Tric. push-d.")
    .replace("Pohjeprässi", "Pohjepr.")
    .replace("Hauiskääntö", "Hauiskä.");
}

// ─────────────────────────────────────────────────────────────────────────
// Phase ribbon — horizontal heat-map of all weeks (compact)
// ─────────────────────────────────────────────────────────────────────────
function PhaseRibbon({ phase, selWeekId, selDay, onPick, showCompletion, onExpand }) {
  return (
    <div style={{
      display: "flex",
      borderBottom: "1px solid var(--line)",
      background: "var(--bg-1)",
      padding: "10px 14px 12px",
      gap: 8,
      alignItems: "stretch",
      overflow: "auto",
    }}>
      <div onClick={onExpand} style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 10, borderRight: "1px solid var(--line)", marginRight: 2, flex: "0 0 auto", cursor: "pointer" }} title="Laajenna yleiskuva">
        <div className="tiny" style={{ color: "var(--accent-fg)" }}>JAKSO ⇣</div>
        <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 2 }}>Laajenna</div>
      </div>
      {phase.weeks.map((w) => {
        const isSel = w.id === selWeekId;
        const setCount = w.sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
        return (
          <div
            key={w.id}
            onClick={() => onPick(w.id)}
            style={{
              flex: "1 1 0",
              minWidth: 110,
              padding: "6px 8px 7px",
              borderRadius: 8,
              cursor: "pointer",
              background: isSel ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${isSel ? "var(--accent-line)" : "var(--line)"}`,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              position: "relative",
              transition: "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
            onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
          >
            {w.active && (
              <span style={{
                position: "absolute", top: 4, right: 6,
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--green)",
              }} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="mono tiny" style={{ color: isSel ? "var(--accent-fg)" : "var(--fg-2)" }}>VK{w.num}</span>
              <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{setCount}</span>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: isSel ? "var(--fg-0)" : "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {w.name}
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
              {w.sessions.map((s) => {
                const c = window.COLORS[s.color];
                const status = showCompletion ? isSessionDone(w.num, s.day) : "future";
                const cellSel = isSel && s.day === selDay;
                const sets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
                return (
                  <div
                    key={s.day}
                    onClick={(e) => { e.stopPropagation(); onPick(w.id, s.day); }}
                    title={`${window.DAY_LABEL[s.day]} · ${s.name} · ${sets} sarjaa`}
                    style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 4,
                      background: status === "done" ? c.bg : status === "today" ? c.bg : c.bg,
                      border: `1px solid ${cellSel ? "var(--accent-fg)" : c.line}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      opacity: status === "future" ? 0.55 : 1,
                      cursor: "pointer",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 8.5, color: c.fg, fontWeight: 600, letterSpacing: "0.02em" }}>
                      {window.DAY_LABEL[s.day]}
                    </span>
                    {status === "done" && (
                      <span style={{
                        position: "absolute", bottom: 1, right: 1,
                        width: 4, height: 4, borderRadius: "50%",
                        background: "var(--green)",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{
        flex: "0 0 auto",
        minWidth: 60,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1.5px dashed var(--line-2)",
        borderRadius: 8,
        color: "var(--fg-3)",
        fontSize: 14,
        cursor: "pointer",
      }} title="Lisää viikko">＋</div>
    </div>
  );
}

function WeeksColumn({ phase, selWeekId, onSelect, copyMenu, setCopyMenu, onCopy, showCompletion, d }) {
  return (
    <Column title="Viikot" actionLabel="＋ Viikko" width={250} d={d}>
      {phase.weeks.map((w) => {
        const sel = w.id === selWeekId;
        const setCount = w.sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
        const doneCount = showCompletion ? w.sessions.filter(s => isSessionDone(w.num, s.day) === "done").length : 0;
        const isMenu = copyMenu === w.id;
        return (
          <div key={w.id} style={{ position: "relative" }}>
            <ColRow
              selected={sel}
              onClick={() => onSelect(w.id)}
              accent={w.active ? "var(--green)" : null}
              d={d}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="grip" style={{ cursor: "grab", color: "var(--fg-3)", fontSize: 11, marginRight: -2 }}>⋮⋮</span>
                <span className="tiny mono" style={{ color: sel ? "var(--accent-fg)" : "var(--fg-2)", width: 28 }}>VK{w.num}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: d.rowFs, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.name}
                  </div>
                  <div className="mono" style={{ fontSize: d.subFs, color: "var(--fg-3)", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                    <span>{w.sessions.length} treeniä</span>
                    <span style={{ color: "var(--fg-3)" }}>·</span>
                    <span>{setCount} sarjaa</span>
                    {showCompletion && doneCount > 0 && (
                      <>
                        <span style={{ color: "var(--fg-3)" }}>·</span>
                        <span style={{ color: "var(--green)" }}>{doneCount}/{w.sessions.length} ✓</span>
                      </>
                    )}
                  </div>
                </div>
                {w.active && <span className="chip active" style={{ padding: "1px 6px", fontSize: 9 }}>Akt</span>}
                <button
                  className="row-action"
                  onClick={(e) => { e.stopPropagation(); setCopyMenu(isMenu ? null : w.id); }}
                  title="Monista viikko"
                >⎘</button>
              </div>
            </ColRow>

            {isMenu && (
              <CopyMenu
                onClose={() => setCopyMenu(null)}
                onPick={(mode) => onCopy(w.id, mode)}
                sourceNum={w.num}
                targetNum={phase.weeks.length + 1}
              />
            )}
          </div>
        );
      })}

      <style>{`
        .row-action {
          opacity: 0;
          background: transparent;
          border: 1px solid transparent;
          color: var(--fg-2);
          font-size: 11px;
          width: 22px; height: 22px;
          border-radius: 5px;
          display: inline-flex; align-items: center; justify-content: center;
          transition: opacity 0.12s, background 0.12s, color 0.12s, border-color 0.12s;
          flex: 0 0 auto;
        }
        .col-row:hover .row-action { opacity: 1; }
        .row-action:hover { background: rgba(255,255,255,0.06); color: var(--fg-0); border-color: var(--line-2); }
        .col-row .grip { opacity: 0; transition: opacity 0.12s; }
        .col-row:hover .grip { opacity: 1; }
      `}</style>
    </Column>
  );
}

function CopyMenu({ onClose, onPick, sourceNum, targetNum }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 50 }}
      />
      <div style={{
        position: "absolute",
        top: "50%",
        right: 6,
        transform: "translateY(-50%)",
        zIndex: 51,
        width: 240,
        background: "var(--bg-3)",
        border: "1px solid var(--line-2)",
        borderRadius: 10,
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        padding: 10,
      }}>
        <div className="tiny" style={{ color: "var(--fg-3)", marginBottom: 8 }}>Monista Vk {sourceNum} → Vk {targetNum}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <button className="btn sm" style={{ justifyContent: "flex-start" }} onClick={() => onPick("exact")}>
            <span style={{ flex: 1, textAlign: "left" }}>Sellaisenaan</span>
            <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10 }}>=</span>
          </button>
          <button className="btn sm" style={{ justifyContent: "flex-start" }} onClick={() => onPick("progress")}>
            <span style={{ flex: 1, textAlign: "left" }}>+2.5 % painoja</span>
            <span className="mono" style={{ color: "var(--green)", fontSize: 10 }}>↑</span>
          </button>
          <button className="btn sm" style={{ justifyContent: "flex-start" }} onClick={() => onPick("deload")}>
            <span style={{ flex: 1, textAlign: "left" }}>Deload (−15 % volyymi)</span>
            <span className="mono" style={{ color: "var(--fg-2)", fontSize: 10 }}>↓</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// COL 2: SESSIONS
// ──────────────────────────────────────────────────────────────
function SessionsColumn({ week, selDay, onSelect, showCompletion, d }) {
  return (
    <Column title={`Vk ${week.num} — ${week.name}`} subtitle="TREENIT" actionLabel="＋ Treeni" width={250} d={d}>
      {week.sessions.map((s) => {
        const sel = s.day === selDay;
        const c = window.COLORS[s.color];
        const setCount = s.exercises.reduce((a, e) => a + e.sets.length, 0);
        const status = showCompletion ? isSessionDone(week.num, s.day) : "future";
        return (
          <ColRow key={s.day} selected={sel} onClick={() => onSelect(s.day)} accent={c.fg} d={d}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span className="grip" style={{ cursor: "grab", color: "var(--fg-3)", fontSize: 11, marginRight: -4 }}>⋮⋮</span>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: c.bg, border: `1px solid ${c.line}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flex: "0 0 auto",
                position: "relative",
              }}>
                <span className="mono tiny" style={{ color: c.fg }}>{window.DAY_LABEL[s.day]}</span>
                {status === "done" && (
                  <span style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--bg-1)" }} />
                )}
                {status === "today" && (
                  <span style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: "50%", background: "var(--accent-fg)", border: "2px solid var(--bg-1)" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: d.rowFs, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.name}
                </div>
                <div className="mono" style={{ fontSize: d.subFs, color: "var(--fg-3)", marginTop: 1 }}>
                  {s.exercises.length} liikettä · {setCount} sarjaa
                </div>
              </div>
              <span style={{ color: sel ? "var(--accent-fg)" : "var(--fg-3)", fontSize: 13 }}>›</span>
            </div>
          </ColRow>
        );
      })}
    </Column>
  );
}

// ──────────────────────────────────────────────────────────────
// COL 3: EXERCISES
// ──────────────────────────────────────────────────────────────
function ExercisesColumn({ session, selExIdx, onSelect, d }) {
  const c = window.COLORS[session.color];
  return (
    <Column
      title={session.name}
      subtitle={`${window.DAY_LABEL[session.day]} · ${session.tag.toUpperCase()}`}
      titleColor={c.fg}
      actionLabel="＋ Liike"
      width={240}
      d={d}
    >
      {session.exercises.map((e, i) => {
        const sel = i === selExIdx;
        return (
          <ColRow key={i} selected={sel} onClick={() => onSelect(i)} accent={c.fg} d={d}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="grip" style={{ cursor: "grab", color: "var(--fg-3)", fontSize: 11, marginRight: -4 }}>⋮⋮</span>
              <span className="mono tiny" style={{ color: "var(--fg-3)", width: 16 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: d.rowFs, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                <div className="mono" style={{ fontSize: d.subFs, color: "var(--fg-3)", marginTop: 1 }}>
                  {window.makeSummary(e.sets)}
                </div>
              </div>
              <span style={{ color: sel ? "var(--accent-fg)" : "var(--fg-3)", fontSize: 13 }}>›</span>
            </div>
          </ColRow>
        );
      })}
    </Column>
  );
}

// ──────────────────────────────────────────────────────────────
// Column shell
// ──────────────────────────────────────────────────────────────
function Column({ title, subtitle, actionLabel, titleColor, width, d, children }) {
  return (
    <div style={{
      width, flex: "0 0 auto",
      borderRight: "1px solid var(--line)",
      background: "var(--bg-1)",
      display: "flex", flexDirection: "column",
      minHeight: 0,
    }}>
      <div style={{ padding: "13px 14px 11px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {subtitle && <div className="tiny" style={{ color: "var(--fg-3)" }}>{subtitle}</div>}
            <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: titleColor || "var(--fg-0)" }}>{title}</div>
          </div>
          {actionLabel && <button className="btn ghost sm acc-fg" style={{ color: "var(--accent-fg)", flex: "0 0 auto" }}>{actionLabel}</button>}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: d.colPad }}>
        {children}
      </div>
    </div>
  );
}

function ColRow({ selected, onClick, accent, d, children }) {
  return (
    <div
      className="col-row"
      onClick={onClick}
      style={{
        padding: `${d.rowY}px 10px`,
        margin: "1px 4px",
        borderRadius: 7,
        background: selected ? "var(--accent-soft)" : "transparent",
        cursor: "pointer",
        borderLeft: accent ? `2px solid ${selected ? "var(--accent-fg)" : accent}` : "2px solid transparent",
        transition: "background 0.1s",
        position: "relative",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Detail
// ──────────────────────────────────────────────────────────────
function ExerciseDetail({ ex, session, week, phase, idx, total, d, showProgression, onJumpWeek }) {
  const c = window.COLORS[session.color];

  // Find same exercise in adjacent weeks (by name + day)
  const weekIdx = phase.weeks.findIndex(w => w.id === week.id);
  const prevWeek = weekIdx > 0 ? phase.weeks[weekIdx - 1] : null;
  const nextWeek = weekIdx < phase.weeks.length - 1 ? phase.weeks[weekIdx + 1] : null;
  const findEx = (w) => w?.sessions.find(s => s.day === session.day)?.exercises.find(e => e.name === ex.name);
  const prevEx = findEx(prevWeek);
  const nextEx = findEx(nextWeek);
  return (
    <div style={{ padding: d.pad, display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="row gap-8" style={{ fontSize: 11, color: "var(--fg-3)" }}>
        <span>Vk {week.num} · {week.name}</span>
        <span>›</span>
        <span style={{ color: c.fg }}>{session.name}</span>
        <span>›</span>
        <span style={{ color: "var(--fg-1)" }}>Liike {idx + 1}/{total}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: d.titleFs, fontWeight: 600, letterSpacing: "-0.01em" }}>{ex.name}</div>
          <div style={{ color: "var(--fg-2)", fontSize: 12, marginTop: 5, display: "flex", gap: 14 }}>
            <span><b style={{ color: "var(--fg-1)" }}>{ex.sets.length}</b> sarjaa</span>
            <span><b style={{ color: "var(--fg-1)" }}>{ex.sets.reduce((a, s) => a + s.r, 0)}</b> toistoa yht.</span>
            <span>keskim. RPE <b style={{ color: c.fg }}>{(ex.sets.reduce((a, s) => a + s.rpe, 0) / ex.sets.length).toFixed(1)}</b></span>
          </div>
        </div>
        <div className="row gap-6">
          <button className="btn ghost sm">⏮ Edell.</button>
          <button className="btn ghost sm">Seur. ⏭</button>
          <div style={{ width: 1, height: 22, background: "var(--line)" }} />
          <button className="btn ghost">Korvaa</button>
          <button className="btn ghost">⋯</button>
        </div>
      </div>

      {/* Three-week comparison */}
      <div style={{
        display: "flex",
        gap: 12,
        alignItems: "stretch",
      }}>
        <div style={{ flex: "0 0 154px", minWidth: 0 }}>
          <NeighborWeekCard week={prevWeek} ex={prevEx} accent={c.fg} status={prevEx ? "done" : "empty"} label="Viime viikko" onJump={prevWeek ? () => onJumpWeek(prevWeek.id) : null} />
        </div>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <CurrentWeekTable ex={ex} week={week} accent={c} d={d} />
        </div>
        <div style={{ flex: "0 0 154px", minWidth: 0 }}>
          <NeighborWeekCard week={nextWeek} ex={nextEx} accent={c.fg} status="planned" label="Ensi viikko" onJump={nextWeek ? () => onJumpWeek(nextWeek.id) : null} />
        </div>
      </div>

      {/* Bottom row: progression + notes */}
      <div style={{ display: "grid", gridTemplateColumns: showProgression ? "1fr 1fr" : "1fr", gap: 14 }}>
        {showProgression && (
          <div style={{ background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div className="tiny">Progressio · työsarjan kuorma</div>
              <div className="mono" style={{ fontSize: 11, color: c.fg }}>↑ +{((ex.sets.length - 1) * 2.5).toFixed(1)} kg / 7 vk</div>
            </div>
            <ProgressionBars exName={ex.name} day={session.day} currentWeek={week.num} accent={c.fg} />
          </div>
        )}
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
          <div className="tiny" style={{ marginBottom: 10 }}>Ohje asiakkaalle</div>
          <div style={{ fontSize: 12.5, color: "var(--fg-1)", lineHeight: 1.55 }}>
            Pidä rinta ylhäällä ja keskivartalo tiukkana. Lasku 3 s, alhaalla pieni paussi, nousu räjähtävästi. Jos viimeinen sarja menee yli RPE 9, jätä yksi toisto pois seuraavalla.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="chip">📹 Videolinkki</span>
            <span className="chip">📎 Liite</span>
            <span className="chip">＋ Variaatio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Current week — big editable set table
// ──────────────────────────────────────────────────────────────
function CurrentWeekTable({ ex, week, accent, d }) {
  const c = accent;
  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderTop: `2px solid ${c.fg}`,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px",
        borderBottom: "1px solid var(--line)",
        background: c.bg,
        gap: 8,
      }}>
        <div className="row gap-6" style={{ minWidth: 0 }}>
          <span className="tiny" style={{ color: c.fg, whiteSpace: "nowrap" }}>VK {week.num} · NYKYINEN</span>
        </div>
        <div className="row gap-4" style={{ flex: "0 0 auto" }}>
          <button className="btn ghost sm" style={{ fontSize: 10.5, padding: "3px 7px" }} title="Kopioi sarjat viime viikolta">← Kopioi</button>
          <button className="btn ghost sm" style={{ fontSize: 10.5, padding: "3px 7px" }} title="Kopioi sarjat ensi viikkoon">Kopioi →</button>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: d.tableFs }}>
        <thead>
          <tr style={{ background: "var(--bg-2)" }}>
            {["", "Sarja", "Toistot", "Kuorma", "RPE", ""].map((h, i) => (
              <th key={i} style={{
                padding: "9px 12px",
                textAlign: i <= 1 ? "left" : "center",
                fontSize: 10,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                borderBottom: "1px solid var(--line)",
                width: i === 0 ? 22 : i === 1 ? 50 : "auto",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ex.sets.map((s, i) => (
            <tr key={i} style={{ borderBottom: i < ex.sets.length - 1 ? "1px solid var(--line)" : "none" }}>
              <td style={{ padding: "8px 12px", color: "var(--fg-3)", fontSize: 11, cursor: "grab" }}>⋮⋮</td>
              <td className="mono" style={{ padding: "8px 12px", color: "var(--fg-2)" }}>#{i + 1}</td>
              <td style={{ padding: "6px 10px" }}><input className="cell" defaultValue={s.r} /></td>
              <td style={{ padding: "6px 10px" }}>
                <div style={{ position: "relative" }}>
                  <input className="cell" defaultValue={s.w || ""} placeholder="—" style={{ paddingRight: 24 }} />
                  <span className="mono" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: "var(--fg-3)", fontSize: 10 }}>kg</span>
                </div>
              </td>
              <td style={{ padding: "6px 10px" }}><input className="cell" defaultValue={s.rpe} style={{ color: c.fg, fontWeight: 600 }} /></td>
              <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--fg-3)", cursor: "pointer", fontSize: 12 }}>×</td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.015)" }}>
            <td colSpan="6" style={{ padding: "9px 12px", color: "var(--accent-fg)", cursor: "pointer", fontSize: 12.5 }}>＋ Lisää sarja</td>
          </tr>
        </tbody>
      </table>
      <div style={{
        padding: "8px 14px", borderTop: "1px solid var(--line)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--bg-2)", color: "var(--fg-3)", fontSize: 11,
      }}>
        <span>Tempo 3-1-1-0 · Tauko 2:00 · kaikki sarjat</span>
        <button className="btn ghost sm" style={{ fontSize: 10.5 }}>Muokkaa lisäkenttiä →</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Neighbor week (read-only compact view)
// ──────────────────────────────────────────────────────────────
function NeighborWeekCard({ week, ex, accent, status, label, onJump }) {
  if (!week) {
    return (
      <div style={{
        background: "transparent",
        border: "1.5px dashed var(--line)",
        borderRadius: 12,
        padding: "20px 12px",
        minHeight: 180,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 4,
        color: "var(--fg-3)",
        fontSize: 11,
        textAlign: "center",
      }}>
        <div className="tiny">{label}</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>—</div>
        <button className="btn ghost sm" style={{ marginTop: 8, fontSize: 10.5 }}>＋ Lisää viikko</button>
      </div>
    );
  }

  const isDone = status === "done";
  const summary = ex ? makeNeighborSummary(ex.sets) : null;

  return (
    <div
      onClick={onJump}
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: onJump ? "pointer" : "default",
        transition: "border-color 0.12s, transform 0.12s",
        opacity: 0.92,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
    >
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--line)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
        background: "var(--bg-2)",
      }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="tiny" style={{ color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{label}</span>
            {isDone && <span style={{ color: "var(--green)", fontSize: 10 }}>✓ tehty</span>}
            {!isDone && <span style={{ color: "var(--fg-3)", fontSize: 10 }}>suunniteltu</span>}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-1)" }}>
            VK {week.num} — {week.name}
          </div>
        </div>
        <span style={{ color: "var(--fg-3)", fontSize: 11 }}>↗</span>
      </div>

      {ex ? (
        <div style={{ padding: "6px 10px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0 6px" }}>
            <span className="mono" style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{summary}</span>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{ex.sets.length} sarjaa</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {ex.sets.map((s, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr 30px",
                alignItems: "center",
                gap: 4,
                padding: "4px 6px",
                background: "var(--bg-2)",
                borderRadius: 5,
                fontSize: 11,
              }}>
                <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10 }}>{i + 1}</span>
                <span className="mono" style={{ color: "var(--fg-0)", textAlign: "center" }}>
                  <b>{s.r}</b>
                  <span style={{ color: "var(--fg-3)", margin: "0 4px" }}>×</span>
                  <b>{s.w ? s.w : "—"}</b>
                  <span style={{ color: "var(--fg-3)", fontSize: 9, marginLeft: 2 }}>{s.w ? "kg" : ""}</span>
                </span>
                <span className="mono" style={{ color: accent, fontWeight: 600, textAlign: "center", fontSize: 10.5 }}>@{s.rpe}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "18px 12px", color: "var(--fg-3)", fontSize: 11.5, textAlign: "center" }}>
          Tätä liikettä ei ole tässä viikossa.
          <div style={{ marginTop: 6, color: "var(--accent-fg)", cursor: "pointer", fontSize: 11 }}>＋ Lisää myös tähän</div>
        </div>
      )}
    </div>
  );
}

function makeNeighborSummary(sets) {
  const allSameReps = sets.every(s => s.r === sets[0].r);
  const allSameRpe = sets.every(s => s.rpe === sets[0].rpe);
  if (allSameReps && allSameRpe) return `${sets.length}×${sets[0].r} @${sets[0].rpe}`;
  if (allSameReps) return `${sets.length}×${sets[0].r}`;
  return `${sets.length} sarjaa`;
}

function ProgressionBars({ exName, day, currentWeek, accent }) {
  const weeks = window.PROGRAM_DATA.phases[0].weeks;
  const data = weeks.map(w => {
    const s = w.sessions.find(s => s.day === day);
    const e = s?.exercises.find(e => e.name === exName);
    const top = e ? Math.max(...e.sets.map(x => x.w || 0)) : 0;
    return { num: w.num, w: top, name: w.name };
  });
  const max = Math.max(...data.map(d => d.w), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
      {data.map((d) => {
        const h = (d.w / max) * 100;
        const cur = d.num === currentWeek;
        const past = d.num < currentWeek;
        return (
          <div key={d.num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: cur ? accent : past ? "var(--fg-1)" : "var(--fg-3)" }}>{d.w || "—"}</div>
            <div style={{ width: "100%", height: 64, background: "rgba(255,255,255,0.03)", borderRadius: 3, position: "relative", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
              <div style={{
                width: "100%",
                height: h + "%",
                background: cur ? accent : past ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.10)",
                borderRadius: 2,
                transition: "height 0.3s",
              }} />
            </div>
            <div className="mono" style={{ fontSize: 9, color: cur ? accent : "var(--fg-3)", fontWeight: cur ? 600 : 400 }}>vk{d.num}</div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Summary rail
// ──────────────────────────────────────────────────────────────
function SummaryRail({ week }) {
  const totalSets = week.sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const totalEx = week.sessions.reduce((a, s) => a + s.exercises.length, 0);
  const totalReps = week.sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.r, 0), 0), 0);

  return (
    <div style={{
      width: 230, flex: "0 0 auto",
      borderLeft: "1px solid var(--line)",
      background: "var(--bg-1)",
      padding: "16px 14px",
      overflow: "auto",
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      <div>
        <div className="tiny">VIIKKO {week.num}</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{week.name}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <SumStat label="Treenejä" value={week.sessions.length} />
        <SumStat label="Liikkeitä" value={totalEx} />
        <SumStat label="Sarjoja" value={totalSets} />
        <SumStat label="Toistoja" value={totalReps} />
      </div>

      <div>
        <div className="tiny" style={{ marginBottom: 9 }}>Volyymijakauma</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {week.sessions.map((s) => {
            const c = window.COLORS[s.color];
            const sets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
            const pct = (sets / totalSets) * 100;
            return (
              <div key={s.day}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
                  <span className="mono" style={{ color: c.fg }}>{window.DAY_LABEL[s.day]} · {s.tag}</span>
                  <span className="mono" style={{ color: "var(--fg-2)" }}>{sets} sarjaa</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: pct + "%", height: "100%", background: c.fg, opacity: 0.7 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="tiny" style={{ marginBottom: 9 }}>Pikatoiminnot</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn sm" style={{ justifyContent: "flex-start" }}>⎘ Monista viikoksi {week.num + 1}</button>
          <button className="btn sm" style={{ justifyContent: "flex-start" }}>↑ Lisää 2.5 % painoja</button>
          <button className="btn sm" style={{ justifyContent: "flex-start" }}>↓ Muunna deloadiksi</button>
          <button className="btn sm" style={{ justifyContent: "flex-start" }}>📋 Vie PDF</button>
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "12px 0 4px", borderTop: "1px solid var(--line)" }}>
        <div className="tiny" style={{ marginBottom: 6 }}>Asiakkaan kuulumiset</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.5, fontStyle: "italic" }}>
          "Ti aamu polvi vähän jumissa, otin vinopenkki kevyemmin." — Jaakko, 12.5.
        </div>
      </div>
    </div>
  );
}

function SumStat({ label, value }) {
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px" }}>
      <div className="mono" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Toast({ text }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "var(--bg-3)", border: "1px solid var(--line-2)",
      borderLeft: "3px solid var(--green)",
      borderRadius: 8, padding: "10px 14px",
      fontSize: 12.5, color: "var(--fg-0)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
      zIndex: 100,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ color: "var(--green)" }}>✓</span>
      <span>{text}</span>
    </div>
  );
}

window.MillerV2 = MillerV2;

// Floating gear button to open Tweaks panel (in case the toolbar toggle isn't visible)
function TweaksOpener() {
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      if (t === "__activate_edit_mode") setTweaksOpen(true);
      else if (t === "__deactivate_edit_mode" || t === "__edit_mode_dismissed") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  if (tweaksOpen) return null;
  return (
    <button
      onClick={() => window.postMessage({ type: "__activate_edit_mode" }, "*")}
      title="Avaa Tweaks"
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        zIndex: 90,
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "var(--bg-3)",
        border: "1px solid var(--line-2)",
        color: "var(--fg-1)",
        fontSize: 18,
        cursor: "pointer",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >⚙</button>
  );
}
