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
