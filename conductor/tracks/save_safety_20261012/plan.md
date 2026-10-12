# Plan — Save Safety & QoL Pass (`save_safety_20261012`)

Follows `conductor/workflow.md` — TDD for logic-bearing tasks, manual
verification for DOM/scene tasks, phase checkpoints with git notes.

## Phase A — Save v7: session, rename, hints schema

- [x] Task: Write failing tests — save v7 schema shape, v6→v7 migration
      (adds cup session / creature name / hint-dismissal defaults), round-trip
      fidelity (extend `packages/sim/src/save/save.test.ts` style) `[3faff8b]`
- [x] Task: Implement schema v7 + v6→v7 migration in `packages/sim/src/save/`
      `[3faff8b]`
- [x] Task: Write failing tests — cup-session persist/restore round-trip
      through the save adapter (committed and pre-commit states; a finalized
      session does not resurrect) `[store.test.ts suite]`
- [x] Task: Implement session persistence in the client store commit path
      (`apps/client/src/store.ts` + cup `onCommit`/`onFinalize` hooks)
- [x] Task: Sync `docs/save-schema.md` (v7 recipe)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: 9366343]`

## Phase B — Bug fixes: corrupt-save notice + juvenile cup seed

- [x] Task: Write failing tests — storage distinguishes "no save yet" vs
      "save exists but unreadable" `[ede940f]`
- [x] Task: Implement corrupt-save notice in the boot path (`main.ts` +
      broadcast-kit notice); manual verification note for the DOM surface
      `[ede940f]`
- [x] Task: Extend the staging-seed test for the `visualSeedOf(stage)`
      contract; fix `apps/client/src/cup.ts` to pass `owned.stage` `[b7a36b3]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: 1b265ed]`

## Phase C — Creature renaming

- [x] Task: Write failing tests — sim `renameCreature`: trim/length cap (≤16),
      empty → species default name, rejection while phase is `"cup"`
      (success AND failure cases) `[819cb1a]`
- [x] Task: Implement `renameCreature` in `packages/sim` + wire through the
      store commit path `[819cb1a]`
- [x] Task: HUD inline edit on the creature lower-third (manual verification;
      kit styling; aria conventions) `[819cb1a]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: 819cb1a]`

## Phase D — Reset-save + onboarding callouts

- [x] Task: Write failing tests — `clearSave` + `markHintSeen` / seenHints
      dismissal persistence `[ca8940b]`
- [x] Task: Implement dock "New game" button + confirm modal → wipe +
      reload to starter `[ca8940b]`
- [x] Task: Callout precedence chain extension (day-1 AP, training-tier
      ~day 5, cup-eve day 6) with persisted dismissal `[ca8940b]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: ca8940b]`

## Phase E — Final verification

- [ ] Task: Full `bun run verify`; browser walkthrough of all spec acceptance
      criteria; README/docs touch-ups if needed
- [ ] Task: Final Phase Verification & Checkpoint (Refer to workflow.md)
