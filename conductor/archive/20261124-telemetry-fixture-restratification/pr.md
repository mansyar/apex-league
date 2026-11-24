## Summary

Re-stratifies the telemetry gate at the same 42-fight budget so it samples the balance matrix population (midpoint stats, press doctrine) instead of the historical reference/split diagnostic. Only two bounds move with a recorded before/after derivation; the historical sample survives as an ungated `--smoke` CLI flag, the matrix and D-1 fence stay untouched, and D-4 closes with an owner-documented single-fight artifact.

## Track

- **ID:** `20261124-telemetry-fixture-restratification`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261124-telemetry-fixture-restratification/spec.md`](conductor/archive/20261124-telemetry-fixture-restratification/spec.md)
- **Plan:** [`conductor/archive/20261124-telemetry-fixture-restratification/plan.md`](conductor/archive/20261124-telemetry-fixture-restratification/plan.md)
- **Review:** [`conductor/archive/20261124-telemetry-fixture-restratification/review.md`](conductor/archive/20261124-telemetry-fixture-restratification/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Baseline and frozen derivation evidence | Reproduce the baseline and the frozen before/after derivation on the clean tree | verified | `2ce1a939` | Two subagent shell denials resolved by primary first-class runs; four-cell audit `1680/580/370`, `+12.5 points`. |
| 2: Representative gate and failing-first tests | Gate representative midpoint+press, preserve historical smoke, fail-first tests | verified | `ae4db559` | Subagent stalled after partial test edits; primary completed implementation. One zero-commit artifact found and owner-documented under AC-11. Plan amended to move FR-6 audit truth earlier. |
| 3: Audit truth, dated documentation, and final verification | Date the docs, re-run all configured checks, write integrated evidence | verified | `81a7fa6c` | Dated product/tech-stack notes; all five commands green with hash `0xff6f3d62`; subagent denials resolved by primary. |
| R1: Review Fixes | Fix the two Low review findings | verified | `fe8e349a` | `diff --check` trailing blank line removed; dated notes now point to the authoritative bound table. |

## Requirements

- [x] `FR-1` — baseline evidence recorded (`verification/phase-1.md`)
- [x] `FR-2` — representative midpoint+press gate over unchanged 42 pairings (`battle-telemetry.ts`, `telemetry.test.ts`)
- [x] `FR-3` — historical reference+split preserved as ungated `--smoke` CLI flag (`battle-telemetry.ts`)
- [x] `FR-4` — exactly two `BOUNDS` values move with before/after `why` (`battle-telemetry.ts`)
- [x] `FR-5` — failing-first proof red `14/4` → green `24/0` (`.conductor/evidence/.../phase-2/failing-first.txt`)
- [x] `FR-6` — audit names historical smoke cell A and representative gate cell D (`fixture-audit.ts`)
- [x] `FR-7` — dated product and tech-stack notes with authoritative table pointers
- [x] `FR-8` — integrated evidence committed (`verification/integrated.md`)
- [x] `NFR-1` — no SIM_VERSION/ghost/controller/species/fight-cap/fence/matrix/schema/API/CORS/deploy change
- [x] `NFR-2` — matrix 1680 fights and D-1 ≤1/3 fence unchanged; telemetry `capShare` bound 0.6
- [x] `NFR-3` — no manifest/dependency/package/schema/protocol change
- [x] `NFR-4` — Google TS style, Biome clean, no allowlist, module caps unchanged
- [x] `NFR-5` — no credentials or player data
- [x] `NFR-6` — five configured commands green with battle hash `0xff6f3d62`
- [x] `NFR-7` — 42-fight budget, one seed per pairing
- [x] `AC-1` — baseline reproduction
- [x] `AC-2` — representative composition and readings
- [x] `AC-3` — smoke diagnostic ungated and unrewired
- [x] `AC-4` — exactly two bound changes
- [x] `AC-5` — failing-first tests
- [x] `AC-6` — audit truth preserved
- [x] `AC-7` — dated documentation
- [x] `AC-8` — scope diff clean
- [x] `AC-9` — all configured checks green
- [x] `AC-10` — integrated evidence
- [x] `AC-11` — documented zero-commit artifact with cadence-resonance follow-up

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + typecheck + lint + determinism | `bun run verify` | pass | 4462 pass / 1 skip / 0 fail, Biome 1037 files, `0xff6f3d62` |
| build | `bun run build` | pass | 438 modules, advisory only |
| balance | `bun run balance` | pass | 1680 fights, `370/1680 (22.0%)`, all gates ok |
| determinism | `bun run gate:determinism` | pass | all GLBs and 5 props byte-identical |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail |
| gate | `bun run telemetry` | pass | 42 fights, 14/14 bounds, one AC-11 artifact |
| audit | `bun run fixture-audit` | pass | `1680/580/370`, `+12.5 points` |
| historical smoke | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | pass | `SMOKE` header, historical readings, exit 0 |
| scope | `git diff --check d29042de..HEAD` | pass | exit 0 after R1 |

Full command tables and raw evidence paths: `conductor/archive/20261124-telemetry-fixture-restratification/verification/integrated.md`.

## Review

- **Verdict:** PASS
- **Rounds:** 2
- **Fixed:** 2 Low findings (F1 scope-proof whitespace, F2 authoritative bound-table pointers)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Phase subagents repeatedly hit shell/edit permission denials; the primary ran the exact commands unchanged and wrote the docs/evidence with first-class exit codes. Denials are retained only as resolved historical notes.
- The Phase 2 subagent stalled after partial test edits; the primary completed implementation from its handoff, including the failing-first proof and root-cause instrumentation.
- `conductor/workflow.md` was changed in `526ff5d6` at the user's explicit 2026-11-24 request: the PR merge policy is now a merge commit (`gh pr merge --merge`) instead of squash. Disclosed in `integrated.md` §7 and `phase-3.md` §6.
- The representative cell has one zero-commit fight (`gale_moth v emberwing`, seed `20261146`) caused by controller cadence resonance. It is tolerated under AC-11 with a named follow-up; no bound, gate, controller, species, or resolver was changed to hide it.
- Risk: cadence resonance may reappear for other pairings if the fixture is expanded; the 42-fight budget and pairing walk are unchanged, so this PR does not alter that exposure.

## Follow-ups

- Separate investigation of controller decision-cadence resonance behind the named zero-commit artifact (no issue tracker entry; `review.issues.enabled=false`).

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```

No migration, feature flag, data change, or schema change is involved; reverting the merge restores the historical telemetry gate and bounds.
