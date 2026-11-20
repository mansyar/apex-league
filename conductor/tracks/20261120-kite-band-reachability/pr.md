## Summary

Closes D-2 pacing debt with a deterministic speed-aware Kite reachability clamp,
the owner-approved single 40 s → 45 s fight-cap fence extension, and a narrow
re-tune of only `water_axolotl` and `dune_jerboa`. The final 1,680-fight matrix has
all 34 balance gates green and `capShare` 22.0% (370/1680), strictly below the
30.8% (517/1680) baseline. `SIM_VERSION` moves to 4 with ghost pins 4/5 so old
and future replay bundles are refused while v4 replays byte-identically.

## Track

- **ID:** `20261120-kite-band-reachability`
- **Type:** chore
- **Spec:** [`conductor/archive/20261120-kite-band-reachability/spec.md`](conductor/archive/20261120-kite-band-reachability/spec.md)
- **Plan:** [`conductor/archive/20261120-kite-band-reachability/plan.md`](conductor/archive/20261120-kite-band-reachability/plan.md)
- **Review:** [`conductor/archive/20261120-kite-band-reachability/review.md`](conductor/archive/20261120-kite-band-reachability/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Baseline and slow-kiter reproduction | Record the unchanged matrix and `spd 5` Kite failure | verified | `474cfe21` | Baseline `capShare 30.8% (517/1680)`; trace hash `0x1368d19b` |
| 2: Speed-aware reachable Kite band | Add failing-first pure clamp tests and integer-only clamp | verified | `7fb66b04` | Candidate green but `capShare` unchanged; not shipped |
| 3: Measured decision | Apply ship/no-ship rule and replay guard | blocked | `a5ee16ca` | By design: candidate equalled baseline; code reverted; owner then unblocked D-2 |
| 4: Owner-approved clamp and 45s cap | Re-apply clamp, extend one fence, add v4 guard | blocked | `88158b57` | Strict capShare reduction achieved but two species gates red; candidate withdrawn |
| 5: Narrow roster re-tune | Fix only those two species and ship | verified | `7c7af8c6` | `water_axolotl` def min 8→6, `dune_jerboa` atk 20→18; 34/34 gates; `capShare 22.0%` |

## Requirements

- [x] `FR-1` — unchanged baseline and slow-kiter reproduction (`verification/phase-1.md`)
- [x] `FR-2`/`FR-3` — pure integer speed-aware Kite clamp with band invariants (`controller-reach.ts`, `controller-profile.test.ts`)
- [x] `FR-4`/`FR-10` — `SIM_VERSION` 4 with dated note and ghost pins 4/5 (`ghost.ts`, `ghost.test.ts`)
- [x] `FR-5`/`FR-6` — all 34 gates green and strictly lower `capShare` (`verification/integrated.md`)
- [x] `FR-7` — integrated commands, counts, hashes, module caps, scope proof (`verification/integrated.md`)
- [x] `FR-8`/`FR-9` — owner-approved clamp re-application and the single 40 s → 45 s cap fence (`resolve.ts`, `battle-balance-report.ts`)
- [x] `FR-11`/`FR-12` — only the two named species re-tuned; ship gate preserved (`starters.ts`, `discovery.ts`)
- [x] `NFR-1`..`NFR-6` — no dependency/protocol/save/API/CORS/deploy change; determinism, caps and exact commands preserved
- [x] `AC-1`..`AC-15` — covered by phase evidence, review and final verification

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --timeout 120000` | pass | 4458 pass / 1 skip / 0 fail, 670470 `expect()` calls, 4459 tests / 437 files |
| typecheck | `bun run check` | pass | voxel 214, sim 252, server 185, client 549 files clean |
| lint | `bun x biome check` | pass | 1032 files, no fixes |
| build | `bun run build` | pass | Vite 438 modules; pre-existing >500 kB chunk warning only |
| verify | `bun run verify` | pass | hash `0xff6f3d62`, determinism gate green |
| balance | `bun run balance` | pass | 1680 fights, 34/34 gates, capShare 370/1680 (22.0%), decisiveShare 95.1%, capWinQuality 78.9%, damage 49/49 |
| determinism | `bun run gate:determinism` | pass | 21 species × 3 stages + 5 props byte-identical |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls |
| focused | species/controller/ghost tests | pass | 122 pass / 0 fail |
| trace | pinned `earth_tortoise` Kite vs `embercub` Press | pass | hash `0x1d0cc2ed`, 5/5 invariants |

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- `packages/sim/scripts/battle-telemetry.ts`: `BOUNDS.durationMax` 40,000 → 45,000 plus its why string. Required because the approved 45 s fight cap makes the old 40 s telemetry bound unsatisfiable; no target or other fence moved.
- Diagnostic re-pins in `fixture-audit.test.ts`, `stream.test.ts`, `clock.contract.test.ts`, `balance-report.test.ts`, `battle-trace.test.ts`, `telemetry.test.ts`, `pacing.test.ts`, and `resolve.test.ts` follow the new 45 s cap and do not gate gameplay.
- The original spec forbade fence and species changes; owner decisions on 2026-11-20 explicitly superseded that for this track only (recorded in `spec.md` and `verification/owner-decision.md`).
- Replay guard risk: old v3 ghost bundles are intentionally refused; all current ghosts were re-pinned to v4.

## Follow-ups

- none

## Rollback

```bash
# Squash commit
git revert --no-edit 7c7af8c6
```

No migration, feature flag, or data rollback is needed. The species bound and
cap changes are source-only; reverting the squash commit restores the prior
balance and `SIM_VERSION` 3 guard.
