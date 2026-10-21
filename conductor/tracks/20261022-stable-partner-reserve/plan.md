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
- **Status:** pending

- [ ] **P4.T1: Docs sync** — covers: FR-13
  - [ ] **P4.T1.1: `docs/save-schema.md` documents the stable, the age field and the v22 → v23 migration** — covers: FR-13
  - [ ] **P4.T1.2: README and `conductor/product.md` record the stable and close the electric line's known issue; `conductor/tech-stack.md` gets the dated entry** — covers: FR-13
- [ ] **P4.T2: Integrated verification** — covers: NFR-1, NFR-2, NFR-4, NFR-6, AC-9
  - [ ] **P4.T2.1: The full gate is green and the stable flow is proven in a browser at both widths** — covers: AC-9

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
