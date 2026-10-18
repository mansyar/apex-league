# Implementation Plan: Ranch Decomposition

## Refactor TDD note

Every machine already has tests (12 co-located files). Those tests are the red
bar: they must be green before the first move and green after every move, with
no assertion changed. New tests are written only where the spec asks for a new
guarantee (the size guard and barrel-surface test in Phase 3).

## Phase 1 - Split scene-logic

- [x] Task: Capture the baseline gate
    - [x] Record `bun run verify` output: test count, determinism digests, warnings (1457 pass / 0 fail, 8 warnings, digests OK).
    - [x] Record `Get-ChildItem` sizes for `scene-logic.ts` (43.1 KB) and `ranch-motion.ts` (39.8 KB).
    - [x] Confirm the 14 importers of `./scene-logic` and the 2 of `./ranch-motion`.
- [x] Task: Extract the pure leaf modules (`scene-logic/math.ts`, `wind.ts`, `stage.ts`, `framing.ts`)
    - [x] Move `lerpAngle`, `wrapPi`, `phaseHash`, `smoothstep` into `math.ts`.
    - [x] Move `windBaseAmp`, `gustEnvelope`, `swayAngle` into `wind.ts`.
    - [x] Move `BABY_SCALE`, `JUVENILE_SCALE`, `CHAMPION_SCALE`, `stageScale` into `stage.ts`.
    - [x] Move `arenaFramingAdjust` and `ArenaFramingAdjustment` into `framing.ts` (FR6).
    - [x] Keep each module leaf-only (no sibling imports) and carry the original doc comments.
- [x] Task: Extract the position-driven ceremonies (`feed.ts`, `evolution.ts`)
    - [x] Move `CeremonyPhase`, `WalkDrive`, `WalkMachine`, `createWalk` into `feed.ts`.
    - [x] Add `walk.ts` (13th module) for the shared walk primitives — `WALK_SPEED`, `TURN_SPEED`, `TURN_THRESHOLD`, `heading`, `strideStep` — because feed and evolution both need them and a `feed`→`gait` import would have been a cycle.
    - [x] Move the evolution phase/drive/machine types and `createEvolutionCeremony` into `evolution.ts`.
    - [x] Import easing from `math.ts` rather than duplicating it.
- [x] Task: Extract the care and reaction machines (`rest.ts`, `treat.ts`, `play.ts`, `pet.ts`)
    - [x] Move the rest constants, drive types, and `createRestCeremony` into `rest.ts`.
    - [x] Move the treat constants, drive types, and `createTreatCeremony` into `treat.ts`.
    - [x] Move the play phases, constants, drive types, and `createPlayCeremony` into `play.ts`.
    - [x] Move `PetVariant`, `PetPhase`, `PetDrive`, `pickPetReaction`, `PET_*`, `createPetMachine`, and `isTap` into `pet.ts`.
- [x] Task: Extract the movement modules (`gait.ts`, `wander.ts`)
    - [x] Move `GAIT_*`, `GaitPose`, `gaitPose` into `gait.ts`.
    - [x] Move `WANDER_*`, the wander types, `nextGap`, `pickVisitTarget`, and `createWander` into `wander.ts`.
- [x] Task: Rewrite `scene-logic.ts` as a barrel
    - [x] Re-export every symbol currently exported, preserving names and types (FR2).
    - [x] Delete the moved bodies; leave no dead imports or unused constants.
    - [x] Verify `bun run check` passes with zero importer edits.
- [x] Task: Co-locate the 12 logic tests
    - [x] Move `scene-logic*.test.ts` into `scene-logic/` and repoint imports to `../scene-logic` (the barrel).
    - [x] Leave every test name, case, and assertion untouched (FR7).
    - [x] Confirm `git diff` shows changes in no other `apps/client/src` file.
- [x] Task: Commit `refactor(client): split scene-logic into per-machine modules` (cc6cbab)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
    - `[checkpoint: cc6cbab]` - approved 2026-10-18; gates: verify 1457 pass / 0 fail, typecheck clean (voxel 51 / sim 68 / client 196), determinism byte-identical, biome 8 pre-existing warnings; browser evidence: ranch renders from the refactored modules, tap still triggers the pet reaction, 260 px drag still orbits, console clean.


