# Review: Sim & Voxel Size Guard + Save-Migration Decomposition

- **Track:** `20261022-sim-voxel-size-guard`
- **Type:** `refactor`
- **Branch:** `refactor/20261022-sim-voxel-size-guard`
- **Range:** `06a82fce96271fc6b857a0735b39cdf663a057c3..bf63fd7`
- **Date:** 2026-10-22
- **Verdict:** `PASS WITH FINDINGS`

## Summary

A well-executed pure refactor. All 24 save-migration steps were moved verbatim, the five oversized sim modules were split along their existing seams with byte-identical public barrels, and both new package guards are real, cheap, cap-accurate and self-proving. The reviewer independently reproduced every configured check (2340 tests, typecheck, `biome check` on 547 files, the determinism gate, the build) and re-derived the base-commit comparison rather than trusting the primary's differential - every step body is verbatim identical, and the load-time validator gate and the clock's `HitContext` threading are unchanged. No Critical, High or Medium findings: no behaviour change, no public-surface change, no import cycle, no save-schema change. Three Low findings remain, all about documentation and plan fidelity rather than behaviour. This project runs `review.strict: true`, so all three are fixed in the review-fix phase rather than deferred.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --timeout 120000` | pass | 2340 pass, 1 skip, 0 fail, 90,778 expect() calls across 176 files. Baseline was 2330 - the +10 are the two new guard suites. |
| coverage | not configured (`coverage.gate: "none"`) | n/a | No coverage leg exists in this repo; test adequacy was judged behaviourally. |
| lint | `biome check` | pass | 547 files checked, 0 errors, 0 warnings. |
| format | `biome check` (not auto-format) | pass | Same run; no formatting diffs. |
| typecheck | `bun run check` | pass | `@apex/voxel` 72 files, `@apex/sim` 144 files, `@apex/client` 349 files - no type errors. |
| build | `bun run build` | pass | `@apex/client` built, 291 modules transformed, 740 ms. |
| determinism | `bun run gate:determinism` | pass | 14 digests byte-identical at seed 42 (12 creature GLBs + 5 props). |
| integrated | `bun run verify` | pass | typecheck + whole-repo tests + lint + determinism gate, all green. |
| guards | `bun test --timeout 120000 module-size` | pass | 15 pass, 0 fail across the client, sim and voxel guards; the two new guards run in 127 ms combined (NFR-4's budget is 2 s). |

Volume strategy: the code diff is large (50 files, +4,299/-3,286 excluding `conductor/`), so the review ran per phase checkpoint - Phase 1 `8a2c213..e2a7350`, Phase 2 `97374fd..ac4fbda`, Phase 3 `0027d67..1305de1` - and then a cross-phase integration diff `06a82fc..HEAD`.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P3.T1 | `packages/sim/src/module-size.test.ts`; primary probe with a 12,998 B module in the real tree exits 1 and names the offender | covered |
| FR-2 | P3.T2 | `packages/voxel/src/module-size.test.ts`; primary probe with a 24,998 B module exits 1 | covered |
| FR-3 | P1.T1 | `save/migrate.ts` 1,370 B; 24 step modules + a barrel under `save/migrations/` | covered |
| FR-4 | P2.T1..T5 | independent `git ls-tree -r -l` size sweep - no non-test sim module over 12,288 B (largest `bosses.ts` 11,654 B) | covered |
| FR-5 | P1.T2 | `save/migrations.test.ts`; removing a step from the record fails 35 assertions | covered |
| FR-6 | P2.T6 | export-name differential 11/19/28/32/7 names, 0 added, 0 removed; `src/index.ts` and `battle/index.ts` byte-identical | covered |
| FR-7 | P3.T3 | `git diff --name-only <base>..HEAD -- packages/voxel` returns only the new guard test | covered |
| NFR-1 | P1.T1, P2.T1..T5 | reviewer's own verbatim read of the base monoliths against the new modules - 0 differences; primary's 600-scenario clock differential - 0 mismatches; 2340 passing tests | covered |
| NFR-2 | all phases | `bun run gate:determinism` - 14 digests byte-identical | covered |
| NFR-3 | all phases | `package.json`, `bun.lock` and both package manifests untouched | covered |
| NFR-4 | P3.T1, P3.T2 | 127 ms combined; fixtures in an OS temp dir, removed in a `finally`; `existsSync(dir) === false` asserted | covered |
| NFR-5 | all phases | `bun run check` clean; 0 hits for `any` / `as any` / `@ts-ignore` in changed files | covered |
| NFR-6 | all phases | `biome check` clean at 547 files; 0 `export default`; explicit return types on every new export | covered |
| NFR-7 | P1.T1, P2.T2..T5 | 0 modules import their own barrel; `legacy` -> `breeding` stays one-way | covered |
| AC-1 | P3.T1 | guard green; negative control rejects a synthetic oversized module and removes the fixture | covered |
| AC-2 | P3.T2 | 24,576 accepted / 24,577 rejected asserted | covered |
| AC-3 | P1.T1 | `save/migrate.ts` 1,370 B; `bun run verify` green | covered |
| AC-4 | P2.T1..T5 | all five modules under 12,288 B | covered |
| AC-5 | P1.T2 | suite green; fails if a step is removed | covered |
| AC-6 | P2.T6, P1.T1, P3.T1, P3.T2 | `bun run check` green in all three workspaces; the only `*.test.ts` hits are the three new files | covered |
| AC-7 | P3.T3 | only the new voxel guard test under `packages/voxel` | covered |
| AC-8 | all phases | determinism gate green, committed hashes unchanged | covered |
| AC-9 | all phases | `bun run verify` green end to end | covered |

## Findings

### Critical

- none

### High

- none

### Medium

- none

### Low

- **F1 - `save/validators.ts` barrel forwards only 2 of the 8 validators, and shares its base name with the `save/validators/` folder beside it**
  - **File:** `packages/sim/src/save/validators.ts:1-19`
  - **What:** the plan's P2.T1 said the eight `isValid*` helpers move to `save/validators.ts`. The tree has a different shape: `save/validators.ts` is a 19-line barrel that forwards only `isValidSaveState` and `isValidSession` from `save/validators/session.ts`, while the other six live in `save/validators/creature.ts` and `save/validators/session.ts`. The result is a file and a directory sharing the base name `validators` in the same folder, and a barrel whose name suggests the whole validator surface while covering two of eight.
  - **Why:** no functional impact today - TypeScript, Bun and Vite all resolve `./validators` to `save/validators.ts` file-first, which is why the typecheck, the tests and the client build pass. The cost is clarity and plan fidelity: the plan, the file name and the folder name all claim the same noun, and a reader looking for "the validators" at `save/validators.ts` finds an incomplete forwarder.
  - **Fix:** pick one owner for the name. Either move the barrel to `save/validators/index.ts` and drop `save/validators.ts` (the specifier `./validators` in `save/storage.ts:15` stays the same, and it matches the `save/migrations/index.ts` pattern Phase 1 introduced), or rename the two implementation modules to flat siblings and keep `save/validators.ts` as the single barrel re-exporting all eight helpers.
  - **Requirement:** FR-4
  - **Test gap:** none
- **F2 - the save-schema doc points at the migrations folder for `migrate(raw)`, which now lives in `save/migrate.ts`**
  - **File:** `docs/save-schema.md:124`
  - **What:** the migration-chain lead-in reads "`migrate(raw)` walks the chain one step at a time (`packages/sim/src/save/migrations/`)". After Phase 1 the walk itself lives in `packages/sim/src/save/migrate.ts` (the `migrate()` driver); `packages/sim/src/save/migrations/` holds only the per-version step modules and the `migrations` record barrel. The pre-track text pointed at `migrate.ts`, which was correct - the repoint moved the pointer onto the wrong file for the sentence's subject.
  - **Why:** this is the developer entry point for adding a migration. A reader following the pointer for `migrate(raw)` lands in a folder with no `migrate` function in it, and the real driver stays unmentioned. The second changed line - the "add a migration" checklist, now naming `packages/sim/src/save/migrations/` - is correct, because the record does live there.
  - **Fix:** name both files - "`migrate(raw)` (`packages/sim/src/save/migrate.ts`) walks the chain one step at a time (`packages/sim/src/save/migrations/`)". Optionally make the checklist line name the exact file, `packages/sim/src/save/migrations/index.ts`, and mention that a new version adds a `v<N>.ts` step module.
  - **Requirement:** FR-3
  - **Test gap:** none
- **F3 - the plan's Phase 2 `Touches` list was never reconciled with the accepted `save/validators/**` deviation**
  - **File:** `conductor/tracks/20261022-sim-voxel-size-guard/plan.md` (Phase 2 - Touches)
  - **What:** Phase 2's declared `Touches` names `save/storage.ts` and `save/validators.ts` but not `save/validators/**`, so the two implementation modules the phase actually added fall outside the declared scope. Both were accepted as deviations in `verification/phase-2.md`, but plan.md was never reconciled, so the phase contract on disk does not match the tree it produced.
  - **Why:** Conductor's scope contract is the mechanism that keeps a phase from quietly widening. Leaving the plan understated makes the next phase's "no file outside the phase contract" check unreliable and hides a real structural choice from anyone reading the plan rather than the verification note.
  - **Fix:** amend the Phase 2 `Touches` list to include `save/validators/**` (and, if it is to be recorded, the new role of the `save/validators.ts` barrel), or fold the note into the plan's deviation section. plan.md is Conductor state - the primary owns that edit, not the phase subagent.
  - **Requirement:** none
  - **Test gap:** none

## Overrides

- none

## Plan compliance

All three planned phases are complete, each with a `Result`, a `Checkpoint` and an `Evidence` path:

| Phase | Result | Checkpoint | Evidence |
| --- | --- | --- | --- |
| 1 - Save-Migration Decomposition | verified | `e2a7350` | `verification/phase-1.md` |
| 2 - Sim Module Splits | verified | `ac4fbda` | `verification/phase-2.md` |
| 3 - The Package Guards | verified | `1305de1` | `verification/phase-3.md` |
| R1 - Review Fixes | verified | `0db693c` | `verification/phase-R1.md` |
| R2 - Review Fixes (round 2) | verified | `c2e70cd` | `verification/phase-R2.md` |

All 13 top-level tasks and all 51 sub-tasks are marked `[x]`, and every one of them was implemented - the reviewer checked the tree against the plan task by task. The final code diff stays inside the union of the phases' `Touches` except for the two deviations accepted in `verification/phase-2.md` (`save/validators/creature.ts` + `save/validators/session.ts`, and `battle/clock/hits.ts`), both of which are inside the phase's glob-covered neighbourhoods and are recorded in the evidence. No task was silently dropped. The review-fix phase is appended below. Round 2 re-reviewed the R1 fixes and raised one new Low finding (F4) — the two validator headers citing the deleted `save/validators.ts` — fixed by Phase R2 (`c2e70cd`).

## Out of scope

- The `packages/voxel/scripts/*` files are not covered by the voxel guard. FR-2 asks for `packages/voxel/src` literally and the spec's Goal holds anyway - every script is under 4,655 B - so no finding is raised. Recorded here so it is a decision, not an oversight.
- FR-6's guarantee is verified one-time (byte-identical barrels, a mechanical export-name differential, typecheck) rather than by a committed regression test, so a future edit could change the public surface with no test failing. The spec's Scope does not ask for such a guard and P2.T6 defines the byte-identity check as the verification, so this is not a finding - it is a natural follow-up.
- The 142 production modules with no co-located test stay as they are; the spec puts them out of scope.

## Debt

- none - `review.strict` is `true` for this project, so all three Low findings are fixed in the review-fix phase rather than deferred, and `review.issues.enabled` is `false`, so no issues are filed.

## Doc sync

`updated` - the pre-review doc sync already ran (`conductor/tech-stack.md`
dated note + the three caps in its Quality Gates; `conductor/workflow.md`
module-size rule and checklist item). The review loop repointed the
`docs/save-schema.md` lead-in and recipe (F2 + the adjacent item 3, Phase R1)
and the tech-stack/workflow compositions unchanged through round 2 (the F4
fix was comment-only). Nothing further to sync after round 2; nothing the
diff changed remains undocumented.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 3 | 0 |
| 2 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 (F4, fixed by Phase R2) | 1 |
