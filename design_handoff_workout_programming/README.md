# Handoff: Workout Programming Redesign (Gainly)

## Overview

Redesign of the trainer-facing **workout programming view** for Gainly. The previous layout was a deeply-nested vertical list (phase → weeks → workouts → exercises → sets), which forced the trainer to scroll endlessly and made it impossible to see the wider context of a program while editing a single exercise.

This redesign keeps a **left-to-right drill-down hierarchy** (Miller columns) for editing, but adds a **large phase overview grid** at the top so the trainer can see *every workout in every week of the phase at a glance* — including what was completed, what's planned, exact loads, reps and RPE.

The main file: **`Treenien ohjelmointi v2.html`** — open it in a browser to see the working prototype.

## About the Design Files

The files in this bundle are **design references created in HTML/React+Babel** — prototypes that demonstrate the intended look, layout and interaction. They are not production code. The task is to **recreate this design inside the Gainly codebase** using its existing React patterns, component library, styling system, state management, and data models.

If a part of the prototype mocks data that the real app already has (e.g. exercise library, completed sets, user info), wire it to the real source instead of the mock data in `data.jsx`.

## Fidelity

**High-fidelity.** Pixel-perfect mockups with final colors, typography, spacing, hierarchy, micro-interactions and copy. The developer should match the visual design closely. Adapt to the codebase's component library when shadcn/Mui/etc. equivalents exist (buttons, inputs, tables), but keep the spacing, color usage, and information density as designed.

## Screens / Views

There is **one main screen** — the workout programming view — composed of four major regions stacked vertically inside a left sidebar + main panel app shell:

### 1. App chrome (existing — match to current app)
- Left sidebar: `Dashboard / Asiakkaat / Ohjelmat / Liikepankki / Viestit`. Active item highlighted with `--pink` left border + soft pink background tint.
- Top bar: breadcrumb `Ohjelmat › <client name> › <program name>`. Right side: search input, "Esikatsele asiakkaan näkymä" ghost button, "+ Jakso" outlined button, "Tallenna" primary pink button.

### 2. Phase strip (just under top bar)
Single thin row showing:
- `JAKSO 1` (pink uppercase label) + `Akkumulaatio` (phase name, bold)
- Vertical divider
- Inline stats: `7 viikkoa · 28 treeniä · 357 sarjaa · 6.4. – 24.5.2026`
- Right side: `Monista jakso` (ghost) and `⋯` overflow menu

### 3. Phase overview grid (the key feature) — `PhaseOverview`
A large CSS grid: **weeks as columns × days as rows**, plus a row header column (28px) on the left and a "+ Viikko" column on the right.

**Header row (26px):** one cell per week showing:
- `VK1` (mono pink-pink if selected) + week name (`Pohja`, `Volyymi +`, `Volyymi ++`, `Deload`, `Intensiteetti`, `Peak`, `Testi`)
- Green dot on the right if this is the active week (currently `Vk 3`)
- Hover: row highlight; click: select that week

**Day-label column (left):** vertical sequence `MA / TI / TO / PE` — small uppercase mono 10px in `--fg-3`.

**Body cells:** each cell is **one workout** (e.g. Monday of Week 1). Each cell shows the **full content of that workout**:

- Background: `--bg-2` (`#17171f`); 1px `--line` border; **3px left border in the workout type color** (rose / amber / violet / cyan — see Design Tokens).
- Selected cell: background `c.bg` (10% color tint), full 1px border in the workout type color.
- Future cells: opacity 0.85.
- Padding: `7px 9px 8px 10px`. Border-radius 7px.

**Inside each cell:**
- Header row (flex, justify-between, paddingBottom 4px, bottom border `rgba(255,255,255,0.05)`):
  - Workout title (e.g. `Alavartalo — voima`), `font-size 11px`, weight 600, `--fg-1`, ellipsis if overflowing.
  - Right side status badge — exactly one of:
    - `✓ TEHTY` (green `--green`, 9.5px, weight 700, letterSpacing 0.05em) — completed sessions
    - `● TÄNÄÄN` (pink `--accent-fg`, same style) — current day
    - nothing for future sessions
