# Element Chart & Battle Length

**Type:** feat · **Status:** new · **Branch:** `track/element_chart_20261016`
**Base:** `track/silver_ladder_bosses_20261016 @ cb6d402` (stacked — shares the boss-balance probe instrument)
**Created:** 2026-10-16

## Overview

The current 2/1·1/2 type chart is a 4× effective swing that makes cross-element
fights binary (measured 2026-10-16: 0%/100% at every training level) and turns
element matchups into a lottery in ordinary cups — a big share of the 52%
early-exit rate at trained+2. This track softens the factors to a probe-tuned
symmetric pair and lengthens battles via a **global** HP redefinition, so a
type-disadvantaged player can *grind* through a fight with training
investment while type advantage stays meaningful. The elemental triangle
shape is unchanged; typing stays species-level.

## Decisions

1. **Keep both advantage and disadvantage** multipliers (symmetric pairs);
   sweep candidates (3/2·2/3, 4/3·3/4, 5/4·4/5) and pin the winner by probe.
2. **Global HP ×2**: species `statBounds.hp` doubles (fire 76–92, plant
   88–104, water 80–96); every consumer adapts — effective stats, RIVAL_RAMP
   clamps, ladder identity seeds, legacy stat-floor inheritance, evolution
   bumps, HUD plates.
3. **Trained HP scales +2/day** (cap +12) so training HP keeps its relative
   value; other stats stay +1/day (cap +6).
4. **Battle tick cap scales proportionally** with the HP scale (e.g. 2× HP →
   ~80 ticks); the 20% draw ceiling holds.
5. HP scale magnitude is **probe-tuned** (sweep 1.5×/2×/3×; start at 2×).
6. Longer arena playback is **accepted as-is** — no client pacing work in
   this track.
7. Save **v12**: migration doubles saved creature HP *and* in-flight cup
   session slot stats (and lineage/HoF records), so mid-cup saves stay
   coherent; validators accept the new bounds.
8. Battle transcript goldens re-golden in **one commit** with a mapping note;
   no behavior edits alongside.
9. The parked boss track resumes Phase 3 after this track lands, re-deciding
   boss milestone mapping on fresh probe data.

## Functional Requirements

- **FR1** — `chart.ts` `typeFactor` uses the probe-pinned symmetric factor
  pair; triangle edges unchanged (fire > plant > water > fire).
- **FR2** — species HP bounds ×2; trained-HP rate +2/day (cap +12); other
  training economics unchanged.
- **FR3** — battle tick cap scales with the HP scale; the draw behavior
  remains a stall guard only.
- **FR4** — save v12 with migration (state creature ×2 hp, in-flight session
  slot stats ×2, lineage/HoF records ×2), validator updates,
  `docs/save-schema.md` updated.
- **FR5** — probe instrument: equal-stat cross-element sweep across factor
  pairs × HP scales × training levels; report mode emits markdown.
- **FR6** — tactics meta re-baselined: mirror bands unchanged
  (chart-invariant); cross cells and draw rates verified inside
  WIN_BAND/DRAW_CEILING or re-baselined with documented rationale.
- **FR7** — single re-golden commit for all battle transcript goldens with a
  mapping note; parked `test.failing` boss tripwires become `test.skip` with
  a pointer to the boss track's Phase 3 resume.

## Acceptance criteria (curve bands)

1. Equal-stat cross-element duels, disadvantaged side: **≥35% win rate at
   full training; ≤25% at trained+0** — for all six ordered starter pairs.
2. Mirror curves unchanged in shape (chart-invariant).
3. `bun run verify` green with determinism gate byte-identical (no voxel
   changes).
4. Save v12 round-trips and migrates v11 cleanly (including a mid-cup save).
5. Tactics probe green under re-baselined bands.

## Non-goals / Out of scope

Boss pins & milestone mapping (parked boss track), element triangle shape,
move-level typing, client pacing/playback work, Gold content, backend.
