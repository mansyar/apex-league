# Phase 2 Verification — Conditional Targeted Balance Tuning

- Track: `20261124-boss-discovery-balance-probes`
- Branch: `chore/20261124-boss-discovery-balance-probes`
- Track base: `6e4b3893971832ae652a9d21713e906e9e4be459`
- Phase base: `cad7fb53a07a15cb9704e2d4b4ea55b5b8ee2b22`
- Phase 1 checkpoint: `cd136a46`
- Verdict: **VERIFIED** — every required check passed, the final matrix is byte-identical to Phase 1, and no tuning was made.

## No-tuning decision

Phase 1 passed every approved fresh/cap gate, including the focused 6/6 suite, all 35 existing balance tests, typecheck, byte-identical repeated report matrices, and the unchanged battle hash. Phase 2 therefore had no measured failure requiring a balance-data change.

No edit was made to:

- `packages/sim/src/species/discovery.ts`
- `packages/sim/src/bosses.ts`

The scoped `git diff --quiet` check from the track base to the pre-evidence HEAD exited 0 with no output, proving both files are byte-identical to the track base. A second scoped check from the Phase 2 base also exited 0 for both data files and the focused probe, proving no Phase 2 code or test edit.

The decision is **no tuning required**. Speculative tuning would reopen an already-green balance surface and is explicitly out of scope.

## Before/after matrix identity

- Phase 1 baseline: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/baseline-matrix.txt`, a normalized 56-line payload covering all 216 species/boss/level cells.
- Phase 1 raw reports: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/report-run-1.txt` and `report-run-2.txt`; Phase 1 verified byte-identical normalized payloads.
- Phase 2 raw report: `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/report-run.txt`.
- Phase 2 normalized matrix: `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/final-matrix.txt`.
- Identity conclusion: **proven**. The primary ran the exact report-mode command unchanged; it exited 0, and its normalized 56-line payload is byte-identical to `baseline-matrix.txt`. The probe and both balance-data files are also byte-identical to the Phase 2 base.

## Required command results

Every command was invoked separately, without pipes or `&&`.

| # | Command | Result |
| --- | --- | --- |
| 1 | `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | Exit 0: 6 pass, 0 fail, 12 assertions, 1 file. |
| 2 | `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | Exit 0 under primary verification; normalized 56-line payload byte-identical to the Phase 1 baseline. Raw and normalized outputs are linked below. |
| 3 | `bun test --timeout 120000 packages/sim/src/bosses.balance.test.ts packages/sim/src/species-electric.balance.test.ts packages/sim/src/battle/species-balance.test.ts packages/sim/src/battle/species-roster.balance.test.ts packages/sim/src/battle/species-wave4-discovery.balance.test.ts packages/sim/src/battle/species-discovery-balance.test.ts` | Exit 0: 35 pass, 0 fail, 2055 assertions, 6 files. |
| 4 | `bun run balance` | Exit 0: all 21 species gates passed; cap share `370/1680 (22.0%)`; doctrine, boss, duration/pacing, damage, decisive-share, and cap-win-quality gates passed. |
| 5 | `bun run verify` | Exit 0: 4468 pass, 1 skip, 0 fail; 670519 assertions across 438 files; Biome checked 1041 files with no fixes; voxel determinism passed all 63 creature artifacts and five prop digests. |
| 6 | `git diff --quiet 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD -- packages/sim/src/species/discovery.ts packages/sim/src/bosses.ts` | Exit 0, no output: balance data unchanged. |
| 7 | `git diff --check 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD` | Exit 0, no output. |
| 8 | `git status --porcelain` | Exit 0, no output before evidence creation. |

Command 2 completed successfully under primary verification; the initial subagent permission rejection is recorded as resolved history below.

## Hash and existing-pin proof

- `bun run verify` printed `final hash 0xff6f3d62` twice, with deterministic same-seed replay passing.
- No hash delta exists relative to the Phase 1 expectation `0xff6f3d62`.
- `bun run balance` does not print a battle hash; the hash above comes from the deterministic verification trace.
- All 35 pre-existing balance tests passed.
- The six pre-existing balance test files are byte-identical to the track base: a supplemental scoped `git diff --quiet ...HEAD -- <six files>` check exited 0 with no output.
- The pre-evidence track diff contained only the expected Conductor artifacts and the new focused probe; it contained no discovery-species, authored-boss, or existing-test modification.

## AC mapping

- **AC-5 — no-tuning result or minimal measured delta:** fully met. Phase 1 and Phase 2 gates were green, no measured failure existed, and no balance-data edit was made.
- **AC-6 — existing suites/pins unchanged and green:** fully met. The six existing suites passed 35/35; their files are byte-identical to the track base; hash remains `0xff6f3d62`.
- **AC-7 — verification passes and hash is recorded/explained:** fully met. Every required command ultimately exited 0, the final matrix matches Phase 1, and `bun run verify` printed the unchanged hash.
- **NFR-3 — existing tests/pins byte-identical:** fully met. Scoped Git diffs for both balance data and all six existing balance suites exited 0.
- **NFR-6 — verify/build/balance/determinism/fuzz gates and hash:** fully met by `bun run verify`, `bun run balance`, deterministic replay, and the unchanged `0xff6f3d62` hash.

## Scope proof

- Phase 2 changed no product code, species data, boss data, tests, lockfiles, generated files, or Conductor state other than this phase evidence file.
- `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/` is gitignored and holds the subagent's command summaries plus the primary-provided report artifacts.
- The full automatic `bun run verify` transcript is retained at `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_20d905465001NpCj4u80hUn0s5.out`; its key results are copied to the tuning evidence directory.
- Phase 3 remains responsible for integrated evidence and any conditional documentation. No docs note is required because balance data did not change.

## Resolved historical permission note

The subagent's initial invocation of the exact report-mode command was rejected by the shell permission layer before execution. The rejection is preserved in `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/02-report-mode-denied.txt`. The subagent did not retry, alter, or work around the command. The primary subsequently ran the exact command unchanged and supplied successful output, so the permission issue is resolved and no blocker remains.

## Primary verification

- Command: `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`
- Result: exit 0.
- Raw output: `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/report-run.txt`.
- Normalized output: `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/final-matrix.txt`.
- Comparison: the normalized 56-line payload is byte-identical to Phase 1's `baseline/baseline-matrix.txt`, covering all 216 cells.
- No command was rerun by the subagent after this primary handoff. Phase 2 is **verified** with **no tuning required**.
