# Stable & Partner Reserve — Implementation Plan

> **Branch:** `feat/20261022-stable-partner-reserve`
> **Base:** `main` @ `cf2cdbf`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Per-Pet Age

- **Goal:** every pet carries its own age, the growth gates read it, and a pet hatched late matures on its own tenth night instead of its first.
- **Depends on:** none
- **Covers:** FR-5, FR-12, NFR-3, NFR-4, AC-3, AC-4
- **Touches:** `packages/sim/src/creature.ts`, `packages/sim/src/evolution.ts`, `packages/sim/src/ticker.ts`, `packages/sim/src/state.ts`, `packages/sim/src/legacy.ts`, `packages/sim/src/save/*`, `packages/sim/src/*.test.ts`
- **Verification:** `bun run check && bun test --timeout 120000` (the evolution goldens re-pinned on the pet's age)
- **Status:** verified

**Result:** verified
**Checkpoint:** d929a77
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-1.md

- [x] **P1.T1: Give every creature an age counter** — covers: FR-5
  - [x] **P1.T1.1: Failing test first — the gates read the pet's age, and a day-24 hatch matures on its own tenth night** — covers: FR-5, AC-4
  - [x] **P1.T1.2: `ageDays` on the creature, stamped at 1 by every creation seam (starter, gift, graduation, breeding)** — covers: FR-5
- [x] **P1.T2: Move the gates onto the pet's age** — covers: FR-5, FR-12
  - [x] **P1.T2.1: The night settlement increments the active pet's age once per night** — covers: FR-5, NFR-3
  - [x] **P1.T2.2: Juvenile, champion and graduation gates (and the growth hints) read the pet's age, not the world day** — covers: FR-5, NFR-4
- [x] **P1.T3: Save the age and migrate it** — covers: FR-5, AC-3
  - [x] **P1.T3.1: Save v23 with a linear v22 → v23 migration that stamps the active pet's age from the world day (today's effective age)** — covers: FR-5, AC-6
  - [x] **P1.T3.2: Validation rejects a malformed age; `docs/save-schema.md` documents the field and the migration** — covers: FR-5

## Phase 2: The Stable

- **Goal:** the state holds every pet the player owns that is not in the ranch, and the swap, freeze, gift and graduation seams all work in the sim.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-7, FR-8, FR-10, FR-11, FR-12, NFR-3, AC-2, AC-3, AC-6, AC-8
- **Touches:** `packages/sim/src/state.ts`, `packages/sim/src/stable.ts`, `packages/sim/src/breeding.ts`, `packages/sim/src/legacy.ts`, `packages/sim/src/evolution.ts`, `packages/sim/src/save/*`, `packages/sim/src/index.ts`, `packages/sim/src/*.test.ts`
- **Verification:** `bun run check && bun test --timeout 120000`
- **Status:** verified

**Result:** verified
**Checkpoint:** d8dff99
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-2.md

- [x] **P2.T1: The stable on the state** — covers: FR-1
  - [x] **P2.T1.1: Failing test first — a pet can be stashed and brought back with every field intact** — covers: FR-3, AC-2
  - [x] **P2.T1.2: `stable` on the state, persisted by save v24 and validated; the migration leaves it empty** — covers: FR-1, AC-6
- [x] **P2.T2: The swap seam** — covers: FR-3, FR-10
  - [x] **P2.T2.1: `sendToStable` and `bringToRanch` are pure, free and lossless in both directions** — covers: FR-3, AC-2
  - [x] **P2.T2.2: Both refuse during a live cup or spar, with the day's phase lock** — covers: FR-10
- [x] **P2.T3: A stashed pet is frozen** — covers: FR-4
  - [x] **P2.T3.1: The night settlement touches neither a stashed pet's conditions nor its age** — covers: FR-4, AC-3
- [x] **P2.T4: The Storm Gift hatches into the stable** — covers: FR-7, FR-2
  - [x] **P2.T4.1: The gift hatch installs the hound in the stable; the ranch pet is untouched and stays active** — covers: FR-7, AC-1
- [x] **P2.T5: Graduation may hand the ranch to a stashed pet** — covers: FR-8
  - [x] **P2.T5.1: A graduation successor can be a stashed pet; the retired pet is archived as before** — covers: FR-8, AC-8
- [x] **P2.T6: Breeding stays Hall-only** — covers: FR-11, FR-12
  - [x] **P2.T6.1: The breeding pool ignores the stable; the cups tally stays the family's** — covers: FR-11, FR-12

## Phase 3: Client Surfaces

- **Goal:** the player sees the stable, swaps from it, sees each pet's age, and the gift card stops implying a replacement.
- **Depends on:** Phase 2
- **Covers:** FR-2, FR-6, FR-7, FR-8, FR-9, FR-10, NFR-1, NFR-5, AC-1, AC-5, AC-7
- **Touches:** `apps/client/src/stable.ts`, `apps/client/src/gift.ts`, `apps/client/src/hud/*`, `apps/client/src/graduation/*`, `apps/client/src/creature-detail.ts`, `apps/client/src/app/*`, `apps/client/src/ranch.css`, `apps/client/src/*.test.ts`
- **Verification:** `bun run check && bun test --timeout 120000` plus the visual pass (desktop + iPhone 15, clean console)
- **Status:** verified

**Result:** verified
**Checkpoint:** 681fe3e
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-3.md

