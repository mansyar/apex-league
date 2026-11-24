## Summary

Adds a deterministic boss-balance probe for the nine discovery species that lacked an authored-boss matrix. The approved fresh/cap gates all pass, so no discovery-species or boss data was tuned; existing balance probes and pins remain unchanged.

## Track

- **ID:** `20261124-boss-discovery-balance-probes`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261124-boss-discovery-balance-probes/spec.md`](conductor/archive/20261124-boss-discovery-balance-probes/spec.md)
- **Plan:** [`conductor/archive/20261124-boss-discovery-balance-probes/plan.md`](conductor/archive/20261124-boss-discovery-balance-probes/plan.md)
- **Review:** [`conductor/archive/20261124-boss-discovery-balance-probes/review.md`](conductor/archive/20261124-boss-discovery-balance-probes/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Baseline and nine-line boss probe | Add the exact nine-line probe, measure the full matrix, and prove existing suites stay green | verified | `cd136a46` | 56 normalized rows / 216 cells; deterministic across two runs |
| 2: Conditional targeted balance tuning | Tune only if the new gates fail | verified | `11a8779b` | No tuning required; matrix byte-identical; hash unchanged |
| 3: Final verification, documentation, and integrated evidence | Run final checks, prove freeze/scope, and commit integrated evidence | verified | `06b0858a` | No balance-data change, so dated product/tech-stack notes were correctly omitted |
| R1: Review fixes | Reconcile nested task state and prove byte-level matrix identity | verified | `691a943d` | F1/F2 fixed; all three matrices share object ID `f0e41cb9…` |

## Requirements

- [x] `FR-1` — Exact nine-target discovery roster with explicit exclusions.
- [x] `FR-2` — Frozen seed grid, training levels, tactic, production boss builder, and resolver.
- [x] `FR-3` — Boss-advantaged fresh zero-win gate and >=35% cap gate for every target/boss pair.
- [x] `FR-4` — Opt-in deterministic 9x6x4 report with exact tallies.
- [x] `FR-5` — Pre-tuning matrix recorded; no tuning required because every gate passed.
- [x] `FR-6` — Existing balance probes and pins unchanged and green.
- [x] `FR-7` — Final matrix, hash, verification, and full coverage committed.
- [x] `FR-8` — Conditional dated docs omitted because no balance data changed.
- [x] `NFR-1` — No runtime mechanics or behavior changes.
- [x] `NFR-2` — Deterministic gated path; report remains opt-in.
- [x] `NFR-3` — Existing balance test files and pins byte-identical.
- [x] `NFR-4` — No dependency, manifest, lockfile, allowlist, or module-cap change; Biome clean.
- [x] `NFR-5` — No credentials, player data, or remote mutation.
- [x] `NFR-6` — Configured checks completed; full verify load timeout resolved by the approved isolated fallback; hash `0xff6f3d62`.
- [x] `NFR-7` — Bounded gated work; full matrix is opt-in report work.
- [x] `NFR-8` — Surgical one-file code diff plus Conductor artifacts.
- [x] `AC-1` — Exact nine target species.
- [x] `AC-2` — Frozen methodology.
- [x] `AC-3` — Fresh/cap gates, including cap-only electric/earth/wind lines.
- [x] `AC-4` — Complete deterministic report across runs.
- [x] `AC-5` — Baseline and no-tuning result committed.
- [x] `AC-6` — Existing suites/pins unchanged and green.
- [x] `AC-7` — Configured verification and hash recorded under the approved fallback rule.
- [x] `AC-8` — Surgical scope; no unrelated changes.
- [x] `AC-9` — Integrated FR/NFR/AC mapping committed.
- [x] `AC-10` — Clean tree and passing diff-check.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --timeout 120000` | pass: 4468 pass, 1 skip, 0 fail | `conductor/archive/20261124-boss-discovery-balance-probes/verification/integrated.md` |
| phase tests | `bun test --check --parallel=4 --timeout 120000` | pass: 4468 pass, 1 skip, 0 fail; hash `0xff6f3d62` | `verification/phase-2.md` |
| focused | `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | pass: 6 pass, 0 fail | `verification/phase-1.md` |
| report | `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | pass: 56 rows, byte-identical | `verification/integrated.md` |
| existing balance | six existing balance suites | pass: 35 pass, 0 fail | `verification/phase-1.md` |
| lint/format | `bunx biome check packages/sim/src/battle/species-discovery-boss.balance.test.ts` | pass | `verification/phase-1.md` |
| typecheck | `bun run check` | pass | `verification/phase-1.md` |
| build | `bun run build` | pass; existing chunk advisory only | `verification/phase-3.md` |
| balance | `bun run balance` | pass: 21 species / 1680 fights / cap 22.0% | `verification/phase-3.md` |
| determinism | `bun run gate:determinism` | pass | `verification/phase-3.md` |
| fuzz | `bun run test:fuzz` | pass: 139 pass, 0 fail | `verification/phase-3.md` |
| verify | `bun run verify` | 4467 pass / 1 skip / 1 fail; sole `gatekeeper-reach` load timeout; approved isolated test passed 1/1 | `verification/phase-3.md` |
| scope | corrected `git diff --quiet` and frozen-file checks | pass | `verification/integrated.md` |
| hygiene | `git diff --check` and `git status --porcelain` | pass | `verification/phase-3.md` |

## Review

- **Verdict:** PASS
- **Rounds:** 2
- **Fixed:** 2 Low findings (F1 nested plan state, F2 matrix byte identity)
- **Accepted/deferred:** 0

## Deviations and risks

- Phase subagents hit shell permission denials for several read-only/verification commands; the primary ran each exact command unchanged and recorded first-class results.
- Two full `bun run verify` runs hit the same documented `gatekeeper-reach` timeout under full-suite load. The spec-approved isolated test passed 1/1 in 7.39s; the full suite was not retried again. No test, threshold, source, balance data, or hash changed.
- No balance tuning was required, so the conditional product/tech-stack notes were intentionally omitted.

## Follow-ups

- None.

## Rollback

```bash
git revert --no-edit -m 1 <merge-commit>
```
