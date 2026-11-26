# Review: Decide stable capacity, ranch expansion, and pet release

- **Track:** `20261126-stable-capacity-ranch-release`
- **Type:** chore
- **Branch:** `chore/20261126-stable-capacity-ranch-release`
- **Range:** `d6502929052316b9b595671eae90fbc1fafc6700..0c76ce36`
- **Date:** 2026-11-26T11:04:48.7977778+11:00
- **Verdict:** PASS

## Summary

The doc-only chore ratifies the three owner decisions (unlimited stable, exactly one active ranch partner, no release seam), aligns `docs/save-schema.md` with `SAVE_VERSION = 26`, preserves historical `v25` references, records the revisit trigger and roadmap-only follow-up policy, and stays confined to Conductor state plus the two approved docs. Round 1 found one Medium doc-truth gap (missing `v25 → v26` migration row); R1 added the source-accurate row and closed it. Round 2 found one Low metadata-progress inconsistency; the primary reconciled the counters and the reviewer confirmed `PASS`. No findings remain open; AC-7's terminal Conductor proof is intentionally owned by the completion step and was accepted by the reviewer as not a defect.

## Verification

| Layer | Command / source | Result |
| --- | --- | --- |
| Phase 1 | `bun run verify`; `bun run build`; primary chained re-run | exit 0 each |
| Phase 2 | `bun run verify` | exit 0; `4531 pass / 1 skip / 0 fail`, `675694 expect()` calls, 443 files [164.18s]; Biome 1054 files, no fixes; determinism green for 21 archetypes × 3 stages + 5 props |
| Phase 2 | `bun run build` | exit 0; 441 modules; only pre-existing chunk advisory |
| Integrated | `(bun run verify && bun run build)` primary re-run | exit 0; determinism green; `index-DADRLmAJ.js` |
| Module caps | `bun test` across four `module-size.test.ts` files | `22 pass / 0 fail` |
| R1 | `bun run verify`; `bun run build`; primary chained re-run | exit 0 each; `4531 pass / 1 skip / 0 fail`, Biome clean, determinism green, `index-DADRLmAJ.js` |
| Scope | `git diff --name-status d6502929..0c76ce36` | Conductor state plus `conductor/product.md` and `docs/save-schema.md`; no `apps/**` or `packages/**` change |
| Code truth | `packages/sim/src/save/schema.ts:5`; `packages/sim/src/save/migrations/v25.ts` | `SAVE_VERSION = 26`; documented fold matches migration source |
| Visual | Not applicable | No user-facing code changed |

## Requirements

| ID | Status | Note |
| --- | --- | --- |
| FR-1 | covered | Unlimited stable in product note and save-schema stable row |
| FR-2 | covered | One active `creature`, rest frozen in `stable` |
| FR-3 | covered | No release path; retirement/breeding remain lifecycle |
| FR-4 | covered | v26 markers correct and migration table now terminal at `v25 → v26` |
| FR-5 | covered | Revisit trigger and roadmap-Later-only policy in integrated evidence |
| FR-6 | covered | Full gate, doc truth, doc-only diff |
| NFR-1 | covered | No `apps/**` or `packages/**` diff |
| NFR-2 | covered | No dependency/lockfile/generated/determinism-hash change; gates green |
| NFR-3 | covered | Edits ratify decided policies; no new rule |
| NFR-4 | covered | Stable IDs mapped across spec, plan, and evidence |
| AC-1 | covered | product.md ratification note |
| AC-2 | covered | v26 markers, stable row and complete migration history |
| AC-3 | covered | ~40 pets / multi-partner trigger and new-track-with-save-review rule |
| AC-4 | covered | Diff-scope proof |
| AC-5 | covered | Full gate results, including R1 re-run |
| AC-6 | covered | No stale `current: 25` claim; doc-truth invariant re-established |
| AC-7 | partial by design | Gate/diff/module-cap portion proven; registry `[x]`, archived metadata, committed `review.md`, PR open and RM-7 retirement are owned by completion and were accepted as not a defect |

## Findings

### Critical

None.

### High

None.

### Medium

None open. F1 (v26 header lacked `v25 → v26` migration row) was fixed in review-fix phase R1 at checkpoint `9bc8592c`; the row in `docs/save-schema.md:157` was cross-checked against `migrateFromV25` and the reviewer confirmed `fixed`.

### Low

None open. F2 (metadata progress counters omitted the R1 phase and its two tasks) was fixed at `0c76ce36`: `progress` now reads `3/3` phases and `6/6` tasks, matching `plan.md`. The reviewer confirmed `fixed` with `new_findings: []`.

## Overrides

None. Both findings were fixed rather than deferred.

## Plan compliance

All three phases (Phase 1, Phase 2, Phase R1) are verified with checkpoints `35dc87a8`, `208ddff0` and `9bc8592c`; all six top-level tasks are checked off. `metadata.progress` was reconciled to `3/3` phases and `6/6` tasks. The pre-completion partial AC-7 is by lifecycle design, not a plan defect. The Phase 1 product-doc edits were drafted by the phase agent and applied by the primary because agent policy forbids editing `conductor/**` outside verification; this is recorded in Phase 1 deviations. The Phase 2 "9 files" diff line was corrected to 10 in primary verification.

## Out of scope

Stale run files and tracked `.conductor` artifacts from earlier tracks are not findings of this track. The hardware device lab (RM-2) and roster expansion (RM-9) remain future roadmap work.

## Debt

None. F1 and F2 were resolved in this review cycle; no follow-up was deferred. A future reversal of the stable/ranch decision requires a new track with save and migration review, as recorded in the revisit trigger.

## Doc sync

`updated` — product ratification and save-schema version/policy were applied with owner approval; product-guidelines, tech-stack and workflow need no change. The roadmap row remains linked until completion retires it.

## Re-review

- **Round 2 (delta `26d30cb4..20a9e984`):** F1 `fixed`; AC-2 and AC-6 advanced to covered; AC-7 partial accepted by design. New Low F2 recorded on metadata progress.
- **Final confirmation (`20a9e984..0c76ce36`):** F2 `fixed`, `new_findings: []`, reviewer verdict `PASS`.

## History

| Round | Verdict | Critical | High | Medium | Low |
| --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 |
| 2 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 |
| Final | PASS | 0 | 0 | 0 | 0 |
