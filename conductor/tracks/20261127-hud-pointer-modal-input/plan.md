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
- **Status:** pending

- [ ] **P1.T1: Pin background isolation and restoration** — covers: FR-3, FR-4, AC-3, AC-4, NFR-5
  - [ ] Add failing tests for inert/aria-hidden background state.
  - [ ] Pin restoration after close, repeated open/close, and nested-safe behavior.
  - [ ] Preserve existing scrim, Escape, focus-trap, and return-focus tests.
- [ ] **P1.T2: Implement opt-in isolation in the shared helper** — covers: FR-3, FR-4, NFR-3, NFR-5
  - [ ] Record prior `inert`/`aria-hidden` values before isolation.
  - [ ] Restore prior values exactly on close.
  - [ ] Keep the default behavior unchanged for existing modals.

<!-- Primary appends Result / Checkpoint / Evidence after acceptance. -->

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
- **Status:** pending

- [ ] **P2.T1: Repair HUD pointer ownership** — covers: FR-1, FR-2, FR-5, AC-1, AC-2
  - [ ] Capture failing normal-click/hit-test evidence before the fix.
  - [ ] Constrain transparent HUD wrappers so only visible controls receive pointer events.
  - [ ] Give the creature plate/Rename target explicit reliable hit ownership.
  - [ ] Re-run normal clicks without DOM `.click()` workarounds.
- [ ] **P2.T2: Adapt spar to the shared modal lifecycle** — covers: FR-3, FR-4, AC-3, AC-4
  - [ ] Add dialog semantics and an accessible label to the spar overlay.
  - [ ] Open/close through the shared helper with background isolation.
  - [ ] Enable Escape and scrim dismissal while preserving explicit close/back controls.
  - [ ] Return focus to SPAR and verify repeated/mid-fight close behavior.

<!-- Primary appends Result / Checkpoint / Evidence after acceptance. -->

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
- **Status:** pending

- [ ] **P3.T1: Capture interaction and visual proof** — covers: FR-6, AC-1, AC-2, AC-3, AC-4, AC-5
  - [ ] Record Rename and SPAR normal-click hit tests.
  - [ ] Record dialog semantics, background inertness, focus trap, dismissal, and focus return.
  - [ ] Capture desktop, portrait, and landscape screenshots with clean consoles.
- [ ] **P3.T2: Run integrated verification and scope audit** — covers: AC-6, AC-7, NFR-1, NFR-2, NFR-4
  - [ ] Run the full configured gate and module-size checks.
  - [ ] Confirm no sim/save/balance/audio/voxel/dependency/generated-file diff.
  - [ ] Record exact red/green evidence and final results.

<!-- Primary appends Result / Checkpoint / Evidence after acceptance. -->
