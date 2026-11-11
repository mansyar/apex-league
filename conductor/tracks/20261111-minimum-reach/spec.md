# Minimum Reach — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Long moves currently reach everywhere. `reachesBody` (`contact.ts:149`) and
`inReach` (`controller-moves.ts:100`) are one-sided maximums, so every special
is legal at every gap and `chooseMove` simply takes the highest-power move that
reaches. Authored reach runs 3,800–6,500 mm inside an 8,000 × 6,000 mm arena,
and the innate basic is the only 420 mm row. There is no space a fighter can
stand that denies a long move.

This track adds an authored **minimum reach** per row: a blow or shot only
connects when the centre gap is inside
`[minReach + both radii, reach + both radii]`. Inside that inner edge is the
blind spot. Because hit geometry changes, the track ships with the balance pass
the roadmap requires, not as a presentation tweak.

## Problem / Motivation

Spacing has no defensive meaning. Doctrine bands decide where a fighter *wants*
to stand, but nothing punishes standing in the wrong place: closing inside a
finisher's arc costs the attacker nothing. The roadmap's Phase 2 follow-up #4
names this as the missing piece — "long moves need a blind spot, but it changes
outcomes, so it ships with the balance track alongside."

## Goals & Success Metrics

- **Goal:** every long move (reach ≥ 5,000 mm) has a real blind spot; the innate
  basic is the universal close-range answer.
- **Metric:** a point-blank long move whiffs with a distinct `range` reason;
  `bun run balance` exit 0 with all 15 rows green; `bun run telemetry` exit 0 at
  14/14 including the new dead-zone bound; replay hash stable per seed.

## Scope

### In Scope

- `FrameData.minReachMm` (authored integer, `0` = no dead zone) plus the
  validator rule `0 ≤ minReachMm < reachMm`.
- First pass: every row with `reachMm ≥ 5000` gets `minReachMm = 1200`; every
  row below stays `0`. The innate basic stays `0`.
- One interval test shared by melee strikes, projectiles, and the move chooser.
- A distinct miss signal (`reason: "range"`) for both strikes and shots that
  fail only the inner edge.
- Controller: `chooseMove` and the punish chooser filter on the interval; a
  point-blank fighter falls back to the basic. No new retreat logic.
- `SIM_VERSION` 2 → 3, with the ghost doc comment and pins updated.
- Balance pass: tune `minReachMm` first, species stats only if that cannot
  restore the gate.
- Telemetry: one new gated metric (dead-zone whiff share) alongside the
  existing 13.
- Presentation: the tell wedge draws its inner edge from `minReachMm`.

### Out of Scope

