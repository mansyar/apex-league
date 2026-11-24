# Phase 3 verification — BLOCKED

- Track: `20261124-boss-discovery-balance-probes`
- Branch: `chore/20261124-boss-discovery-balance-probes`
- Phase base: `ed7ac10dfa6348408ef6fdcf0ace1001bd3dfa2b`
- Track base: `6e4b3893971832ae652a9d21713e906e9e4be459`
- Date: 2026-11-25
- Status: **BLOCKED** — the shell permission layer rejected three required Phase 3 commands before execution. No denied command was retried or worked around.

## Result summary

- The focused probe passed in normal mode: **6 pass / 0 fail**.
- Production build passed.
- The full balance matrix passed: **21 species, 1680 fights, cap share `370/1680 (22.0%)`**.
- `bun run verify` completed with **4467 pass, 1 skip, 1 fail**. Its sole failure was the known full-suite-load timeout in `gatekeeper-reach`; the brief's approved one-test fallback was run once and passed (**1 pass / 0 fail, 7.39s**). The full sweep was not blindly retried.
- Verification printed the unchanged battle hash **`0xff6f3d62`**.
- Exact `bun run gate:determinism`, `bun run test:fuzz`, and report-mode commands were **permission-denied**. Phase 3 therefore cannot be marked verified.
- Both authored balance-data files and all six existing balance test files are byte-identical to the track base.
- No unrelated runtime/config/dependency file changed.
- Documentation sync: **none**. Phase 2 proved no balance-data change, so neither `conductor/product.md` nor `conductor/tech-stack.md` was edited.

## Command results

Commands were run separately, without pipes or `&&`.

| # | Command | Exit / result | Evidence |
| --- | --- | --- | --- |
| 1 | `bun run verify` | Exit 1 after 289.45s; 4467 pass, 1 skip, 1 fail; sole failure was the permitted-load-timeout case below | `final/01-verify.txt` |
| 1a | `bun test --timeout 120000 packages/sim/src/cup/gatekeeper-reach.test.ts -t "a real climb reaches the authored final and fights it for real"` | Exit 0; 1 pass, 9 filtered out, 0 fail, 476 assertions, 7.39s | `final/01a-gatekeeper-isolated.txt` |
| 2 | `bun run build` | Exit 0; 438 modules transformed; production client built in 1.59s; chunk-size warning only | `final/02-build.txt` |
| 3 | `bun run balance` | Exit 0; 21 species / 1680 fights / cap share 22.0%; all species and boss gates passed | `final/03-balance.txt` |
| 4 | `bun run gate:determinism` | **PERMISSION DENIED before execution** | `final/04-gate-determinism.txt` |
| 5 | `bun run test:fuzz` | **PERMISSION DENIED before execution** | `final/05-test-fuzz.txt` |
| 6 | `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | Exit 0; 6 pass / 0 fail; 12 assertions; 316ms | `final/06-focused.txt` |
| 7 | `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | **PERMISSION DENIED before execution** | `final/07-report.txt` |
| 8 | `git diff --check 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD` | Exit 0, no output | `final/08-diff-check.txt` |
| 9 | `git diff --quiet 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD -- . ':!packages/sim/src/battle/species-discovery-boss.balance.test.ts' ':!packages/sim/src/species/discovery.ts' ':!packages/sim/src/bosses.ts' ':!conductor/**'` | Exit 0, no output | `final/09-corrected-scope.txt` |
| 10 | `git diff --quiet 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD -- packages/sim/src/species/discovery.ts packages/sim/src/bosses.ts packages/sim/src/bosses.balance.test.ts packages/sim/src/species-electric.balance.test.ts packages/sim/src/battle/species-balance.test.ts packages/sim/src/battle/species-roster.balance.test.ts packages/sim/src/battle/species-wave4-discovery.balance.test.ts packages/sim/src/battle/species-discovery-balance.test.ts` | Exit 0, no output | `final/10-frozen-data-and-tests.txt` |
| 11 | `git status --porcelain` | Exit 0, no output before evidence files were written | `final/11-status-before-evidence.txt` |
| 12 | `git diff --name-status 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD` | Exit 0; only Conductor track state/evidence and the new focused probe are present | `final/12-name-status.txt` |

All relative evidence paths above are under `.conductor/evidence/20261124-boss-discovery-balance-probes/`.

## Verify timeout and approved fallback

The full verification sweep's only failing test was:

- File: `packages/sim/src/cup/gatekeeper-reach.test.ts`
- Test: `a real climb reaches the authored final and fights it for real`
- Failure: timeout after `60000ms`, reported at `108707.74ms` under full-suite load.

Per the phase brief, that single test was isolated once with a 120-second timeout. It passed in 7.39s with 476 assertions. This is the approved fallback, not a substitute for the separately required direct determinism command, which remained permission-denied.

The verification trace still completed and printed:

- `final hash 0xff6f3d62`
- all five replay invariants passing, including same-seed deterministic replay
- embedded balance matrix: 21 species, 1680 fights, cap share `370/1680 (22.0%)`

## Baseline, final matrix, and no-tuning decision

