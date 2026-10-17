# Plan — Cup Module Refactor (`cup_module_refactor_20261018`)

Refactor track: behavior-identical decomposition of the cup domain (sim first,
then client), golden-test-first per the confirmed spec. Follows
`conductor/workflow.md` — git notes per task, plan updates per task, phase
checkpoints with explicit user verification.

## Phase 1 — Sim Golden Safety Net

- [x] Task: Pin sim cup behavior with semantic goldens
  - [x] New `cup.golden.test.ts`: bracket construction (strict match order +
        slot labels)
  - [x] `CupSession` step/transition flow (commit at first arena step,
        coach-room re-pick points, forfeit semantics)
  - [x] Rival-vs-rival verdict determinism (seeded, replayable)
  - [x] `cupPlacement` points (champion/runner-up/semifinal, loss/forfeit = 0)
  - [x] `bossForCup` routing across all tiers — all six bosses + walkover path
        (learnings §13)
  - [x] Confirm suite green — goldens *pin* current behavior (not red-first)

> b80cf9b — **Note:** 18-row exhaustive `bossForCup` routing grid (all six bosses,
> gate-overrides and re-summon rows) plus full `[round, slotA, slotB, winner,
> line]` transcripts for all three endings (champion seed 25, SF-exit seed 2,
> forfeit seed 101). Capture values taken from the live engine and
> cross-validated against the existing contract goldens (seed 101 rival
> winners matched exactly). 707 pass / 0 fail, biome clean. Deviation note:
> the plan's bracket-construction bullets were already pinned by existing
> goldens (`cup.test.ts` draw-stream, `cup-contracts.test.ts` exact fields)
> and are not duplicated; the new file instead adds the exhaustive routing
> grid and full-transcript depth that were missing.
>
> **[checkpoint: b80cf9b]** Phase 1 complete — user-approved. Test-only
> phase; no production logic changed. Browser probe waived by approval.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Sim Decomposition (FR1, FR2)

- [x] Task: Data-driven `bossForCup` routing
  - [x] TDD: equivalence tests derived from Phase 1 goldens
  - [x] Frozen milestone→boss table + thin lookup in `bosses.ts`; routing
        output byte-identical

> fac7eef — **Note:** TDD red first (`CUP_ROUTES` shape tests: frozen,
> ordered per tier, gate→milestone pairing pinned — silver gates on
> `"promotion"`, gold re-seats the `"apex"` Thessa). Then the frozen
> per-tier rule table (`when`/`milestone`/`kind`) with a thin first-match
> lookup replacing the if/else chain. Behavior proven identical by the
> Phase 1 golden grid + all existing `cup.boss` tests. 712 pass / 0 fail,
> biome clean.

- [~] Task: Split `packages/sim/src/cup.ts` → `packages/sim/src/cup/`
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
