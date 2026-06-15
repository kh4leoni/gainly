---
name: Gainly
description: AI-first digital coaching PWA — near-black stage, rainbow spotlight, native-app polish.
colors:
  cobrand-pink: "#FF1D8C"
  coach-primary: "#FF0080"
  stage-black: "#070708"
  surface-1: "#0F0F12"
  surface-2: "#161619"
  surface-3: "#1E1E23"
  ink: "#F0EEF5"
  light-bg: "#F5F4F8"
  light-surface: "#FFFFFF"
  light-ink: "#1A1820"
  success-green: "#3ECF8E"
  emerald: "#34D399"
  warning-amber: "#F5A623"
  info-indigo: "#818CF8"
  toggle-on-green: "#34C759"
  coach-ok: "#16A34A"
  coach-lime: "#65A30D"
  coach-warn: "#CA8A04"
  coach-hot: "#EA580C"
  coach-danger: "#DC2626"
  coach-gold: "#D97706"
  coach-teal: "#0D9488"
  coach-violet: "#7C3AED"
  coach-info: "#0284C7"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.2px"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  script:
    fontFamily: "Great Vibes, cursive"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "normal"
rounded:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "28px"
  2xl: "36px"
  coach: "12px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.cobrand-pink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.coach}"
    padding: "8px 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.coach}"
    padding: "8px 16px"
  surface-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.stage-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.coach}"
    padding: "8px 12px"
    height: "40px"
  ios-group-row:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "11px 16px"
---

# Design System: Gainly

## 1. Overview

**Creative North Star: "The Black Stage"**

Gainly is a near-black stage. The surface is quiet, almost theatrical dark (`#070708`), and color is the spotlight — it falls only on what earns it: a new PR, a status, the brand. The full rainbow lives in the system, but it is a vocabulary of meaning, not decoration. When everything is dark and one thing is saturated, the eye goes exactly where the product wants it.

Two shells share one stage. The **client app** is an installed PWA: dark, immersive, motion-rich, built for a thumb mid-workout in a gym with bad signal. It feels like a native iOS app — continuous squircle corners, UIKit easing curves, press feedback on every tappable thing, an animated splash. The **coach dashboard** turns the lights up: a lighter, information-dense surface for scanning a roster of clients at a glance before drilling in. Same shape language, same accent system, same craft bar — different brightness because the jobs differ.

This system explicitly rejects two things. It is **not sterile medical/clinical software** — no cold institutional grays, no patient-portal chill; Gainly is performance and progress. And it is **never cheap or templated** — no Bootstrap defaults, no off-the-shelf theme, no lazy card grids. Every screen reads as hand-built.

**Key Characteristics:**
- Near-black base; saturated color reserved for meaning (PRs, status, brand).
- Native-app feel: squircle corners, iOS easing, global press feedback, offline-first.
- Two registers of one identity: dark immersive client app, lighter dense coach dashboard.
- Expressive but disciplined motion that always respects reduced-motion.
- Co-brand pink (`#FF1D8C`) as the signature accent across both shells.

## 2. Colors

A near-black canvas under a full, deliberately-rationed rainbow.

### Primary
- **Co-brand Pink** (`#FF1D8C`): The signature Gainly accent — but **co-brand only**. In the default (non-cobrand) client shell `--c-pink` resolves to neutral near-white; pink appears solely when `html.gainly-cobrand` is set (coach = Fanni Savela). Active states, the co-brand glow (`btn-spring` hover shadow `rgba(255,29,140,0.35)`), splash shimmer in co-brand mode. On the coach shell the equivalent primary is the slightly hotter **Coach Primary** (`#FF0080`, `hsl(330 100% 50%)`).
- **Rainbow gradient — the one default brand accent**: `linear-gradient(120deg, #4f46e5 → #7c3aed → #c026d3 → #db2777 → #e11d48)` (indigo→violet→fuchsia→pink→rose). In the default (non-cobrand) shell this gradient is the *only* brand colour, and it lives **on surfaces only**: primary CTAs + hero (`--c-cta-bg` / `--c-hero-bg`), active nav indicators, notification badges, and selected/active background tints (`--c-pink-dim`, a low-opacity version of the same sweep), plus the glow (`--c-pink-glow`). Held in the white-text-safe band so white CTA copy clears AA across the whole sweep. There is **no single solid "brand colour"** in default — text, numbers, icons and borders are neutral ink. Co-brand collapses the entire system to solid Gainly pink.

### Secondary
The rainbow status family — each color carries a fixed meaning, never used decoratively.
- **Success Green** (`#3ECF8E`) / **Emerald** (`#34D399`): completion, synced state, positive deltas.
- **Warning Amber** (`#F5A623`): caution, attention-needed.
- **Info Indigo** (`#818CF8`): informational, neutral highlight.
- **Toggle-On Green** (`#34C759`): iOS UISwitch ON state only.

