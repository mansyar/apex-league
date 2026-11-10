# Battle Variance — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track widens per-seed fight variance so a 112-game species row produces at least half distinct fights (median across the roster at or above 56 of 112), making the printed 45-55% design band measurable. It honours the authored accuracy ladder as real probabilities, keeps the damage spread downward-only inside the 4-12% band, adds bounded seeded timing jitter and execution-only controller noise, and gives Kite a way to win — while keeping same-seed replays byte-identical and every pacing, cap, decisive, and damage bound green.

## Problem / Motivation

The balance gate is green but the roster is not balanced: three of fifteen species sit inside the printed 45-55% band and twelve outside, all passing only because 112 games resolve to 21-35 distinct fights (a 17-21 point interval). `MoveDef.accuracy` is transformed by `MISS_SCALE = 5`, so an authored 70 lands at 94% and an authored 100 never draws — the number on the card is not the probability. The damage spread is downward-only by design, and the controller is fully deterministic per seed beyond the seeded tiebreak, so rematches repeat rather than vary. Kite loses all six of its sampled fights. If this is not solved, every further roster re-tune tunes noise: a 26.8% row and a 55.4% row are indistinguishable inside a 24-28 point interval, and the gate certifies rows it cannot see.

## Goals & Success Metrics

- **Goal:** Half of all games are distinct fights.
- **Metric:** Median distinct across the fifteen species rows at or above 56 of 112, printed per row with its effective standard error.
- **Goal:** The accuracy number means what it says.
- **Metric:** An authored 70 lands near 70% over a large seeded sample; an authored 100 is a guaranteed connect consuming no RNG.
- **Goal:** Variance never breaks determinism.
- **Metric:** The same seed with the same sides replays byte-identically (events and state hash); different seeds produce different fights.
- **Goal:** Pacing, cap, decisive, and damage bounds hold.
- **Metric:** `bun run balance` exits 0 on cap share, decisive share, cap-win quality, median, p05, damage band, and all fifteen species rows; `bun run telemetry` holds 13/13.
- **Goal:** Kite can win.
- **Metric:** The doctrine probe records a non-zero Kite win share without a doctrine redesign.

## Scope

### In Scope

- Re-author the accuracy path so authored values are real probabilities (remove the `MISS_SCALE` transform; 100 stays a guaranteed connect).
- Bounded downward-only damage spread (no rolled hit breaches the 12% ceiling).
- Bounded seeded timing / cadence jitter.
- Execution-only controller noise: commit timing, dodge side, and punish-window variation that never changes doctrine bands, spacing, or strategy.
- Minimal Kite fix so it records wins (no doctrine redesign).
- Distinct-fight counting, interval reporting, and gate wiring (`DISTINCT_FLOOR` stays 12; `UNVERIFIED` still fails).
- Re-pins forced by the variance change, listed row by row.

### Out of Scope

