# Integrated verification — BLOCKED

- Track: `20261124-boss-discovery-balance-probes`
- Branch: `chore/20261124-boss-discovery-balance-probes`
- Track base: `6e4b3893971832ae652a9d21713e906e9e4be459`
- Phase 1 checkpoint: `cd136a46`
- Phase 2 checkpoint: `11a8779b`
- Phase 3 evidence base: `ed7ac10dfa6348408ef6fdcf0ace1001bd3dfa2b`
- Date: 2026-11-25
- Integrated status: **BLOCKED**, because three exact Phase 3 commands were rejected by the shell permission layer before execution.

## Executive conclusion

The discovery-boss probe is correctly scoped to nine discovery targets and six authored bosses. Phase 1 and Phase 2 established a deterministic 56-line / 216-cell matrix, passed every approved fresh/cap gate, and proved that no balance tuning was needed. Phase 3's normal-mode focused suite, production build, and full balance matrix passed. The full verify sweep's only failure was the specifically anticipated `gatekeeper-reach` load timeout; its approved isolated fallback passed. Verification retained battle hash `0xff6f3d62`.

Direct determinism, fuzz, and Phase 3 report-mode execution remain blocked by permission rejection. Therefore this document records all completed evidence and the remaining exact blockers, but does not claim Phase 3 verification is complete.

## Baseline and no-tuning decision

