# Fix HUD pointer interception and isolate modal input across desktop and mobile — Implementation Plan

> **Branch:** `fix/20261127-hud-pointer-modal-input`
> **Base:** `main @ 4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68`

## Phase 1: Shared modal background isolation

- **Goal:** Add an opt-in background-isolation contract to the existing modal helper so spar can make underlying HUD inert and aria-hidden without duplicating focus/dismissal logic.
- **Depends on:** None
- **Covers:** FR-3, FR-4, AC-3, AC-4, NFR-3, NFR-5
- **Touches:**
  - `apps/client/src/ui/modal.ts`
  - `apps/client/src/ui/modal.test.ts`
  - `apps/client/src/ui/focus.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts`
- **Status:** verified

- [x] **P1.T1: Pin background isolation and restoration** — covers: FR-3, FR-4, AC-3, AC-4, NFR-5
  - [x] Add failing tests for inert/aria-hidden background state.
  - [x] Pin restoration after close, repeated open/close, and nested-safe behavior.
  - [x] Preserve existing scrim, Escape, focus-trap, and return-focus tests.
- [x] **P1.T2: Implement opt-in isolation in the shared helper** — covers: FR-3, FR-4, NFR-3, NFR-5
  - [x] Record prior `inert`/`aria-hidden` values before isolation.
  - [x] Restore prior values exactly on close.
  - [x] Keep the default behavior unchanged for existing modals.

- **Result:** verified
- **Checkpoint:** `a878a967`
- **Evidence:** `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-1.md`

## Phase 2: HUD pointer ownership and spar modal adapter

- **Goal:** Make Rename and SPAR reliably clickable, then route the spar overlay through the shared modal lifecycle for its entire setup/fight/result lifetime.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, AC-1, AC-2, AC-3, AC-4, NFR-1, NFR-2, NFR-5
- **Touches:**
  - `apps/client/src/ranch.css`
  - `apps/client/src/spar.ts`
  - `apps/client/src/spar/panel.ts`
  - `apps/client/src/spar/panel.test.ts` (new)
  - `apps/client/src/spar.css`
  - `apps/client/src/hud/shell.ts` (only if the Rename fix requires a DOM change)
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts`
- **Browser verification:** `playwright-cli` at desktop `1440×900`, phone portrait `393×852`, and phone landscape `852×393`.
- **Status:** verified

- [x] **P2.T1: Repair HUD pointer ownership** — covers: FR-1, FR-2, FR-5, AC-1, AC-2
  - [x] Capture failing normal-click/hit-test evidence before the fix.
  - [x] Constrain transparent HUD wrappers so only visible controls receive pointer events.
  - [x] Give the creature plate/Rename target explicit reliable hit ownership.
  - [x] Re-run normal clicks without DOM `.click()` workarounds.
- [x] **P2.T2: Adapt spar to the shared modal lifecycle** — covers: FR-3, FR-4, AC-3, AC-4
  - [x] Add dialog semantics and an accessible label to the spar overlay.
  - [x] Open/close through the shared helper with background isolation.
  - [x] Enable Escape and scrim dismissal while preserving explicit close/back controls.
  - [x] Return focus to SPAR and verify repeated/mid-fight close behavior.

- **Result:** verified
- **Checkpoint:** `540d26b8`
- **Evidence:** `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-2.md`

## Phase 3: Visual evidence and integrated gate

- **Goal:** Prove the fix on desktop and both phone orientations, confirm clean consoles and no banned file-class changes, and run the full configured stack.
- **Depends on:** Phases 1 and 2
- **Covers:** FR-6, AC-5, AC-6, AC-7, NFR-1, NFR-2, NFR-4
- **Touches:**
  - `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-3.md`
  - `conductor/tracks/20261127-hud-pointer-modal-input/verification/integrated.md`
  - Gitignored `.conductor/evidence/20261127-hud-pointer-modal-input/`
- **Verification:** `bun run verify && bun run build`
- **Browser verification:** `playwright-cli` captures and console checks at desktop `1440×900`, phone portrait `393×852`, and phone landscape `852×393`.
- **Status:** verified

- [x] **P3.T1: Capture interaction and visual proof** — covers: FR-6, AC-1, AC-2, AC-3, AC-4, AC-5
  - [x] Record Rename and SPAR normal-click hit tests.
  - [x] Record dialog semantics, background inertness, focus trap, dismissal, and focus return.
  - [x] Capture desktop, portrait, and landscape screenshots with clean consoles.
- [x] **P3.T2: Run integrated verification and scope audit** — covers: AC-6, AC-7, NFR-1, NFR-2, NFR-4
  - [x] Run the full configured gate and module-size checks.
  - [x] Confirm no sim/save/balance/audio/voxel/dependency/generated-file diff.
  - [x] Record exact red/green evidence and final results.

- **Result:** verified
- **Checkpoint:** `9775267f`
- **Evidence:** `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-3.md`

## Phase R1: Review Fixes

- **Goal:** Resolve F1 so board ghost spar and every other spar entry return focus to the visible SPAR control after background restoration and teardown.
- **Depends on:** Phase 3
- **Covers:** F1, FR-4, AC-4, NFR-5
- **Touches:**
  - `apps/client/src/ui/modal.ts`
  - `apps/client/src/ui/modal.test.ts`
  - `apps/client/src/spar.ts`
  - `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-R1.md`
  - `conductor/tracks/20261127-hud-pointer-modal-input/verification/integrated.md`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` plus the mandatory primary `bun run verify && bun run build` gate.