- Exercise list (`flex-direction: column`, `gap: 4px`): one `OverviewExerciseRow` per exercise. Each row has a name plus a **planned** sub-row, and for completed sessions an additional **actual** sub-row directly under it:
  - **Line 1 — exercise name**: `font-size 10.5px`, `--fg-1`, ellipsis on overflow. Long names get shortened via `shortenExName()` (e.g. `Romanian maastav.` → `Rom. maasto`).
  - **Line 2 — planned**: monospace 9.5px, flex space-between:
    - Left: `${reps} · ${weights}` — e.g. `4×5 · 120-135kg`. Color is `--fg-2` for non-done sessions; **`--fg-3` (muted) when the session is done** so the actual row pops.
    - Right: `@${plannedRpe}` in the same color.
  - **Line 3 — actual (only for done sessions)**: same layout as the planned row but rendered in the workout type color, weight 600. Prefix `✓ `. Shows the actually-achieved reps × weight on the left and `@${achievedRpe}` on the right. Example: `✓ 4×5 · 122.5-137.5kg     @8.5`.

**Reps / weight / RPE label rules:**
- `repsLabel`: same across all sets → `4×5`; otherwise range → `4×5-8`
- `weightLabel`: at least one weighted set → `120-135kg` (range) or `100kg` (single); none → `oma p.`
- `rpeLabel`: same across all sets → `@8`; otherwise → `@7-9`
- `achievedWeightLabel` (mock for now — wire to real completed-set data): planned min/max + 2.5 kg overshoot
- `achievedRpeLabel` (mock for now — wire to real completed-set data): average planned RPE + 0.5, rounded to 0.5

**Legend (top-right of overview):** small key showing what `●` colors mean — green=tehty, pink=tänään, gray=tuleva. Then a `⇡ Tiivistä` ghost button to collapse the overview into the compact ribbon variant.

**The "+ Viikko"** column (rightmost): full-height dashed-border 6px-radius drop zone, `--fg-3` text, click to add a new week to the phase.

### 4. Drill-down editor (below the overview)
Three columns + a wide detail panel + an optional summary rail. Each is independently scrollable. This is the **edit surface** for whatever cell the trainer clicked in the overview above.

- **Column 1: Sessions** (`SessionsColumn`, 250px wide)
  - Header: `Vk 3 — Volyymi ++` (subtitle `TREENIT`, action `+ Treeni` in accent color).
  - One row per workout in the selected week. Each row:
    - Drag handle `⋮⋮` (hover-only, `--fg-3`)
    - Day badge — 34×34 rounded-8 square with workout color bg + 1px border + 2-letter day label in mono. Top-right corner status dot when relevant (`done` = green; `today` = pink; sized 11×11 with 2px `--bg-1` outline).
    - Title (13px weight 600) + meta line (mono 10px `--fg-3`: `4 liikettä · 13 sarjaa`)
    - Right chevron `›` (pink if selected, `--fg-3` otherwise)
  - Selected row: 2px accent left border + accent soft bg; non-selected gets bg `rgba(255,255,255,0.03)` on hover.

- **Column 2: Exercises** (`ExercisesColumn`, 240px wide)
  - Header title = session name in **session color**; subtitle = `MA · VOIMA`; action `+ Liike` accent.
  - One row per exercise: drag handle, mono index `1`, name (`Etukyykky`), meta line with the summary string (e.g. `3×6 @7-8`).

