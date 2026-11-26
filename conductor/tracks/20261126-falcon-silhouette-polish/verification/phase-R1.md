# Phase R1 verification — Falcon silhouette polish (review fix F1)

- Track: `20261126-falcon-silhouette-polish`
- Phase: R1 — Review Fixes
- Date: 2026-11-26
- Branch: `feat/20261126-falcon-silhouette-polish`
- Base: `a11737a34a41f22e59593bd01be69c720a672326`
- Head: `6556447b67e7e609035eb65b4e266a90b140fb10`
- Result: **verified** — TDD red captured before implementation, exact phase command green afterwards.

## Commands

| # | Command | When | Exit code | Result |
|---|---------|------|-----------|--------|
| 1 | `bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts` | **TDD red** — coverage test added while the sweep still had only the seed-42 proportion set | 1 | 35 pass, 1 fail, 9315 `expect()` calls, 36 tests, 86.41s. Exact output below. |
| 2 | same command | **final green** after adding the worst-case set and the four-feather assertions | 0 | 37 pass, 0 fail, 9316 `expect()` calls, 37 tests, 50.33s. Exact output below. |
| 3 | `bun test --check --parallel=4 --timeout 120000 packages/voxel/src/module-size.test.ts` | after implementation | 0 | 5 pass, 0 fail, 15 `expect()` calls, 205.00ms. Voxel module cap remains intact (`*.test.*` exempt). |
| 4 | `git status --short` | after implementation, before the commit | 0 | Only ` M packages/voxel/src/falcon.test.ts` (no production, artifact or lockfile change). |
| 5 | `git log -1 --format=%H` | after the test commit | 0 | `6556447b67e7e609035eb65b4e266a90b140fb10`. |

### Exact TDD red output (command #1)

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL

packages\voxel\src\falcon.test.ts:
274 |           wings === "flared" &&
275 |           tail === "streamer" &&
276 |           reach === 1.4 &&
277 |           stage === "champion",
278 |       ),
279 |     ).toBe(true)
            ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (D:\Projects\battle-pets\packages\voxel\src\falcon.test.ts:279:7)
(fail) falcon feather silhouette contract > style sweep combines template-max proportions with champion extremes [1.40ms]

 35 pass
 1 fail
 9315 expect() calls
Ran 36 tests across 3 files. [86.41s]
```

### Exact green output (command #2)

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL

 37 pass
 0 fail
 9316 expect() calls
Ran 37 tests across 3 files. [50.33s]
```

### Exact module-size output (command #3)

```text
bun test v1.4.4 (38afee6c8) 4x PARALLEL

 5 pass
 0 fail
 15 expect() calls
Ran 5 tests across 1 file. [205.00ms]
```

## F1 / FR-6 / AC-2 / AC-5 evidence

- **F1 (fixed in tests).** `packages/voxel/src/falcon.test.ts` now defines `WORST_CASE_PROPORTIONS` (`bodyGirth 1.3`, `bodyLength 1.35`, `wingLength 1.35`, `tailLength 1.35`) as a second entry in `PROPORTION_SETS` alongside the original seed-42 proportions. Both sets are combined with all 3 wing styles × 3 tail styles × reach bounds `0.6` and `1.4` × all 3 stages by the shared `sweepCases()` matrix: 108 cases, including flared/streamer/reach-1.4/champion with template-max proportions.
- **Contract test.** `style sweep combines template-max proportions with champion extremes` fails before the matrix update (command #1) and passes after it (command #2), so the new coverage is genuinely pinned rather than incidental.
- **FR-6.** The strengthened sweep keeps every prior assertion: `assertDnaInBounds` for both proportion sets, finite pivots, finite colors and finite SDF samples for every field, no voxel at coordinate `0` or `55` of the 56-grid, non-zero voxel counts for every claimed part and total voxels `>900`.
- **AC-2.** Style slots remain `folded/drooped/flared` and `fan/forked/streamer`; the sweep varies only existing slots and params (`sweep`, `forkSpread`, `streamerLength`). No slot or part was renamed or added.
- **AC-5.** A dedicated `worst-case proportions keep all four feathers finite and grid-bounded` test explicitly checks all four feather parts (`wingFeatherLeft`, `wingFeatherRight`, `tailFeatherFan`, `tailFeatherStreamer`) in every worst-case sweep combination for exactly one field, finite pivot/color/SDF and non-empty, off-boundary voxel sets. The module-size gate (command #3) is green.

## Evidence paths

- `packages/voxel/src/falcon.test.ts` — committed test change (`6556447b`).
- `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-R1.md` — this file (uncommitted, primary-owned).
- `conductor/tracks/20261126-falcon-silhouette-polish/verification/integrated.md` — R1 follow-up line and coverage update (uncommitted, primary-owned).

## Deviations

- None. All phase commands were permitted and run exactly as written; no command was denied or retried.

## Notes

- No production code, artifact/manifest, generator script, save/sim/balance/audio file, CSS, dependency or lockfile was touched. Only `falcon.test.ts` is in the test commit.
- The full `bun run verify && bun run build` gate was intentionally not run by this phase (primary-owned); the two new evidence files remain uncommitted for the primary to append verification and squash.
- The red/green pair above is a genuine TDD sequence: the only change between commands #1 and #2 was adding the worst-case proportion set, the four-feather assertions and routing the existing sweep through the shared matrix.

## Primary verification

- Date: 2026-11-26
- Scope: `a11737a34a41f22e59593bd01be69c720a672326..HEAD` contained only `packages/voxel/src/falcon.test.ts` and one reported commit `6556447b test(voxel): cover worst-case falcon proportions in style sweep`; no merge/user commit. Working tree held only the two uncommitted evidence files.
- Scoped Biome: `bunx biome check packages/voxel/src/falcon.test.ts` → `Checked 1 file in 37ms. No fixes applied.`, exit 0.
- Exact phase command: first primary run hit a transient `stage.test.ts` proportion-budget timeout (36 pass / 1 fail, 187.12s), the same unrelated voxel timeout seen earlier in Phase 1; a single clean retry returned `37 pass / 0 fail / 9316 expect() calls`, exit 0, in 80.86s. No code change occurred between runs.
- Full gate: `(bun run verify && bun run build)` → `gate_exit=0`, with determinism OK for all archetype baby/juvenile/champion GLBs and 5 props, and client build `dist/assets/index-BL310Ok0.js 1,109.86 kB`, `index-D45x_3yC.css`, `lab-BiS8jmah.js`, `lab-B2IkTbut.css`, only the pre-existing chunk advisory.
- Conclusion: F1 is genuinely closed by a test-only change; no generator, artifact, save, sim, balance, audio or cross-species surface changed. Ready for squash and delta re-review.