- **Status:** verified

- [x] **R1.T1: Pin explicit return-focus and hidden-opener regressions** — covers: F1, FR-4, AC-4
  - [x] Add red tests for an explicit return target winning over the active opener.
  - [x] Add a nested board-close → spar-close sequence where the captured opener is connected but hidden.
- [x] **R1.T2: Wire the stable SPAR return target through the shared modal API** — covers: F1, FR-4, AC-4, NFR-5
  - [x] Add an opt-in explicit return-focus target without changing default modal behavior.
  - [x] Pass the SPAR button from `presentSetup` and preserve teardown-before-focus ordering.
  - [x] Record red/green, full-gate, scope, and browser evidence; leave other roadmap work untouched.

- **Result:** verified
- **Checkpoint:** `59551de5`
- **Evidence:** `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-R1.md`

## Phase R2: Review Fixes

- **Goal:** Resolve F2 by making the nested board-close → spar-close regression use the same default `closeModal(boardRoot)` options as production and model the inert board opener focus attempt.
- **Depends on:** Phase R1
- **Covers:** F2, AC-4, NFR-3
- **Touches:**
  - `apps/client/src/ui/modal.test.ts`
  - `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-R2.md`
  - `conductor/tracks/20261127-hud-pointer-modal-input/verification/integrated.md`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` plus the mandatory primary `bun run verify && bun run build` gate.
- **Status:** verified

- [x] **R2.T1: Match the production board-close sequence** — covers: F2, AC-4, NFR-3
  - [x] Pin the default board close's isolated-opener focus attempt and observe red before changing the close options.
  - [x] Use `closeModal(boardRoot)` and prove spar close still focuses `sparButton` without focusing the hidden Fight button.
- [x] **R2.T2: Record the test-fidelity fix and integrated evidence** — covers: F2, AC-4
  - [x] Record red/green, exact phase command, scope, and primary full-gate results.
  - [x] Leave production code, artifacts, sim/state/save/balance/audio/voxel/dependencies, and unrelated roadmap work untouched.

- **Result:** verified
- **Checkpoint:** `5484e811`
- **Evidence:** `conductor/tracks/20261127-hud-pointer-modal-input/verification/phase-R2.md`
