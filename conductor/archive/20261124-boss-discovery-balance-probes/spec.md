# Boss Discovery Balance Probes — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add a dedicated boss-balance probe for the nine breeding-discovery species that
do not yet have an authored-boss matrix. Reuse the shipped boss-probe
methodology, enforce fresh/cap gates where they are meaningful, and print a
deterministic measured report for every target species.

The track may include narrowly targeted balance tuning if the new gates fail,
but only inside the existing species/boss identities and only while every
pre-existing balance probe and pin remains green without modification.

## Problem / Motivation

`packages/sim/src/bosses.balance.test.ts` sweeps only `STARTER_SPECIES`. Separate
suites already cover the six reward lines and the three wave-4 discovery lines,
but nine discovery lines remain without authored-boss coverage:

- Wave 3: `voltfox`, `galeheron`, `shalemole`
- Later discovery wave: `dune_jerboa`, `spark_ray`, `gale_moth`, `thornvolt`,
  `siltback`, `emberwing`

The existing discovery kit suite checks sustained kit scores and sibling-duel
termination, not performance against the six authored bosses. This leaves a
concrete gap in the balance tripwire: a future data edit could make one of these
lines a fresh walkover or an uncounterable cap wall without failing a dedicated
boss probe.

## Goals & Success Metrics

- **Goal:** all nine uncovered discovery lines have deterministic authored-boss
  fresh/cap coverage and a measured four-level report.
- **Success:** the new probe passes; all existing balance suites and pins remain
  unchanged and green; any required tuning is minimal, evidence-backed, and
  recorded with before/after readings.

## Scope

### In Scope

- One new balance-probe test file for the nine named discovery species.
- The existing production battle path: `resolveBattle`, `battleSideForSlot`,
  `defaultLoadout`, and seeded creature construction.
- Fixed seed grid and training levels matching the existing boss probes.
- Fresh gate only for cells where the boss element is chart-advantaged into the
  challenger.
- Cap grindability gate for every target species against every authored boss.
- Opt-in measured report covering training levels `+0`, `+2`, `+4`, and `+6`.
- If and only if a new gate fails: minimal tuning of the nine discovery species
  or authored bosses within their existing identities.
- Verification evidence, integrated report, and dated documentation when a
  balance change lands.

### Out of Scope

- Re-probing starter, reward, or wave-4 species in the new file.
- Exact per-cell pins for the new probe; thresholds plus measured evidence are
  the approved contract.
- Editing or re-baselining any existing balance test or pinned tally.
- Type-chart, resolver, RNG, combat-mechanic, save, migration, acquisition,
  breeding, roster-membership, element, species-id, boss-id, branch, API, client,
  server, deployment, or dependency changes.
