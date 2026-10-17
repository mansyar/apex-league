# Plan — Cup Module Refactor (`cup_module_refactor_20261018`)

Refactor track: behavior-identical decomposition of the cup domain (sim first,
then client), golden-test-first per the confirmed spec. Follows
`conductor/workflow.md` — git notes per task, plan updates per task, phase
checkpoints with explicit user verification.

## Phase 1 — Sim Golden Safety Net

- [ ] Task: Pin sim cup behavior with semantic goldens
  - [ ] New `cup.golden.test.ts`: bracket construction (strict match order +
        slot labels)
  - [ ] `CupSession` step/transition flow (commit at first arena step,
        coach-room re-pick points, forfeit semantics)
  - [ ] Rival-vs-rival verdict determinism (seeded, replayable)
  - [ ] `cupPlacement` points (champion/runner-up/semifinal, loss/forfeit = 0)
  - [ ] `bossForCup` routing across all tiers — all six bosses + walkover path
        (learnings §13)
  - [ ] Confirm suite green — goldens *pin* current behavior (not red-first)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Sim Decomposition (FR1, FR2)

- [ ] Task: Data-driven `bossForCup` routing
  - [ ] TDD: equivalence tests derived from Phase 1 goldens
  - [ ] Frozen milestone→boss table + thin lookup in `bosses.ts`; routing
        output byte-identical
- [ ] Task: Split `packages/sim/src/cup.ts` → `packages/sim/src/cup/`
  - [ ] Move `bracket.ts`, `session.ts`, `verdicts.ts`, `placement.ts` (pure
        relocation, no edits beyond imports)
  - [ ] `cup.ts` becomes barrel re-export; zero consumer import changes
- [ ] Task: Size-cap audit + `bun run verify` green; commit with git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Client Golden Safety Net

- [ ] Task: Pin client cup behavior with semantic goldens
  - [ ] Screen sequence: bracket → coach room → arena → results
  - [ ] Results screen math + placement/reward copy
  - [ ] Give-up → as-if-lost placement semantics
  - [ ] Coach-room kit/tactic re-pick flow per match
  - [ ] Confirm suite green before any move
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Client Decomposition (FR3, FR4)

- [ ] Task: Extract pure view-models first (TDD)
  - [ ] DOM-free modules for screen-flow ordering, results math, give-up
        semantics (`spar/loadout-vm.ts` style)
- [ ] Task: Split `apps/client/src/cup.ts` → `apps/client/src/cup/`
  - [ ] Submodules: screens / coach-room / results / session-flow + arena
        handoff
  - [ ] `cup.ts` remains the orchestration entrypoint (import path unchanged)
- [ ] Task: Size-cap audit (≤ ~12 KB each) + `bun run verify`; commit with
      git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Final Verification & Close

- [ ] Task: Full mock.html golden comparison + live browser probe — play a
      real cup end-to-end including a boss cup; attach evidence
- [ ] Task: Final `bun run verify`, registry/metadata status update, track
      closeout
