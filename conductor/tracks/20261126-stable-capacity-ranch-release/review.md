# Review: Decide stable capacity, ranch expansion, and pet release

- **Track:** `20261126-stable-capacity-ranch-release`
- **Type:** chore
- **Branch:** `chore/20261126-stable-capacity-ranch-release`
- **Range:** `d6502929052316b9b595671eae90fbc1fafc6700..e482aad2c8bb0e3ea8879888b0f8c298977959de`
- **Date:** 2026-11-26T10:47:50.1389502+11:00
- **Verdict:** PASS WITH FINDINGS

## Summary

The doc-only chore correctly ratifies the three owner decisions, aligns `docs/save-schema.md` with `SAVE_VERSION = 26`, preserves historical `v25` references, records the revisit trigger and roadmap-only follow-up policy, and stays confined to Conductor state plus the two approved docs. One Medium doc-truth gap remains: the newly current `GameState at v26` header is not backed by a `v25 → v26` migration-table row. Strict mode requires this to be fixed or explicitly owner-overridden before the PR opens; no override was requested.

## Verification

| Layer | Command / source | Result |
| --- | --- | --- |
| Phase 1 | `bun run verify`; `bun run build`; primary chained re-run | exit 0 each |
| Phase 2 | `bun run verify` | exit 0; `4531 pass / 1 skip / 0 fail`, `675694 expect()` calls, 443 files [164.18s]; Biome 1054 files, no fixes; determinism green for 21 archetypes × 3 stages + 5 props |
| Phase 2 | `bun run build` | exit 0; 441 modules; only pre-existing chunk advisory |
| Integrated | `(bun run verify && bun run build)` primary re-run | exit 0; determinism green; `index-DADRLmAJ.js` |
| Module caps | `bun test` across four `module-size.test.ts` files | `22 pass / 0 fail` |
| Scope | `git diff --name-status d6502929..e482aad2` | 10 files, all Conductor state or the two approved docs |
| Code truth | `packages/sim/src/save/schema.ts:5` | `SAVE_VERSION = 26` |
| Visual | Not applicable | No user-facing code changed |

## Requirements

| ID | Status | Note |
| --- | --- | --- |
| FR-1 | covered | Unlimited stable in product note and save-schema stable row |
| FR-2 | covered | One active `creature`, rest frozen in `stable` |
| FR-3 | covered | No release path; retirement/breeding remain lifecycle |
| FR-4 | partial | v26 version markers correct, but migration table ends at `v24 → v25` — see F1 |
| FR-5 | covered | Revisit trigger and roadmap-Later-only policy in integrated evidence |
| FR-6 | covered | Full gate, doc truth, doc-only diff |
| NFR-1 | covered | No `apps/**` or `packages/**` diff |
| NFR-2 | covered | No dependency/lockfile/generated/determinism-hash change; gates green |
| NFR-3 | covered | Edits ratify decided policies; no new rule |
| NFR-4 | covered | Stable IDs mapped across spec, plan, and evidence |
| AC-1 | covered | product.md ratification note |
| AC-2 | partial | v26 markers and stable row correct; migration history gap — F1 |
| AC-3 | covered | ~40 pets / multi-partner trigger and new-track-with-save-review rule |
| AC-4 | covered | Diff-scope proof |
| AC-5 | covered | Full gate results |
| AC-6 | partial | No stale `current: 25` remains, but v26 migration row missing — F1 |
| AC-7 | partial | Gate/diff/module-cap portion proven; registry `[x]`, archived metadata, committed `review.md`, PR open and RM-7 retirement are owned by completion |

## Findings

### Critical

None.

### High

None.

### Medium

- **F1 — `docs/save-schema.md:18,156` — v26 header lacks v25→v26 migration row.** The diff changes the current-version marker and header to v26, but the migration table still ends at `v24 → v25`. Code truth in `packages/sim/src/save/migrations/v25.ts` implements a material v25→v26 stat fold: HP absorbs the 210% arena scale via `round(hp*21/10)`, trained HP folds and clamps to the scaled cap of 13, ATK/DEF/SPD and other fields forward untouched, and frozen cup-session sides gain `doctrine`. Without a row, a reader of the `at v26` reference cannot reconstruct the shipped v26 save contract. **Fix:** add a `v25 → v26` row to the migration table sourced from that migration; add a doc-truth note that the terminal migration row matches the current `GameState at v<N>` header. **Requirement:** FR-4/AC-2/AC-6. **Test gap:** evidence note pinning terminal migration row to current header.

### Low

None.

## Overrides

None. Strict mode requires F1 to be fixed before PR; no owner override was requested.

## Plan compliance

Both phases are verified with checkpoints `35dc87a8` and `208ddff0`; all four tasks are checked off. The pre-completion partial AC-7 is by lifecycle design, not a plan defect. The Phase 1 product-doc edits were drafted by the phase agent and applied by the primary because agent policy forbids editing `conductor/**` outside verification; this is recorded in Phase 1 deviations. The Phase 2 "9 files" diff line was corrected to 10 in primary verification.

## Out of scope

Stale run files and tracked `.conductor` artifacts from earlier tracks are not findings of this track. The hardware device lab (RM-2) and roster expansion (RM-9) remain future roadmap work.

## Debt

None permanent. F1 is to be resolved in review-fix phase R1, not deferred.

## Doc sync

`updated` — product ratification and save-schema version/policy were applied with owner approval; product-guidelines, tech-stack and workflow need no change. The roadmap row remains linked until completion retires it.

## History

| Round | Verdict | Critical | High | Medium | Low |
| --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 |
