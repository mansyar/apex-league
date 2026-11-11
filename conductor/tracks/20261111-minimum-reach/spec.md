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
  basic is the universal close-range answer; a fighter that finds itself inside
  its own blind spot steps out of it instead of standing there.
- **Metric:** a point-blank long move whiffs with a distinct `range` reason;
  `bun run balance` exit 0 with all 15 rows green; `bun run telemetry` exit 0 on
  a sample large enough to measure pacing, including the new dead-zone bound;
  replay hash stable per seed.

## Scope

### In Scope

- `FrameData.minReachMm` (authored integer, `0` = no dead zone) plus the
  validator rule `0 ≤ minReachMm < reachMm`.
- The dead-zone value authored from measurement in the balance phase, not from
  a fixed first pass: every row with `reachMm ≥ 5000` gets one value, every row
  below stays `0`, and the innate basic stays `0`. The value is the first knob.
- One interval test shared by melee strikes, projectiles, and the move chooser.
- A distinct miss signal (`reason: "range"`) for both strikes and shots that
  fail only the inner edge.
- Controller: `chooseMove` and the punish chooser filter on the interval; a
  point-blank fighter falls back to the basic. A move is legal only when the gap
  **at its active frame** — the current gap plus the closing travel during its
  startup — lands inside the interval, so a fighter that commits while closing
  does not launch into its own blind spot.
- **Retreat-to-fight:** when no ready move's interval covers the current gap,
  the fighter steps back to the nearest gap at which a ready move lands rather
  than holding. This is the behaviour that keeps the doctrine hold point from
  deadlocking inside a dead zone (see Edge Cases).
- `SIM_VERSION` 2 → 3, with the ghost doc comment and pins updated.
- Balance pass: tune `minReachMm` first, species stats only inside their
  existing roll bounds.
- Telemetry: the sample is widened so `capShare` and its neighbours measure
  behaviour rather than a 14-fight coin flip, its bound values are re-derived
  from that sample with stated headroom and recorded before/after, and one new
  gated dead-zone metric is added.
- Presentation: the tell wedge draws its inner edge from `minReachMm`.

### Out of Scope