## Phase 2 - Split ranch-motion

- [x] Task: Lift the pure helpers out of the adapter
    - [x] Move `smoothstep` usage to the single `scene-logic/math.ts` export and delete `smoothstepLocal` (FR5).
    - [x] Re-export `gaitIntensity` and `standPointOnLineTo` from their logic modules; drop the adapter copies (FR4). Both now live in `scene-logic/walk.ts` and `scene-logic/gait.ts`.
- [x] Task: Extract `ranch/poses.ts` and `ranch/mood.ts`
    - [x] Move `moodModeFrom`, `MOOD_PROFILES`, `applyGait`, `applyRestPose`, `applyTreatPose`, `applyPetPose`, and the breathe/head/tail writers.
    - [x] Keep pose writers allocation-free and in-place.
- [x] Task: Extract `ranch/effects.ts` and `ranch/idle.ts`
    - [x] Move the relief sparkle and play-ball builders/updaters, including disposal, into `effects.ts` (the planned `sparkle.ts` + `ball.ts` merged: both are small and share the prop lifecycle).
    - [x] Move the idle and ceremony pose driver plus the walk-leg transitions into `idle.ts`.
- [x] Task: Replace the closure with an explicit state object (Option B, full restructure)
    - [x] Add `ranch/types.ts` (contracts), `ranch/state.ts` (`RanchState` + `createRanchState`), `ranch/mount.ts`, `ranch/frame.ts`, `ranch/api.ts`.
    - [x] Reduce `ranch/motion.ts` to the `createRanchMotion` composition root (0.9 KB).
    - [x] Verify the update ordering is unchanged: base pose writes, then additive pet pose, then `onCreatureMoved`, then wind.
- [x] Task: Repoint the two consumers and delete `ranch-motion.ts`
    - [x] Update imports in `scene.ts` and `ranch-motion.test.ts` (move the test to `ranch/motion.test.ts`).
    - [x] Delete the old file; confirm no stray references remain.
- [x] Task: Commit `refactor(client): split ranch-motion into a ranch module folder` (433483c)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
    - `[checkpoint: 433483c]` - approved 2026-10-18; gates: verify 1457 pass / 0 fail, typecheck clean (voxel 51 / sim 68 / client 205), determinism byte-identical, biome 8 pre-existing warnings, largest ranch module `api.ts` 9.4 KB / largest scene-logic module 8.3 KB; browser evidence: feed, rest, treat (health 60 to 100 + relief sparkles), play (chase/return legs measured with a canvas pixel probe), pet, 220 px orbit drag; console 0 errors.

## Phase 3 - Guard and document

- [x] Task: Write the size guard test
    - [x] Assert every file under `apps/client/src/scene-logic/` and `apps/client/src/ranch/` is at or under 12 KB (`apps/client/src/module-size.test.ts`, 12 * 1024 B).
    - [x] Prove the over-cap branch fails before trusting the green run: the cap predicate is unit-tested against an at-cap and an over-cap entry (in-memory fixtures instead of a temp file, so nothing to clean up).
- [x] Task: Write the barrel-surface test
    - [x] Pin the exported symbol set of `scene-logic.ts` (53 sorted runtime names) so a dropped re-export fails loudly (`apps/client/src/scene-logic.test.ts`).
    - [x] Name all 25 type-only exports in a tuple type, so a dropped type re-export fails typecheck even though it is erased at runtime.
- [x] Task: Record the module convention
    - [x] Add the ranch module layout and the 12 KB cap to `conductor/tech-stack.md`.
    - [x] Note the guard test as the enforcement mechanism.
- [x] Task: Commit `test(client): guard ranch module size caps` (2ff8d55)
- [x] Task: Commit `docs(conductor): document ranch module layout` (0609d8e)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
    - `[checkpoint: 0609d8e]` - approved 2026-10-18; gates: verify 1461 pass / 0 fail (1457 baseline + 4 guard cases), typecheck clean, determinism byte-identical, biome 0 errors / 8 pre-existing warnings; guard confirms largest modules stay `ranch/api.ts` 9.4 KB and `scene-logic/gait.ts` 8.3 KB, both under the cap.