- New mechanics, moves, effects, or UI.
- Reopening D-1 or changing the matrix cap-share fence.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add a dedicated probe whose target roster is exactly the nine uncovered discovery species, with an explicit roster assertion that excludes starters, rewards, and the three wave-4 lines. | must |
| FR-2 | Reuse the shipped probe methodology: creature seeds `11,42,77,101,143,202`, battle seeds `11,29,47,53,71,89`, training levels `0,2,4,6`, player tactic `balanced`, production boss-side construction, and `resolveBattle`. | must |
| FR-3 | Enforce zero fresh wins only where the boss element is chart-advantaged into the challenger; electric, earth, and wind targets have no such boss cell and are cap-only. Enforce at least 35% player win rate at training cap for every target against every boss. | must |
| FR-4 | Provide an opt-in report mode that prints the complete nine-species × six-boss × four-training-level matrix with exact won/game tallies. | must |
| FR-5 | Measure and record the pre-tuning matrix. If every new gate passes, ship no balance change. If a gate fails, make the smallest evidence-backed change to the nine discovery species and/or authored bosses that restores all gates. | must |
| FR-6 | Keep every existing balance probe and pin unchanged and green. If no targeted tuning can satisfy the new gates without modifying an existing test or pin, stop and report blocked rather than weakening a gate. | must |
| FR-7 | Record the final matrix, any tuning delta, before/after battle hash, all configured verification results, and full FR/NFR/AC coverage in committed evidence. | must |
| FR-8 | If balance data changes, add a dated product/tech-stack note describing the measured reason and confirming that no product direction, debt status, or fence changed. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No runtime mechanics, resolver, RNG, chart, acquisition, save/schema, API, deployment, or UI behavior changes. Balance tuning is limited to existing species/boss data fields. |
| NFR-2 | The probe is deterministic and uses no new RNG stream, clock, network, filesystem, or environment-dependent behavior in its gated path. |
| NFR-3 | Existing balance test files and pinned values remain byte-identical. No test is skipped, weakened, or re-baselined. |
| NFR-4 | No dependency, package manifest, lockfile, allowlist, or module-cap change. Google TypeScript style applies; Biome is authoritative. |
| NFR-5 | No credentials, player data, or remote mutation. |
| NFR-6 | `bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism`, and `bun run test:fuzz` pass. Record the final battle hash; it may differ from `0xff6f3d62` only when justified by measured tuning and all existing pins remain green. |
| NFR-7 | The gated probe computes only the cells it asserts; the full four-level matrix is opt-in report work. Every test stays within the configured timeout and uses bounded loops. |
| NFR-8 | Changes remain surgical: one new probe file, only necessary balance-data edits, Conductor evidence/state, and dated docs when required. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The new probe names exactly `voltfox`, `galeheron`, `shalemole`, `dune_jerboa`, `spark_ray`, `gale_moth`, `thornvolt`, `siltback`, and `emberwing`. | FR-1 |
| AC-2 | The probe uses the frozen seed grid, training levels, tactic, production boss-side builder, and production resolver. | FR-2 |
| AC-3 | Boss-advantaged fresh cells are zero-win; all nine species are at least 35% against every boss at cap; electric/earth/wind fresh behavior is intentionally unconstrained. | FR-3 |
| AC-4 | Report mode emits the complete 9×6×4 matrix with exact tallies and is deterministic across two runs. | FR-4 |
| AC-5 | The committed evidence includes the pre-tuning matrix and either a no-tuning result or a minimal before/after tuning delta. | FR-5 |
| AC-6 | Every existing balance suite and pin is unchanged and green. | FR-6 |
| AC-7 | Configured verification passes, the final hash is recorded, and any hash change is explained by the measured tuning delta. | FR-7, NFR-6 |
| AC-8 | Final diff is limited to the new probe, necessary balance data, Conductor artifacts, and dated docs if balance changed; no unrelated runtime/config/dependency change exists. | FR-8, NFR-1, NFR-4 |
| AC-9 | `verification/integrated.md` maps every FR/NFR/AC and records scope, matrix, tuning, verification, and verdict. | FR-7 |
| AC-10 | Working tree is clean and `git diff --check` passes at completion. | NFR-8 |

## Edge Cases

- If a new gate fails but every candidate fix breaks an existing pin, stop and
  report blocked; do not alter the pin.
- If the full report is nondeterministic, stop and investigate; do not loosen the
  seed grid.
- If a load-induced timeout recurs, isolate the single probe once under low load;
  do not weaken thresholds or retry the full suite blindly.
- Electric, earth, and wind lines have no boss-advantaged fresh cell because no
  authored boss uses their counter-element. Their approved fresh contract is
  cap-only.
- A changed final battle hash is acceptable only with a recorded before/after
  matrix explanation and all pre-existing balance pins still green.

## Dependencies

- **Tracks:** none; all referenced balance and roster tracks are complete.
- **External:** none.

## Open Questions & Assumptions

- “Targeted tuning” means changes to existing stat bounds, kits, temperaments,
  or authored boss stats/kits within the same species/boss identities. Any
  change that would alter identity, element, roster membership, or mechanics is
  out of scope.
- The nine-line roster is derived from `DISCOVERY_SPECIES` minus the three
  wave-4 lines already covered by `species-wave4-discovery.balance.test.ts`.
- Existing reward-line probes remain the source of truth for those six species.

## References

- `conductor/roadmap.md` — RM-5
- `packages/sim/src/bosses.balance.test.ts`
- `packages/sim/src/battle/species-wave4-discovery.balance.test.ts`
- `packages/sim/src/battle/species-roster.balance.test.ts`
- `packages/sim/src/battle/species-balance.test.ts`
- `packages/sim/src/species-electric.balance.test.ts`
- `packages/sim/src/battle/species-discovery-balance.test.ts`
- `packages/sim/src/species/discovery.ts`
- `conductor/archive/20261027-roster-wave-3/verification/phase-4.md`
- `conductor/archive/20261027-roster-wave-4/verification/phase-4.md`
