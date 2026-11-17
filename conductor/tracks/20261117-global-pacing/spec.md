# Global Pacing — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track reduces the share of battles that run out the 40 s clock by raising the rate at which
fighters actually commit and land blows, first through shared controller policy and, only if that
proves insufficient, through effective stats kept strictly inside each species' authored roll
bounds. Both measurement populations must finish inside the project's one-in-three line: the
42-distinct-pairing telemetry fixture (currently 20/42, 47.6%) and the 840-fight balance matrix
(currently 224/840, 26.7%, already inside the line). No pacing bound, floor, tolerance,
`DISTINCT_FLOOR`, fight-cap duration or species identity is moved to make a number pass; if no
in-scope candidate reaches the target, the phase reports blocked with the measured sweep.

## Problem / Motivation

A cap win is a legitimate outlasting victory and must stay one, but the project still owes the
one-in-three target. The re-composed telemetry fixture reads 20/42 (47.6%) against a 14/42 (33.3%)
target, and its test currently pins the miss as debt with
`expect(cap.count * 3).toBeGreaterThan(cap.total)` in `telemetry.test.ts:213`. `pacing.test.ts:176`
likewise carries a `test.failing` majority-by-KO pin. The matrix reads 224/840 (26.7%) and passes
its own one-in-three bound, but Phase 1 of the Capshare Pacing track measured a global throughput
shortfall: stalled fights land 2.5–7.6 damage per second against 160–189 HP pools, needing 41–73 s
against a 40 s cap, while averaging roughly 0.3 commits/s per side. The audit then showed the stat
basis and the fixture's pairing walk, not the tortoise, explain the disagreement between the two
samples; the remaining pacing gap is real and belongs on the matrix population, not on the fixture.

Leaving it open means every pacing bound continues to describe a population where nearly half the
fixture fights and more than a quarter of real roster fights end on the clock rather than by a
decisive blow, and two test pins keep asserting that failure as the expected state.

## Goals & Success Metrics

- **Goal:** fighters close fights through play rather than through the clock, on both measurement
  populations, without turning a slow species into a fast one or widening a gate.
- **Metric:** telemetry `cap.count * 3 <= cap.total` on the 42-distinct-pairing fixture
  (at most 14 of 42) and balance `cap share <= 1/3` on the 840-fight matrix (at most 280 of 840),
  with both `BOUNDS` and `CAP_MAX` untouched.
- **Metric:** the 840-fight matrix still reports 15/15 species inside their win band, 49/49 moves
  inside the 4–12% damage band, median duration inside 25–40 s and decisive share at least 2/3.
  Cap wins keep counting as outlasting wins under the existing `CAP_MARGIN_FLOOR_BP` rule.
- **Metric:** two debt pins are promoted, not deleted: the one-in-three assertion in
  `telemetry.test.ts` becomes a normal passing expectation, and the `test.failing` majority-by-KO
  body in `pacing.test.ts` becomes a normal test if its body now passes.

## Scope

### In Scope

- A written diagnosis of why committed blows per second are low on the stalling pairings, using the
  existing trace/telemetry evidence, before any value changes.
- A sweep of shared controller-policy candidates that can raise commits/s or reduce idle while
  keeping integer arithmetic and determinism; measure each on the 42-fight fixture first, then the
  840-fight matrix, and record every accepted and rejected rung.
- If controller-only candidates miss the target, a second sweep of effective stats **inside each
  species' existing authored roll bounds**, never outside them; `earth_tortoise` stays subject to
  the shipped `identity.test.ts` fence (`spd [3, 5]`, `hp`/`def` floors, `temperament "slow"`,
  `archetypeId "tortoise"`, its own six moves).
- **Combined fix (amended 2026-11-17):** if one controller rung meets the fixture and matrix cap
  targets but breaks a species win-rate row, that policy rung may ship **together with** the minimum
  per-species stat corrections that restore every broken row, provided no roll envelope widens and
  every identity fence stays green. This supersedes the stats-only reading of Phase 3; FR-2's
  controller-first order and FR-4's no-widening fence still apply.
- Promotion of the two debt pins when they genuinely pass, with their comments rewritten to record
  the new figures rather than silently deleting the debt history.
- A `SIM_VERSION` bump from 3 to 4 when controller policy, frame data or resolution changes; ghost
  contract pins are updated to the new version in the same phase. When the shipped tree is changed
  only by stats inside bounds, the version stays 3 and the trace hash is shown to be unchanged for
  unchanged inputs.
