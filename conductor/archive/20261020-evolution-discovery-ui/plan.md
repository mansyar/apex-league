# Evolution Threshold Discovery UI — Implementation Plan

> **Branch:** `feat/20261020-evolution-discovery-ui`
> **Base:** `main` @ `b97cb37c779835c388db0cdc4f248ea0027d7723`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Sim knowledge & save v17

- **Goal:** `GameState` carries per-gate discovery, `advanceDay` records it on a real stage change, and v1–v16 saves migrate with inference, proven by tests.
- **Depends on:** none
- **Covers:** FR-4, FR-5, NFR-4
- **Touches:** `packages/sim/src/state.ts`, `packages/sim/src/ticker.ts`, `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrate.ts`, `packages/sim/src/save/evolutionKnowledge.test.ts`, `packages/sim/src/save/breedingSave.test.ts`, `packages/sim/src/save/cupSave.test.ts`, `packages/sim/src/save/legacySave.test.ts`, `packages/sim/src/save/releasePolish.test.ts`, `packages/sim/src/index.ts`, `docs/save-schema.md`
- **Verification:** `bun test --timeout 120000`
- **Status:** verified

**Result:** verified
**Checkpoint:** 34fc937
**Evidence:** conductor/tracks/20261020-evolution-discovery-ui/verification/phase-1.md

- [x] **P1.T1: Add discovery state to `GameState`** — covers: FR-4
  - [x] Add `evolutionKnowledge: { juvenile: boolean; champion: boolean }`, initialised unknown in `createInitialState`
  - [x] Add a pure helper that marks a gate known, idempotent
  - [x] Export the type and helper through the sim barrel
- [x] **P1.T2: Record discovery in `advanceDay`** — covers: FR-4
  - [x] Carry the field into the `next` literal (it is rebuilt explicitly)
  - [x] Baby→juvenile sets the juvenile gate; juvenile→champion sets both
- [x] **P1.T3: Bump the save to v17 with migration** — covers: FR-5, NFR-4
  - [x] Set `SAVE_VERSION = 17`; add the v16→v17 step rebuilding state with inferred flags
  - [x] Juvenile ⇒ juvenile known; champion ⇒ both; no creature ⇒ none
  - [x] Tests cover v1, v15, v16 and champion/juvenile/no-creature inputs
- [x] **P1.T4: Update the hardcoded version assertions** — covers: FR-5
  - [x] Update the four save test files asserting `SAVE_VERSION === 16`
- [x] **P1.T5: Document the schema** — covers: FR-5
  - [x] Add the v17 shape and inference rule to `docs/save-schema.md`

## Phase 2: Growth view-model

- **Goal:** A pure module turns `(creature, state)` into the exact row set, labels, and values for the current gate in both discovery states.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-6, NFR-1, NFR-2, NFR-5
- **Touches:** `apps/client/src/growth.ts`, `apps/client/src/growth.test.ts`
- **Verification:** `bun test --timeout 120000`
- **Status:** verified

**Result:** verified
**Checkpoint:** b039471
**Evidence:** conductor/tracks/20261020-evolution-discovery-ui/verification/phase-2.md

- [x] **P2.T1: Model the current gate** — covers: FR-1, FR-2
  - [x] Select the gate by stage; key condition rows off `EvolutionReason`
  - [x] Pre-discovery rows carry no digits and no threshold words
- [x] **P2.T2: Reveal targets when known** — covers: FR-3
  - [x] Render `Day 6 / 10`, `Mood 35 / 40`, `Bond 52 / 60`, `Cup wins 0 / 1`, and the clean-night countdown
  - [x] One gate's discovery never reveals the other
- [x] **P2.T3: Champion final-stage model** — covers: FR-6
  - [x] No condition rows; a final-stage line
- [x] **P2.T4: Copy and accessible status text** — covers: NFR-1, NFR-2, NFR-5
  - [x] Met/unmet as text plus glyph, meaning independent of colour
  - [x] Module stays under the 12 KB cap

## Phase 3: Panel integration & live refresh