- Baseline: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/baseline-matrix.txt`
- Phase 2 normalized report: `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/final-matrix.txt`
- Phase 3 frozen-matrix copy: `.conductor/evidence/20261124-boss-discovery-balance-probes/final/final-matrix.txt`
- Matrix size: **56 normalized lines, 216 cells** across nine targets, six bosses, and four trained levels.
- Phase 1's two normalized report payloads were byte-identical.
- Phase 2's normalized report payload was byte-identical to Phase 1.
- The exact Phase 3 report-mode rerun was permission-denied, so the Phase 3 copy is explicitly the last successful Phase 2 payload, not a newly measured Phase 3 report.
- Phase 1 and Phase 2 passed every fresh/cap gate. There was no measured failure requiring tuning. No discovery-species or authored-boss data changed, and the battle hash did not change.
- Final decision: **NO TUNING**.

Focused gate contract:

- Exact targets: `voltfox`, `galeheron`, `shalemole`, `dune_jerboa`, `spark_ray`, `gale_moth`, `thornvolt`, `siltback`, `emberwing`.
- Exact bosses: `koda`, `hesse`, `marlow`, `delmar`, `fenn`, `thessa`.
- Creature seeds: `11,42,77,101,143,202`; battle seeds: `11,29,47,53,71,89`.
- Trained levels: `0,2,4,6`; player tactic: `balanced`; cap threshold: `0.35`.
- Fresh zero-win gate applies only to `siltback` and `emberwing`; the other seven targets are cap-only by the approved contract.
- Every one of the 54 target/boss pairs reaches at least 35% at trained+6.

## Freeze proof

The scoped track-base diff for both balance-data files and all six existing balance test files exited 0 with no output. This proves byte identity to `6e4b3893971832ae652a9d21713e906e9e4be459` for:

- `packages/sim/src/species/discovery.ts`
- `packages/sim/src/bosses.ts`
- `packages/sim/src/bosses.balance.test.ts`
- `packages/sim/src/species-electric.balance.test.ts`
- `packages/sim/src/battle/species-balance.test.ts`
- `packages/sim/src/battle/species-roster.balance.test.ts`
- `packages/sim/src/battle/species-wave4-discovery.balance.test.ts`
- `packages/sim/src/battle/species-discovery-balance.test.ts`

The corrected scope check excluded only the new focused probe, the two frozen balance-data files, and `conductor/**`; it exited 0. Therefore no unrelated runtime, configuration, dependency, manifest, or lockfile changed.

Pre-evidence changed paths from the track base were:

- `conductor/roadmap.md`
- `conductor/tracks.md`
- the track's `index.md`, `metadata.json`, `plan.md`, and `spec.md`
- the track's Phase 1 and Phase 2 verification files
- `packages/sim/src/battle/species-discovery-boss.balance.test.ts`

## Documentation sync

**None.** No balance data changed, so `conductor/product.md` and `conductor/tech-stack.md` were not edited. This follows the Phase 3 brief and Phase 2's no-tuning result.

## Raw evidence and blockers

Raw/captured outputs are under `.conductor/evidence/20261124-boss-discovery-balance-probes/final/`. The full 838-line raw `bun run verify` output remains at the shell tool's source path recorded in `final/01-verify.txt`; an attempt to copy it with `git hash-object -w -- <path>` was permission-denied and was not retried or worked around.

Permission-denied commands:

1. `bun run gate:determinism`
2. `bun run test:fuzz`
3. `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`
4. `git hash-object -w -- C:/Users/Ansyar/.local/share/opencode/shell/4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569/sh_20da75b6100127izhB1cH2TSbS.out` — needed only to copy the full raw verify log into `final/` without shell redirection.

The primary must run the three required denied commands unchanged and supply their output before this phase can be marked verified.

## Acceptance-criteria mapping

| AC | Status | Evidence |
| --- | --- | --- |
| AC-1 exact nine-target roster and exclusions | PASS | Focused suite passed 6/6; exact target and boss lists are recorded above and in the committed probe. |
| AC-2 frozen seeds, levels, tactic, production builders/resolver | PASS | Probe constants and production-path calls are unchanged; Phase 3 normal-mode suite passed. |
| AC-3 fresh zero-win and all cap cells >=35% | PASS | Phase 1/Phase 2 gates passed; Phase 3 normal-mode suite passed 6/6; frozen matrix retained. |
| AC-4 complete deterministic 9x6x4 report across two runs | PARTIAL / BLOCKED | Phase 1/Phase 2 byte identity is proven; exact Phase 3 report rerun was permission-denied. |
| AC-5 committed baseline and no-tuning result | PASS | Baseline is evidenced; Phase 2 and Phase 3 freeze proof show no tuning. |
| AC-6 unchanged existing suites/pins and green | PASS | Six test files are byte-identical; existing 35-test balance result remains green and full balance passed. |
| AC-7 configured verification and explained hash | BLOCKED | Build/balance/normal focused passed; verify hash is `0xff6f3d62`; direct determinism and fuzz commands were denied. |
| AC-8 surgical scope and no unrelated changes | PASS | Corrected scope diff exited 0; only the probe plus Conductor artifacts changed. |
| AC-9 integrated FR/NFR/AC mapping | PASS | `verification/integrated.md` contains the full mapping. |
| AC-10 clean tree and passing diff-check | PASS | After evidence commit `330817ca`, `git status --porcelain` and `git diff --check <track-base>..HEAD` both exited 0 with no output; corrected scope and frozen-file checks also remained exit 0. See `final/15-post-commit-checks.txt`. |

## Deviations

None. No file outside the assigned evidence scope was edited.

## Notes for the primary

- Run the three denied required commands exactly as written; do not alter them.
- Confirm the report's normalized 56-line payload remains byte-identical to `tuning/final-matrix.txt` and `final/final-matrix.txt`.
- Record direct determinism/fuzz exit codes and the post-commit clean-tree result before changing this phase to verified.
- No balance tuning or product/tech-stack documentation change is warranted.