- Verticality, jumping, airborne bodies.
- Blocking, parries, ring-out.
- Exploiting the blind spot defensively (holding *inside* the foe's dead zone):
  the threat model stays conservative — it treats the whole disc as dangerous.
- Retreat-to-fire spacing AI.
- New moves, species, doctrines, or elements.
- Any widening of an existing bound, floor, tolerance, or `DISTINCT_FLOOR`.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `FrameData` carries `minReachMm`; the validator rejects `minReachMm < 0` or `minReachMm ≥ reachMm`; the basic strike is 0. | Must |
| FR-2 | A melee strike connects only when the centre gap lies inside `[minReach + r₁ + r₂, reach + r₁ + r₂]`; inside the inner edge it whiffs. | Must |
| FR-3 | A shot hits only when the swept contact point is at least `minReach + r₁ + r₂` from the shooter's origin; inside it the shot passes and is spent. | Must |
| FR-4 | `chooseMove` and the punish chooser reject a move whose interval excludes the current gap; the basic is the fallback. | Must |
| FR-5 | A strike or shot that fails only the inner edge reports a distinct `range` miss, never `accuracy` and never a dodge. | Must |
| FR-6 | The gate is green on the final tree: 15/15 species, pacing, bosses and damage band all pass. | Must |
| FR-7 | Telemetry gains one gated dead-zone metric with headroom; the existing 13 bounds are unchanged. | Must |
| FR-8 | `SIM_VERSION` is 3, with `ghost.ts`'s version note and `ghost.test.ts` pins updated. | Must |
| FR-9 | The tell wedge shows the inner dead-zone edge derived from the same authored data. | Should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic only; no new RNG draw; same seed → same hash and event sequence. |
| NFR-2 | No existing bound, floor, tolerance or `DISTINCT_FLOOR` is widened; the new telemetry bound is additive. |
| NFR-3 | The full suite stays inside the 150 s phase budget. |
| NFR-4 | No new stream field beyond what the existing event vocabulary already carries. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `frames.test.ts` proves every `reachMm ≥ 5000` row has `minReachMm = 1200`, every row below is `0`, and no row violates `0 ≤ minReach < reach`. | FR-1 |
| AC-2 | A melee test lands at exactly `minReach + radii` and whiffs one millimetre inside it, with `reason: "range"`. | FR-2, FR-5 |
| AC-3 | A projectile test fired at a target inside `minReach` reports a `range` miss, not a hit and not a dodge; the same shot at the boundary hits. | FR-3, FR-5 |
| AC-4 | `chooseMove` at a point-blank gap returns the basic, and returns a long move at the same gap once the foe is outside its dead zone. | FR-4 |
| AC-5 | `bun run balance` exits 0 with all 15 species inside the statistical bound; no existing bound moved. | FR-6, NFR-2 |
| AC-6 | `bun run telemetry` exits 0 at 14/14, printing the dead-zone share with visible headroom. | FR-7 |
| AC-7 | `ghost.test.ts` pins `SIM_VERSION === 3` and `SIM_VERSION + 1 === 4`; `bun run trace --seed N --check` passes. | FR-8, NFR-1 |
| AC-8 | The wedge's inner radius equals `tellInnerWorld(minReachMm, radiusMm)` and never exceeds its outer radius. | FR-9 |

## Edge Cases

- **Gap changes during startup:** a fighter commits outside the dead zone and
  the foe closes inside it before the active window — the swing whiffs.
  Expected, and exactly what the dead-zone metric counts.
- **Mutual clinch:** both sides inside each other's dead zones → basic-only
  exchange. The existing `contactShare ≤ 0.7` bound guards against it becoming
  the whole fight.
- **Mid rows and the basic:** reach < 5,000 keeps `minReachMm = 0`, so
  close-range play never becomes move-starved.
- **Tuning direction:** if 1,200 mm breaks pacing, move the number (one knob,
  all long rows) before touching stats; if a row still misses, stats move inside
  their existing roll bounds.
- **Old ghosts:** bundles at v2 stop verifying and skip replay, which is the
  version's designed behaviour.

## Dependencies

- **Tracks:** none; base is `main` @ `e9a0f4b8`, every prior track merged.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** one uniform 1,200 mm value for all long rows is tunable
  enough; if the gate disagrees, the value moves before per-row values are
  considered.
- **Assumption:** the basic strike (420 mm) is the intended close-range answer,
  so no row needs a dead zone smaller than the basic's reach.
- **Assumption:** the tell wedge can draw an inner edge without a stream change,
  because `minReachMm` is authored data the client already imports.

## References

- `conductor/product.md` — Phase 2 battle follow-up #4 (minimum reach / dead
  zones).
- `conductor/archive/20261111-kite-verdict/` — the last outcomes-changing
  track.
- `packages/sim/src/battle/frames.ts` — the authored table this track extends.
- `packages/sim/src/battle/continuous/contact.ts` — `reachesBody`, the
  one-sided test being widened to an interval.
- `packages/sim/src/battle/continuous/controller-moves.ts` — the chooser that
  must learn the inner edge.
- `packages/sim/scripts/battle-balance-report.ts` and
  `packages/sim/scripts/battle-telemetry.ts` — the gates.