### Tertiary
Coach roster semantics — a denser ramp for at-a-glance status across many clients (light-mode values shown; each brightens in dark mode):
- **Coach OK** (`#16A34A`), **Lime** (`#65A30D`), **Warn** (`#CA8A04`), **Hot** (`#EA580C`), **Danger** (`#DC2626`), **Gold** (`#D97706`), **Teal** (`#0D9488`), **Violet** (`#7C3AED`), **Info** (`#0284C7`).

### Neutral
- **Stage Black** (`#070708`): client app body. The stage.
- **Surface 1 / 2 / 3** (`#0F0F12` / `#161619` / `#1E1E23`): stacked dark surfaces — cards, sheets, raised rows.
- **Ink** (`#F0EEF5`): primary client text (muted `48%`, subtle `24%` of ink).
- **Light BG / Surface / Ink** (`#F5F4F8` / `#FFFFFF` / `#1A1820`): coach shell and client light-mode.
- Hairline borders are alpha, not solid: `rgba(255,255,255,0.07)` on dark, `rgba(0,0,0,0.08)` on light.

### Named Rules
**The Spotlight Rule.** Saturated color marks meaning, never fills space. If a color isn't reporting a status, a PR, or the brand, it doesn't belong. The black does the work; color is the exception.

**The Status-Color Lock.** Each rainbow hue has one job (green = good/synced, amber = caution, danger = red, …). Never reassign a status color for decoration; the coach scans by hue.

**The Rainbow-Surface Rule.** In the default client shell the brand accent is the rainbow gradient, and it appears **only on surfaces** — CTAs, active indicators, notification badges, selected-state tints, glows. Text, numbers, icons and borders stay neutral ink; never introduce a single solid "brand colour" (no lone violet/pink accent) in default. The gradient is the one voice. Co-brand swaps the whole surface system to solid Gainly pink.

## 3. Typography

**Display Font:** Bricolage Grotesque (with Plus Jakarta Sans, system-ui fallback)
**Body Font:** Plus Jakarta Sans (with system-ui, sans-serif)
**Script/Accent Font:** Great Vibes (`--font-dancing`, decorative co-brand signature only)

**Character:** A contrast pairing — Bricolage Grotesque is a quirky, slightly condensed humanist grotesque that gives headings personality; Plus Jakarta Sans is a clean geometric workhorse for everything readable. Great Vibes is the rare flourish, reserved for co-brand signature moments, never UI text.

### Hierarchy
- **Display** (700, `clamp(1.75rem, 4vw, 2.75rem)`, lh 1.05, tracking -0.02em): page heroes, big page titles. Uses `text-wrap: balance`.
- **Title** (700, 17px, lh 1.2, tracking -0.2px): compact top-bar titles, section heads, card titles.
- **Body** (400, 15px, lh 1.5): all readable content. Cap measure at 65–75ch.
- **Label** (700, 11px, tracking 0.06em, UPPERCASE): iOS group section labels, small caps metadata only.
- **Script** (Great Vibes, 400): co-brand signature flourishes exclusively.

### Named Rules
**The One Display Rule.** Bricolage Grotesque is the only display face. Don't introduce a second heading font; weight and size carry hierarchy.

## 4. Elevation

A hybrid system. The dark client app conveys depth primarily through **tonal layering** — Surface 1 → 2 → 3 stack lighter to read as raised — plus alpha hairline borders. Shadows are reserved for genuinely floating elements (dialogs, the spring-hover on primary buttons) and stay soft and diffuse, never the hard dark drops of a 2014 app.

### Shadow Vocabulary
- **Dialog (dark)** (`box-shadow: 0 18px 48px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.22), inset 0 0 0 0.5px rgba(255,255,255,0.06)`): iOS-style themed alert dialogs.
- **Dialog (light)** (`0 18px 48px rgba(20,20,30,0.18), 0 4px 14px rgba(20,20,30,0.08)`): light-shell dialogs.
- **Spring Glow** (`0 6px 20px rgba(255,29,140,0.35)`): primary button `btn-spring` hover only — the pink lift.
- **Card Lift** (`0 6px 16px rgba(0,0,0,0.10)`): `card-grow` pointer-hover.
- **Toggle Thumb** (`0 3px 8px rgba(0,0,0,0.15), …`): iOS switch thumb.

### Named Rules
**The Layer-Before-Shadow Rule.** On the dark stage, raise a surface by stepping its tone (Surface 1→2→3), not by adding a shadow. Shadows are for things that actually float (dialogs, hovers), nothing else.

