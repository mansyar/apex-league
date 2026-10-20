# Branching Evolution & Champion Forms — Implementation Plan

> **Branch:** `feat/20261020-branching-evolution-champion-forms`
> **Base:** `main` @ `ec8d7168e1113807889843566df0d61f6bad4722`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Branch contract, evolution, loadout, save v19

- **Goal:** The sim can describe, offer, choose, and evolve along two branches
  per species, and a v18 save migrates to v19 with `legacy` champions intact.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, FR-5, FR-6, FR-9, AC-1, AC-3, AC-4, AC-5, AC-6, AC-9
- **Touches:** `packages/sim/src/branches.ts`, `packages/sim/src/branches.test.ts`, `packages/sim/src/evolution.ts`, `packages/sim/src/evolution.test.ts`, `packages/sim/src/creature.ts`, `packages/sim/src/loadout.ts`, `packages/sim/src/loadout.test.ts`, `packages/sim/src/state.ts`, `packages/sim/src/index.ts`, `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrate.ts`, `packages/sim/src/save/migrate.test.ts`, `packages/sim/src/save/storage.ts`, `packages/sim/src/save/storage.test.ts`, `packages/sim/src/save/transfer.ts`, `packages/sim/src/save/transfer.test.ts`, `docs/save-schema.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P1.T1: Author the branch catalog** — covers: FR-1
  - [ ] **P1.T1.1: Define `EvolutionBranch`, the two-branch-per-species table, and a lookup that returns a species' pair; assert one pair per starter, all fields present, equal boost totals, and equal move numbers.**
  - [ ] **P1.T1.2: Add the six exclusive specials to the move catalog on the existing power/accuracy/cooldown templates, with element and display names, and assert each pair is symmetric.**
- [ ] **P1.T2: Replace the linear gate with a branch-aware one** — covers: FR-3, FR-4, FR-5
  - [ ] **P1.T2.1: Add `branch: string | null` to `Creature` and the `evolutionOffer` shape to `GameState`; keep `legacy` as a non-selectable catalog entry.**
  - [ ] **P1.T2.2: Implement `chooseBranch(state, branchId)` with offer/species/cup validation and gate-specific boost application; test success, wrong species, stale offer, duplicate, and cup-in-progress failures.**
  - [ ] **P1.T2.3: Make champion evolution apply the branch's cumulative boost; test that a legacy creature reproduces today's exact juvenile and champion stats.**
- [ ] **P1.T3: Make the known-move pool branch-aware** — covers: FR-6
  - [ ] **P1.T3.1: Append the branch special to `knownMoves` and teach it in `requiredDays`, without changing the default loadout slice.**
  - [ ] **P1.T3.2: Test equipping on the own branch, rejection on the sibling, legacy, a baby, and another species, and the friendly error text.**
- [ ] **P1.T4: Save v19 and migration** — covers: FR-9
  - [ ] **P1.T4.1: Bump `SAVE_VERSION` to 19; migrate v18 babies/juveniles to `branch: null`, champions and Hall of Fame records to `legacy`, and seed `evolutionOffer: null`.**
  - [ ] **P1.T4.2: Extend validation and export/import for the branch and offer; test a v18 fixture through migrate → serialize → parse → validate and a malformed branch/offer rejection.**
  - [ ] **P1.T4.3: Update `docs/save-schema.md` with the v19 fields, legacy semantics, and the migration rule.**
- [ ] **P1.T5: Export the public surface** — covers: FR-1, FR-3
  - [ ] **P1.T5.1: Re-export the catalog, `chooseBranch`, and the branch types from `packages/sim/src/index.ts`; keep the module under the client cap in later phases.**

## Phase 2: Settlement offers, rivals, and records

- **Goal:** A gate-ready creature generates exactly one pending offer, rivals
  branch deterministically, and retired records keep their branch.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-10, AC-2, AC-10
- **Touches:** `packages/sim/src/settlement.ts`, `packages/sim/src/settlement.test.ts`, `packages/sim/src/ticker.ts`, `packages/sim/src/ticker.test.ts`, `packages/sim/src/battle/rival-kit.ts`, `packages/sim/src/battle/rival-kit.test.ts`, `packages/sim/src/legacy.ts`, `packages/sim/src/legacy.test.ts`, `packages/sim/src/balance.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Return the offer from settlement** — covers: FR-2
  - [ ] **P2.T1.1: Have settlement return the settled creature plus an optional offer; `advanceDay` records it and marks the gate discovered.**
  - [ ] **P2.T1.2: Test offer creation on a gate night, no stage change, no second offer on later nights, and no champion evaluation while one is pending.**