- Doctrine redesign, new doctrines, new conditional rules.
- Roster stat / bounds re-tune beyond what Kite and the variance fix require.
- Narrowing the printed 45-55% band itself.
- Verticality, jumping, blocking, ring-out, cover, arcs, splash, shot-vs-shot.
- Minimum reach / sweet spots, animation mapping, stat-sheet unification follow-ups.
- Save-format change, new species / moves / elements, server / API changes.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Accuracy rolls honour the authored ladder: each attack below 100 rolls against its authored probability, and an authored 100 is a guaranteed connect consuming no RNG. | must |
| FR-2 | Damage spread stays downward-only: no rolled hit exceeds the 12% band ceiling on the base hit. | must |
| FR-3 | Per-seed timing jitter varies fight progression (cadence / commit phasing) while replaying identically on the same seed. | must |
| FR-4 | The controller varies execution per seed (commit timing, dodge side, punish-window use) without changing doctrine range bands, strafe intent, dodge policy, or move-selection strategy. | must |
| FR-5 | The standard matrix reports at least half distinct fights: median distinct across species rows is at or above 56 of 112. | must |
| FR-6 | Kite records a non-zero win share in the doctrine probe without a doctrine redesign. | must |
| FR-7 | The same seed with the same sides replays byte-identically (events and final state hash). | must |
| FR-8 | Pacing and band bounds hold: cap share at or below one in three, median inside 25-40 s, p05 at or above 8.00 s, decisive share at or above two in three, cap-win quality at or above two in three, damage band 49/49. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic only in the step function, one seeded RNG per fight, the RNG cursor mixed into the state hash, no wall clock, no `Math.random` / `Date`. |
| NFR-2 | The balance report stays headless and deterministic (byte-identical double resolve); the full suite stays inside the 150 s budget. |
| NFR-3 | New or changed sim / client modules stay under the 12 KB per-file guard; scripts stay under the 64 KB guard with no `src/` importing `scripts/`. |
| NFR-4 | No save-format change and no network / API change. |
| NFR-5 | Telemetry holds 13/13 on the shipped sample (cap 7/14 at its bound is acceptable and must not regress). |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | An authored 70 lands near 70% over a large seeded sample, an authored 100 never draws the RNG, and the ladder is strictly the authored probability. | FR-1 |
| AC-2 | No rolled hit exceeds 12% of the reference pool, and the band test holds 49/49 after the best roll. | FR-2 |
| AC-3 | Two different seeds on the same pairing produce different fights in a measured share of the matrix, and the report prints distinct counts with effective standard errors. | FR-3 |
| AC-4 | Doctrine range bands, strafe intent, and dodge policy are unchanged; only execution timing / side varies, and a test pins the band. | FR-4 |
| AC-5 | The report shows median distinct at or above 56 of 112, and fails naming the target when it is missed. | FR-5 |
| AC-6 | Kite wins at least one sampled fight in the doctrine probe, and no other doctrine goes to zero wins. | FR-6 |
| AC-7 | The same seed reproduces its events and state hash exactly, and accuracy misses appear as events with a reason. | FR-7 |
| AC-8 | `bun run balance` and `bun run telemetry` hold every pacing, cap, decisive, quality, and damage bound with no bound widened. | FR-8 |

## Edge Cases

- An authored 100 is a guaranteed connect and consumes no RNG; every row below 100 rolls.
- Cap fights share a duration but differ by HP margin: distinct counting keys on real final HP (`side.id ?? side.name`), never on display name alone.
- Mirror matches stay excluded from the species gate.
- The slow tank (`spd` 3-4) must still resolve: variance must not depend on speed or on winning the exchange rate.
- Telemetry cap share sits at 7/14 = 50.0%, exactly at its bound with zero headroom: variance must not push it over.
- The Kite fix must not zero out Press, Circle, or Counter in the same probe.
- `DISTINCT_FLOOR` stays 12: a row below the floor is reported `UNVERIFIED` and fails the gate.
- Re-authoring accuracy re-pins cup / client goldens: every forced re-pin is listed row by row, never silently absorbed.
- An all-knockout matrix leaves cap-win quality vacuously passing; a pure-cap sample reports 0.0% and fails the band.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** Half distinct (56 of 112) tightens the interval enough that the printed 45-55% band becomes reachable with later stat tuning, without demanding near-every-fight-distinct.
- **Assumption:** Execution noise plus real accuracy plus timing jitter suffices; the damage mean does not need to move.
- **Question:** Will real accuracy cost pacing headroom (previously measured at 15-20 points of cap share)? Measure it, report it as a finding, and do not widen a bound to fit.
- **Assumption:** Kite can win without a doctrine redesign — it lacks a tool (a way in), not a strategy.
- **Assumption:** The controller stabilises before any number is measured: doctrine bands, turn budgets, and `DECISION_MS` stay frozen unless a finding requires them.

## References

- `conductor/product.md`, `conductor/workflow.md`, `conductor/product-guidelines.md`, `conductor/tech-stack.md`
- `conductor/archive/20261109-battle-balance/spec.md` (variance debt, `MISS_SCALE` lever table, 21-35 distinct baseline)
- `packages/sim/scripts/battle-balance-report.ts` (matrix, distinct counting, `fightSignature`, `DISTINCT_FLOOR`)
- `packages/sim/src/battle/continuous/roll.ts` (`MISS_SCALE`, accuracy transform)
- `packages/sim/src/battle/continuous/controller*.ts` (doctrines, execution, strafe / dodge policy)
- `packages/sim/src/battle/continuous/balance-report.test.ts` (gate, `KNOWN_MISSES`, design-band misses)
- `packages/sim/src/battle/frames.ts`, `packages/sim/src/battle/moves.ts` (authored ladder)