- An evidence file and integrated record carrying the before/after cap shares, both samples' full
  gate output, the sweep table and the reason the chosen candidate wins.

### Out of Scope

- Changing any bound, floor, tolerance, `DISTINCT_FLOOR`, `BOUNDS` value, `CAP_MAX`, the 40 s fight
  cap, the one-in-three target itself, or the species win band to make a result pass.
- Changing `earth_tortoise`'s identity or any species' archetype, element, temperament, kit or
  frame data; adding moves, species, elements or doctrines. A stat bound pair may be shifted or
  narrowed by whole stat points under FR-3/FR-11 only if its envelope never widens, every generated
  stat stays inside the original envelope, and `identity.test.ts` remains green.
- Treating a cap win as a failure or lowering `CAP_MARGIN_FLOOR_BP`; outlasting remains a valid
  victory.
- Re-composing the 42-pairing telemetry fixture, changing `PAIRINGS`/`SEEDS_PER_PAIRING`, or moving
  bounds behind a new sample; that is a separate gate-redesign track.
- The D-2 kite-band-versus-`spd` fix, `MISS_SCALE`, animation work, new content, and any change to
  `paths-ignore`/CI triggers beyond what an ordinary track commit requires.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Before changing behaviour, record a diagnosis naming which side fails to convert and why, with per-fight commits, hits, idle share, gap and damage throughput for the stalling pairings. | must |