- Verticality, jumping, airborne bodies.
- Blocking, parries, ring-out.
- Exploiting the blind spot defensively (holding *inside* the foe's dead zone):
  the threat model stays conservative — it treats the whole disc as dangerous.
- New moves, species, doctrines, or elements.
- Any widening of an existing bound, floor, tolerance, or `DISTINCT_FLOOR` to
  hide a regression. The single exception is the telemetry sample and its
  re-derived bound values (FR-7), approved on 2026-11-12 because the shipped
  bound sat exactly on its measured value.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `FrameData` carries `minReachMm`; the validator rejects `minReachMm < 0` or `minReachMm ≥ reachMm`; the basic strike is 0. | Must |
| FR-2 | A melee strike connects only when the centre gap lies inside `[minReach + r₁ + r₂, reach + r₁ + r₂]`; inside the inner edge it whiffs. | Must |
| FR-3 | A shot hits only when the swept contact point is at least `minReach + r₁ + r₂` from the shooter's origin; inside it the shot passes and is spent. | Must |
| FR-4 | `chooseMove` and the punish chooser reject a move whose interval excludes the gap **at the move's active frame** (current gap plus closing travel during startup); the basic is the fallback. | Must |
| FR-5 | A strike or shot that fails only the inner edge reports a distinct `range` miss, never `accuracy` and never a dodge. | Must |
| FR-6 | The gate is green on the final tree: 15/15 species, pacing, bosses and damage band all pass. | Must |
| FR-7 | Telemetry's sample is widened enough to measure pacing (the shipped 14-fight sample sat exactly on its own `capShare` bound), its bounds are re-derived with headroom and recorded before/after, and one gated dead-zone metric is added. | Must |
| FR-8 | `SIM_VERSION` is 3, with `ghost.ts`'s version note and `ghost.test.ts` pins updated. | Must |
| FR-9 | The tell wedge shows the inner dead-zone edge derived from the same authored data. | Should |
| FR-10 | When no ready move lands from the current gap, the fighter steps back toward the nearest gap where one does, instead of holding still. | Must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic only; no new RNG draw; same seed → same hash and event sequence. |
| NFR-2 | No existing bound, floor, tolerance or `DISTINCT_FLOOR` is widened to hide a regression. The one approved exception is FR-7's telemetry sample and re-derived bounds, recorded with before/after figures and stated headroom. |
| NFR-3 | The full suite stays inside the 150 s phase budget. |
| NFR-4 | No new stream field beyond what the existing event vocabulary already carries. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `frames.test.ts` proves every row satisfies `0 ≤ minReach < reach`, the basic is `0`, and (in the balance phase) every `reachMm ≥ 5000` row carries the authored value while every shorter row stays `0`. | FR-1 |
| AC-2 | A melee test lands at exactly `minReach + radii` and whiffs one millimetre inside it, with `reason: "range"`. | FR-2, FR-5 |
| AC-3 | A projectile test fired at a target inside `minReach` reports a `range` miss, not a hit and not a dodge; the same shot at the boundary hits. | FR-3, FR-5 |
| AC-4 | `chooseMove` at a point-blank gap returns the basic, and returns a long move at the same gap once the foe is outside its dead zone; a move whose active-frame gap would fall inside the inner edge is refused even when the current gap is legal. | FR-4 |
| AC-5 | `bun run balance` exits 0 with all 15 species inside the statistical bound, and every moved figure is recorded. | FR-6, NFR-2 |
| AC-6 | `bun run telemetry` exits 0 on the widened sample, printing the dead-zone share and every re-derived bound with visible headroom. | FR-7 |
| AC-7 | `ghost.test.ts` pins `SIM_VERSION === 3` and `SIM_VERSION + 1 === 4`; `bun run trace --seed N --check` passes. | FR-8, NFR-1 |
| AC-8 | The wedge's inner radius equals `tellInnerWorld(minReachMm, radiusMm)` and never exceeds its outer radius. | FR-9 |
| AC-9 | With the dead zone authored, a full telemetry fight shows the fighter leaving its own blind spot and committing from a gap where the blow lands: commits stay above zero, `idleShare` stays inside its bound, and the `range` whiff share stays well under half of commits, with a test or trace proving the retreat order is what moved it. | FR-10 |
| AC-10 | The telemetry sample size, every re-derived bound, and the before/after values are recorded in the track's evidence, and the run reports visible headroom on each. | FR-7, NFR-2 |

## Edge Cases

- **Gap changes during startup:** a fighter commits outside the dead zone and
  the foe closes inside it before the active window — the swing whiffs.
  Expected, and exactly what the dead-zone metric counts.
- **Hold point inside the dead zone:** the doctrine bands hold near 1,088 mm. A
  dead zone wider than the basic's standoff makes every special illegal there
  while the basic is still too short, so without FR-10 the fighter stands and
  does nothing — measured at 1,200 mm as 100% cap, 79.1% idle, 0.3% contact.
  FR-10 is what makes a dead zone larger than ~200 mm playable at all.
- **Commit while closing:** a shot is judged on its launch gap, and the gap
  shrinks 150–700 mm between commit and launch at real closing speeds. Measured
  on the 42-fight sample: at 400 mm of dead zone, 31.4% of commits were `range`
  whiffs and `capShare` hit 92.9%, because the doctrine's ~946 mm preferred range
  is inside the inner edge once startup travel is counted. The chooser therefore
  judges the active-frame gap, not the current one (FR-4), and FR-10 backs off to
  the landing edge.
- **Mutual clinch:** both sides inside each other's dead zones → basic-only
  exchange. The existing `contactShare ≤ 0.7` bound guards against it becoming
  the whole fight.
- **Mid rows and the basic:** reach < 5,000 keeps `minReachMm = 0`, so
  close-range play never becomes move-starved.
- **Tuning direction:** the value moves before stats; if a row still misses,
  stats move inside their existing roll bounds.
- **Sample size:** a 14-fight sample cannot adjudicate an outcome-changing
  mechanic — 50 mm moved `capShare` from 7/14 to 10/14 while 400 mm moved it
  back to 10/14. The sample grows before the value is chosen.
- **Old ghosts:** bundles at v2 stop verifying and skip replay, which is the
  version's designed behaviour.

## Dependencies

- **Tracks:** none; base is `main` @ `e9a0f4b8`, every prior track merged.
- **External:** none.

## Open Questions & Assumptions

- **Decided 2026-11-12:** a real dead zone ships, which requires the telemetry
  sample fix (FR-7) and retreat-to-fight (FR-10). Both were previously out of
  scope; the user approved the expansion after Phase 2 measured that no positive
  value survives the frozen `capShare` pin.
- **Decided 2026-11-12 (second):** the unblock is a projection-aware chooser
  (FR-4 judges the active-frame gap), not a lift of the doctrine bands. Phase 4's
  sweep showed the doctrine hold point is inside the inner edge once startup
  travel is counted, so a chooser that only tests the current gap commits from
  where it cannot land; the bands themselves stay as the Kite verdict left them.
- **Assumption:** the basic strike (420 mm) is the intended close-range answer,
  so no row needs a dead zone smaller than the basic's reach.
- **Assumption:** the tell wedge can draw an inner edge without a stream change,
  because `minReachMm` is authored data the client already imports.
- **Open:** the final value is whatever the widened sample and the 840-fight
  roster gate both accept; 400–800 mm is the expected band from the Phase 2
  measurements.

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
- `conductor/tracks/20261111-minimum-reach/verification/phase-2.md` — the
  measured tuning curve behind the FR-7 and FR-10 decisions.