- [ ] **P2.T2: Seed rivals and records** — covers: FR-10
  - [ ] **P2.T2.1: Draw a legal branch for generated rivals from their existing seed and include its special in the 4-of-7 kit; keep bosses pinned.**
  - [ ] **P2.T2.2: Carry `branch` through `RetiredRecord`, the Hall of Fame, and the breeding parent displays; migrate old records to `legacy`.**
  - [ ] **P2.T2.3: Add balance probes per branch, assert both branches stay in the established band, and assert identical seeds produce identical rivals.**

## Phase 3: Branch picker and discovery surfaces

- **Goal:** A player can see, defer, and confirm a branch from the ranch, and the
  Growth, detail, and handbook surfaces read the same state.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, AC-7, AC-8
- **Touches:** `apps/client/src/branch/`, `apps/client/src/branch.css`, `apps/client/src/hud/shell.ts`, `apps/client/src/hud/dock.ts`, `apps/client/src/hud/plates.ts`, `apps/client/src/growth.ts`, `apps/client/src/growth-panel.ts`, `apps/client/src/creature-detail.ts`, `apps/client/src/store.ts`, `apps/client/src/app/screens.ts`, `apps/client/src/main.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Build the picker view-model and DOM** — covers: FR-7
  - [ ] **P3.T1.1: A pure view-model turns an offer plus species into two card models (name, line, four deltas, move numbers, accent, crest).**
  - [ ] **P3.T1.2: A `branch/` module renders the cards with focus order, Enter/Space confirm, Escape/dismiss, and a live region; keep it under 12 KB.**
  - [ ] **P3.T1.3: Wire `chooseBranch` into the store, the ranch screen, and the cup guard; test the deferred-offer path.**
- [ ] **P3.T2: Persistent badge and discovery surfaces** — covers: FR-7, FR-8
  - [ ] **P3.T2.1: Add the HUD "evolution ready" badge that reopens the picker and hides once the offer clears.**
  - [ ] **P3.T2.2: Extend the Growth view-model with a pending/chosen branch row and repaint it on the existing seam.**
  - [ ] **P3.T2.3: Show the branch label and crest in the detail modal and on the creature plate; add the handbook "Paths" copy with no day numbers.**
  - [ ] **P3.T2.4: Add CSS on the shared kit, with desktop and phone layouts, and no colour-only stat deltas.**

## Phase 4: Branch presentation, audio cue, and docs sync

- **Goal:** The chosen branch is visible on the creature in ranch and arena,
  the evolution moment has its cue, and project docs match the shipped system.
- **Depends on:** Phase 3
- **Covers:** FR-8, FR-11, AC-8, AC-11
- **Touches:** `apps/client/src/scene/creature.ts`, `apps/client/src/scene/creature.test.ts`, `apps/client/src/audio/`, `apps/client/src/handbook/`, `conductor/product.md`, `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P4.T1: Runtime branch tint** — covers: FR-11
  - [ ] **P4.T1.1: Apply a per-instance accent tint on load and after evolution without mutating shared materials; test that two instances keep different tints.**
  - [ ] **P4.T1.2: Confirm the determinism gate is byte-identical and capture ranch/arena desktop and phone evidence with a clean console.**
- [ ] **P4.T2: Evolution cue and copy pass** — covers: FR-11
  - [ ] **P4.T2.1: Route the branch evolution through the existing evolution cue and check the reduced-motion path loses no information.**
  - [ ] **P4.T2.2: Read every new surface against the product voice and the two-sentence tooltip limit.**
- [ ] **P4.T3: Documentation sync** — covers: FR-8
  - [ ] **P4.T3.1: Update `conductor/product.md` Phase 2 status and `conductor/tech-stack.md` with the branch module boundary and save v19 note.**