- **Goal:** The Growth section renders in the active creature's detail modal, refreshes in place on settlement, and leaves Hall of Fame untouched.
- **Depends on:** Phase 2
- **Covers:** FR-1, FR-7, FR-8, AC-9, NFR-1
- **Touches:** `apps/client/src/creature-detail.ts`, `apps/client/src/hud.ts`, `apps/client/src/main.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/creature-detail.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P3.T1: Render the Growth section** - covers: FR-1
  - [x] Build the section from the Phase 2 model, placed after the context rows
- [x] **P3.T2: Refresh while open** - covers: FR-7
  - [x] Track the last state and re-render on commit while the modal is visible
  - [x] A gate unlocked mid-session repaints without reopening
- [x] **P3.T3: Accessibility pass** - covers: AC-9, NFR-1
  - [x] Named region, per-row status text, glyph, reduced-motion safe
- [x] **P3.T4: Style with the broadcast kit** - covers: NFR-1
  - [x] Use existing kit classes; no gradients on panels
- [x] **P3.T5: Prove Hall of Fame is unchanged** - covers: FR-8
  - [x] Regression test or golden assertion on record rendering

**Result:** verified
**Checkpoint:** 385a49f
**Evidence:** conductor/tracks/20261020-evolution-discovery-ui/verification/phase-3.md

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1, F2 (reclassified High: NFR-2 is unmet at 12,305 B), F3, F4.
- **Depends on:** Phase 3
- **Covers:** F1, F2, F3, F4
- **Touches:** `apps/client/src/growth-panel.ts` (new), `apps/client/src/growth.ts`, `apps/client/src/growth.test.ts`, `apps/client/src/creature-detail.ts`, `apps/client/src/creature-detail.test.ts`, `conductor/tracks/20261020-evolution-discovery-ui/verification/phase-1.md`, `conductor/tracks/20261020-evolution-discovery-ui/verification/phase-2.md`, `conductor/tracks/20261020-evolution-discovery-ui/verification/phase-3.md`, `conductor/tracks/20261020-evolution-discovery-ui/verification/integrated.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **R1.T1: Bring touched modules under the 12 KB cap** - covers: F2, NFR-2
  - [x] Extract the Growth section DOM builders out of `creature-detail.ts` into `growth-panel.ts`
  - [x] `creature-detail.ts` and `growth-panel.ts` both measure at or under 12,288 B
- [x] **R1.T2: Remove the unused row target** - covers: F3, FR-3
  - [x] Drop `GrowthRow.target`/`Condition.target`; `detail` is the single representation
- [x] **R1.T3: Prove the open-panel repaint** - covers: F1, AC-7, FR-7
  - [x] Fake-DOM test: `open` renders the gate, `sync` repaints it without reopening, `sync` is a no-op while closed, creature-less state hides the host
- [x] **R1.T4: Correct the evidence trail** - covers: F4
  - [x] Replace squashed per-task SHAs with the real phase checkpoints and say so
  - [x] Restate the module-size claim as measured, not guard-enforced

**Result:** verified
**Checkpoint:** 4a1e185
**Evidence:** conductor/tracks/20261020-evolution-discovery-ui/verification/phase-R1.md

## Phase R2: Review Fixes

- **Goal:** Resolve the round-2 findings M1 (panel wiring still untested while the evidence claimed AC-7 closed), M2 (R1 plan state and the unrecorded test file), L1, L2, L3, L4, L5.
- **Depends on:** Phase R1
- **Covers:** M1, L1, L2, L3, L4, L5
- **Touches:** `apps/client/src/creature-detail.test.ts`, `apps/client/src/creature-detail.ts`, `apps/client/src/growth-panel.ts`, `apps/client/src/growth-panel.test.ts`, `apps/client/src/growth.test.ts`, `conductor/tracks/20261020-evolution-discovery-ui/verification/phase-R1.md`, `conductor/tracks/20261020-evolution-discovery-ui/verification/integrated.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **R2.T1: Prove the panel wiring** - covers: M1, AC-7, FR-7
  - [x] Stub `document`/`HTMLElement` and drive `buildCreatureDetail`: `open` unhides the Growth slot with a title, `sync` repaints its rows while open, `sync` after close leaves the slot untouched
- [x] **R2.T2: Fix the host surface** - covers: L4, L5
  - [x] Drop the unused `GrowthHost.node` and correct the `setVisible` docstring
  - [x] Paint before showing in `open` so the section renders once
- [x] **R2.T3: Tighten the existing tests** - covers: L1, L3
  - [x] Assert undiscovered rows contain no `/` instead of a non-empty length
  - [x] Restore `globalThis.document` after the tests that stub it
- [x] **R2.T4: Correct the R1 evidence** - covers: L2
  - [x] `phase-R1.md` names `4a1e185` and states the squash once, with no dangling SHAs
  - [x] Record `growth-panel.test.ts` and the now-run lint layer

**Result:** verified
**Checkpoint:** f247ea9
**Evidence:** conductor/tracks/20261020-evolution-discovery-ui/verification/phase-R2.md