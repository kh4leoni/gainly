# Product

## Register

product

## Users

Two roles, one relationship.

- **Clients** — people training under a coach. Primarily on mobile, often mid-workout in a gym (poor signal, sweaty hands, one-handed), or checking meals/programs/messages on the go. They want to log sets fast, see what's next, and feel their coach is present. The client surface is an installed PWA that must work offline.
- **Coaches** — strength/fitness professionals managing a roster of clients. Mostly on desktop/laptop. They build programs, monitor compliance and PRs, review logs, and message clients. The coach surface is a dense, efficient dashboard where speed and at-a-glance status matter.

Primary language is Finnish (valmentaja = coach, asiakas = client).

## Product Purpose

Gainly is an AI-first digital coaching PWA that connects coaches to their clients. It replaces spreadsheets, generic gym apps, and scattered chat with one tool: coaches program and track, clients log and follow, both communicate in context. Success is a client who logs every workout without friction (even offline) and a coach who can run a larger roster without losing the personal feel of 1:1 coaching.

## Brand Personality

Mostly black, app-like, premium. The base is near-black and quiet; **color is the secondary voice** — a full rainbow of saturated accents used deliberately (pink #FF1D8C as the co-brand signature, plus semantic greens/oranges/violets/teals for status, PRs, and data). Smooth continuous (squircle) corners and iOS-grade motion are core identity, not decoration.

Three words: **confident, expressive, polished.** It should feel like a native iOS app a serious athlete is proud to open — restrained where it carries data, alive where it celebrates progress.

The two shells differ on purpose: the client app is dark, immersive, and motion-rich; the coach dashboard is lighter and information-dense. Both share the same shape language, accent system, and craft bar.

## Anti-references

- **Sterile medical / clinical software** — cold grays, no warmth, no brand, hospital-EMR energy. Gainly is performance and progress, not a patient portal.
- **Cheap / templated** — Bootstrap defaults, obvious off-the-shelf theme, low-craft spacing and type. Every screen should read as hand-built.
- Also avoid: generic SaaS card-grid dashboards with the gradient hero-metric template; neon-on-black gym-bro badge-spam.

## Design Principles

1. **Black base, color earns its place.** The surface is near-black/neutral; saturated color marks meaning — status, PRs, the co-brand accent — never decoration. Rainbow as a system, not a gradient.
2. **App, not website.** Native-app feel is the bar: squircle corners, iOS easing, press feedback, splash, offline-first. If it feels like a web page, it's wrong on the client surface.
3. **Mid-workout reality wins.** The client flow is designed for a thumb in a gym with bad signal. Fast logging, offline durability, and obvious next-action beat density and chrome.
4. **Coach sees status at a glance.** The coach surface optimizes for scanning a roster — compliance, PRs, who needs attention — before drilling in. Information density with clear hierarchy.
5. **Motion celebrates, never blocks.** Expressive iOS-grade motion is part of the identity (PR toasts, entrances, springs), but it always enhances an already-visible default and respects reduced-motion.

## Accessibility & Inclusion

- **WCAG AA** for contrast across both shells — body text ≥4.5:1, large text ≥3:1, including muted text on tinted near-black/near-white surfaces.
- **Motion-rich is intentional**, not a violation: the expressive iOS motion stays, but every animation has a `prefers-reduced-motion: reduce` fallback (already wired globally in `globals.css`).
- Don't rely on color alone for status (the rainbow accents) — pair with icon, label, or shape so colorblind users and the coach roster scan correctly.
- Touch targets ≥44px on the client app (iOS standard, already used in `.ios-group-row`).