- [x] **P3.T1: The stable chip and modal** — covers: FR-9
  - [x] **P3.T1.1: A chip beside Settings/Handbook opens a modal listing the stashed pets (crest, name, species, stage, age) with an empty state** — covers: FR-9, AC-7
  - [x] **P3.T1.2: *Bring to the ranch* commits the swap, rebuilds the ranch scene, and restores focus to the partner plate** — covers: FR-9, AC-7
- [x] **P3.T2: The age readout** — covers: FR-6
  - [x] **P3.T2.1: The partner-details modal carries an age row beside the stage** — covers: FR-6, AC-5
- [x] **P3.T3: The gift card and the graduation screen** — covers: FR-7, FR-8
  - [x] **P3.T3.1: The gift card says the hound goes to the stable, and the hatch leaves the ranch pet in place** — covers: FR-7, AC-1
  - [x] **P3.T3.2: The graduation egg screen offers the stashed pets as successors** — covers: FR-8
- [x] **P3.T4: The swap refusal reads as coaching, not a dead button** — covers: FR-10, NFR-5

## Phase 4: Docs & Integrated Verification

- **Goal:** the docs match the delivered behaviour and the full gate is green on the branch.
- **Depends on:** Phase 1, Phase 2, Phase 3
- **Covers:** FR-13, NFR-1, NFR-2, NFR-4, NFR-5, NFR-6, AC-9
- **Touches:** `docs/save-schema.md`, `README.md`, `conductor/product.md`, `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build` plus the re-run visual passes
- **Status:** verified

**Result:** verified
**Checkpoint:** 91114b0
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-4.md

- [x] **P4.T1: Docs sync** — covers: FR-13
  - [x] **P4.T1.1: `docs/save-schema.md` documents the stable, the age field and the v22 → v23 migration** — covers: FR-13
  - [x] **P4.T1.2: README and `conductor/product.md` record the stable and close the electric line's known issue; `conductor/tech-stack.md` gets the dated entry** — covers: FR-13
- [x] **P4.T2: Integrated verification** — covers: NFR-1, NFR-2, NFR-4, NFR-6, AC-9
  - [x] **P4.T2.1: The full gate is green and the stable flow is proven in a browser at both widths** — covers: AC-9

<!--
The primary appends after acceptance:

**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/<track-id>/verification/phase-<n>.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 4
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->

## Phase R1: Review Fixes

- **Goal:** close every finding from review round 1 — a waiting pet can be renamed, the stable's empty state is reachable, the growth panel calls the pet's age what it is, and the sim's evolution API stops advertising a day it no longer reads.
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3, F4, F5, FR-3, FR-5, FR-6, FR-9, NFR-3, NFR-5
- **Touches:** `packages/sim/src/stable.ts`, `packages/sim/src/evolution.ts`, `packages/sim/src/settlement.ts`, `packages/sim/src/index.ts`, `packages/sim/src/*.test.ts`, `apps/client/src/stable.ts`, `apps/client/src/growth.ts`, `apps/client/src/growth.test.ts`, `artifacts/champion-demo.ts`
- **Verification:** `bun run verify && bun run build` plus the re-run visual pass (the stable flow, both widths)
- **Status:** verified

**Result:** verified
**Checkpoint:** d77638c
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-R1.md

## Phase R2: Review Fixes (round 2)

- **Goal:** close the three findings the round-2 re-review raised — the rename editor is styled like the rest of the kit and is captured open, and its two untested branches are pinned.
- **Depends on:** Phase R1
- **Covers:** N1, G1, N2, FR-3, FR-9, NFR-5, NFR-1
- **Touches:** `apps/client/src/ranch.css`, `apps/client/src/stable-rename.ts`, `apps/client/src/stable.ts`, `apps/client/src/stable.test.ts`, `apps/client/src/base.css`
- **Verification:** `bun run verify && bun run build` plus the re-run visual pass (both widths, including an editor-open capture)
- **Status:** verified

**Result:** verified
**Checkpoint:** fdfaa9a
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-R2.md

### Tasks

- [x] **R2.T1: The rename editor wears the house kit (N1)** — style `.stable-pet-input` like `.creature-name-input` and `.stable-pet-name-row` as a flex row with the house 6 px gap; the pencil follows the house icon-button pattern (26 px on desktop, the phone tier's 44 px floor) instead of an inline size; the visual pass captures the editor open — covers: N1, NFR-5
- [x] **R2.T2: The editor's two untested branches are pinned (G1)** — Enter saves; a refused rename keeps the editor open, focuses the field and writes the note — covers: G1, FR-3
- [x] **R2.T3: The coverage table's stale FR-8 row (N2)** — done by the primary in `verification/integrated.md`; the fix phase confirms the docs still read true — covers: N2, FR-8

### Tasks

- [x] **R1.T1: A waiting pet can be renamed (F1)** — a pure `renameStablePet(state, creatureId, name)` seam with the same trim/clamp and `cup-phase` refusal as `renameCreature`, and a rename control on the stable row — covers: F1, FR-3, FR-9
- [x] **R1.T2: The stable's empty state is reachable (F3)** — the chip stays visible while the stable is empty, so the modal shows its empty state instead of a blank panel — covers: F3, FR-9
- [x] **R1.T3: The growth panel says "Age", not "Day" (F4)** — covers: F4, FR-6, FR-5
- [x] **R1.T4: `evaluateEvolution` stops taking a day it does not read (F5)** — drop the parameter and update the four call sites — covers: F5, FR-5, NFR-3
- [x] **R1.T5: FR-8 narrowed to the delivered options (F2)** — done by the primary in the spec (the pending gift is a pure gift with no inherited floor, so it waits in the stable like any other pet); the fix phase confirms no code claims the third option — covers: F2, FR-8
