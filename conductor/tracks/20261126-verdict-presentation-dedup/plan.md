# Deduplicate verdict presentation across spar, cup, and battle HUD — Implementation Plan

> **Branch:** `refactor/20261126-verdict-presentation-dedup`
> **Base:** `main` @ `9209fcc926d564d0992d2e873059cdc2c585ca9c`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Shared verdict copy model

- **Goal:** A pure copy module derives every spar/cup/HUD verdict title and sub from already-resolved inputs, with a table test pinning all known variants before implementation.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-4, FR-5, AC-1, NFR-2
- **Touches:** `apps/client/src/verdict/copy.ts`, `apps/client/src/verdict/copy.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts`
- **Status:** verified

- [x] **P1.T1: Pin the copy contract in a table test** — covers: FR-5, AC-1
  - [x] **P1.T1.1:** Enumerate null winner, double-KO, time-out, winner keys, mirror-name qualification for spar and cup, and cup Champion/Eliminated copy with exact expected strings.
  - [x] **P1.T1.2:** Observe the red state before the module exists and record it in evidence.
- [x] **P1.T2: Author the pure copy module** — covers: FR-1, FR-2, FR-4, NFR-2
  - [x] **P1.T2.1:** Derive title/sub from resolved `BattleResult`, fight, and cup-session inputs; reuse `reasonLine` for the battle subline; recompute nothing.
  - [x] **P1.T2.2:** Keep the module frozen/small and export seams suitable for the spar, cup, and HUD adapters without changing any pinned string.

**Result:** verified
**Checkpoint:** d285abbd
**Evidence:** conductor/tracks/20261126-verdict-presentation-dedup/verification/phase-1.md

## Phase 2: Shared stamp view and adapter rewiring

- **Goal:** The battle HUD and cup results card use one stamp DOM view, and every spar/cup/HUD adapter delegates copy to the Phase 1 model with byte-identical wording, classes, animation, and accessibility.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, AC-2, AC-3, AC-4, AC-7, NFR-3, NFR-5
- **Touches:** `apps/client/src/verdict/stamp.ts`, `apps/client/src/verdict/stamp.test.ts`, `apps/client/src/battle-session.ts`, `apps/client/src/battle-session.test.ts`, `apps/client/src/battleHud.ts`, `apps/client/src/battleHud.test.ts`, `apps/client/src/cup/view-models.ts`, `apps/client/src/cup/view-models.test.ts`, `apps/client/src/cup/results.ts`, `apps/client/src/cup/screens/results.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts`
- **Status:** pending

- [ ] **P2.T1: Pin stamp DOM and adapter delegation** — covers: AC-2, AC-3, AC-4, AC-7
  - [ ] **P2.T1.1:** Pin class names, rule element, animation restart, `role="status"`, `aria-live="polite"`, and the cup's single combined announcement.
  - [ ] **P2.T1.2:** Pin that spar/cup title builders and cup results copy delegate to the shared model and that no verdict title/sub literals remain duplicated in those adapters.
- [ ] **P2.T2: Author the stamp view and rewire the surfaces** — covers: FR-1, FR-2, FR-3, NFR-3, NFR-5
  - [ ] **P2.T2.1:** Create the reusable stamp view with class-name configuration only; wire it into `battleHud.ts` and the cup results screen.
  - [ ] **P2.T2.2:** Delegate copy in `battle-session.ts` and `cup/view-models.ts`; leave `live/state.ts`, CSS, audio cues, sim, and save untouched.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-verdict-presentation-dedup/verification/phase-2.md
-->

## Phase 3: Visual evidence and integrated gate

- **Goal:** Prove the three verdict surfaces look and announce correctly on desktop and phone, and pass the full configured stack with a presentation-only diff.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-6, AC-5, AC-6, NFR-1, NFR-2, NFR-4
- **Touches:** `conductor/tracks/20261126-verdict-presentation-dedup/verification/phase-3.md`, `conductor/tracks/20261126-verdict-presentation-dedup/verification/integrated.md`, gitignored `.conductor/evidence/20261126-verdict-presentation-dedup/`
- **Verification:** `bun run verify && bun run build`, plus `playwright-cli` captures at 1440x900 and forced iPhone 15 393x852 with clean console checks
- **Status:** pending

- [ ] **P3.T1: Capture desktop and phone verdict surfaces** — covers: FR-6, AC-5
  - [ ] **P3.T1.1:** Capture the spar stamp, cup results stamp, and live battle HUD stamp through the real UI, using DOM `.click()` only if HUD/onboarding intercepts pointer input.
  - [ ] **P3.T1.2:** Run a console check per session and record 0 errors/0 warnings with screenshot paths.
- [ ] **P3.T2: Run the integrated gate and write evidence** — covers: AC-6, NFR-1, NFR-2, NFR-4
  - [ ] **P3.T2.1:** Run `bun run verify && bun run build` and record typecheck, Biome, unit, determinism, module-size, and build results.
  - [ ] **P3.T2.2:** Prove the final diff contains no sim/cup-result, save/schema, voxel, dependency, lockfile, CSS, audio, or generated-file change.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-verdict-presentation-dedup/verification/phase-3.md
-->
