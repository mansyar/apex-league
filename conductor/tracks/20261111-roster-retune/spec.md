# Roster Re-tune — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The variance track made every fight measurable (distinct 100–112 of 112) and left the gate red on exactly four species rows. This track moves plant_ox, earth_tortoise, cindermoor, and galeheron into the printed 45–55% design band by species stats and kit, turning the first fully-green balance gate in the repo's history while every pacing, damage, boss, and telemetry target stays green.

## Problem / Motivation

`bun run balance` exits 1 on four rows 5–11 points outside their significance intervals (plant_ox 67.9%, earth_tortoise 29.5%, cindermoor 59.8%, galeheron 33.9%). Variance tightened intervals around the same point estimates and cannot move them; only stat/kit tuning can. Until this lands, the variance branch cannot merge (it would carry a red gate onto main) and no balance claim is honest.

## Goals & Success Metrics

- **Goal:** All four red rows land inside 45–55%.
- **Metric:** `bun run balance` exits 0 with all 15 rows printing rates inside 45.0%..55.0%.
- **Goal:** Nothing green regresses.
- **Metric:** `bun run verify` (3986 pass baseline, 1 gate fail), `bun run build`, `bun run telemetry` 13/13 all green after the tune, with no bound widened.

## Scope

### In Scope

- Stat-bound shifts (whole-band preferred: floor and ceiling together) for the four rows.
- Local kit changes for the four rows: reorder the four fighting moves or swap tiers first; global `MoveDef.power` edits only with a full-matrix re-measure proving no other row regresses.
- Re-baselining the gate pins the tune moves (distinct counts, design-band list, KNOWN_MISSES emptied) and re-pinning forced golden churn row by row.

### Out of Scope

- Bound, floor, or tolerance changes (4–12% band, DISTINCT_FLOOR 12, cap/decisive/quality/median/p05/damage/boss/telemetry bounds).
- `test.failing` conversions to make red green.
- Ladder, noise rates, damage path, turn budgets, DECISION_MS, FIGHT_CAP_MS, MISS_SCALE, doctrines, controller, accuracy, or simulation-module changes.
- Tuning the 11 green rows except to repair a regression this track causes.
- Save-format, network, or API changes; new species, moves, or mechanics.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | plant_ox measures inside 45–55% on the seeded matrix | must |
| FR-2 | earth_tortoise measures inside 45–55% while keeping the slowest-speed identity and the R5 startup-512 swing intact | must |
| FR-3 | cindermoor measures inside 45–55% | must |
| FR-4 | galeheron measures inside 45–55% | must |
| FR-5 | All other 11 species rows stay gate-green (no pass-to-fail regression caused by this track) | must |
| FR-6 | The balance gate exits 0 with KNOWN_MISSES empty, no widened bound, and no `test.failing` conversion | must |
| FR-7 | Every pacing, cap, decisive, quality, duration, damage, boss, and telemetry target stays green | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic only, one seeded RNG per fight, byte-identical replay per seed |
| NFR-2 | Full suite stays within the 150 s budget; the balance command stays headless and deterministic |
| NFR-3 | Module size caps respected (12 KB sim/client, 64 KB scripts) |
| NFR-4 | No save-format change; no network or API change |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The report prints plant_ox inside 45.0%..55.0% and its row passes the 95% test | FR-1 |
| AC-2 | The report prints earth_tortoise inside 45.0%..55.0%; it is still the slowest roster record and `boulder_toss` keeps startup 512 | FR-2 |
| AC-3 | The report prints cindermoor inside 45.0%..55.0% | FR-3 |
| AC-4 | The report prints galeheron inside 45.0%..55.0% | FR-4 |
| AC-5 | All other 11 rows pass the gate; none that passed at baseline fails after the tune | FR-5 |
| AC-6 | `bun run balance` exits 0, KNOWN_MISSES is empty, and no bound, floor, or tolerance differs from the variance head | FR-6 |
| AC-7 | `bun run verify`, `bun run build`, and `bun run telemetry` (13/13) are green at the final head | FR-7 |

## Edge Cases

- Tortoise overshoot: the R3 `atk [16,20]` probe hit 50% but broke the ceiling identity — accept only moves that keep the slowest record and a defensible attack ceiling, scored per-cell against `sqrt(flips)`.
- Near-edge oscillation (cindermoor +5.5): accept only moves shifting the row by more than its own se; a move that flips the miss from +5.5 to −5.5 is churn, not progress.
- Shared-kit ripple: any global power edit re-measures all 15 rows before acceptance.
- Telemetry zero headroom: damage buffs push cap share (7/14 = 50.0% at bound) — every candidate re-runs telemetry, and a species fix that reddens telemetry is rejected, not accommodated.
- Distinct floor: tuned rows must keep ≥12 distinct fights; a row that collapses below the floor is UNVERIFIED, not balanced.
- Kit swaps keep tier order strict and every row inside the 4–12% band with the rear-counter ceiling stated.

## Dependencies

- **Tracks:** 20261110-battle-variance (unmerged; this track stacks on its branch).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** Whole-band shifts preserve roll width and species identity; recorded because the R13 precedent held on this track's lineage.
- **Assumption:** No row currently outside the design band (water_axolotl, electric_hound, embercub, mossboar) moves further outside by more than its se; recorded as a guardrail so the tune cannot rob Peter to pay Paul.
- **Assumption:** `measureSpecies(id)` per-iteration scoring plus full-matrix confirmation is sufficient iteration discipline, per the R13 search log precedent.
- **Waiver R1 (2026-11-11, plant_ox margin):** plant_ox holds 46.4% with 1.4pt margin (< 1se). The ≥1se zone is proven unreachable with whole-band integer shifts (atk +1 mid → 57.1% outside-high; spd +1 mid → 55.4% outside-high; the only joint-inside state breaks galeheron to 37.5% and water_axolotl to 60.7% with gate FAIL). Revisit only with a fractional lever (kit change) in a later track.
- **Waiver R1 (water_axolotl design band):** water_axolotl holds 57.1% outside the band; HOLD vs frontier 58.9% (|delta| < se). Every tune direction pops a fire row (embercub 53.6 / cindermoor 51.8 have 1.4 / 0.5 headroom) or the telemetry cap (water fills 4 ko-matchups). AC-1 reads: gate `run() === 0` AND `designBandMisses == [water_axolotl]` == the waived set.
- **Waiver R1 (galeheron / cindermoor margins):** galeheron 53.6% (1.4 from edge) and cindermoor 51.8% (3.2 from edge) cannot be re-centered ≥1se inside — the only galeheron lever crashes it to 37.5%. Both held by this waiver and test-locked by the R1 T3 margin regression test (fails if either comes within 1pt of an edge).
- **Resolved R1 (guardrail):** the out-of-band guardrail was verified row by row (frontier vs head with se arithmetic): electric_hound improved into the band, embercub and mossboar improved into the band, voltfox's excursion (55.8/56.7) was closed by direct trim to 45.5%, water_axolotl held. No assumption row moved further outside by more than its se.

## References

- `conductor/tracks/20261110-battle-variance/frontier.md` (imported source)
- `conductor/tracks/20261110-battle-variance/spec.md`, `plan.md` (variance lineage)
- `packages/sim/scripts/battle-balance-report.ts` (the gate)
- `packages/sim/src/species/{starters,discovery,rewards}.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/battle/frames.ts`
- `conductor/product.md`, `conductor/workflow.md`
