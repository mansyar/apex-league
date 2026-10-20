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
- **Status:** pending

- [ ] **P1.T1: Add discovery state to `GameState`** — covers: FR-4
  - [ ] Add `evolutionKnowledge: { juvenile: boolean; champion: boolean }`, initialised unknown in `createInitialState`
  - [ ] Add a pure helper that marks a gate known, idempotent
  - [ ] Export the type and helper through the sim barrel
- [ ] **P1.T2: Record discovery in `advanceDay`** — covers: FR-4
  - [ ] Carry the field into the `next` literal (it is rebuilt explicitly)
  - [ ] Baby→juvenile sets the juvenile gate; juvenile→champion sets both
- [ ] **P1.T3: Bump the save to v17 with migration** — covers: FR-5, NFR-4
  - [ ] Set `SAVE_VERSION = 17`; add the v16→v17 step rebuilding state with inferred flags
  - [ ] Juvenile ⇒ juvenile known; champion ⇒ both; no creature ⇒ none
  - [ ] Tests cover v1, v15, v16 and champion/juvenile/no-creature inputs
- [ ] **P1.T4: Update the hardcoded version assertions** — covers: FR-5
  - [ ] Update the four save test files asserting `SAVE_VERSION === 16`
- [ ] **P1.T5: Document the schema** — covers: FR-5
  - [ ] Add the v17 shape and inference rule to `docs/save-schema.md`

## Phase 2: Growth view-model

- **Goal:** A pure module turns `(creature, state)` into the exact row set, labels, and values for the current gate in both discovery states.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-6, NFR-1, NFR-2, NFR-5
- **Touches:** `apps/client/src/growth.ts`, `apps/client/src/growth.test.ts`
- **Verification:** `bun test --timeout 120000`
- **Status:** pending

- [ ] **P2.T1: Model the current gate** — covers: FR-1, FR-2
  - [ ] Select the gate by stage; key condition rows off `EvolutionReason`
  - [ ] Pre-discovery rows carry no digits and no threshold words
- [ ] **P2.T2: Reveal targets when known** — covers: FR-3
  - [ ] Render `Day 6 / 10`, `Mood 35 / 40`, `Bond 52 / 60`, `Cup wins 0 / 1`, and the clean-night countdown
  - [ ] One gate's discovery never reveals the other
- [ ] **P2.T3: Champion final-stage model** — covers: FR-6
  - [ ] No condition rows; a final-stage line
- [ ] **P2.T4: Copy and accessible status text** — covers: NFR-1, NFR-2, NFR-5
  - [ ] Met/unmet as text plus glyph, meaning independent of colour
  - [ ] Module stays under the 12 KB cap

## Phase 3: Panel integration & live refresh

- **Goal:** The Growth section renders in the active creature's detail modal, refreshes in place on settlement, and leaves Hall of Fame untouched.
- **Depends on:** Phase 2
- **Covers:** FR-1, FR-7, FR-8, AC-9, NFR-1
- **Touches:** `apps/client/src/creature-detail.ts`, `apps/client/src/hud.ts`, `apps/client/src/main.ts`, `apps/client/src/ui/kit.css`, `apps/client/src/creature-detail.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Render the Growth section** — covers: FR-1
  - [ ] Build the section from the Phase 2 model, placed after the context rows
- [ ] **P3.T2: Refresh while open** — covers: FR-7
  - [ ] Track the last state and re-render on commit while the modal is visible
  - [ ] A gate unlocked mid-session repaints without reopening
- [ ] **P3.T3: Accessibility pass** — covers: AC-9, NFR-1
  - [ ] Named region, per-row status text, glyph, reduced-motion safe
- [ ] **P3.T4: Style with the broadcast kit** — covers: NFR-1
  - [ ] Use existing kit classes; no gradients on panels
- [ ] **P3.T5: Prove Hall of Fame is unchanged** — covers: FR-8
  - [ ] Regression test or golden assertion on record rendering

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261020-evolution-discovery-ui/verification/phase-1.md
-->