| FR-2 | Sweep controller-policy candidates that can raise commit throughput or cut idle, cheapest and most conservative first; measure each on the fixture, then the matrix, and keep byte-identical integer arithmetic and one RNG stream. | must |
| FR-3 | If controller-only candidates cannot reach both targets, sweep effective stats only inside existing authored roll bounds, keeping the tortoise identity fence green throughout. | should |
| FR-4 | Never widen a bound, floor, tolerance, `DISTINCT_FLOOR`, cap duration or target; record every figure before and after and name any miss as debt rather than moving the line. | must |
| FR-5 | Promote the one-in-three debt pin in `telemetry.test.ts` and the `test.failing` majority pin in `pacing.test.ts` when and only when their bodies pass, retaining their history in comments. | must |
| FR-6 | Bump `SIM_VERSION` from 3 to 4 whenever controller policy, frame data or resolution changes; update ghost pins in the same phase. Leave it at 3 for a stats-only tree and prove the trace hash is unchanged. | must |
| FR-7 | Leave `bun run balance` and `bun run telemetry` green with their existing gates, recording both cap shares plus median duration, decisive share, species and move-band results. | must |
| FR-8 | Keep species identity intact: `identity.test.ts` stays green and no authored stat bound, archetype, element, temperament or kit entry is relaxed. | must |
| FR-9 | Record the full candidate sweep, including rejected rungs and the reason each was rejected, in the phase evidence and integrated record. | must |
| FR-10 | Keep cap wins valid: no change to the decisive-share or cap-win-quality rules, and a cap win still counts when it clears the existing margin floor. | must |
| FR-11 | **Added 2026-11-17.** When a controller rung meets the cap targets but breaks a species row, ship that rung with the minimum per-species stat corrections that restore every broken row; never widen a roll envelope, lower a floor or touch an identity-defining stat. | must |
| FR-12 | **Added 2026-11-17 (user decision).** With the combined tree shipped, re-pin the cadence- and species-sensitive golden, digest and relation tests that legitimately moved. Circle's lost flank/rear counts at 200 ms and the two champion cup fixtures that flip to eliminated are **accepted consequences**, not regressions to hide. No gate bound, target, tolerance, roll envelope, damage band or identity fence moves; no probe is simply deleted or skipped. | must |
| FR-13 | **Added 2026-11-17 (user decision).** Before any fence is reconsidered, sweep *combinations* of moderate controller-policy changes with `DECISION_MS` held at 240, no species value and no gate fence touched. If a combined rung meets both cap targets with every other gate green, ship it: promote the debt pins, bump `SIM_VERSION` to 4 and re-pin only cadence-moved tests under FR-12. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic and a single seeded RNG stream remain; same seed still produces a byte-identical hash and event sequence under the new code. |
| NFR-2 | All verification uses the project's configured commands: `bun run balance`, `bun run telemetry`, `bun run trace --seed ... --check`, `bun run verify`, `bun run build`. |
| NFR-3 | Every phase's full `verify_phase` (`bun run verify && bun run build`) is green before the phase is accepted. |
| NFR-4 | A phase stays inside its 150 s verification budget; if the matrix sweep cannot fit, split the sweep across phases rather than skipping the gate. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `verification/phase-1.md` names the stall mechanism with per-fight commit/hit/idle/throughput figures before any behaviour change. | FR-1 |
| AC-2 | Every candidate is recorded with its fixture and matrix readings; no candidate is accepted on the fixture alone. | FR-2, FR-9 |
| AC-3 | If used, every stat value sits strictly inside its species' authored roll bounds and the tortoise identity test passes. | FR-3, FR-8 |
| AC-4 | The 42-fight fixture reports `cap.count * 3 <= cap.total` and the 840-fight matrix reports cap share at most 1/3, with all other gate rows still green. | FR-4, FR-7 |
| AC-5 | The debt pin in `telemetry.test.ts` and the `test.failing` majority pin in `pacing.test.ts` are promoted to normal passing assertions when their bodies pass; neither is deleted or `.skip`ped. | FR-5 |
| AC-6 | `SIM_VERSION` is 4 with ghost pins updated if policy or resolution moved; otherwise it is 3 and the trace hash `0xb6cce858` is unchanged for the same seed. | FR-6, NFR-1 |
| AC-7 | A before/after table proves no bound, floor, tolerance, `DISTINCT_FLOOR`, cap duration or target value changed in the diff. | FR-4 |
| AC-8 | `bun run balance` still reports 15/15 species, 49/49 moves in the damage band, median 25–40 s and decisive share at least 2/3; `bun run telemetry` prints all 14 bounds inside their limits. | FR-7, FR-10 |
| AC-9 | `bun run verify` and `bun run build` are green on the final tree, and the diff contains no re-pinning that weakens an assertion. | NFR-2, NFR-3 |
| AC-10 | If no in-scope candidate satisfies AC-4 without violating AC-7 or AC-8, the phase reports blocked with the measured sweep and no bound moves; the track does not silently downgrade its target. | FR-4, FR-9 |
| AC-11 | **Added 2026-11-17.** The combined tree reproduces fixture ≤ 14/42 and matrix ≤ 1/3 with all 15 species and 49 moves green, `identity.test.ts` unchanged, `SIM_VERSION` 4 with both ghost pins updated, a recorded new trace hash, and a before/after table proving no roll envelope widened and no gate bound moved. | FR-11, FR-6 |
| AC-12 | **Added 2026-11-17.** `bun run verify` is green with only value/golden/relation re-pins in the cadence- and species-sensitive tests; each re-pin has a comment naming the 200 ms cadence or the species correction that moved it, and no assertion is deleted, `.skip`ped or weakened to hide a failure. The evidence names every moved file and quotes the old and new expected values. | FR-12 |
| AC-13 | **Added 2026-11-17.** A combined-controller rung, if shipped, leaves `DECISION_MS = 240`, every species value and every fence (45–55% sibling band, boss stat pins, 0.35 boss floor, `BOUNDS`, `CAP_MAX`, `DISTINCT_FLOOR`, damage band) untouched; it reproduces fixture ≤ 14/42 and matrix ≤ 1/3 with 15/15 species, 49/49 moves and all other gates green; debt pins are promoted, `SIM_VERSION` is 4 with both ghost pins updated, and the evidence records the new hash and every re-pin. If no combination works, the phase reports blocked with the measured grid. | FR-13, FR-4 |

## Edge Cases

- **A candidate makes the fixture pass but the matrix fail.** Reject it; the matrix is the game's
  population and the fixture is only the cheap sweep.
- **A candidate cuts cap share but breaks the damage band, species band, median or fastest-fifth.**
  Reject it and record the broken row; no bound is moved to accommodate the candidate.
- **The tortoise starts losing its identity.** `identity.test.ts` fails the build; any stat sweep
  step that changes `spd` bounds, lowers `hp`/`def`, re-tempers or swaps a move is out of scope.
- **A policy change invalidates ghosts.** Bump `SIM_VERSION` to 4 and update every ghost pin in the
  same phase; a stats-only tree leaves the version and v3 replay contract intact.
- **The debt pins flip early.** A promoted pin that later fails is a regression and fails the build;
  its comment must retain the old debt figure for context.
- **No candidate works.** Report blocked with the full sweep and the measured reason, exactly as the
  Capshare Pacing track did for the tortoise fix; do not widen the target or pick favourable seeds.
