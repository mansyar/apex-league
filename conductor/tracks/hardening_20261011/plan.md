# Plan — Hardening & Quality Pass (`hardening_20261011`)

Workflow reference: `conductor/workflow.md` (TDD for logic-bearing tasks, git
notes per task, phase checkpoints with explicit user verification).

## Phase 1 — Sim Core Hardening (TDD-able, DOM-free)

- [x] Task: Cup draw HP tiebreak (FR-A8) (2780b3b)
  - [x] Write failing tests in `cup.test.ts`: `double_ko` resolves by higher
        `finalHp`; exact-tie falls to the earlier slot; draw rounds still halve
  - [x] Implement tiebreak in `resolvePairing` via new exported pure
        `doubleKoWinner` using `BattleResult.finalHp`; update stale comment
        (FR-C4 part 1)
  - [x] Commit `fix(sim): cup double_ko resolves by remaining HP tiebreak` +
        git note
- [x] Task: Resolve CupOutcome at machine boundary (FR-A5) (556ef30)
  - [x] Write failing tests pinning `"won" | "lost"` at `applyCupRewards` input
        (numeric placements rejected at the boundary)
  - [x] Move numeric-placement collapse into `machine.ts` (`enterCup`); shrink
        `CupOutcome` union; delete `toOutcome`
  - [x] Commit `refactor(sim): normalize cup outcome at machine boundary`
- [x] Task: Retire vestigial cup machine paths (FR-A6) (e331c48)
  - [x] Delete `beginCup`/`endCup`; barrel export reduced to `enterCup`; the
        phase suite in `loop.test.ts` now pins the real contract (ticker
        grants cup phase, `enterCup` flips back — covered in cupMachine tests)
  - [x] Commit `refactor(sim): remove bypassed beginCup/endCup cup machine paths`
- [x] Task: Shared migration validator (FR-A2) (c67d106)
  - [x] Add unit test for `validateStateShape(raw, version)` accept/reject table
  - [x] Extract helper; reduce six migrations to pure field-shapers; reorder
        `Record` keys ascending (v0→v5)
  - [x] Verify full v0→v6 migration test chain still green (byte-level state
        parity)
  - [x] Commit `refactor(sim): extract shared save state-shape validator`
- [x] Task: Type-color contract into sim (FR-A4) (c2dd5ea)
  - [x] Move `ELEMENT_HUE` to `@apex/sim` (beside `typeFactor`); update
        `staging`/`battleHud` imports; delete client copy
  - [x] Commit `refactor(sim): canonicalize ELEMENT_HUE type-color contract`
- [x] Task: Pin champion stat constant (FR-A7) (fb07035)
  - [x] Export `CHAMPION_STAT_BOOST {hp:6, atk:4, def:4, spd:2}` with JSDoc
        noting sim-unused-today; `staging.ts` consumes it
  - [x] Commit `chore(sim): pin champion stat boost constant`
- [x] Task: Species-existence load validation (FR-B2) (d8d7720)
  - [x] Write failing test in `save.test.ts` storage suite: hand-edited save
        with unknown `speciesId` rejected by `loadGame`
  - [x] Add catalog lookup check to `isValidCreature`
  - [x] Commit `fix(sim): reject saves referencing unknown species`
- [x] Task: Dead RNG draw audit (FR-B3) (becd670)
  - [x] Verify `void creatureSeed` / over-drawn `pickNames` stream-stability
        requirements; pickNames count normalized (proven stream-neutral via
        golden test), creatureSeed kept + documented as load-bearing
  - [x] Commit `refactor(sim): audit cup RNG draws; pin stream invariant`
- [~] Task: Phase 1 Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Client Store & Dedupe (parity refactor)

- [ ] Task: Typed store module (TDD)
  - [ ] Write failing tests (DOM-free): get/set/subscribe semantics,
        `commit(state)` = persist → notify hud/spar/cup/scene in fixed order,
        persistence failure does not break notification
  - [ ] Implement `store.ts` with fake `SaveAdapter`
  - [ ] Commit `feat(client): typed game-state store with commit fanout`
- [ ] Task: Rewire main.ts through commit() (FR-A1)
  - [ ] Route every handler through `commit()`; remove per-handler
        persist/update pairs; strict behavior parity — no visual/timing changes
  - [ ] Manual smoke: all HUD actions, spar, cup entry, save/reload
  - [ ] Commit `refactor(client): route all state mutations through commit()`
- [ ] Task: Client dedupe pass (FR-A3)
  - [ ] Import `clampCondition` from settlement in `cupRewards.ts` (delete
        local copy)
  - [ ] Create shared reduced-motion predicate module; consume in
        `spar.ts`/`cup.ts`/`swap.ts`
  - [ ] Remove duplicated creature-condition branch in `storage.ts`
  - [ ] Commit `refactor(client): dedupe clampCondition and reduced-motion predicate`
- [ ] Task: Phase 2 Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Robustness & UX Polish

- [ ] Task: Save-failure handling (FR-B1)
  - [ ] Write failing test for the save-failure notice decision (coach-voice
        copy, non-blocking)
  - [ ] Wrap `saveGame` `setItem` in try/catch; surface HUD notice on failure
  - [ ] Commit `feat(client): friendly save-failure notice`
- [ ] Task: Meta tags & favicon (FR-C1)
  - [ ] Add favicon + description/theme-color/OG tags to `index.html`
  - [ ] Commit `style(client): add favicon and document meta tags`
- [ ] Task: Accessible status callout (FR-C2)
  - [ ] Add `aria-live="polite"` to ranch `status-callout`
  - [ ] Commit `style(client): announce ranch status callout to screen readers`
- [ ] Task: Cup pacing toggle (FR-C3)
  - [ ] Wire `playbackSpeed.ts` into the cup panel, replacing hardcoded
        `PACE_MS`; reduced-motion default honored
  - [ ] Manual verification: toggled speeds during a cup run
  - [ ] Commit `feat(client): cup panel pacing speed toggle`
- [ ] Task: Stale comment fixes (FR-C4)
  - [ ] Fix `starter.ts:42-43` "Water locked" comment
  - [ ] Commit `docs(client): fix stale starter and cup comments`
- [ ] Task: Phase 3 Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Docs & Close-out

- [ ] Task: Save schema documentation (FR-D1)
  - [ ] Write `docs/save-schema.md`: v6 shape, field meanings, migration chain
        summary, add-v7 recipe
  - [ ] Commit `docs: add save schema reference`
- [ ] Task: Final sweep & registry close
  - [ ] Full `bun run verify`; grep audit for leftover fanout/dupes
  - [ ] Update conductor docs for track completion
  - [ ] Commit `chore(conductor): finalize track 'Hardening & Quality Pass'`
- [ ] Task: Phase 4 Verification & Checkpoint (Refer to workflow.md)