- **Column 3: Exercise detail** (flex-grow, no fixed width)
  - Breadcrumb: `Vk 3 · Volyymi ++ › Alavartalo — hypertr. › Liike 1/4` (11px `--fg-3`, session color highlights the middle segment).
  - Big exercise title (26px weight 600 at balanced density; scales per density tweak).
  - Stats line: `3 sarjaa · 18 toistoa yht. · keskim. RPE 7.7`.
  - Right side: prev/next ghost buttons (`⏮ Edell.` / `Seur. ⏭`), divider, `Korvaa`, `⋯`.

  Below the title, a **three-week comparison row** (the centerpiece of editing):
  - **Left card — Viime viikko** (154px fixed width):
    - Header tile (`--bg-2`): "Viime viikko ✓ tehty" + `VK 2 — Volyymi +`, with `↗` jump arrow.
    - Compact summary line: `3×8 @7-8` (mono, session color).
    - 1 row per set: 3-column mini grid (set #, `reps × weight kg`, `@rpe`). Read-only, 11px.
    - If exercise doesn't exist in that week, show empty state `Tätä liikettä ei ole tässä viikossa. + Lisää myös tähän`.
    - If the neighbor week doesn't exist at all (boundary), show dashed-border placeholder card with `+ Lisää viikko`.
    - Click anywhere → `onJumpWeek(prevWeek.id)` — jump to that week.
  - **Center card — Nykyinen viikko** (flex 1):
    - 2px top border in workout color. Header tinted with `c.bg`.
    - Title: `VK 3 · NYKYINEN` (workout color, uppercase 10.5px). Right side: `← Kopioi` and `Kopioi →` ghost buttons that copy sets from / to neighbors.
    - Editable table: drag, set #, Toistot input, Kuorma input (with `kg` suffix), RPE input (in workout color, weight 600), × delete.
    - Bottom row: `+ Lisää sarja` in accent color.
    - Below the table: a thin status bar showing `Tempo 3-1-1-0 · Tauko 2:00 · kaikki sarjat` + a `Muokkaa lisäkenttiä →` ghost button (these advanced fields live in a popover so the main table stays narrow).
  - **Right card — Ensi viikko** (154px): identical to left card but status is "suunniteltu" and there's no checkmark.

  Below the comparison row:
  - **Progressio · työsarjan kuorma** card (left half): little bar chart showing top weight per week across the phase, current week highlighted in workout color, past weeks in `rgba(255,255,255,0.28)`, future in `rgba(255,255,255,0.10)`. Top-right shows `↑ +5.0 kg / 7 vk` delta.
  - **Ohje asiakkaalle** card (right half): free-form coaching note + chip row (`📹 Videolinkki`, `📎 Liite`, `+ Variaatio`).

- **Summary rail** (right, 230px, toggleable via tweak)
  - Big week label `VIIKKO 3 — Volyymi ++`.
  - 2×2 grid of stat tiles: `Treenejä / Liikkeitä / Sarjoja / Toistoja` — large mono numbers in tiles with `--bg-2` background.
  - **Volyymijakauma** — one bar per day-of-week, `MA · Voima  13 sarjaa`, colored bar fill at the appropriate width %.
  - **Pikatoiminnot** — four small buttons: `⎘ Monista viikoksi 4`, `↑ Lisää 2.5 % painoja`, `↓ Muunna deloadiksi`, `📋 Vie PDF`.
  - **Asiakkaan kuulumiset** (bottom): italic excerpt of the client's latest journal entry.

### Alternative compact mode: Phase ribbon (`PhaseRibbon`)
When `tweaks.phaseView === 'compact'`, the big overview is replaced by a single-row horizontal "ribbon" — small weekly cards with a 4-cell day strip each. Useful when the trainer wants more vertical space for the editor. Click `JAKSO ⇣ Laajenna` on the ribbon to switch back.

## Interactions & Behavior

### Navigation
- Clicking any overview cell selects that workout and scrolls the drill-down columns to show its content. Clicking the workout-title row in the overview header selects the week (defaults to first day).
- The "Edell. / Seur." buttons in the detail header walk through the exercise list of the current session — they should also wrap to the previous/next session when reaching the edges (not yet implemented in prototype).
- Sessions column rows are clickable to switch the active day within the selected week.
- Exercises column rows switch which exercise is shown in the detail panel.

### Editing
- All set fields (Toistot, Kuorma, RPE, Tempo, Tauko) are inline-editable text inputs. Focus state: border `--accent-line`, bg `--accent-soft`.
- `+ Lisää sarja` appends a new editable row to the current exercise.
- `× Delete` icon on each set row removes that set.
- `+ Liike` (Exercises column header) opens an exercise picker — out of scope for this prototype; wire to existing exercise library modal.
- `+ Treeni` (Sessions column header) creates a new session — opens a small day/template picker.

### Week duplication
The `⎘` icon on a week row in the Sessions column opens a small popover (`CopyMenu`) with three options:
- `Sellaisenaan` — copy week exactly
- `+2.5 % painoja` — copy with progressive overload applied to all weights
- `Deload (−15 % volyymi)` — copy with reduced volume

After a duplication a toast appears bottom-center (auto-dismiss 2.4 s): `Vk 3 kopioitu vk 8 (+2.5 % painoja) ✓`.

The same actions are also surfaced as full-width buttons in the right Summary rail (`⎘ Monista viikoksi 4`, etc.).

### Three-week sets copying
- `← Kopioi` in the center card: copy this exercise's sets from last week into this week (overwrites).
- `Kopioi →` in the center card: push this exercise's sets to next week.
- Empty-state CTA `+ Lisää myös tähän` in a neighbor card: clone the exercise into that week's matching session.

### Tweaks panel
A floating gear button in the bottom-right (or the host app's edit-mode toolbar toggle) opens a small Tweaks panel. Controls:
- Density: `Tiivis / Tasap. / Ilmava` — affects font sizes, row padding, and column padding throughout the drill-down columns.
- Accent color: `Pink / Amber / Cyan / Lime` — sets `--accent-fg/-soft/-line/-contrast` CSS vars used by selection highlights, primary button, and `+ Lisää sarja` action.
- Jakson yleiskuva: `Iso / Riband / Pois` — controls the phase overview region.
- Viikkoyhteenveto oikealla — toggle the right Summary rail.
- Progressiokaavio liikkeellä — toggle the progression bar chart in the detail panel.
- Asiakkaan suoritusmerkit — toggle ✓/● status indicators (when off, all cells render as planned).

In production, density and accent could move into user preferences; the panel-visibility toggles could become permanent layout controls in the top bar.

### Animations
Keep transitions subtle:
- Background/border color transitions on hover/select: `background 0.12s, border-color 0.12s`
- Progression bar heights: `height 0.3s`
- No flashy animations.

## State Management

Minimum state the real implementation needs:
- `selWeekId: string` — currently selected week within the phase
- `selDay: 'ma' | 'ti' | 'to' | 'pe' | …` — currently selected workout-day within the week
- `selExIdx: number` — currently selected exercise within the session
- `copyMenu: weekId | null` — which week's copy-menu popover is open
- `toast: { text, kind } | null` — transient confirmation
- Tweaks: `density`, `accent`, `phaseView`, `showSummaryRail`, `showProgression`, `showCompletion`

Data the page needs (replace `data.jsx` with real API):
- The current `phase` with its `weeks`, each having `sessions`, each having `exercises`, each having `sets`.
- Per-session completion info: status (`done` / `today` / `future`) and per-set `actualReps`, `actualWeight`, `actualRpe` for done sessions. The prototype fakes this via `isSessionDone(weekNum, day)` and `achievedRpeLabel()`.
- Client journal entries (for the Summary rail's "Asiakkaan kuulumiset").

## Design Tokens

All defined in `shared.css` (`:root`).

### Colors — Neutrals
- `--bg-0: #0a0a0d` — page background
- `--bg-1: #111116` — chrome (sidebar, topbar, columns)
- `--bg-2: #17171f` — cards, table headers, overview cells
- `--bg-3: #1f1f29` — popovers, toasts
- `--bg-4: #2a2a36` — (reserved, deeper layer)
- `--line: rgba(255,255,255,0.08)` — subtle dividers
- `--line-2: rgba(255,255,255,0.14)` — button borders, popover edges
- `--fg-0: #fafafa` — primary text
- `--fg-1: #c8c8d0` — secondary text
- `--fg-2: #8a8a96` — tertiary, captions
- `--fg-3: #5b5b66` — muted, helper

### Colors — Brand & status
- `--pink: #ff3d8a` — primary accent (Gainly brand)
- `--pink-soft: rgba(255,61,138,0.14)` — pink fill for selected rows
- `--pink-line: rgba(255,61,138,0.4)` — pink border for selected/focused
- `--green: #2ecf8b` — completion indicator
- Accent overrides (when accent tweak is non-pink): `--accent-fg`, `--accent-soft`, `--accent-line`, `--accent-contrast`

### Colors — Workout-type palette
Each session has a `color` key (`rose | amber | violet | cyan`) and the UI looks up:
```
rose:   { fg: "#FF7AA8", bg: "rgba(255,122,168,0.10)", line: "rgba(255,122,168,0.35)" }
amber:  { fg: "#F2B872", bg: "rgba(242,184,114,0.10)", line: "rgba(242,184,114,0.35)" }
violet: { fg: "#B69CFF", bg: "rgba(182,156,255,0.10)", line: "rgba(182,156,255,0.35)" }
cyan:   { fg: "#7BD3E5", bg: "rgba(123,211,229,0.10)", line: "rgba(123,211,229,0.35)" }
```

In the prototype day-of-week is mapped to color (ma=rose, ti=amber, to=violet, pe=cyan), but in production map by workout type/tag.

### Typography
- Primary: **Inter**, weights 400/500/600/700. `font-feature-settings: "ss01", "cv11"`.
- Mono (numbers / set data): **JetBrains Mono**, weights 400/500/600. `font-feature-settings: "zero"`.
- Logo only: **Caveat 700** (`gainly` wordmark in sidebar). Don't use Caveat anywhere else.

### Spacing & scale
- Radius: cells/cards `7-12px`, buttons `6-8px`, pills `999px`.
- Typical paddings: cells `7-10px`, cards `14-16px`, app gutters `18-26px` depending on density.
- Density variants are in `DENSITY` in `variant-miller-v2.jsx`.

### Density presets (font + padding)
```
compact:  rowFs 12  | subFs 9.5 | titleFs 22 | tableFs 12  | pad "12px 18px 18px"
balanced: rowFs 13  | subFs 10  | titleFs 26 | tableFs 13  | pad "20px 26px 30px"  ← default
airy:     rowFs 14  | subFs 11  | titleFs 30 | tableFs 14  | pad "26px 32px 38px"
```

### Shadows
- Popovers: `0 12px 32px rgba(0,0,0,0.5)`
- Floating elements (gear button, toast): `0 6px 18px – 0 12px 30px rgba(0,0,0,0.45-0.5)`

## Assets

No external imagery is used; everything is rendered with CSS, text, and inline glyphs (✓, ⋮⋮, →, ⎘, etc.). The Gainly wordmark in the sidebar is plain text in Caveat. Replace with the real logo SVG/PNG in production.

Icon glyphs used (replace with the app's icon system — e.g. lucide-react):
- `⋮⋮` drag handle → `GripVertical`
- `›` `‹` chevrons → `ChevronRight` / `ChevronLeft`
- `↗` jump → `ArrowUpRight`
- `⎘` duplicate → `Copy`
- `✓` check → `Check`
- `×` close → `X`
- `⏮ ⏭` prev/next → `ChevronsLeft` / `ChevronsRight`
- `⇡` collapse → `ChevronsUp`
- `📹 📎 📋` → media/clip/clipboard icons
- `↑ ↓` progressive/deload arrows → `TrendingUp` / `TrendingDown`
- `⌕` search → `Search`
- `⚙` settings → `Settings`

## Files

- `Treenien ohjelmointi v2.html` — entry point. Loads React/ReactDOM/Babel from unpkg and renders `<MillerV2 />`.
- `shared.css` — design tokens + base chrome styles.
- `data.jsx` — mock program data (1 phase, 7 weeks, 4 days/wk, with progressive load). Replace with API in production.
- `chrome.jsx` — `SideNav` + `TopBar` components. The real app probably has these already — adapt or replace.
- `variant-miller-v2.jsx` — the redesign itself. Contains `MillerV2`, `PhaseOverview`, `PhaseRibbon`, `SessionsColumn`, `ExercisesColumn`, `ExerciseDetail`, `CurrentWeekTable`, `NeighborWeekCard`, `SummaryRail`, `ProgressionBars`, the label helpers, density/accent tweaks, and the floating gear opener for the Tweaks panel. **This is the main file to port.**
- `variant-calendar.jsx` — earlier exploration (calendar-grid layout). Included for reference only; `makeSummary` is the only function still imported by `variant-miller-v2.jsx`. You can inline `makeSummary` into the miller file when porting and ignore this file otherwise.
- `tweaks-panel.jsx` — generic Tweaks panel framework used by the prototype. Not needed in production unless you want to keep the design-time tweaks visible to power users.

## Implementation Notes

- The four major regions (chrome, phase strip, overview, drill-down + rail) share state through a single top-level component. Drill-down state (selected week / day / exercise) is the same state used to highlight the overview cell — clicking the overview just updates this state.
- `Tweaks` panel + the floating ⚙ button are prototype-only — drop them or replace with real settings.
- Where the prototype shows mock "achieved" data for done sessions (`✓8.5`), wire to actual completed-set telemetry.
- Drag handles (`⋮⋮`) are visible on hover but **not yet wired** to drag-and-drop. The intent is dnd-kit for: reordering weeks within a phase, reordering sessions within a week, reordering exercises within a session, reordering sets within an exercise. When porting, set up dnd contexts per group.
- The CopyMenu in the Sessions column uses a fixed-position overlay backdrop to dismiss — replace with the codebase's popover/dropdown primitive (Radix Popover, etc.).
