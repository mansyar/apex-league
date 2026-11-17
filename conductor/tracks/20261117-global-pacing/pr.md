# Global Pacing — Pull Request

## Summary

This track investigated D-1 pacing and **shipped no game change**. The 840-fight matrix already satisfies the product's one-in-three rule at 224/840 (26.7%), while the 42-fight telemetry fixture reads 20/42 (47.6%). The fixture-only target of 14/42 is formally **Withdrawn 2026-11-17**: an earlier audit proved the fixture is not a sample of the matrix population (reference-clamped stats, press-vs-kite doctrine, strided pairing walk), and every in-scope attempt to close it without moving a fence failed.

Three bounded searches are recorded with full grids: 14 single-knob controller rungs, 19 combined controller rungs at `DECISION_MS = 240`, and 14 in-envelope species configurations at 200 ms. The closest combination reached 13/42 and 198/840 but broke two species bands; the closest species configuration satisfied the matrix and sibling band but broke the boss stat fence and the Fenn balance floor. No bound, floor, tolerance, species value, frame datum, pin or `SIM_VERSION` moved. `SIM_VERSION` remains 3, the trace hash remains `0xb6cce858`, and both debt pins remain in place.

## Track

- **ID:** 20261117-global-pacing
- **Type:** chore — high
- **Spec:** `conductor/archive/20261117-global-pacing/spec.md`
- **Plan:** `conductor/archive/20261117-global-pacing/plan.md`
- **Review:** `conductor/archive/20261117-global-pacing/review.md`

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1 | Measure the clock-bound fights | verified | `b97075da` | 20 time-outs traced; throughput shortfall 1.73-4.35 dps per side; `COMMIT_SKIP_DENOM` proposed first |
| 2 | Raise throughput in the shared controller | blocked | `f5383dd1` | 14 single-knob then 19 combined rungs; closest 13/42 + 198/840 broke two species bands; fixture target withdrawn |
| 3 | Combined cadence and species correction | blocked | `7f9b296e` | Three attempts; 200 ms cadence plus in-envelope stats could not satisfy matrix, sibling band, boss fences and Fenn floor together |
| 4 | Record the whole track | verified | `0a15ca77` | Integrated no-ship record with full gate output and no-ship proof |
| R1 | Resolve review finding F1 | verified | `64bef142` | Stale debt-pin promotion metric marked Withdrawn |

## Requirements

- [x] FR-1 — diagnosis from real traces (`verification/phase-1.md`)
- [x] FR-2 — controller sweep (`verification/phase-2.md`)
- [x] FR-3 — in-envelope stats attempted and reverted (`verification/phase-3.md`)
- [x] FR-4 — no fence widened (`verification/integrated.md` §4)
- [x] FR-5 — debt pins left in place (same)
- [x] FR-6 — version guard respected, `SIM_VERSION` 3 (same)
- [x] FR-7 — all configured gates green on the final tree (same)
- [x] FR-8 — identity fence untouched (no diff to `identity.test.ts`)
- [x] FR-9 — all sweeps recorded with closest misses (`verification/integrated.md` §3)
- [x] FR-10 — cap wins remain valid (no `CAP_MARGIN_FLOOR_BP` diff)
- [x] FR-11 — combined fix attempted with envelope-subset only (`verification/phase-3.md`)
- [x] FR-12 — no probe deleted or skipped; no re-pins shipped
- [x] FR-13 — combined controller search completed (`verification/phase-2.md` §13-§21)
- [x] FR-14 — no game change shipped when no candidate passed fences (`verification/integrated.md` §4)
- [x] NFR-1..NFR-4 — integer arithmetic, one RNG, configured commands, 150 s budget (gate table)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Pacing fixture | `bun run telemetry` | exit 0 — 20/42 (47.6%), 14/14 bounds, dead zone 2.9% | `verification/integrated.md` §2 |
| Matrix | `bun run balance` | exit 0 — 224/840 (26.7%), 15/15 species, 49/49 moves, decisive 95.6% | same |
| Determinism | `bun run trace --seed 20261111 --check` | exit 0 — hash `0xb6cce858`, 5/5 invariants | same |
| Full gate | `bun run verify` | exit 0 — 4,167 pass / 1 skip / 0 fail, 4,168 tests / 375 files, Biome 940 files, determinism byte-identical | same |
| Build | `bun run build` | exit 0 — 418 modules, chunk warning only | same |

## Media

None.

## Review

- **Verdict:** PASS WITH FINDINGS
- **Rounds:** 1
- **Fixed:** 1 Low (stale debt-pin metric in the spec Goals)
- **Accepted debt:** D-1 global pacing, D-2 kite band, D-3 fixture one-in-three, D-4 fixture population bias

## Deviations and risks

- Phases 2 and 3 are recorded as blocked and resolved by the formal fixture-target withdrawal; no failure was hidden by moving a gate.
- The fixture target remains missed at 20/42. The matrix's 26.7% is the product figure and meets the rule.
- `SIM_VERSION` stays 3 and both debt pins stay in debt form because nothing shipped.
- No product-doc sync: the roadmap already names D-1 as owed, and this track landed no feature.
- No code, species, controller, ghost, pin, bound or assertion changed; the whole diff is under `conductor/`.

## Follow-ups

- D-1: any future attempt must either change controller family (cut idle/retreat/dodge dwell rather than raise press) or obtain a product decision to move a fence.
- D-2: kite threat band versus `spd 5`.
- D-3/D-4: fixture one-in-three debt and the proven population bias.

## Rollback

No game change shipped. To revert this PR, revert the squash commit; no migration, flag or data change is involved.
