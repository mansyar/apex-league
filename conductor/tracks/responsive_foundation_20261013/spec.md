# Spec — Responsive Layout Foundation (`responsive_foundation_20261013`)

- **Type:** Feature (first slice of the roadmap's mobile-responsive pass)
- **Status:** New

## Overview

Make the entire client UI work on mobile (phone), tablet, and desktop. Today
the client is deliberately desktop-only: the codebase has zero
width/orientation breakpoints, fixed-width HUD plates collide under ~900px,
the starter grid overflows any phone, the cup screens scale their type with
`cqw` to ~3px on narrow viewports, and the arena camera crops fighters on
portrait screens. This track introduces a mobile-first breakpoint system and
fluid design tokens in the shared kit, then reflows every gameplay surface to
be usable at 390 / 768 / 1024 / 1280+ widths. Desktop polish is allowed but
conservative. Touch-input ergonomics (pinch-zoom, touch targets, hover
replacements) are a separate follow-up track.

## Background (evidence)

- **No breakpoints**: the only media queries in the codebase are two
  `prefers-reduced-motion` blocks (`cup.css:837`, `ui/kit.css:644`). No
  `@media (width)`, no orientation queries, no `safe-area-inset`, no `dvh`,
  no `clamp()`.
- **Ranch HUD collision**: `.creature-plate` fixed `width: 300px`
  (`ranch.css:126`) and `.command-dock` fixed `width: 328px`
  (`ranch.css:411`) pin to opposite bottom corners — they collide with each
  other and the top chips below ~900px. Only manual collapse toggles shrink
  them.
- **Starter grid overflow**: three `.starter-card { width: 190px }` in a
  non-wrapping flex row ≈ 602px minimum (`starter.css:48-75`) — overflows any
  phone; the starter choice is unreachable on mobile.
- **Cup screens**: sized in `cqw` container units with **no font floor** — at
  400px CSS width, `0.8cqw` ≈ 3px text. Rigid grids: `.cup-bracket
  { grid-template-columns: 1fr 1fr 0.72fr; width: min(92cqw, 1100px) }`
  (`cup.css:93-102`), `.cup-coach-body { grid-template-columns: 1fr 1fr 1fr }`
  (`cup.css:421-429`). `.cup-button` hardcodes `right: 110px` to clear the
  spar chip (`cup.css:850`).
- **Battle HUD**: `.spar-hud-top { width: min(86%, 980px) }` with a fixed
  110px center chip (`battle-hud.css:22, 200`); `.spar-hud-lower
  { max-width: 60% }` turns the announcer line into a sliver on narrow
  screens. `.spar-panel { width: 460px }` (`spar.css:19`).
- **3D**: canvas resize is aspect-aware (`scene.ts:1056-1064`) ✅, but arena
  framing is distance-based with no aspect compensation — portrait phones
  crop fighters. Pixel ratio is captured once at creation and never refreshed
  on resize/DPR change.
- Precedent: `broadcast_hud_20261011`, `hardening_20261011`, and
  `save_safety_20261012` specs all explicitly deferred "mobile/responsive
  pass" (roadmap Phase 4, `product.md:124`).

## Functional Requirements

### F1 — Breakpoint system & fluid tokens (`ui/kit.css`)

- Define the shared breakpoint tiers as documented tokens (CSS custom
  properties + a comment header): **base (mobile) / ≥480px (large phone) /
  ≥768px (tablet portrait) / ≥1024px (tablet landscape) / ≥1200px (desktop)**.
  Mobile styles are the default; each tier progressively restores the full
  layout.
- Introduce a fluid type/spacing scale with `clamp()` floors so `cqw`-based
  cup typography never drops below a readable minimum (~12px body).
- Use `dvh` (with `vh` fallback) for full-height overlays and
  `env(safe-area-inset-*)` padding for notched devices.
- Keep all tokens on `:root`; no surface-specific values leak into the kit.

### F2 — Ranch HUD reflow (`ranch.css`)

- At base/phone: the creature plate and command dock **stack vertically at
  the bottom**; the dock's existing collapse toggles remain functional and
  plates default to collapsed state on narrow viewports.
- Top chip rows (day/AP, motion/camera/new-game) wrap instead of overflowing.
- Modals (`.kit-modal-box`, reset confirm) and onboarding callouts become
  full-width-minus-margin at phone widths.
- Desktop (≥1200px) keeps today's corner-pinned layout, modulo conservative
  polish.

### F3 — Starter choice (`starter.css`)

- The three-card grid wraps and scales down to fit a 390px viewport; each
  card stays a comfortable tap target. The dome/title reflows above it.

### F4 — Cup screens (`cup.css`)

- **Bracket (phone)**: scroll-first stacked layout — rounds become a
  vertically scrollable round-by-round column list, cards full-width; the
  bracket shape is not preserved at phone widths.
- **Bracket (tablet)**: 2-column round grid.
- **Coach room (phone)**: stacks kit → tactic → confirm vertically; each
  section keeps its existing component behavior.
- **Results / give-up modal**: reflow to single column; type floors applied.
- Corner chips (spar + cup buttons) stack or reposition without the hardcoded
  110px offset at narrow widths.
- Readable type floors over the existing `cqw` scaling; `container-type`
  stays.

### F5 — Battle HUD & spar panel (`battle-hud.css`, `spar.css`)

- `.spar-panel` becomes width-fluid below 520px (full-width-minus-margin).
- Battle placard/HP bars/announcer reflow: the top bar's center chip shrinks
  or hides gracefully; the announcer line gets a usable width at phone
  widths; lower-third clusters stack.
- The verdict stamp and battle log remain reachable and legible on phones.

### F6 — Arena camera & renderer (`scene.ts`)

- Portrait-aware arena framing: when the viewport aspect is narrower than the
  broadcast composition expects, compensate (FOV widening and/or radius
  increase) so both fighters stay framed; landscape keeps the current
  framing.
- Refresh `setPixelRatio` on resize (and DPR change) instead of capturing
  once.

## Non-Functional Requirements

- Presentation-layer only: no sim (`@apex/sim`) changes, no save-schema bump,
  no gameplay behavior change. Scene changes are camera/render plumbing only
  (digest-neutral — the determinism gate must stay green).
- Mobile-first CSS per F1; no new JS dependencies; no framework introduction.
- All new styles respect reduced-motion, aria conventions, and broadcast-kit
  patterns; the mock-first design gate (`/mock.html`) gains a responsive
  section demonstrating the kit breakpoints.
- Desktop (≥1200px) changes are conservative polish only (spacing/density/
  type-scale refinements from the token work — no desktop layout changes).
- `bun run verify` green; suite runtime unchanged.

## Acceptance Criteria

1. At 390×844 the full loop is playable: starter choice → ranch care → spar
   → cup → results, with no horizontal page scroll and no overlapping fixed
   plates.
2. At 768×1024 (tablet portrait) and 1024×768 (tablet landscape) every
   surface is readable and tappable; the ranch HUD uses its tablet
   arrangement.
3. At ≥1200px the ranch HUD, cup screens, and arena match today's desktop
   layout (conservative polish allowed; no layout re-architecture).
4. Cup bracket text is ≥12px at 390px width (container floors hold).
5. Rotating the device or resizing the window reflows every surface live;
   the arena keeps both fighters framed in portrait and landscape.
6. Reduced-motion and existing a11y behaviors (focus trap, aria-live, focus
   restore) still hold on the reflowed surfaces.
7. `bun run verify` passes; the determinism gate is byte-identical.

## Out of Scope

- Touch interaction pass (pinch-zoom orbit, touch-target sizing,
  hover-replacement for kit rejection reasons, `touch-action` tuning) — a
  follow-up track.
- Playwright/CI device-matrix screenshot harness — a follow-up track.
- Server sync, gameplay/sim changes, new features, save schema changes,
  audio.
