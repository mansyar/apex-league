# Review: Boss Discovery Balance Probes

- **Track:** `20261124-boss-discovery-balance-probes`
- **Type:** chore
- **Branch:** `chore/20261124-boss-discovery-balance-probes`
- **Range:** `6e4b3893971832ae652a9d21713e906e9e4be459..691a943d`
- **Date:** `2026-11-25T01:38:08.8125301+11:00`
- **Verdict:** **PASS**

## Summary

The new probe covers exactly the nine discovery species without an existing authored-boss matrix, reuses the frozen production methodology, enforces the approved fresh/cap gates, and emits the complete opt-in matrix. Every gate passed, so no production balance data was tuned. The only code change is the new 309-line probe.

Strict mode found two Low evidence/state accuracy issues: all nested plan subtasks remained unchecked, and the saved matrix artifacts differed only by line endings despite byte-identical wording. Phase R1 reconciled all 26 nested subtasks and normalized the matrices; the focused re-review returned PASS with both findings resolved.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --timeout 120000` | pass: 4468 pass, 1 skip, 0 fail; 670519 expects | `verification/integrated.md` |
| phase tests | `bun test --check --parallel=4 --timeout 120000` | pass: 4468 pass, 1 skip, 0 fail; hash `0xff6f3d62` | `verification/phase-2.md` |
| focused | `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | pass: 6 pass, 0 fail | `verification/phase-1.md` |
| reviewer focused | same focused command | pass: 6 pass, 0 fail, 12 assertions, 386 ms | reviewer report |
| report | `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | pass: all 216 cells; 56 normalized rows | `verification/integrated.md` |
| existing balance | six existing balance suites | pass: 35 pass, 0 fail | `verification/phase-1.md` |
| lint/format | `bunx biome check packages/sim/src/battle/species-discovery-boss.balance.test.ts` | pass: 1 file clean | `verification/phase-1.md` |
| typecheck | `bun run check` | pass: voxel/sim/server/client | `verification/phase-1.md` |
| build | `bun run build` | pass; existing chunk advisory only | `verification/phase-3.md` |
| balance | `bun run balance` | pass: 21 species, 1680 fights, cap `370/1680` (22.0%) | `verification/phase-3.md` |
| determinism | `bun run gate:determinism` | pass | `verification/phase-3.md` |
| fuzz | `bun run test:fuzz` | pass: 139 pass, 0 fail | `verification/phase-3.md` |
| verify | `bun run verify` | exit 1 twice; sole `gatekeeper-reach` load timeout; approved isolated fallback passed 1/1 | `verification/phase-3.md` |
| scope | corrected implementation-scope diff | pass | `verification/integrated.md` |
| whitespace/tree | `git diff --check`, `git status --porcelain` | pass / empty | `verification/phase-3.md`, `verification/phase-R1.md` |
| branch/base | branch check + `git merge-base --is-ancestor` | pass | primary review |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | exact target/exclusion assertions; `phase-1.md` | covered |
| FR-2 | P1.T1 | frozen constants; production builder/resolver path | covered |
| FR-3 | P1.T2 | fresh/cap gates; focused 6/6 | covered |
| FR-4 | P1.T2 | opt-in 9x6x4 report; repeated matrix content | covered |
| FR-5 | P1.T3, P2 | baseline matrix; no-tuning decision; frozen data diff | covered |
| FR-6 | P1.T3, P2, P3 | existing 35 tests; frozen data/tests; balance pass | covered |
| FR-7 | P3 | integrated evidence, final matrix, hash | covered |
| FR-8 | P3 | no balance-data change; doc-sync none | covered |
| NFR-1 | P1, P3 | one-file code diff; corrected scope pass | covered |
| NFR-2 | P1, P3 | fixed grid; production resolver; repeated report | covered |
| NFR-3 | P2, P3 | six balance files byte-identical; 35 pass | covered |
| NFR-4 | P1, P3 | no dependency/config diff; Biome pass | covered |
| NFR-5 | P3 | local-only evidence; no credentials/remote mutation | covered |
| NFR-6 | P2, P3 | configured checks; approved verify fallback; serial pass; hash unchanged | covered |
| NFR-7 | P1 | bounded loops; report opt-in; focused 386 ms | covered |
| NFR-8 | P3 | one new probe; no production-source change | covered |
| AC-1 | P1.T1 | exact nine targets and exclusions | covered |
| AC-2 | P1.T1 | fixed methodology assertions | covered |
| AC-3 | P1.T2 | fresh/cap gates; 54 cap cells | covered |
| AC-4 | P1.T2, P3 | complete report; all three matrices share object ID `f0e41cb9…` after R1 | covered |
| AC-5 | P1.T3, P2 | pre-tuning baseline and no-tuning result | covered |
| AC-6 | P2, P3 | frozen existing files/pins and green suites | covered |
| AC-7 | P3 | checks and fallback recorded; hash unchanged | covered |
| AC-8 | P3 | surgical scope; no unrelated changes | covered |
| AC-9 | P3.T4 | integrated full mapping | covered |
| AC-10 | P3.T4 | clean tree and diff-check | covered |

## Findings

### Critical

None.

### High

None.

### Medium

None.

### Low

- **F1 — Nested plan subtasks remained unchecked (fixed in Phase R1).** `plan.md` shows every parent task and phase verified, but all 26 nested checkboxes remain `[ ]`, including conditional Phase 2 work that was explicitly not triggered. Mark applicable completed subtasks `[x]` and mark non-triggered conditional work `N/A` (or remove nested checkboxes if only parent tasks are tracked).
- **F2 — Matrix identity was EOL-normalized, not byte-identical (fixed in Phase R1).** `integrated.md` and `phase-3.md` call the Phase 1/2/3 normalized matrices byte-identical. The saved Phase 1 artifact uses LF while Phase 2/3 use CRLF: object IDs are `f0e41cb9...` vs `35076a16...`; `git diff --no-index --ignore-space-at-eol` is clean, ordinary byte diff is not. Normalize Phase 2/3 artifacts to the Phase 1 newline convention and record a byte-level comparison, or revise every claim to EOL-normalized text identity with the exact comparison recorded.

## Overrides

None.

## Plan compliance

All three phases are verified with Result/Checkpoint/Evidence and all 12 top-level tasks are checked. Implementation scope is compliant: one new probe plus Conductor artifacts, with no balance-data or existing-test changes. All 26 nested Phase 1–3 subtasks are now reconciled: 23 completed and 3 explicitly N/A. Phase R1 is verified at `691a943d`; F1 and F2 are resolved.

## Out of scope

No production balance tuning, boss/species identity change, new dependency, schema/API/deploy change, product direction change, or hardware work was performed.

## Debt

None.

## Doc sync

`none` — Phase 2 proved no balance-data change, so `conductor/product.md` and `conductor/tech-stack.md` correctly remain untouched.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 2 | 0 (Phase R1 pending) |
