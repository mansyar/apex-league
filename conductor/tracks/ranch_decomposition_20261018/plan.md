# Implementation Plan: Ranch Decomposition

## Refactor TDD note

Every machine already has tests (12 co-located files). Those tests are the red
bar: they must be green before the first move and green after every move, with
no assertion changed. New tests are written only where the spec asks for a new
guarantee (the size guard and barrel-surface test in Phase 3).

## Phase 1 - Split scene-logic

- [ ] Task: Capture the baseline gate
    - [ ] Record `bun run verify` output: test count, determinism digests, warnings.
    - [ ] Record `Get-ChildItem` sizes for `scene-logic.ts` and `ranch-motion.ts`.
    - [ ] Confirm the 14 importers of `./scene-logic` and the 2 of `./ranch-motion`.
- [ ] Task: Extract the pure leaf modules (`scene-logic/math.ts`, `wind.ts`, `stage.ts`, `framing.ts`)
    - [ ] Move `lerpAngle`, `wrapPi`, `phaseHash`, `smoothstep` into `math.ts`.
    - [ ] Move `windBaseAmp`, `gustEnvelope`, `swayAngle` into `wind.ts`.
    - [ ] Move `BABY_SCALE`, `JUVENILE_SCALE`, `CHAMPION_SCALE`, `stageScale` into `stage.ts`.
    - [ ] Move `arenaFramingAdjust` and `ArenaFramingAdjustment` into `framing.ts` (FR6).
    - [ ] Keep each module leaf-only (no sibling imports) and carry the original doc comments.
- [ ] Task: Extract the position-driven ceremonies (`feed.ts`, `evolution.ts`)
    - [ ] Move `CeremonyPhase`, `WalkDrive`, `WalkMachine`, `createWalk`, `standPointOnLineTo` into `feed.ts`.
    - [ ] Move the evolution phase/drive/machine types and `createEvolutionCeremony` into `evolution.ts`.
    - [ ] Import easing from `math.ts` rather than duplicating it.
- [ ] Task: Extract the care and reaction machines (`rest.ts`, `treat.ts`, `play.ts`, `pet.ts`)
    - [ ] Move the rest constants, drive types, and `createRestCeremony` into `rest.ts`.
    - [ ] Move the treat constants, drive types, and `createTreatCeremony` into `treat.ts`.
    - [ ] Move the play phases, constants, drive types, and `createPlayCeremony` into `play.ts`.
    - [ ] Move `PetVariant`, `PetPhase`, `PetDrive`, `pickPetReaction`, `PET_*`, `createPetMachine`, and `isTap` into `pet.ts`.
- [ ] Task: Extract the movement modules (`gait.ts`, `wander.ts`)
    - [ ] Move `GAIT_*`, `GaitPose`, `gaitPose`, `gaitIntensity` into `gait.ts`.
    - [ ] Move `WANDER_*`, the wander types, `nextGap`, `pickVisitTarget`, and `createWander` into `wander.ts`.
- [ ] Task: Rewrite `scene-logic.ts` as a barrel
    - [ ] Re-export every symbol currently exported, preserving names and types (FR2).
    - [ ] Delete the moved bodies; leave no dead imports or unused constants.
    - [ ] Verify `bun run check` passes with zero importer edits.
- [ ] Task: Co-locate the 12 logic tests
    - [ ] Move `scene-logic*.test.ts` into `scene-logic/` and repoint imports to `./<module>`.
    - [ ] Leave every test name, case, and assertion untouched (FR7).
    - [ ] Confirm `git diff` shows changes in no other `apps/client/src` file.
- [ ] Task: Commit `refactor(client): split scene-logic into per-machine modules`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Split ranch-motion

- [ ] Task: Lift the pure helpers out of the adapter
    - [ ] Move `smoothstep` usage to the single `scene-logic/math.ts` export and delete `smoothstepLocal` (FR5).
    - [ ] Re-export `gaitIntensity` and `standPointOnLineTo` from their logic modules; drop the adapter copies (FR4).
- [ ] Task: Extract `ranch/poses.ts`
    - [ ] Move `moodModeFrom`, `MOOD_PROFILES`, `applyGait`, `applyRestPose`, `applyTreatPose`, `applyPetPose`, and the breathe/head/tail writers.
    - [ ] Keep pose writers allocation-free and in-place.
- [ ] Task: Extract `ranch/sparkle.ts` and `ranch/ball.ts`
    - [ ] Move the relief sparkle builder and its update step.
    - [ ] Move `buildBall`, the ball update, and the play-chase helpers, including disposal.
- [ ] Task: Reduce `ranch/motion.ts` to the adapter
    - [ ] Keep `RanchMotion`, `RanchMotionDeps`, `createRanchMotion`, the frame loop, and the ceremony/machine wiring.
    - [ ] Verify the update ordering is unchanged: base pose writes, then additive pet pose, then `onCreatureMoved`, then wind.
- [ ] Task: Repoint the two consumers and delete `ranch-motion.ts`
    - [ ] Update imports in `scene.ts` and `ranch-motion.test.ts` (move the test to `ranch/motion.test.ts`).
    - [ ] Delete the old file; confirm no stray references remain.
- [ ] Task: Commit `refactor(client): split ranch-motion into a ranch module folder`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Guard and document

- [ ] Task: Write the size guard test
    - [ ] Assert every file under `apps/client/src/scene-logic/` and `apps/client/src/ranch/` is at or under 12 KB.
    - [ ] Write it red first by pointing it at a temp over-cap fixture, then delete the fixture.
- [ ] Task: Write the barrel-surface test
    - [ ] Pin the exported symbol set of `scene-logic.ts` (sorted names) so a dropped re-export fails loudly.
    - [ ] Include the type-only exports the barreled modules publish.
- [ ] Task: Record the module convention
    - [ ] Add the ranch module layout and the 12 KB cap to `conductor/tech-stack.md`.
    - [ ] Note the guard test as the enforcement mechanism.
- [ ] Task: Commit `test(client): guard ranch module size caps`
- [ ] Task: Commit `docs(conductor): document ranch module layout`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