## 5. Components

### Buttons
- **Shape:** continuous squircle, coach radius 12px (`rounded-md` in coach shell); client buttons inherit the larger iOS radius scale.
- **Primary:** `--c-cta-bg` — default = the rainbow CTA gradient, co-brand = solid pink — with white text (`--c-cta-fg`), `8px 16px` padding, 40px tall. `btn-spring` hover lifts `scale(1.06) translateY(-2px)` with the `--c-cta-glow` Spring Glow shadow; active `scale(0.96)`. The dashboard hero "Aloita treeni" is the canonical instance.
- **Press feedback (client):** every button/link/`[role=button]` in `.client-app` gets global `scale(0.96)` + `brightness(0.9)` on `:active` over 60ms. This is identity, not optional.
- **Ghost / Outline / Secondary / Link:** transparent or hairline-bordered, color shift on hover; ghost tints toward `accent`.

### Cards / Containers
- **Corner Style:** large continuous squircle — Surface cards default to `lg` (22px); the whole `.client-app *` gets `corner-shape: squircle`.
- **Background:** Surface 1 (`#0F0F12`) on dark, white on light; hairline alpha border.
- **Shadow Strategy:** flat at rest (see Elevation). `interactive` adds `card-grow` pointer-hover lift only.
- **Internal Padding:** 16px default.
- **Entrance:** `card-enter` fade-up 8px over 320ms with staggered delays (`card-enter-1..9`).

### Inputs / Fields
- **Style:** hairline border, `bg-background` (Stage Black on dark), 12px radius, 40px tall, 15px text.
- **Focus:** 2px ring in brand pink (`--ring`) with 2px offset — global `:focus-visible` everywhere.
- **Placeholder:** must hit 4.5:1 contrast (muted-foreground), not light gray.
- **Disabled:** `opacity-50`, `cursor-not-allowed`.

### Navigation
- **Client bottom nav:** floating bar over a progressive fade (`client-fade-nav`: translucent top → solid bottom), hugs the iOS home-indicator (`--client-nav-inset`). Icons animate on press.
- **Title handoff:** large page title fades out as `client-shell-scrolled` engages and a compact 17px top title bar slides in — the iOS large-title pattern.
- **Coach nav:** hover-expand sidebar rail + progressive-blur topbar.

### Signature Components
- **iOS UISwitch** (`.ios-toggle`): exact 51×31 track, 27px thumb, system-green ON (`#34C759`), spring easing. Forced true-circle thumb.
- **iOS inset grouped list** (`.ios-group` / `.ios-group-row`): rounded card of 44px-min rows with inset hairline dividers and small-caps section labels — the Settings pattern.
- **App splash** (`.app-splash`): animated Gainly logo with a one-shot shimmer masked to the logo silhouette; co-brand variant turns the shimmer pink.
- **PR burst** (`pr-burst` keyframe): celebratory `scale(0)→1.4→1` rotate pop when a personal record fires, paired with a Realtime toast.

## 6. Do's and Don'ts

### Do:
- **Do** keep the client surface near-black (`#070708`) and let saturated color appear only as meaning — PRs, status, brand (the Spotlight Rule).
- **Do** use continuous squircle corners on the client app; respect the radius scale (xs 8 → 2xl 36) and apply `corner-shape: squircle`.
- **Do** raise dark surfaces by tonal layering (Surface 1→2→3), not by adding shadows (the Layer-Before-Shadow Rule).
- **Do** ship press feedback, iOS easing, and a `prefers-reduced-motion` fallback for every animation — motion is identity and motion-rich AA is the bar.
- **Do** pair every status color with an icon, label, or shape so color isn't the only signal.
- **Do** keep contrast at WCAG AA — including muted/placeholder text on tinted near-black and near-white.

### Don't:
- **Don't** make Gainly feel like **sterile medical/clinical software** — no cold institutional grays, no patient-portal chill, no warmth-free screens.
- **Don't** let it look **cheap or templated** — no Bootstrap defaults, no off-the-shelf theme, no lazy identical card grids, no SaaS gradient hero-metric template.
- **Don't** use color decoratively or reassign a status hue (the Status-Color Lock). Green means good/synced, amber means caution — always.
- **Don't** add a second display font; Bricolage Grotesque is the only one (the One Display Rule).
- **Don't** use Great Vibes (script) for anything but co-brand signature flourishes — never UI text.
- **Don't** add `border-left`/`border-right` colored stripes, gradient text, or decorative glassmorphism.
- **Don't** use hard, dark drop shadows; if a shadow looks like a 2014 app, it's too dark and too tight.