- **Cadence changes rewrite doctrine/cup outcomes (occurred 2026-11-17).** At 200 ms,
  Circle's flank/rear probe drops to zero and two champion fixtures flip to eliminated.
  The user explicitly accepted these as the cost of the pacing fix (FR-12). Re-author the
  affected probes to the new expected values and say so; never delete a probe, add `.skip`,
  or relax a gate bound to make them pass.
- **A controller rung passes the caps but breaks species rows (occurred 2026-11-17).**
  `DECISION_MS 240→200` read 13/42 and 188/840 with every cap gate green but put `fire_drake`
  59.8% (≤ 59.4), `plant_ox` 62.5% (≤ 59.6), `voltfox` 39.3% (≥ 40.7) and `shalemole` 60.7%
  (≤ 59.5) outside their bands. FR-11 permits correcting those four with the smallest stat moves
  that restore every row, without widening any envelope; Phase 2's block is evidence, not a lowered
  target.
- **A cap win still occurs.** It remains a valid outlasting victory under
  `CAP_MARGIN_FLOOR_BP`; the metric is fewer stalls, not invalidation of caps.

## Dependencies

- **Tracks:** none. Base `main` at `0c9b8fca` carries all merged pacing, gate and CI work.
- **External:** none. GitHub Actions and `gh` are used by the normal Conductor PR flow.

## Open Questions & Assumptions

- **Decided 2026-11-17:** type `chore`, priority `high`; success is both samples inside one-in-three
  with no bound moved; the primary lever is shared controller throughput, with effective stats
  inside authored bounds as a second lever; candidates are swept on the fixture first and confirmed
  on the matrix; all rungs are recorded.
- **Assumption:** a controller-policy change is permitted by the product's determinism rules as long
  as integer arithmetic, one RNG stream and byte-identical replay hold; it costs one `SIM_VERSION`
  bump, which the project has accepted for prior policy changes.
- **Assumption:** the two debt pins' bodies are the intended signal of the one-in-three target; a
  promotion is a real improvement, not a gate relaxation.
- **Assumption:** the kite-band issue (D-2) and fixture re-stratification remain separate tracks and
  are not silently folded into this one.
- **Decided 2026-11-17 (resume):** after Phase 2 blocked, the user chose the combined fix. Phase 2
  stays recorded as blocked; FR-11/AC-11 are added rather than renumbering anything, and Phase 3 is
  re-scoped from stats-only to controller policy plus the minimum species corrections that restore
  every green row. No bound, floor, tolerance or target moves.
- **Decided 2026-11-17 (fourth resume):** after the in-envelope grid proved no species
  configuration clears all fences, the user chose to leave every fence untouched and
  finish the controller search instead. FR-13/AC-13 add the untested space of
  **combined moderate controller rungs** at `DECISION_MS = 240`. Phase 2 is reopened
  for that search; all three blocked Phase 3 attempts stay as evidence.
- **Decided 2026-11-17 (third resume):** after attempt 2 broke the 45–55% sibling band
  (Cinder Courser 56.3%, Thorn Ram 55.7%) while trying to restore all 15 species rows,
  the user chose to search for a **different in-envelope species configuration** that
  preserves that band. No bound, tolerance or band moves; the accepted FR-12 re-pin
  scope stays as written.
- **Decided 2026-11-17 (second resume):** after Phase 3 measured 30 red assertions outside
  `Touches`, the user chose to expand scope and accept the measured behaviour changes. FR-12/AC-12
  were added without renumbering; the cadence-sensitive golden, digest, relation and fixture tests
  become re-pinnable with named reasons. The alternative — a narrower policy preserving Circle
  flanks and cup outcomes — was offered and not chosen.

## References

- `conductor/archive/20261112-capshare-pacing/verification/integrated.md` — the diagnosis, the
  tortoise withdrawal and debts D-1..D-4.
- `conductor/archive/20261112-gate-cost-and-fixture-audit/verification/integrated.md` — the four-cell
  attribution and the correct matrix figure (26.7%).
- `conductor/archive/20261111-minimum-reach/verification/integrated.md` — the `SIM_VERSION` 3 change
  and backing-shot precedent.
- `packages/sim/src/battle/continuous/telemetry.test.ts`, `pacing.test.ts`,
  `balance-report.test.ts`, `scripts/battle-telemetry.ts`, `scripts/battle-balance-report.ts`,
  `packages/sim/src/species/identity.test.ts`.
