# Improve arena camera, lighting, and fighter readability — Implementation Plan

> **Branch:** `feat/20261127-arena-readability-pass`
> **Base:** `main` @ `9bb6710de839a347720fdf53fb66b2df50bbce16`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Measurable framing and cinematic composition

- **Goal:** Make fighters reliably readable through measurable tracked broadcast and cinematic action framing, with a separate wide establishing shot for arena corners, without changing fighter models, stage scale, simulation mapping, or legal movement bounds.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-4, FR-6, AC-1, AC-2, AC-3, AC-6, NFR-1, NFR-4, NFR-5
- **Touches:** `apps/client/src/camera/presets.ts`, `apps/client/src/camera/rig.ts`, `apps/client/src/director.ts`, `apps/client/src/director.test.ts`, `apps/client/src/scene-logic/framing.ts`, `apps/client/src/scene-logic/framing.test.ts`, `apps/client/src/scene-logic.test.ts`, `apps/client/src/roster.ts`, `apps/client/src/roster.test.ts`, `apps/client/src/staging.ts`, `apps/client/src/staging-director.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts`
- **Status:** verified

**Decision:** Owner approved tracked action framing plus a separate wide establishing shot. AC-1 retains the universal 8% / 32 CSS-pixel rest-position minimum measured from each cast rig's rendered rest height; AC-2 now requires every legal fighter position in frame during action and all arena corners in the establishing shot. Primary verification found that simulation-cylinder heights overstate several rendered rigs, so Phase 1 measures and feeds each fighter's actual normalized rest height into framing. The owner explicitly authorized the primary's final one-line formatter correction after the rework cap; prior blocked evidence remains in `verification/phase-1.md`.

- [x] **P1.T1: Pin measurable arena framing and camera composition** — covers: FR-1, FR-2, FR-6, AC-1, AC-2, AC-3
  - [x] **P1.T1.1:** Add projection/table tests for desktop, portrait, and landscape, measured rendered body-height extremes, mirror layouts, all legal fighter positions, and a wide establishing shot covering arena corners; pin the scene-logic barrel surface.
  - [x] **P1.T1.2:** Pin 8% viewport height / 32 CSS-pixel minimum at rest using each cast rig's measured normalized height, every legal fighter position in frame during action, all arena corners in the establishing shot, reduced-motion broadcast behavior, and resize/style-switch lifecycle.
  - [x] **P1.T1.3:** Observe and record a genuine failing baseline before implementation.
- [x] **P1.T2: Retune broadcast and cinematic framing** — covers: FR-1, FR-2, FR-4, AC-1, AC-2, AC-3
  - [x] **P1.T2.1:** Tune tracked broadcast/cinematic action framing, a wide establishing composition, responsive radius/FOV behavior, rig lifecycle, and cinematic director intents.
  - [x] **P1.T2.2:** Preserve `MM_TO_WORLD`, legal arena bounds, fighter scale, reduced-motion pinning, and shared ranch behavior.

**Result:** verified
**Checkpoint:** 82f713ef
**Evidence:** conductor/tracks/20261127-arena-readability-pass/verification/phase-1.md

## Phase 2: Arena dressing, lighting, and HUD names

- **Goal:** Create a brighter formal-arena presentation that preserves silhouette readability and complete battle labels while leaving simulation and shared scene behavior frozen.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, FR-6, AC-4, AC-5, AC-6, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5
- **Touches:** `apps/client/src/arena.ts`, `apps/client/src/battle-hud.css`, `apps/client/src/battleHud.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/battleHud.test.ts apps/client/src/scene-logic/framing.test.ts apps/client/src/director.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts`
- **Status:** verified

- [x] **P2.T1: Redress the arena shell and lighting** — covers: FR-3, FR-4, AC-4
  - [x] **P2.T1.1:** Retune arena-only floor, backdrop, stands/crowd, visual spacing, ambient/hemi/key/rim lighting, and fog for formal-competition contrast.
  - [x] **P2.T1.2:** Keep legal movement bounds, simulation mapping, fighter models/scale, shared ranch lighting/post-processing, and audio unchanged.
- [x] **P2.T2: Preserve full battle HUD names** — covers: FR-5, FR-6, AC-5, AC-6
  - [x] **P2.T2.1:** Replace ellipsis-prone responsive name layout with full-name wrapping or sizing for desktop, portrait, and landscape.
  - [x] **P2.T2.2:** Add long/mirrored-name regression coverage and confirm no page overflow or interactive-control occlusion.

**Result:** verified
**Checkpoint:** 986c7aeb
**Evidence:** conductor/tracks/20261127-arena-readability-pass/verification/phase-2.md

## Phase 3: Spar/cup browser proof and integrated gate

- **Goal:** Prove the finished arena in real spar and cup flows at desktop, portrait, and landscape sizes with stills, a short GIF, clean consoles, and the full configured gate.
- **Depends on:** Phase 1 and Phase 2
- **Covers:** FR-7, AC-6, AC-7, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5
- **Touches:** `conductor/tracks/20261127-arena-readability-pass/verification/phase-3.md`, `conductor/tracks/20261127-arena-readability-pass/verification/integrated.md`, gitignored `.conductor/evidence/20261127-arena-readability-pass/`
- **Verification:** `bun run verify && bun run build` plus `playwright-cli` captures and measurements at desktop `1440×900`, phone portrait `393×852`, and phone landscape `852×393`
- **Status:** blocked

- [ ] **P3.T1: Capture real spar and cup evidence** — covers: FR-7, AC-6, AC-7
  - [x] **P3.T1.1:** Capture broadcast and cinematic spar/cup action views plus a wide arena establishing shot at all three viewports using real UI and real sim seeding seams.
  - [x] **P3.T1.2:** Measure fighter projection, establishing-shot corner bounds, name bounds/ellipsis, page overflow, safe areas, and camera lifecycle behavior.
  - [ ] **P3.T1.3:** Cover reduced motion and dense effects, then produce stills plus a short GIF with clean consoles.
- [x] **P3.T2: Run the integrated gate and scope audit** — covers: AC-7, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5
  - [x] **P3.T2.1:** Run the full configured stack and module-size test; record exact results.
  - [x] **P3.T2.2:** Prove no sim/state/save/balance, audio, voxel/determinism, ranch/non-battle UI, dependency, or generated-file diff.

**Result:** blocked
**Blocking evidence:** conductor/tracks/20261127-arena-readability-pass/verification/phase-3.md — default broadcast action can occlude one fighter and arena contrast remains weak in independent visual review.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261127-arena-readability-pass/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
