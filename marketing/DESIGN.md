---
name: Gainly Marketing
description: Editorial neon on near-black — a Finnish coaching platform's landing page that shows off the product's craft instead of describing it.
colors:
  stage-black: "#141414"
  surface-1: "#1a1a1a"
  surface-2: "#1e1e1e"
  ink: "#f4f4f5"
  ink-muted: "#cfcfcf"
  border-hairline: "rgba(207, 207, 207, 0.14)"
  header-bg: "rgba(20, 20, 20, 0.85)"
  cobrand-pink: "#ff2d95"
  neon-pink: "#ff006e"
  neon-orange: "#ff6b00"
  neon-yellow: "#ffd60a"
  neon-green: "#39ff14"
  neon-cyan: "#00f5ff"
  neon-blue: "#3a86ff"
  neon-violet: "#8338ec"
  cta-pill-fg: "#ffffff"
typography:
  display:
    fontFamily: "Cabinet Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.25rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Cabinet Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.125rem, 5vw, 3.625rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Cabinet Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Satoshi, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(0.9375rem, 1.5vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  eyebrow:
    fontFamily: "Satoshi, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "11.26px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.2em"
  index-numeral:
    fontFamily: "Cabinet Grotesk, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.875rem, 3.5vw, 3rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "28px"
  card-mobile: "28px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section-y: "80px"
  section-y-lg: "128px"
components:
  cta-primary:
    backgroundColor: "{colors.stage-black}"
    textColor: "{colors.cta-pill-fg}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 24px"
    height: "52px"
  cta-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  mobile-overlay-cta:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stage-black}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
  mobile-overlay-cta-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
  section-card-mobile:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card-mobile}"
    padding: "20px"
  feature-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "20px 0"
  hamburger-button:
    backgroundColor: "{colors.header-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    width: "48px"
---

# Design System: Gainly Marketing

## 1. Overview

**Creative North Star: "Editorial Neon"**

