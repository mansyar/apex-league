# Plan: Training Programs (`training_20261010`)

Workflow: `conductor/workflow.md` (TDD for logic-bearing code; phases end
with a verification & checkpoint task). Rendering and HUD wiring are verified
manually, not unit-tested.

## Phase A — Training fields on the creature (sim)

- [x] Task: Failing tests — training fields on creation (`aa30970`)
  - [x] a new creature has `trained` zeros, `trainingFocus` null, and `trainingResult` null
  - [x] rolled `stats` are unchanged by the new fields and stay inside species bounds
- [x] Task: Implement training fields on `Creature` and `createCreature` (`aa30970`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: aa30970]`

## Phase B — Assign training (sim)

- [x] Task: Failing tests — `assignTraining` (`866c5a6`, `dc09bea`)
  - [x] first assignment of the day spends 1 AP and sets the focus
  - [x] swapping to a different uncapped stat the same day spends no AP
  - [x] picking the already-focused stat is a no-op
  - [x] a stat at +6 is rejected before any spend; the previous focus stays; other stats remain assignable
  - [x] `no-ap` rejects only when no focus is set; a swap at 0 AP succeeds
  - [x] `no-creature` rejects
  - [x] assignment is allowed while sick, hungry, or exhausted
  - [x] a new assignment clears `trainingResult`
- [x] Task: Implement `assignTraining` (pure; rejections `no-creature`, `no-ap`, `at-cap`) (`866c5a6`, `dc09bea`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: dc09bea]`

## Phase C — Nightly gain and preview (sim)

- [x] Task: Failing tests — settlement gain (`ae4b7cd`)
  - [x] a full-rest night adds +1 to the focused stat only; the rolled base never changes
  - [x] trained bonus never exceeds 6, including a focus already at the cap
  - [x] sick at lights-out pays 0 and records `trainingResult` `"sick"`
  - [x] hunger after the drop at or below 0 pays 0 and records `"hungry"`; sickness wins when both apply
  - [x] exhaustion does not waste a night that otherwise meets the rested predicate
  - [x] the sickness roll does not claw back a granted gain, and the new step draws no rng
  - [x] settlement clears the focus; a night with no focus sets `trainingResult` to null
- [x] Task: Failing tests — preview helper (`ae4b7cd`)
  - [x] the helper uses the same rested predicate as settlement and does not mutate state
  - [x] feeding or treating after assigning turns a wasted preview into a gain
- [x] Task: Implement the settlement step (after hunger drop, before the sickness roll) and the preview helper (`ae4b7cd`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: ae4b7cd]`

## Phase D — Save migration v2→v3 (sim)

- [ ] Task: Failing tests — v3 schema and migration
  - [ ] a v3 save round-trips `trained`, `trainingFocus`, and `trainingResult`
  - [ ] a v2 save migrates with trained zeros, null focus, null result, and unchanged rolled stats
  - [ ] a v1 save still walks v1→v2→v3 into that same shape
  - [ ] corrupt and future-version saves are still rejected
- [ ] Task: Implement `SAVE_VERSION = 3` and the v2→v3 migration step
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase E — Client HUD (rendering/UI — manual verification)

- [ ] Task: Stat row under the name, above the condition bars — stat name, total (`stats + trained`), and trained bonus when above 0
- [ ] Task: Train control and inline four-stat picker in the action cluster
  - [ ] opening and closing the picker spends nothing
  - [ ] entries show tonight's delta, or the waste reason; capped stats are disabled
  - [ ] Train is disabled at 0 AP only when nothing is assigned; a set focus can still be swapped
  - [ ] all-four-capped disables Train; the current focus is marked
- [ ] Task: Status copy — preview while a focus is set; one-sentence morning result after Advance Day, without repeating the condition line
- [ ] Task: Wire `assignTraining` into the ranch loop; cup day and Advance Day stay unchanged
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase F — Integration and Verification Gate

- [ ] Task: Full gate — `bun run verify` (check, tests, biome, determinism) green
- [ ] Task: Browser manual verification — assign, free swap, wasted night, saved night via Feed or Treat, cap rejection, stat row — with screenshot evidence
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
