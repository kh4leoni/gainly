# Product

## Register

brand

## Users

Finnish strength and fitness professionals — personal trainers, voimavalmentajat, kuntosalivalmentajat, online PTs, hybrid coaches, and small coach studios. Two arrival shapes share one site:

- **Greenfield coaches** running clients on Excel, WhatsApp, and email who haven't yet picked a platform.
- **Migrating coaches** already on another coaching app (Trainerize, TrueCoach, Everfit, kotimaiset kilpailijat) who are evaluating a switch.

They read in Finnish, on laptop or phone, in a few minutes between sessions. They are not impulse buyers — they evaluate carefully because the platform shapes how they deliver coaching for years. The site has to earn trust at first impression and then survive a calm, deliberate read.

Pricing positioning: fair and openly scalable — Gainly is not the cheapest, not premium-priced; it grows with the coach's roster without punishing growth.

## Product Purpose

The Gainly marketing site exists to convert serious Finnish fitness coaches into Gainly users. The conversion path is **sales-light, form-driven**: coach lands → reads → fills a contact form (the "Kokeile ilmaiseksi" / "Varaa esittely" CTAs) → the Gainly team manually provisions credentials → coach onboards into the product app.

Success means a coach finishes the page with three convictions: (1) Gainly is the most polished, native-feeling coaching tool they've seen — clearly built by people who actually train and coach; (2) the product solves real mid-workout, multi-client, offline-Finnish-gym problems their current setup does not; (3) it's worth a five-minute form to find out.

The site is not a self-serve signup funnel and not a demo-call qualifier. It is a brand-first conversion page whose job is belief, then action.

## Brand Personality

**Confident, expressive, native-feeling.**

- **Confident** — typography-led, declarative Finnish copy. No hedging, no SaaS-speak, no "we believe that…" mush. Headlines stand on their own.
- **Expressive** — the full neon rainbow (`#ff2d95` magenta, `#00f5ff` cyan, `#39ff14` green, `#8338ec` violet, `#ffd60a` yellow, `#ff6b00` orange) is the brand's primary voice on this surface. Spotlight beams, gradient text in headlines, conic-gradient reflections, scroll-driven phone/laptop reveals — all committed brand choices. The product app stays restrained; the marketing site is where the brand sings.
- **Native-feeling** — the site demonstrates the iOS-grade craft of the product. Editorial layout, motion easing on `[0.16, 1, 0.3, 1]` / `[0.22, 1, 0.36, 1]`, animated laptop opening, mobile screenshots tilted in 3D space, FlipWords cycling in heros, AnimatedHeading entrances. It feels like a product page Apple would build, in Finnish, for a coaching tool.

The marketing register is louder than the parent product PRODUCT.md on purpose. This is the one surface where design IS the product.

## Anti-references

- **Crypto/Web3 neon-on-black bro-tech** — Solana, cyberpunk launch pages, NFT marketplaces. We share the dark-mode-plus-neon palette but never the energy: no glitch text, no "to the moon" hustle, no anime-edgy fonts, no holographic foil. The neon is editorial and earned, not edgy and shouted.
- **Generic Stripe / Linear / Vercel-clone SaaS landing** — soft pastel gradients, identical card grids, hero-metric block, "trusted by these logos" strip, "built for modern teams" subhead. Gainly is not a category default.
- **American big-box gym aesthetic** — Crunch, LA Fitness, F45. High-saturation primary reds, stock photos of athletes flexing, hustle-culture all-caps copy, "GRIND. SWEAT. REPEAT." energy. Gainly sells to professional coaches, not gym chains selling memberships.
- **Generic consumer fitness apps** — MyFitnessPal, Strava, Fitbit landing pages. Mass-market consumer tone, gamified streak language, "your daily steps" framing. We sell to the coach, not to the gym-goer.
- **Sterile medical / clinical software** — inherited from parent PRODUCT.md. No patient-portal greys, no warmth-free screens.
- **Cheap or templated** — inherited from parent. No Bootstrap, no obvious off-the-shelf theme, no lazy spacing. Every section reads as hand-built.

## Design Principles

1. **Neon earns, never decorates.** Even on the brand surface where the rainbow is the voice, each saturated color is doing a job: spotlight beam, conic reflection beneath a device, glow tracing an active feature row, halo behind a phone. It is *editorial neon*, not wallpaper. If a neon glow doesn't anchor an element or direct the eye, it shouldn't be there.
2. **Show the product, don't describe it.** Real screenshots of the actual app inside an animated laptop. Real iPhone mockups for client-side features, tilted in 3D, halo-lit. Testimonials in Finnish from real-shaped coach roles (Voimaharjoitteluvalmentaja, Online PT, Hybridivalmentaja, Voimanostotiimi). Trust comes from specificity, not from claims.
3. **Editorial cadence, not a card grid.** Sections lead with a small tracked uppercase kicker (Miksi Gainly / Asiakaspuoli / Valmentajan työkalut / Kokemuksia), a two-column heading + paragraph split, then a distinctive showcase per topic — scroll-driven laptop on benefits, sticky phone + ribbon on client features, animated infinite cards for testimonials. Variety is the rhythm. Identical cards would betray the brand.
4. **Finnish first, written like a thinking coach.** Copy lands in Finnish. Headlines balance with `text-wrap: balance`, run no longer than two lines, and trust the reader. "Valmenna asiakkaita, älä taulukoita." beats any English bullet list. English locale ships later without rewriting the layout.
5. **Native-app motion in a webpage.** The motion vocabulary is the product app's vocabulary turned outward — iOS easing curves, springs on press, lid-opening laptops, screen-power-on glare, halo crossfades. Every animation enhances an already-visible default and respects `prefers-reduced-motion`. The site never gates content on a scroll trigger.

## Accessibility & Inclusion

- **Finnish first, English locale planned.** Layout, components, and copy length budgeted so an `en` locale slots in without rework.
- **WCAG AA across the board.** Body text ≥4.5:1, large text ≥3:1, including muted (`text-white/60`, `text-white/40`, `text-muted-foreground`) and placeholder text on tinted near-black surfaces. The white-over-near-black combo passes; the white/40 over neon-glow regions needs auditing case-by-case.
- **Motion-rich is intentional, not a violation.** Every animation — Spotlight, FlipWords, AnimatedHeading, Boxes, InfiniteMovingCards, BenefitsSection scroll-driven reveal, LaptopMockup lid-open, MobileScreenshot tilt — has a `prefers-reduced-motion: reduce` alternative that either disables the entrance or replaces it with a crossfade. The site is fully readable, fully linkable, and fully converts with motion off.
- **Color is never the only signal.** Active feature rows pair neon glow with index number, larger title color shift, scaled-up icon, and a slide. Status hues in screenshots inherit the parent product's status-color lock (icon + label + color, never color alone).
- **Touch targets ≥44px** on mobile CTAs (hamburger button is 48×48, primary CTA pill pad ≥40px tall).
- **Reduced-zoom safe.** The root document applies a viewport-width-based zoom only between 1024-1728px; under 1024px native responsive breakpoints take over so mobile text remains user-scalable.