- Baseline matrix: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/baseline-matrix.txt`
- Phase 1 raw reports: `baseline/report-run-1.txt`, `baseline/report-run-2.txt`; normalized payloads were byte-identical.
- Phase 2 raw report: `tuning/report-run.txt`
- Phase 2 normalized matrix: `tuning/final-matrix.txt`; byte-identical to the Phase 1 baseline.
- Phase 3 frozen-matrix copy: `final/final-matrix.txt`
- Matrix dimensions: **9 targets x 6 bosses x 4 trained levels = 216 cells**, represented by 56 normalized lines including the two header lines.
- Phase 3 report rerun: permission-denied. The matrix below is the last successful Phase 2 payload, retained as the frozen final matrix pending the primary's exact rerun.
- No-tuning decision: **NO TUNING**. Both phases were green, the matrix did not change, and neither `packages/sim/src/species/discovery.ts` nor `packages/sim/src/bosses.ts` changed.
- Battle hash: **`0xff6f3d62`**, unchanged from Phase 1.
- Existing balance matrix: **21 species, 1680 fights, cap share `370/1680 (22.0%)`**, within the <=33.3% ceiling.

## Frozen methodology and gate contract

- Targets, in order: `voltfox`, `galeheron`, `shalemole`, `dune_jerboa`, `spark_ray`, `gale_moth`, `thornvolt`, `siltback`, `emberwing`.
- Bosses, in order: `koda`, `hesse`, `marlow`, `delmar`, `fenn`, `thessa`.
- Creature seeds: `11,42,77,101,143,202`.
- Battle seeds: `11,29,47,53,71,89`.
- Trained levels: `0,2,4,6`.
- Player tactic: `balanced`.
- Cap threshold: `0.35` at trained+6 for all 54 target/boss pairs.
- Fresh zero-win gate: applies only to `siltback` and `emberwing`; the other seven targets are cap-only under the approved contract.
- Construction path: seeded-stat locked-species constructor, `effectiveStats`, `defaultLoadout`, production `battleSideForSlot`, and production `resolveBattle`.
- Reporting is opt-in through `APEX_DISCOVERY_BOSS_REPORT=1`; normal mode remains bounded and passed in 316ms with 6 tests and 12 assertions.

## Final frozen matrix

This is the Phase 2 normalized payload copied to `.conductor/evidence/20261124-boss-discovery-balance-probes/final/final-matrix.txt`. A Phase 3 report-mode rerun is still required because its exact command was permission-denied.

| Player | Boss | trained+0 | trained+2 | trained+4 | trained+6 |
| --- | --- | --- | --- | --- | --- |
| voltfox | koda | 0.0% (0/36) | 0.0% (0/36) | 100.0% (36/36) | 100.0% (36/36) |
| voltfox | hesse | 0.0% (0/36) | 58.3% (21/36) | 100.0% (36/36) | 100.0% (36/36) |
| voltfox | marlow | 0.0% (0/36) | 55.6% (20/36) | 100.0% (36/36) | 100.0% (36/36) |
| voltfox | delmar | 0.0% (0/36) | 19.4% (7/36) | 100.0% (36/36) | 100.0% (36/36) |
| voltfox | fenn | 0.0% (0/36) | 0.0% (0/36) | 86.1% (31/36) | 100.0% (36/36) |
| voltfox | thessa | 0.0% (0/36) | 50.0% (18/36) | 100.0% (36/36) | 100.0% (36/36) |
| galeheron | koda | 0.0% (0/36) | 0.0% (0/36) | 100.0% (36/36) | 100.0% (36/36) |
| galeheron | hesse | 0.0% (0/36) | 16.7% (6/36) | 100.0% (36/36) | 100.0% (36/36) |
| galeheron | marlow | 0.0% (0/36) | 38.9% (14/36) | 100.0% (36/36) | 100.0% (36/36) |
| galeheron | delmar | 0.0% (0/36) | 5.6% (2/36) | 100.0% (36/36) | 100.0% (36/36) |
| galeheron | fenn | 0.0% (0/36) | 0.0% (0/36) | 72.2% (26/36) | 100.0% (36/36) |
| galeheron | thessa | 0.0% (0/36) | 13.9% (5/36) | 100.0% (36/36) | 100.0% (36/36) |
| shalemole | koda | 0.0% (0/36) | 0.0% (0/36) | 100.0% (36/36) | 100.0% (36/36) |
| shalemole | hesse | 0.0% (0/36) | 38.9% (14/36) | 100.0% (36/36) | 100.0% (36/36) |
| shalemole | marlow | 0.0% (0/36) | 55.6% (20/36) | 100.0% (36/36) | 100.0% (36/36) |
| shalemole | delmar | 0.0% (0/36) | 19.4% (7/36) | 100.0% (36/36) | 100.0% (36/36) |
| shalemole | fenn | 0.0% (0/36) | 0.0% (0/36) | 100.0% (36/36) | 100.0% (36/36) |
| shalemole | thessa | 0.0% (0/36) | 11.1% (4/36) | 100.0% (36/36) | 100.0% (36/36) |
| dune_jerboa | koda | 80.6% (29/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| dune_jerboa | hesse | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| dune_jerboa | marlow | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| dune_jerboa | delmar | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| dune_jerboa | fenn | 55.6% (20/36) | 97.2% (35/36) | 100.0% (36/36) | 100.0% (36/36) |
| dune_jerboa | thessa | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| spark_ray | koda | 27.8% (10/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| spark_ray | hesse | 61.1% (22/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| spark_ray | marlow | 63.9% (23/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| spark_ray | delmar | 22.2% (8/36) | 97.2% (35/36) | 100.0% (36/36) | 100.0% (36/36) |
| spark_ray | fenn | 0.0% (0/36) | 88.9% (32/36) | 100.0% (36/36) | 100.0% (36/36) |
| spark_ray | thessa | 44.4% (16/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| gale_moth | koda | 0.0% (0/36) | 27.8% (10/36) | 100.0% (36/36) | 100.0% (36/36) |
| gale_moth | hesse | 2.8% (1/36) | 88.9% (32/36) | 100.0% (36/36) | 100.0% (36/36) |
| gale_moth | marlow | 0.0% (0/36) | 83.3% (30/36) | 100.0% (36/36) | 100.0% (36/36) |
| gale_moth | delmar | 0.0% (0/36) | 55.6% (20/36) | 100.0% (36/36) | 100.0% (36/36) |
| gale_moth | fenn | 0.0% (0/36) | 2.8% (1/36) | 100.0% (36/36) | 100.0% (36/36) |
| gale_moth | thessa | 0.0% (0/36) | 86.1% (31/36) | 100.0% (36/36) | 100.0% (36/36) |
| thornvolt | koda | 2.8% (1/36) | 91.7% (33/36) | 100.0% (36/36) | 100.0% (36/36) |
| thornvolt | hesse | 91.7% (33/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| thornvolt | marlow | 75.0% (27/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| thornvolt | delmar | 63.9% (23/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| thornvolt | fenn | 0.0% (0/36) | 63.9% (23/36) | 100.0% (36/36) | 100.0% (36/36) |
| thornvolt | thessa | 66.7% (24/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| siltback | koda | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| siltback | hesse | 0.0% (0/36) | 16.7% (6/36) | 100.0% (36/36) | 100.0% (36/36) |
| siltback | marlow | 55.6% (20/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| siltback | delmar | 33.3% (12/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| siltback | fenn | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| siltback | thessa | 0.0% (0/36) | 0.0% (0/36) | 94.4% (34/36) | 100.0% (36/36) |
| emberwing | koda | 0.0% (0/36) | 55.6% (20/36) | 100.0% (36/36) | 100.0% (36/36) |
| emberwing | hesse | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| emberwing | marlow | 0.0% (0/36) | 0.0% (0/36) | 11.1% (4/36) | 86.1% (31/36) |
| emberwing | delmar | 0.0% (0/36) | 0.0% (0/36) | 0.0% (0/36) | 97.2% (35/36) |
| emberwing | fenn | 0.0% (0/36) | 0.0% (0/36) | 100.0% (36/36) | 100.0% (36/36) |
| emberwing | thessa | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |

## Verification summary

| Command | Result |
| --- | --- |
| `bun run verify` | Exit 1: 4467 pass, 1 skip, 1 fail. Sole failure was `gatekeeper-reach` timing out at 60s under full-suite load. Hash `0xff6f3d62` and all five replay invariants passed. |
| Isolated `gatekeeper-reach` test with 120s timeout | Exit 0: 1 pass, 0 fail, 476 assertions, 7.39s. This is the brief's approved one-time fallback. |
| `bun run build` | Exit 0: production client built; chunk-size warning only. |
| `bun run balance` | Exit 0: 21 species / 1680 fights / cap share 22.0%; all gates passed. |
| `bun run gate:determinism` | **PERMISSION DENIED before execution.** |
| `bun run test:fuzz` | **PERMISSION DENIED before execution.** |
| Focused normal-mode test | Exit 0: 6 pass / 0 fail. |
| Focused report-mode test | **PERMISSION DENIED before execution.** |
| `git diff --check <track-base>..HEAD` | Exit 0, no output. |
| Corrected scope `git diff --quiet` | Exit 0, no output. |
| Frozen data/tests `git diff --quiet` | Exit 0, no output. |
| Pre-evidence `git status --porcelain` | Exit 0, no output. |

The full command table, raw/captured outputs, and exact paths are in `verification/phase-3.md` and `.conductor/evidence/20261124-boss-discovery-balance-probes/final/`.

## Freeze and scope proof

The following files are byte-identical to the track base, proven by a scoped `git diff --quiet` exit 0:

- Authored balance data: `packages/sim/src/species/discovery.ts`, `packages/sim/src/bosses.ts`.
- Existing balance tests: `packages/sim/src/bosses.balance.test.ts`, `packages/sim/src/species-electric.balance.test.ts`, `packages/sim/src/battle/species-balance.test.ts`, `packages/sim/src/battle/species-roster.balance.test.ts`, `packages/sim/src/battle/species-wave4-discovery.balance.test.ts`, `packages/sim/src/battle/species-discovery-balance.test.ts`.

The corrected scope check excluded only the new focused probe, the two frozen data files, and `conductor/**`; it exited 0. No unrelated runtime, mechanics, configuration, dependency, manifest, or lockfile changed. The only code/test addition in the track is `packages/sim/src/battle/species-discovery-boss.balance.test.ts`.

## Documentation sync

**None.** Phase 2 proved no balance-data change. `conductor/product.md` and `conductor/tech-stack.md` were not edited, as explicitly required by the Phase 3 brief.

## Functional-requirement mapping

| FR | Status | Integrated evidence |
| --- | --- | --- |
| FR-1 exact nine-line roster and exclusions | PASS | Probe and this document enumerate exactly the nine approved targets and six bosses; focused suite passed 6/6. |
| FR-2 frozen seeds, levels, tactic, and production path | PASS | Constants and production builder/resolver calls are recorded above; Phase 1/Phase 2 matrix identity and Phase 3 normal-mode pass support the frozen path. |
| FR-3 fresh/cap gates | PASS | Fresh zero-win is limited to `siltback` and `emberwing`; all 54 trained+6 cells are >=35%; focused gates passed. |
| FR-4 deterministic full 9x6x4 report | PARTIAL / BLOCKED | Phase 1/Phase 2 reports are byte-identical; exact Phase 3 report rerun was permission-denied. |
| FR-5 baseline and no-tuning or minimal measured tuning | PASS | Evidenced baseline, Phase 2 identity, Phase 3 freeze proof, and no-tuning decision. |
| FR-6 existing probes/pins unchanged and green | PASS | Six files byte-identical; 35 existing tests passed in prior phases; full balance passed in Phase 3. |
| FR-7 final matrix, hash, verification, and coverage evidence | PARTIAL / BLOCKED | Matrix and hash are recorded; direct determinism, fuzz, and Phase 3 report commands remain denied. |
| FR-8 dated product/tech-stack notes only if balance data changes | PASS | No data changed, so doc-sync is none and no product/tech-stack edit occurred. |

## Non-functional-requirement mapping

| NFR | Status | Integrated evidence |
| --- | --- | --- |
| NFR-1 no runtime/mechanics changes | PASS | Corrected scope diff exited 0; only the new test and Conductor artifacts changed. |
| NFR-2 deterministic gated path | PASS | Report remains opt-in; Phase 1/Phase 2 payloads are byte-identical; normal-mode path is bounded and passed in 316ms. |
| NFR-3 existing tests/pins byte-identical | PASS | Scoped track-base diff for all six existing balance test files exited 0. |
| NFR-4 no dependency/config/manifest/lockfile changes; Biome authority retained | PASS | Corrected scope check exited 0; no formatting/config/dependency file changed. |
| NFR-5 no credentials/player data/remote mutation | PASS | Only local tests, build, balance, Git inspection, and evidence writes were performed. |
| NFR-6 verify/build/balance/determinism/fuzz plus final hash | BLOCKED | Build/balance passed and hash is `0xff6f3d62`; verify had the approved isolated fallback; direct determinism/fuzz were denied. |
| NFR-7 bounded normal work and opt-in report | PASS | Normal focused run was 316ms; report remains opt-in and no report output is produced by normal mode. |
| NFR-8 surgical scope | PASS | No unrelated runtime/config/dependency diff; Phase 3 edits are limited to its two evidence files. |

## Acceptance-criteria mapping

| AC | Status | Integrated evidence |
| --- | --- | --- |
| AC-1 exact roster | PASS | Nine exact targets, six exact bosses, focused 6/6. |
| AC-2 frozen methodology | PASS | Seeds, levels, tactic, threshold, and production path recorded and unchanged. |
| AC-3 fresh zero-win and cap cells >=35% | PASS | Approved fresh/cap contract and frozen matrix; focused gates green. |
| AC-4 complete deterministic report across two runs | PARTIAL / BLOCKED | Phase 1/Phase 2 identity proven; Phase 3 exact rerun denied. |
| AC-5 committed baseline and no-tuning result | PASS | Baseline, Phase 2 identity, and Phase 3 no-tuning/freeze proof. |
| AC-6 unchanged green existing suites/pins | PASS | Six test files byte-identical; 35 prior passes; Phase 3 full balance green. |
| AC-7 configured verification and explained hash | BLOCKED | Hash explained and unchanged; direct determinism/fuzz denied; verify fallback documented. |
| AC-8 surgical diff/no unrelated changes | PASS | Corrected scope and frozen-file diffs exited 0. |
| AC-9 integrated FR/NFR/AC mapping | PASS | This document supplies the complete mapping. |
| AC-10 clean tree and passing diff-check | PASS | After evidence commit `330817ca`, `git status --porcelain` and `git diff --check <track-base>..HEAD` both exited 0 with no output; corrected scope and frozen-file checks also remained exit 0. See `final/15-post-commit-checks.txt`. |

## Permission blockers and required primary action

The following exact commands were rejected before execution and must be run unchanged by the primary:

1. `bun run gate:determinism`
2. `bun run test:fuzz`
3. `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`

An additional evidence-copy command was denied and not retried or worked around:

- `git hash-object -w -- C:/Users/Ansyar/.local/share/opencode/shell/4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569/sh_20da75b6100127izhB1cH2TSbS.out`

The original full verify log remains at that source path, also recorded in `final/01-verify.txt`.

After the three required commands pass, normalize the report payload and compare it byte-for-byte with `baseline/baseline-matrix.txt`, `tuning/final-matrix.txt`, and `final/final-matrix.txt`; then record direct determinism/fuzz exit codes and the final clean-tree result.

## Deviations

None. No product/design decision was made, no balance data was edited, and no Conductor state file was modified by this phase executor.
