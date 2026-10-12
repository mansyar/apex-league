# Plan — Save Safety & QoL Pass (`save_safety_20261012`)

Follows `conductor/workflow.md` — TDD for logic-bearing tasks, manual
verification for DOM/scene tasks, phase checkpoints with git notes.

## Phase A — Save v7: session, rename, hints schema

- [ ] Task: Write failing tests — save v7 schema shape, v6→v7 migration
      (adds cup session / creature name / hint-dismissal defaults), round-trip
      fidelity (extend `packages/sim/src/save/save.test.ts` style)
- [ ] Task: Implement schema v7 + v6→v7 migration in `packages/sim/src/save/`
- [ ] Task: Write failing tests — cup-session persist/restore round-trip
      through the save adapter (committed and pre-commit states; a finalized
      session does not resurrect)
- [ ] Task: Implement session persistence in the client store commit path
      (`apps/client/src/store.ts` + cup `onCommit`/`onFinalize` hooks)
- [ ] Task: Sync `docs/save-schema.md` (v7 recipe)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — Bug fixes: corrupt-save notice + juvenile cup seed

- [ ] Task: Write failing tests — storage distinguishes "no save yet" vs
      "save exists but unreadable"
- [ ] Task: Implement corrupt-save notice in the boot path (`main.ts` +
      broadcast-kit notice); manual verification note for the DOM surface
- [ ] Task: Extend the staging-seed test for the `visualSeedOf(stage)`
      contract; fix `apps/client/src/cup.ts` to pass `owned.stage`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Creature renaming

- [ ] Task: Write failing tests — sim `renameCreature`: trim/length cap (≤16),
      empty → species default name, rejection while phase is `"cup"`
      (success AND failure cases)
- [ ] Task: Implement `renameCreature` in `packages/sim` + wire through the
      store commit path
- [ ] Task: HUD inline edit on the creature lower-third (manual verification;
      kit styling; aria conventions)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Reset-save + onboarding callouts

- [ ] Task: Write failing tests — `clearSave` on the storage adapter;
      callout dismissal-state persistence
- [ ] Task: Implement dock "New game" button + confirm modal → wipe + reload
      to starter choice (manual verification)
- [ ] Task: Extend the callout precedence chain (day-1 AP, training-tier ~day 5,
      cup-eve day 6) with persisted dismissal (manual verification of copy)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase E — Final verification

- [ ] Task: Full `bun run verify`; browser walkthrough of all spec acceptance
      criteria; README/docs touch-ups if needed
- [ ] Task: Final Phase Verification & Checkpoint (Refer to workflow.md)
