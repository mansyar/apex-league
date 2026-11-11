# Band Margins — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track re-measures the roster balance gate on the current tree and hardens only what drift actually broke. Thin margins (plant_ox 46.4%, voltfox 45.5%) and the water_axolotl waiver are live debt; the roadmap forbids pre-emptive hardening, so Phase 1 measures first and the track closes with zero code change if the gate is green.

## Problem / Motivation

The balance gate passed with rows sitting 0.5–1.4 points inside the 45–55% design band, and water_axolotl outside it under a waiver. Relative-matrix drift since then (Kite lever, subsequent merges) may have pushed a row out of band or eroded a margin further. An unverified gate certifies nothing; an untouched-but-red gate blocks every later balance claim.

## Goals & Success Metrics

- **Goal:** every roster row inside 45–55% or under a written, re-confirmed waiver, with the gate green.
- **Metric:** `bun run balance` exit 0; margin test covers every row this track touches; water resolved (fixed or re-justified).

## Scope

### In Scope

- Re-measure the gate on the current tree (Phase 1); stop-if-green close with evidence only.
- Whole-band stat shifts for rows the re-measure finds broken (floor and ceiling move together, ceiling caps respected).
- water_axolotl: fix by stats first; renewed waiver with fresh justification only if ceilings block a fix.
- Extend the 0.46/0.54 inset margin test to every row this track moves.

### Out of Scope

- Kit, move-power, ladder, or damage-band changes.
- Pre-emptive moves of thin-but-green rows.
- Minimum reach / dead zones (separate roadmap item, ships with the balance track).
- New species, doctrines, or elements.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Re-measure the full balance gate on the current tree before changing anything. | Must |
| FR-2 | Fix each broken row with whole-band stat shifts that keep the row inside 45–55% with margin. | Must |
| FR-3 | Resolve water_axolotl: inside the band by stats, or under a renewed written waiver if ceilings block the fix. | Must |
| FR-4 | Extend the inset margin regression test to every row this track moves. | Must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No bound, floor, tolerance, or DISTINCT_FLOOR is widened to make a row pass. |
| NFR-2 | Every stat shift re-checks capShare, median, p05, decisive, damage band, bosses, and telemetry 13/13; a shift that breaks pacing is reverted. |
| NFR-3 | Full suite stays inside the 150 s phase budget. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `bun run balance` exits 0 on the final tree, or the track closed green-at-measure with the clean report on file. | FR-1 |
| AC-2 | Every row the re-measure found broken is inside 45–55% on the final tree, moved by whole-band shifts only. | FR-2 |
| AC-3 | water_axolotl is inside the band or carries a renewed written waiver naming the blocking ceiling and the re-check condition. | FR-3 |
| AC-4 | The margin test fails if any touched row regresses outside the inset. | FR-4 |

## Edge Cases

- Gate green at measure: track closes complete with zero production change; evidence records the clean report (explicitly not a failure to deliver).
- A row breaks mid-track from an unrelated merge: re-baseline, record, fix or carry as a named miss — never silently absorb.
- Water fix blocked by ceilings: waiver renewal comes back to the owner for confirmation before close.
- A stat shift fixes the row but breaks pacing: shift reverted, next candidate tried; pacing bounds are never the lever.

## Dependencies

- **Tracks:** none (all prior tracks merged; base is main).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the 112-game midpoint matrix is the drift measure; same sample shape as the re-tune tracks.
- **Assumption:** ceiling caps from the re-tune (fire_drake 15 highest starter, non-starter caps) still hold.

## References

- `conductor/product.md` — roadmap follow-up #3 (band-margin hardening).
- `conductor/archive/20261111-kite-verdict/` — Kite lever (latest pacing-affecting change).
- `packages/sim/scripts/battle-balance-report.ts` — gate, DISTINCT_FLOOR, margin test.
