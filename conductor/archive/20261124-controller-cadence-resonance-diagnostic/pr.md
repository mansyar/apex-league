## Summary

This evidence-only chore characterizes the controller cadence resonance first observed by the telemetry re-stratification track. It reproduces the frozen baseline, counts the exact resonance event set on both the 42-fight representative gate and the 1680-fight matrix, traces the mechanism for all 13 events, and hands the owner a ranked options table with the tolerate baseline. No runtime, bound, fence, sample, gate, controller constant, dependency, or deployment changed; the tolerate-versus-change decision remains explicitly deferred.

## Track

- **ID:** `20261124-controller-cadence-resonance-diagnostic`
- **Type:** `chore`
- **Spec:** [`conductor/archive/20261124-controller-cadence-resonance-diagnostic/spec.md`](conductor/archive/20261124-controller-cadence-resonance-diagnostic/spec.md)
- **Plan:** [`conductor/archive/20261124-controller-cadence-resonance-diagnostic/plan.md`](conductor/archive/20261124-controller-cadence-resonance-diagnostic/plan.md)
- **Review:** [`conductor/archive/20261124-controller-cadence-resonance-diagnostic/review.md`](conductor/archive/20261124-controller-cadence-resonance-diagnostic/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Frozen baseline and resonance inventory | Reproduce the frozen readings and count the exact resonance event set on the gate and matrix with a deterministic gitignored scanner | verified | `4b7d83a9` | Three subagent command denials resolved by primary; scanner reruns byte-identical (SHA-256 `FB052240...F122F3`). |
| 2: Mechanism decomposition and ranked decision options | Trace all 13 events at decision-tick resolution and rank owner-facing options without implementing any | verified | `c61a5fde` | Scratch-only TDZ repair; trace shows `inBandTicks=0` and `commitOrders=0` for every event; all events are resonance, not stat-bound violations. |
| 3: Freeze proof, integrated evidence, dated product pointer | Prove the full check suite green and the source diff empty, then commit integrated evidence and defer the decision | verified | `99ea923a` | Four subagent denials resolved by primary; dated `product.md` note committed at `2879fd0b`. |
| R1: Review fixes | Correct the frozen AC mapping and report heading numbering | verified | `98665a55` | Two round-1 findings (F1 High, F2 Low) fixed and re-reviewed PASS. |

## Requirements

- [x] `FR-1` — first-class baseline reproduction (test: `conductor/archive/20261124-controller-cadence-resonance-diagnostic/verification/phase-1.md`)
- [x] `FR-2` — deterministic gitignored resonance scanner (test: `verification/phase-1.md` §3)
- [x] `FR-3` — per-event inventory with counts and uniqueness statement (test: `verification/phase-1.md` §4)
- [x] `FR-4` — per-event decision-tick mechanism decomposition (test: `verification/phase-2.md` §3–4)
- [x] `FR-5` — ranked options table with tolerate baseline and per-option fields (test: `verification/phase-2.md` §5)
- [x] `FR-6` — freeze proof with all checks green and empty source diff (test: `verification/phase-3.md` §1–4)
- [x] `FR-7` — committed integrated evidence and dated product pointer (test: `verification/integrated.md`, `conductor/product.md`)
- [x] `NFR-1` — empty `packages`/`apps` diff
- [x] `NFR-2` — frozen constants, bounds, fences, sample, smoke semantics, species bands, controller constants, reach tables, and body profiles unchanged
- [x] `NFR-3` — no dependency, manifest, schema, API, CORS, deploy, client, or server change
- [x] `NFR-4` — scratch confined to gitignored `.conductor/evidence/...`
- [x] `NFR-5` — no credentials, player data, or remote mutation
- [x] `NFR-6` — all configured checks exit 0 with hash `0xff6f3d62`
- [x] `NFR-7` — Google TS style in scratch, Biome authoritative
- [x] `NFR-8` — 42-fight/one-seed budget fixed, no shipped runtime work
- [x] `AC-1` — baseline record with named artifact and mechanism
- [x] `AC-2` — deterministic scanner with gate and matrix counts
- [x] `AC-3` — committed resonance inventory
- [x] `AC-4` — per-event mechanism decomposition
- [x] `AC-5` — ranked options with tolerate baseline, none implemented
- [x] `AC-6` — freeze/scope proof
- [x] `AC-7` — integrated evidence with accurate AC-1..AC-10 mapping
- [x] `AC-8` — dated product note deferring the decision
- [x] `AC-9` — final scope boundary proof
- [x] `AC-10` — no fix, re-pin, bound, gate, or sample change

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit / types / lint | `bun run verify` | pass — 4462 pass, 1 skip, 0 fail, hash `0xff6f3d62` | `conductor/archive/20261124-controller-cadence-resonance-diagnostic/verification/integrated.md` |
| build | `bun run build` | pass — Vite, 438 modules | `verification/phase-3.md` §1 |
| balance | `bun run balance` | pass — `370/1680 (22.0%)` caps, 33/33 gates ok | `verification/phase-3.md` §1 |
| determinism | `bun run gate:determinism` | pass — 21 species x 3 stages and 5 props byte-identical | `verification/phase-3.md` §1 |
| fuzz | `bun run test:fuzz` | pass — 139 pass, 0 fail, 129015 expect(), 135 files | `verification/phase-3.md` §1 |
| representative gate | `bun run telemetry` | pass — cap `5/42`, engagement `340/946/6061`, 14/14 bounds ok | `verification/phase-1.md` §1 |
| historical smoke | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | pass — SMOKE header, cap `11/42`, engagement `345/1102/3992` | `verification/phase-3.md` §1 |
| fixture audit | `bun run fixture-audit` | pass — cells `11/8/7/5`, `+12.5 points` | `verification/phase-3.md` §1 |
| whitespace / scope | `git diff --check dcbe314a..HEAD`; `git diff --quiet dcbe314a..HEAD -- packages apps` | pass — both exit 0 | `verification/integrated.md` §7 |

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 2 findings (F1 frozen AC mapping, F2 heading numbering)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Several verification commands were permission-denied inside phase subagents; the primary ran each unchanged, recorded first-class exit-0 output, and the subagents reconciled the reports. No command was rephrased or worked around.
- The phase-2 trace scratch script had a self-shadowing TDZ `ReferenceError`; only the gitignored scratch was repaired by renaming the function to `replayMatchup`. No tracked source changed.
- Review round 1 found that the final AC tables relabeled frozen IDs AC-6..AC-9; Phase R1 restored the exact `spec.md` definitions and re-review confirmed PASS. No evidence value changed.
- The sole representative-gate resonance event and the 12 matrix events are a real controller/doctrine interaction at the current cadence, not a test error. The risk of implementing any option without a product decision is why no fix was attempted here.

## Follow-ups

- Owner decision: tolerate the artifact under AC-11, or authorize a future controller-family change from the ranked options in `verification/integrated.md` §5. Do not re-propose a bare global `DECISION_MS` change without new data; `20261117-global-pacing` rejected those rungs.
- No GitHub issue is opened because `review.issues.enabled=false`; the decision is recorded in `conductor/product.md`.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No migration, feature flag, or data rollback is needed: this track changes no runtime or persisted state.
