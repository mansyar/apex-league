# Spec — Evolution I: Juvenile Stage

**Track ID:** `evolution_juvenile_20261011`
**Type:** Feature (Phase 1 MVP) · **Status:** approved 2026-10-11

## Overview

Creatures currently stay babies forever. This track lands the first evolution
step: Baby → Juvenile, driven by age *and* care quality, with a visually
progressive transformation that preserves the individual's identity while
adding a per-archetype defining feature. Champion stage and branching are
explicitly deferred.

Design frame: each creature has two visual DNA layers.

1. **Identity layer (never changes):** body plan, snout shape, horn
   shape/position, tail, palette family — all derived from the creature's
   seed. Same individual, same breed.
2. **Stage layer (changes per stage):** stage-gated signature features plus
   proportion/scale maturity.

The defining feature is **additive, and the baby does not have it yet** — so
the juvenile is neither "a bigger baby" nor "a different breed," but the same
creature grown into something new.

## Functional Requirements

### R1 — Evolution trigger (sim, deterministic)

- A baby creature evolves to **juvenile** during nightly settlement when:
  `day ≥ 10` **and** the care gate passes: **no sickness onset in the last 3
  settled days** and **mood ≥ 40** at settlement.
- If the gate fails, evolution is re-checked each subsequent night until it
  passes (neglect delays growth; it never blocks it forever — the mood floor
  and sickness recovery make the gate always eventually passable).
- Pure function: `evaluateEvolution(state) → { evolved: boolean, reason }`;
  consumed by `settlement.ts`.

### R2 — Juvenile stat growth

- On evolution: **HP +3, ATK +2, DEF +2, SPD +1** (applied to the rolled
  base, capped by existing bounds). Effective stats pick it up through the
  existing `effectiveStats` path.
- The boost applies before any same-night training/cup resolution
  (settlement order documented in code).

### R3 — Move kit gate change

- Juveniles unlock **tier-3 moves immediately at evolution**; tier-4 still
  requires 6 trained days. Rule: tier 3 unlocks at
  `max(evolution day, 3 trained days)` — training remains meaningful but
  evolution is a real milestone.
- Loadout picker rows reflect the new unlock (existing kit-gate helpers
  extended, not duplicated).

### R4 — Juvenile voxel build (pipeline, deterministic)

- Juvenile mesh is **derived from the creature's existing seed**: identity
  layer (horn shape, snout, body plan, palette family) unchanged.
- **Stage layer:** one new **per-archetype signature part**, seed-derived and
  stage-gated:
  - **Drake:** horn nubs break through on the head.
  - **Bovine:** brow ridge develops into small horn bases.
  - **Axolotl:** external gills branch outward (second frill set).
- **Proportions:** subtle maturation within existing archetype bounds
  (slightly longer legs, relatively smaller head); the existing
  proportion-budget audit must pass for stage variants.
- **Scale:** baby renders at **0.6× world scale**, juvenile at **1.0×**
  (client-side holder scale — respecting the rig-units contract in
  `conductor/learnings.md`).
- Palette: same hue family; juvenile shifts value/saturation modestly toward
  "adult" coloring.
- Generator runs at runtime in the browser (same pure pipeline as existing
  builds); **determinism gate extended** to hash stage-variant GLBs as new
  committed artifacts.

### R5 — Evolution moment (client)

- On the first day-start after evolution, the ranch plays an **evolution
  ceremony**: creature walks to center, a brief glow/scale-up sequence (new
  mesh swap), coach-voice callout announcing the new stage and stat gains.
- Honors reduced motion (both OS media query and in-app preference): instant
  swap + callout, no animation.
- Ceremony is non-interactive but does not block HUD input (consistent with
  the feeding-ceremony learnings).

### R6 — HUD & hints

- Nameplate shows a stage badge (Baby/Juvenile); stat row reflects the boost.
- From day 5, a coach-voice **hint line** appears: growth is coming if care
  stays good (product doc: "hints shown, thresholds discovered" — the exact
  threshold is not revealed).

### R7 — Save v6

- Adds `stage` and evolution bookkeeping (gate inputs derived from existing
  history where possible).
- Migration v5→v6: existing creatures stay babies with correct gate
  bookkeeping (age derived from the current day).

## Non-Functional Requirements

- All sim logic pure, seeded, DOM-free; new tests keep the suite < 10s.
- `gate:determinism` extended and green; `bun run verify` green.
- No per-frame allocations added in render loops.

## Acceptance Criteria

1. Fresh run: baby evolves on the night of day 10 with good care; ceremony
   plays; stats/HUD/kit update.
2. Neglected creature (starving/sick near day 10): evolution delayed until
   the gate passes; no soft-lock.
3. Juvenile build: visibly larger, new signature part, identity features
   preserved; determinism gate passes.
4. An existing v5 save loads as v6 without loss; evolution then proceeds
   normally.
5. Reduced-motion users get the instant variant.

## Out of Scope

- Champion stage, branching evolution, evolution-threshold *discovery* UI
  beyond the one hint line, breeding/inheritance, new species, cup/rival
  balance rebalance, save export/import.
