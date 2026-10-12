# Spec — Broadcast HUD Overhaul

## Track

- **ID**: `broadcast_hud_20261011`
- **Type**: Feature (UI/UX overhaul with an internal refactor component)
- **Status**: new

## Overview

Apex League's fantasy is a sports broadcast, and its arena + cup surfaces already
speak a committed broadcast language — skewed placard plates (`skewX(±14°)`),
clip-path chamfers, tab-and-headline headers, element crests, damage-lag HP bars,
verdict stamps, ticker lines. The ranch HUD, Spar panel, and starter overlay
still speak an older "flat translucent panel" language (rounded rects, no motion,
no crests), so the game reads as two different products.

This track unifies every UI surface on **AAA-grade broadcast presentation**:
anchored corner clusters with a clear center, layered chamfered plates, one hero
element per cluster, weighty motion, and a **shared component kit** so all
surfaces (ranch, spar, cup, arena chrome, starter) are built from the same
primitives. It is presentation-only: the simulation, save schema, and gameplay
behavior are untouched.

## Design decisions (agreed)

| Decision | Choice |
|---|---|
| Layout | **AAA corner clusters** — score bug (top-center), creature lower-third (bottom-left), command dock (bottom-right), chip family (top-right); center always clear |
| Scope | Reskin + layout rethink; ranch HUD, Spar panel, starter overlay rebuilt; cup overlay + battle HUD chrome adopt the kit (visual only) |
| Component kit | `ui/` DOM factory helpers (e.g. `ui.plate()`, `ui.chip()`, `ui.meter()`) + shared kit CSS classes; no UI framework, no new deps |
| Motion | Weighty broadcast motion (entrance settles, AP-pip spend flash, bar change feedback, status swap-ins, hover/press micro-feedback) — all behind the existing reduced-motion setting + OS `prefers-reduced-motion` |
| Typography | System-ui only; broadcast feel via uppercase, letter-spacing, weights, tabular numerals |
| Panel texture | **Amend product-guidelines**: subtle `backdrop-filter: blur()` scrim behind plates for legibility over the 3D scene |
| Element crests | Draw all 6 (fire/plant/water exist; add electric/earth/wind) in a shared module |
| CSS structure | Split the 1,813-line `style.css` into kit.css + per-surface files (ranch / spar / cup / starter); Vite bundles them |
| Condition display | All five condition bars stay always-visible in the lower-third |
| Design gate | **Mock-first**: a committed dev page (`/mock.html`, following the gallery/preview convention) presents the new HUD for user approval before any wiring |

## Functional requirements

1. **FR1 — Shared UI kit**: a `ui/` module (element factories) + kit CSS defines
   the primitives: plate, chip, button, tab, meter, bar, stamp. All rebuilt
   surfaces consume the kit; cup overlay + battle HUD chrome adopt kit classes
   without behavior change.
2. **FR2 — Ranch HUD rebuild** (AAA corner clusters):
   - **Score bug** (top-center): hero day numeral, phase tab, AP as a segmented
     chamfered meter with spend flash, lifetime trophy tally.
   - **Creature lower-third** (bottom-left): element crest + name plate + stage
     tab, stat cells with `+N` trained chips, five condition bars with glyph
     labels and change feedback, status line presented as the announcer ticker.
   - **Command dock** (bottom-right): chamfered care plates (glyph + AP badge +
     rejection reason), train control with an inline picker styled like the cup
     kit list, **Advance Day** as the gold CTA.
   - **Chip family** (top-right): Spar / Cup / Motion chips share one design.
3. **FR3 — Spar panel**: kit picker, loadout rows, and battle log restyled on
   the kit (no interaction change).
4. **FR4 — Cup + arena chrome**: bracket, coach room, results, placard, and
   lower-third adopt kit classes; layout and behavior unchanged.
5. **FR5 — Starter overlay**: rebuilt in the dome/broadcast language.
6. **FR6 — Motion system**: entrance settles on screen transitions, state-change
   feedback (AP spend, condition deltas, status swaps), hover/press
   micro-feedback; every animation honors reduced motion.
7. **FR7 — Shared crest & hue module**: extract `CREST_GLYPHS` (battleHud.ts)
   and the element-hue table (staging.ts vs cup.ts — fallbacks disagree, 40 vs
   200) into one shared module; draw electric/earth/wind glyphs.
8. **FR8 — CSS split**: `style.css` replaced by kit.css + per-surface files.

## Folded-in fixes (found during analysis)

- Remove the dead "Coming soon" starter ribbon (all starters available).
- Trophy banner: replace the silent ×5 emoji cap with a designed tally (`🏆 × N`).
- Replace the hardcoded `${3 + 1}` AP copy (cup.ts results) with derived
  constants (`ACTION_POINTS_PER_DAY` / cup bonus).
- Single source of truth for element hues/crests (FR7).

## Non-functional requirements

- **Sim untouched**: no changes to `@apex/sim` logic, no save schema change
  (stays v6). The only sim-adjacent touch is reading existing values.
- **No new dependencies, no UI framework** (tech stack: DOM/CSS overlay).
- `bun run verify` stays green; existing HUD copy tests preserved/extended.
- A11y preserved and extended: aria-live on announcer/status, labeled buttons,
  visible focus states; no animation without a reduced-motion fallback.
- Performance: no per-frame allocations added; existing RAF loops unchanged;
  kit factories run at build time, not per frame.
- All copy stays coach-voice, ≤ 2 sentences, never punishing (product guidelines).

## Acceptance criteria

1. Mock dev page (`/mock.html`) presents the new HUD (all clusters, kit
   primitives, motion notes) and is **approved by the user before wiring**.
2. All five surfaces (ranch HUD, Spar, cup, arena chrome, starter) visually
   share the kit; no legacy rounded-rect language remains.
3. Motion behaviors present and correctly muted under reduced motion.
4. All 6 element crests render; hue/crest lookups resolve from one module.
5. Folded-in fixes landed (ribbon, trophy tally, AP copy).
6. `bun run verify` green; per-surface manual verification noted in the track.
7. product-guidelines.md amended for the backdrop-blur scrim.

## Out of scope

- Mobile / responsive pass (roadmap Phase 4); desktop widths only.
- Audio, i18n, theming, gameplay or sim changes, ladder/progression logic.
- Arena/cup *layout* redesign (only kit adoption), battle mechanics, save v7.
- Playwright smoke tests in CI (candidate for a later hardening track).
