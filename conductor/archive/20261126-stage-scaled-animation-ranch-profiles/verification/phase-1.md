# Phase 1 Verification — Arena stage motion profile

- **Track:** `20261126-stage-scaled-animation-ranch-profiles` (Adopt stage-scaled animation and ranch body profiles)
- **Phase:** 1 — Arena stage motion profile
- **Date:** 2026-11-26
- **Branch:** `feat/20261126-stage-scaled-animation-ranch-profiles`
- **Base commit:** `dfd8bc3f8f02fb7f14d3d507fde45597e8f58485`
- **Head commit:** `4fa97b71334f686383ba0faed60fa80594ad05a4`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Unit + types — **TDD red** (before composer existed) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` | 1 | Expected failure: `TS2307 Cannot find module './stage-motion' or its corresponding type declarations.` at `apps/client/src/stage-motion.test.ts:17:37` (1 error in 1 file, 188 files checked). Red observed before any implementation was authored. |
| Unit + types — green (after composer + wiring) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` | 0 | `11 pass, 0 fail, 2410 expect() calls` across 2 files. |
| Unit + types — green (final, after import-order tidy) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` | 0 | `11 pass, 0 fail, 2410 expect() calls` across 2 files. |

### TDD red run (explicit record)

The tests were authored first and executed against the unmodified base. Because the
shared composer module did not exist yet, `--check` rejected the test file's import:

```
<error file="apps/client/src/stage-motion.test.ts" line="17" column="37" code="TS2307">
Cannot find module './stage-motion' or its corresponding type declarations.
...
Found 1 error in 1 file, checked 188 files [3.71s]
Exit code: 1
```

Only after capturing this red was `stage-motion.ts` created and `buildSpot` wired to
it. The test files were committed first as `2ff311c47f40d1942726c3863b00d2fec3372438`
(`test(client): pin arena stage-composed motion profile contract`); the implementation
followed as `4fa97b71334f686383ba0faed60fa80594ad05a4`
(`feat(client): compose arena motion profile with life stage`).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| FR-1 | Arena resolves `profileFor(archetype) × stageScale(stage)` for presentation amplitudes; missing stage → factor 1; physical scale and sim coordinates unchanged. | `stage-motion.test.ts` scales only the nine amplitude/weight fields for all 21 registered archetypes + unknown fallback × baby/juvenile/champion; `roster.test.ts` pins `buildSpot` home/stage/smooth/group.position at `±HOME_X`, `baseScale === group.scale.x`, and the unstaged cast at the authored profile. | pass |
| AC-1 | Table test covers every archetype × stage, arena factor equals profile × `stageScale`, missing stage yields 1, `bodyScaleFor` values unchanged. | `stage-motion.test.ts` 6 tests (2410 assertions total with roster suite); `roster.test.ts` retains the three untouched `bodyScaleFor` pins (0.48 / 0.288 / 0.24 / default 0.352 / degenerate 480). | pass |
| NFR-1 | No sim/state/save, voxel, ceremony outcome or audio cue changes. | Diff touches only `apps/client/src/stage-motion.ts` (new), `apps/client/src/stage-motion.test.ts` (new), `apps/client/src/roster.ts` (one import + one `profile:` assignment), `apps/client/src/roster.test.ts` (added pins). No `packages/*`, voxel, save, ceremony or audio files modified. | pass |
| NFR-5 | No sim payload/damage/timing/cooldown/outcome change. | The composer leaves `gaitFreq`, `swayFreq`, `breathFreq` verbatim (pinned per archetype × stage); downstream tempo/strike consumers were deliberately not edited — they read the composed profile via the existing `c.profile` path. | pass |
| P1.T1.2 | Pin `bodyScaleFor` values and sim-coordinate inputs as unchanged; observe the expected red before authoring the composer. | Existing `bodyScaleFor` pins preserved byte-for-byte; new `buildSpot` pin in `roster.test.ts`; red run recorded above. | pass |
| P1.T2.1 | Pure, reusable, exported composer combining archetype profile + stage factor. | `composeStageProfile(archetypeId, stage?)` exported from `apps/client/src/stage-motion.ts`; frozen result; reuses `stageScale` from `scene-logic/stage` (no second ladder); ready for Phase 2 ranch reuse. | pass |
| P1.T2.2 | Wire composer into `buildSpot`. | `roster.ts:83` now reads `composeStageProfile(info.archetypeId, info.stage)`; all downstream `c.profile` consumers unchanged. | pass |

## Evidence paths

- `apps/client/src/stage-motion.ts` — new shared stage composer
- `apps/client/src/stage-motion.test.ts` — archetype × stage table tests, neutral-factor and immutability pins
- `apps/client/src/roster.ts` — `buildSpot` wiring
- `apps/client/src/roster.test.ts` — `bodyScaleFor` pins (unchanged) + sim-coordinate/composed-profile pins
- This report: `conductor/tracks/20261126-stage-scaled-animation-ranch-profiles/verification/phase-1.md`

## Deviations

None.

## Notes

- `composeStageProfile` returns the authored profile object directly when the factor is `1`
  (missing stage and juvenile alike), so the neutral path is byte-for-byte unchanged; when a
  factor applies it returns a new frozen `BodyProfile` with only the nine amplitude/weight
  fields multiplied.
- An unknown archetype still falls back to `DEFAULT_PROFILE` and gets its own independent
  stage factor; the composer never mutates the choreography registry.
- Physical footprint is untouched: the `bodyScaleFor(info.archetypeId, measuredSpan)` call,
  rig re-anchoring and every sim coordinate in `buildSpot` are unchanged. Stage-specific
  voxel builds may still measure different spans — that is pre-existing generator behavior,
  not a composer side effect.
- Downstream consumers (`fighter-driver.ts`, `pose-apply.ts`, `steps/melee.ts`, `steps/pure.ts`)
  were intentionally left untouched; composing once in `buildSpot` propagates to all of them.
- Committed task-level: tests first (`2ff311c4`), then implementation (`4fa97b71`); no amend.
- The full `bun run verify && bun run build` gate is left to the primary agent; this phase ran
  only the exact verification command from the brief.

## Rework 1

- **Date:** 2026-11-26
- **Trigger:** The primary's full gate `bun run verify && bun run build` exited 1 solely on
  `biome check`: `apps/client/src/roster.test.ts` had one formatter difference at lines ~43-47.
  All behavior checks were already passing; no logic was wrong.
- **Attempted command:** `bunx biome check --write apps/client/src/roster.test.ts` — denied by
  the shell allowlist (`Permission denied: shell`). Recorded as a blocker below; the fix was
  applied by hand using Biome's exact requested edit rather than retrying or working around
  the denial with another tool.
- **Exact fix applied** (`apps/client/src/roster.test.ts:43`):

  ```diff
  -  const champion = buildSpot({ ...info, stage: "champion" }, 1, new THREE.Group())
  +  const champion = buildSpot(
  +    { ...info, stage: "champion" },
  +    1,
  +    new THREE.Group(),
  +  )
  ```

- **Re-run result:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` → exit 0, `11 pass, 0 fail, 2410 expect() calls` across 2 files.
- **Commit:** `a8129dbdf835ce851740cc397d5db04a2b082914` (`style(client): format arena stage-profile test`).
- **Head commit after rework:** `a8129dbdf835ce851740cc397d5db04a2b082914`.
- **Blocker:** `bunx biome check --write apps/client/src/roster.test.ts` was denied; expected
  result was a successful auto-format of the single line. The primary should re-run the full
  gate before accepting; the applied hand edit is byte-for-byte Biome's requested change.
- **Result after rework:** verified (phase behavior unchanged; formatting corrected).

## Primary verification

- **Date:** 2026-11-26
- **Scope check:** clean tree before re-verification; `git diff --name-only dfd8bc3f8f02fb7f14d3d507fde45597e8f58485..HEAD` contains exactly the four declared Touches (`stage-motion.ts`, `stage-motion.test.ts`, `roster.ts`, `roster.test.ts`). The range contains exactly the three reported task/rework commits (`2ff311c4`, `4fa97b71`, `a8129dbd`) plus the primary's evidence commit; no merge or user commit, so the squash guard passes. No deviations.
- **Exact phase command (re-run by primary):** `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` → exit 0, `11 pass / 0 fail`, `2410 expect() calls` across 2 files [1.25s].
- **Full gate (required by workflow, re-run by primary after rework):** `(bun run verify && bun run build)` → exit 0. Typecheck and biome check clean (`Checked 1051 files`, `No fixes applied`), full unit suite green, determinism gate OK for every archetype baby/juvenile/champion regeneration and all 5 props seed 42 digests, client Vite build succeeded (`dist/assets/index-CU2zTjlL.js 1,107.94 kB`, `index-D45x_3yC.css`, `lab-B9L4AaM-.js`, `lab-B2IkTbut.css`) with only the pre-existing chunk-size warning.
- **Rework 1 confirmation:** the initial full gate failure was solely the Biome formatter difference in `roster.test.ts`; after the exact hand edit in Rework 1 the same gate passes. No behavior, toast, audio or sim change accompanied the fix.
- **AC evidence:** AC-1 (archetype × stage table, neutral missing stage, unchanged `bodyScaleFor` and sim coordinates), FR-1/NFR-1/NFR-5 (presentation-only composition) confirmed from the committed tests and the unchanged downstream files.
- **Conclusion:** Phase 1 is verified and ready for acceptance and squash.