The Gainly marketing site is a near-black editorial layout that uses the full neon rainbow as its primary voice. Where the product app is restrained (the parent `gainly/DESIGN.md`'s "Black Stage" with one co-brand pink), the marketing site turns the lights all the way up — every section names its kicker, its display headline, and its supporting paragraph in a two-column rhythm, and each one is anchored by a different saturated neon (cyan for offline, green for the logger, yellow for PRs, pink for messaging, orange for meals, blue for weigh-ins, violet for the home-screen install). The rainbow isn't decorative; each color is doing the same job a spotlight does on a stage — telling the eye which character to watch.

The site shows the product, it doesn't describe it. A 3D-animated MacBook lid opens to reveal the coach dashboard. iPhone screenshots tilt in space inside neon halos. Scroll-driven sections sync laptop frames to text. FlipWords cycle through synonyms inside headlines. The motion is iOS-grade: easing curves `[0.16, 1, 0.3, 1]` and `[0.22, 1, 0.36, 1]`, springs on press, blur-fade entrances via `AnimatedHeading`. Reduced-motion users get the same readable layout without the choreography.

This system explicitly rejects four things named in PRODUCT.md: **crypto/Web3 neon-on-black bro-tech** (we share the palette, never the energy), **generic Stripe/Linear/Vercel SaaS landing** (no soft-gradient card grids, no "trusted by these logos" strip), **American big-box gym aesthetic** (no LA Fitness reds, no flexing stock-photo athletes, no all-caps hustle copy), and **generic consumer fitness apps** (we sell to coaches, not gym-goers; no MyFitnessPal streak language).

**Key Characteristics:**
- Near-black surface (`#141414`) under a deliberately-rationed full neon rainbow.
- Editorial cadence: kicker + headline + paragraph + distinctive showcase per section. Variety is the rhythm; no identical card grids.
- Real product imagery: animated MacBook, tilted iPhone mockups, real Finnish coach testimonials.
- Display type does the work, not chrome. Cabinet Grotesk medium-weight headlines run to two balanced lines and stop.
- Motion-rich but reduced-motion-honest. Every animation has a fallback.
- Finnish first; English locale slots in without rework.

## 2. Colors

A near-black canvas under a fully-committed neon rainbow used as editorial signal, not decoration.

### Primary

- **Co-brand Pink** (`#ff2d95`): The signature Gainly accent across both the product app and the marketing site. The hero "asiakkaita" gradient text leads with it. Spotlight beams, the CTA arrow circle (`.neon-bg`), the radial glow behind the MacBook hero, and the conic-gradient reflection under devices all anchor on this hue.

### Secondary

The rainbow status family — on this brand surface, each color is paired to a single client-app feature row so the eye learns the mapping:

- **Neon Cyan** (`#00f5ff`): Offline-tuki feature, second Spotlight beam, info-temperature secondary accent.
- **Neon Green** (`#39ff14`): Fast logger feature, "synced / good" semantic carryover from the product.
- **Neon Yellow** (`#ffd60a`): Automatic PR detection feature — celebratory hue.
- **Neon Pink** (`#ff006e`): Direct-messaging feature; a redder sibling to co-brand `#ff2d95`.
- **Neon Orange** (`#ff6b00`): Meal plan feature (Apple / nutrition).
- **Neon Blue** (`#3a86ff`): Weight-management feature (trending data).
- **Neon Violet** (`#8338ec`): Home-screen install / native PWA feature.

### Neutral

- **Stage Black** (`#141414`): the body background, the marketing site's near-black stage. Slightly warmer than the product app's `#070708` because this surface lives on a screen the visitor *isn't* immersed in; the marginal lift keeps the page from disappearing into device bezels.
- **Surface 1** (`#1a1a1a`): card and section interior on hero band and feature backgrounds.
- **Surface 2** (`#1e1e1e`): testimonials and "Why Gainly" section card.
- **Ink** (`#f4f4f5`): primary body color.
- **Ink Muted** (`#cfcfcf`): secondary body, eyebrows, the "01 / 04" footer-strip counter.
- **Border Hairline** (`rgba(207, 207, 207, 0.14)`): the only divider treatment on the site. No solid lines.
- **Header BG** (`rgba(20, 20, 20, 0.85)`): the hamburger button's translucent pill, sitting behind a progressive blur strip.

### Named Rules

**The Spotlight Rule.** Saturated color is a spotlight, never wallpaper. Each neon glow on this page is doing exactly one job: pointing at a feature row, anchoring a device halo, glowing under a CTA arrow, or carrying a Spotlight beam into the hero. Decorative rainbow fills are forbidden; the `.neon-bg` class is reserved for active-state surfaces like the primary CTA's arrow circle, progress bars in the BenefitsSection, and intentional one-off accents.

**The Feature-Color Lock.** Each client-app feature owns one neon hue across the page: offline = cyan, logger = green, PRs = yellow, messaging = pink, meals = orange, weights = blue, install = violet. Never reassign a feature's hue for decorative reasons; the active-row marker, the icon glow, the halo behind the phone, and the caption color must all match. Visitors learn the mapping by repetition.

**The Co-brand Holds the Hero.** The hero and the page-level CTA always lead with `#ff2d95`. Other neons appear only after the visitor has met the brand color first. The hero's `.neon-text` word ("asiakkaita") inherits the full rainbow gradient *because* it includes co-brand pink as both start and end stops — closing the loop.

## 3. Typography

**Display Font:** Cabinet Grotesk (with Helvetica Neue, Helvetica, Arial, sans-serif fallback) — loaded from Fontshare weights 500/700/800/900.
**Body Font:** Satoshi (with Helvetica Neue, Helvetica, Arial, sans-serif fallback) — loaded from Fontshare weights 400/500/700.

**Character:** A confident pairing of two Fontshare workhorses. Cabinet Grotesk is a humanist grotesque with subtle quirk — open apertures on lowercase, a flatter `a`, a slightly compressed proportion — that gives display copy personality without theatre. Satoshi is its even-tempered geometric companion for body text, neutral enough to disappear behind the words. The pairing reads as Finnish editorial design: deliberate, plain-spoken, no rhetorical flourish.

### Hierarchy

- **Display** (500, `clamp(2.75rem, 6vw, 5.25rem)`, lh 1.05, tracking -0.02em): the hero h1 only. `text-wrap: balance` is implied by manual `<br>` line breaks and a two-line copy budget. Never exceeds two visual lines on any breakpoint.
- **Headline** (500, `clamp(2.125rem, 5vw, 3.625rem)`, lh 1.05, tracking -0.025em): every section heading ("Mietitty / Rakennettu / Testattu / Hiottu treenaajien toimesta", "Miksi asiakkaasi rakastavat Gainlya", "Miksi valmentajat valitsevat Gainlyn", "Mitä valmentajat sanovat Gainlystä"). Often hosts a `FlipWords` cycle or a `Highlight` underline.
- **Title** (700, `clamp(1.25rem, 2.5vw, 1.875rem)`, lh 1.2, tracking -0.02em): feature row titles ("Offline-tuki", "Nopea loggeri") in the ClientFeaturesShowcase. Bolder weight than display headlines because they live next to the index numeral and need to hold the row.
- **Body** (Satoshi 400, `clamp(0.9375rem, 1.5vw, 1.125rem)`, lh 1.6): all paragraph copy. `text-muted-foreground` (`#cfcfcf`) is the default body color; pure white is reserved for headlines and the active feature row title.
- **Eyebrow** (Satoshi 500, `11.26px`, tracking `0.2em`, UPPERCASE): the section-leading kicker ("Miksi Gainly", "Asiakaspuoli", "Valmentajan työkalut", "Kokemuksia"). Always uses the muted ink (`text-muted-foreground`). This is a committed editorial cadence on this brand surface; do not remove or replace with section numerals.
- **Index Numeral** (Cabinet Grotesk 900, `clamp(1.875rem, 3.5vw, 3rem)`, lh 1, tracking -0.025em, tabular-nums): the feature-row "01"/"02"/"03" indices in the ClientFeaturesShowcase. White at 90% when active; white at 20% otherwise. The tabular-nums lock prevents column drift on hover-to-active transitions.

### Named Rules

**The Two-Display-Faces Rule.** Cabinet Grotesk for display and titles, Satoshi for body and eyebrows. Never introduce a third face on the marketing surface. The parent product app's Bricolage Grotesque + Plus Jakarta Sans pairing is intentionally *different* from this one; the marketing site has its own type system and they don't share fonts.

**The Two-Line Headline Rule.** Display and headline copy is budgeted to two visual lines on every breakpoint, written with manual `<br>` to control wrap. If copy doesn't fit at the smallest breakpoint, rewrite the copy, don't shrink the type. "Valmenna asiakkaita, älä taulukoita." is the model: declarative, balanced, two lines.

**The Muted-Body Rule.** Body copy is `text-muted-foreground` (`#cfcfcf` on `#141414` = ~10.4:1 contrast), not pure `ink`. Pure white is reserved for headlines and the active row title — it's a hierarchy lever, not the default. Audit any white-at-40 or white-at-60 against background for AA before shipping.

## 4. Elevation

The marketing site is **flat at rest with atmospheric depth**. There are no traditional drop shadows on cards or sections. Depth is conveyed by three layered techniques: (a) **tonal layering** of `#141414` → `#1a1a1a` → `#1e1e1e` for nested sections, (b) **hairline alpha borders** (`rgba(207, 207, 207, 0.14)`) where a divider must be visible, and (c) **atmospheric neon glows** behind devices, CTAs, and feature halos — radial and conic gradients dialed down to `opacity` 10–25% and blurred to `3xl`. The glow does the work that a shadow would do in a flatter site: it carries the eye, names the active element, and makes the surface feel three-dimensional without hard-edged darkness.

### Shadow Vocabulary

- **Laptop / Phone Drop** (`box-shadow: 0 50px 100px -25px rgba(0,0,0,0.75)` / `0 40px 80px -25px rgba(0,0,0,0.8)`): the only "real" drop shadows on the page — under the animated MacBook in the hero and behind tilted iPhone mockups. Both use a tall offset, large negative spread, and high alpha; they're shadows of *physical devices*, not of cards.
- **Neon Magenta Halo** (`bg-[radial-gradient(ellipse_at_center,rgba(255,45,149,0.25),transparent_65%)] blur-2xl`): primary device glow under the hero MacBook and the BenefitsSection laptop.
- **Neon Cyan Sheen** (`bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.12),transparent_70%)] blur-3xl`): secondary atmospheric layer behind the laptop, sitting under the magenta halo.
- **Per-Feature Halo** (`radial-gradient(ellipse at center, ${color}33, transparent 65%) blur-3xl`): each iPhone mockup in `ClientFeaturesShowcase` projects a halo in its feature-locked hue. The alpha (`33` = 20%) is deliberately quiet so the screenshot reads first.
- **Neon Reflection Puddle** (`bg-[conic-gradient(from_0deg,rgba(255,45,149,0.25),rgba(255,107,0,0.18),rgba(0,245,255,0.22),rgba(131,56,236,0.25),rgba(255,45,149,0.25))] blur-3xl`): the rainbow puddle below the hero MacBook and tilted hero phone. Spinning conic gradient referenced via `--noise-angle` for the NoiseBackground CTA frame.
- **Mobile Card Inset** (`box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset, 0 30px 60px -30px rgba(0,0,0,0.6)`): the `.mobile-card` class — visible only on mobile where each section gets a 28px-radius card on the black page background; desktop drops the shadow and goes full-bleed.

### Named Rules

**The Glow-Before-Shadow Rule.** Depth on this page comes from neon glows under elements, not from dark drops under cards. Real drop shadows are reserved for actual rendered hardware (laptop, phone) and for the mobile-only card inset. Never add a drop shadow to a section card on desktop; if a section needs to feel raised, tonal-layer Surface 1 → Surface 2 instead.

**The Flat-Section Default.** Desktop sections are full-bleed and flat. The `mobile-card` class — 28px corners, inset white-alpha ring, soft dark drop, horizontal margin — applies only at the mobile breakpoint and disappears at `lg:` because the desktop layout's width already creates rhythm without card frames.

## 5. Components

### Buttons

#### Primary CTA pill
- **Shape:** continuous pill (`rounded-full`), padding `8px 8px 8px 24px`, height ~52px.
- **Surface:** `bg-linear-to-r from-black via-black to-neutral-900` — flat near-black with a subtle gradient to the right side.
- **Frame:** wrapped in a `NoiseBackground` component whose `gradientColors` are the full neon rainbow (`#ff2d95, #00f5ff, #ffd60a, #39ff14, #8338ec`); a `2px` rim of conic-gradient noise rotates around the pill at 5-second period — the only place on the page where the rainbow appears as a continuous gradient.
- **Trailing affordance:** 36×36 `neon-bg` (rainbow-animated) circle with white `ArrowUpRight` icon, shadowed in `rgba(255,45,149,0.6)` co-brand glow.
- **Press:** `active:scale-[0.98]`, 150ms transition. The pill body brightens (`hover:from-neutral-900 hover:to-black`); the rainbow rim continues to spin.
- **Text:** Satoshi 500, 14px, white.

#### Secondary inline link
- **Style:** transparent text link in `text-white`, `text-sm font-medium`, with a trailing `ArrowUpRight` 16×16 in the same color.
- **Hover:** no underline; rely on the arrow as the affordance.

#### Mobile-overlay CTAs (in the hamburger menu sheet)
- **Primary:** `bg-white text-black`, full-width pill, `py-4`, font-medium.
- **Ghost:** transparent with `border-white/20`, full-width pill, `py-4`.

#### Hamburger button
- **Style:** 48×48 round, `bg-header-bg` (`rgba(20,20,20,0.85)`), `backdrop-blur-md`, white `Menu` icon 20×20.

### Cards / Containers

- **Mobile-card** (mobile only): 28px corners, `Surface 1` background, `1px inset rgba(255,255,255,0.08)` ring, soft drop, horizontal margin `12px` on each side. Applied to each `<section>` on mobile so the page reads as a stack of dark cards on the black surround.
- **Desktop sections:** full-bleed flat, distinguished by the `Surface 1` (`#1a1a1a`) ↔ `Surface 2` (`#1e1e1e`) ↔ `Stage Black` (`#141414`) tonal alternation between adjacent sections.
- **No traditional product card** is used anywhere on this site. Identical card grids are explicitly rejected.

### Inputs / Fields

Not present on this surface; the site converts via off-page CTA forms. When forms eventually land (contact / "Kokeile ilmaiseksi"), inherit from the parent product DESIGN.md's input pattern: hairline border, `Stage Black` background, `12px` radius, focus ring in co-brand pink, placeholder ≥4.5:1 contrast against `Stage Black`.

### Navigation

#### Desktop floating navbar
- **Component:** `FloatingNav` from Aceternity, centered above the page.
- **Behavior:** auto-hides on scroll-down, reappears on scroll-up.
- **Background:** translucent pill with backdrop blur, hairline border, lucide icons preceding each label (Home, Sparkles, Tag, Mail).
- **Labels:** Finnish (`Etusivu / Ominaisuudet / Hinnoittelu / Yhteys`), Satoshi 500.

#### Mobile full-screen menu
- **Trigger:** the round hamburger pill (top-right) opens a full-screen overlay (`bg-black/95 backdrop-blur-2xl`) with magenta + cyan radial glows.
- **Menu stack:** `text-5xl font-medium tracking-[-0.02em]`, hairline-bordered between items, motion staggered entry (`delay 0.1 + i * 0.06s`).
- **CTAs at bottom:** primary "Kokeile ilmaiseksi →" and ghost "Varaa esittely".

#### Progressive blur strip
A four-band blurred mask (`blur` 2/6/12/24 px, mask-image linear stop 20/40/60/80%) sits behind the top of every page so any neon halo or hero element gradually softens into the header area. Always pointer-events-none.

### Signature Components

#### LaptopMockup (Hero)
A 3D-animated MacBook frame whose lid opens from `rotateX: -92` to `0` over 1.5 seconds, then a dark veil over the screen fades out and a white glare sweeps across — synthesizing the moment a laptop powers on. The hinge, base, and notch are CSS-only; the screen content is a real product screenshot. Two stacked atmospheric glows (magenta + cyan) sit behind it, and a conic rainbow reflection puddle blurs below.

#### MobileScreenshot
A 260–340px-wide iPhone mockup with a notch, 44px corner radius, 2px zinc ring, and 6px screen inset; halo behind it in the active feature's neon hue. Tilted in 3D via `perspective: 1400px / 1600px` and `rotateY / rotateX` on initial frame, settling on hover or active state.

#### Spotlight
Aceternity-style blurred SVG ellipse (3787×2842 viewBox, 151-stdDev Gaussian blur, 21% fill opacity) sliding in from `x: -200` over 1.5s. Used at hero (magenta TL beam + cyan TR beam, the cyan one mirrored via `scale-x-[-1]`).

#### AnimatedHeading / AnimatedText
Headings enter with `opacity 0 → 1`, `y: 30 → 0`, and a `filter: blur(12px) → 0` blur-out over 0.9s with easing `[0.22, 1, 0.36, 1]`. Body paragraphs enter the same way with `y: 20`, no blur, 0.7s, 0.15s delay. Triggered by `whileInView` with `viewport: { once: true, margin: '-80px' }` so the content is reliably present on first paint and the entrance is a polish layer.

#### FlipWords
Cycles through synonyms inside a headline ("Rakennettu / Mietitty / Testattu / Hiottu" and "valmentajat / käyttäjät / treenaajat / urheilijat"). Always renders with `.neon-text` so the cycling word is the only rainbow element in the headline.

#### Boxes (Testimonials)
Background grid of subtly-lit boxes (Aceternity component) revealing on hover, masked into a radial gradient so the corners stay dark. Sits behind the testimonials' InfiniteMovingCards.

#### ClientFeaturesShowcase (scroll-driven feature ribbon + sticky phone)
A two-column lg-only pattern: left = scrollable ribbon of feature rows with neon top markers, big editorial index numerals, expandable per-row content; right = sticky iPhone mockup whose screenshot crossfades with `blur(10px)` to `blur(0)` over 0.5s when the user activates a different row. The active feature's hue propagates: row top marker, row title slide, icon drop-shadow, phone halo, caption color.

#### BenefitsSection (scroll-driven laptop)
A 2.2 : 1 desktop grid: left = sticky animated `BenefitLaptop` with crossfading screenshots, plus a row of three neon progress bars and an "01 / 03 — Title" counter; right = three `min-h-[85vh]` content blocks tracked by IntersectionObserver (`rootMargin: '-45% 0px -45% 0px'`). Active block fades the others to `opacity 0.35`. Mobile collapses to a tab bar + screenshot card pattern with motion `layoutId`.

#### InfiniteMovingCards (Testimonials)
Aceternity horizontal autoscroll, animation duration 40s, direction `right`, speed `slow`. Six Finnish testimonials with real-shaped coach role labels (`Voimaharjoitteluvalmentaja`, `Online PT`, `Hybridivalmentaja`, `Voimanostotiimi`, `Strength Coach`, `Yleisvalmentaja`).

## 6. Do's and Don'ts

### Do:

- **Do** keep the body surface near-black `#141414` and rely on tonal layering through `Surface 1` and `Surface 2` plus atmospheric neon glows to convey depth.
- **Do** use the full neon rainbow as an editorial signal — one hue per client-app feature, magenta on the hero, white on default body text (the Spotlight Rule, the Feature-Color Lock, the Co-brand Holds the Hero).
- **Do** follow the editorial cadence on every section: eyebrow kicker → headline → paragraph → distinctive showcase. The showcase format should vary (animated laptop on benefits, sticky phone + ribbon on client features, infinite cards on testimonials).
- **Do** keep display and headline copy to two visual lines with manual `<br>` breaks; rewrite copy before shrinking the type (the Two-Line Headline Rule).
- **Do** pair every motion entrance with `whileInView: { once: true, margin: '-80px' }` so reduced-motion users still see content reliably on first paint.
- **Do** budget every neon-on-near-black combination against WCAG AA: body at `#cfcfcf` on `#141414` is ~10.4:1; muted text at `white/40` or `white/60` over a neon-glow region needs an in-context audit case by case.
- **Do** keep hover/active feedback `press`-shaped: `active:scale-[0.96]` to `active:scale-[0.98]` over 60–150ms. Matches the parent product app's `btn-spring`.
- **Do** ship Finnish copy as primary; budget every component (headline, eyebrow, CTA) so the English locale slots in later without a rewrite.

### Don't:

- **Don't** make this site feel like **crypto / Web3 neon-on-black bro-tech** — no glitch text, no holographic foil, no anime-edgy fonts, no "to the moon" hustle copy. We share the palette, never the energy.
- **Don't** turn it into a **generic Stripe / Linear / Vercel SaaS landing** — no soft-pastel gradients, no identical card grids, no hero-metric block, no "trusted by these logos" strip, no "built for modern teams" subhead.
- **Don't** lean **American big-box gym aesthetic** — no Crunch / LA Fitness primary reds, no stock-photo athletes flexing, no all-caps "GRIND. SWEAT. REPEAT." copy.
- **Don't** copy **generic consumer fitness apps** (MyFitnessPal / Strava / Fitbit) — no streak-gamification language, no "your daily steps" framing, no consumer-facing tone. We sell to coaches.
- **Don't** introduce a third display face; Cabinet Grotesk for display, Satoshi for body (the Two-Display-Faces Rule). The parent product app's Bricolage Grotesque + Plus Jakarta Sans is a different system; don't mix the two surfaces' fonts.
- **Don't** reassign a feature's color (the Feature-Color Lock). Cyan = offline, green = logger, yellow = PRs, pink = messaging, orange = meals, blue = weights, violet = install. Coaches scan the page by hue.
- **Don't** use the `.neon-bg` (animated rainbow surface) for decoration. It's reserved for the primary-CTA arrow circle, active progress bars, and intentional one-off accent fills the team explicitly opts into.
- **Don't** add drop shadows under desktop section cards or content blocks (the Glow-Before-Shadow Rule). Real drops are for rendered hardware (laptop, phone) and the mobile-only card inset, nothing else.
- **Don't** use white-at-40 or white-at-60 as primary body color even when it "looks elegant" — it's failing AA. Pull body up to `text-muted-foreground` (`#cfcfcf`) or to pure `ink`.
- **Don't** add `border-left` / `border-right` colored stripes, glassmorphism for decoration, or gradient text outside `.neon-text` on headlines.
- **Don't** stretch hero display copy past two lines or remove `text-wrap: balance` (implied by the manual `<br>` breaks). The headline is the lede; let it breathe.
