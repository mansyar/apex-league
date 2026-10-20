# Implementation Plan: Client Module Decomposition & Size Guard

Branch: `feat/20261020-client-decomposition`
Base: `dde88d1`

Status vocabulary: `pending` / `in_progress` / `verified` / `blocked`.

Phases are behaviour-preserving. Each phase moves code first and only re-exports
afterwards, so a review can read the diff as relocation. Browser smoke is part of
every phase, not just the last one: these modules are wiring, and a moved call can
silently change order.

## Phase 1: Composition root

- **Goal:** `main.ts` keeps boot and composition only; every extracted module is
  under the cap and the app boots identically.
- **Depends on:** none
- **Covers:** FR-1, FR-7, NFR-1, NFR-6
- **Touches:** `apps/client/src/main.ts`, `apps/client/src/app/*.ts` (new),
  `apps/client/src/main.test.ts` (only if it imports moved symbols)
- **Verification:** `bun run verify && bun run build`, plus browser smoke
  (draft → starter → care actions → detail modal → spar → cup → graduation)
- **Status:** verified
- **Result:** verified
- **Checkpoint:** d5b0117
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-1.md

- [x] **P1.T1: Seam map** — inventory every top-level block of `main.ts` with its
  imports and its position in the boot/subscription order; record it in the phase
  evidence before any move — covers: FR-1, NFR-1
- [x] **P1.T2: Extract scene sync** — `app/scene-sync.ts` takes `sceneVisuals`,
  `syncScene`, `applyCameraStyle`, `toggleArenaCamera` — covers: FR-1
  - [x] Pass the scene/arena handles the extracted functions need; no globals
- [x] **P1.T3: Extract audio wiring** — `app/audio.ts` takes the audio player, music
  beds, unlock gesture and the playback step-cue bridge — covers: FR-1
- [x] **P1.T4: Extract arena entry** — `app/arena.ts` takes `enterArena`, `exitArena`,
  the vignette/flash layer and the reduced-motion hand-off — covers: FR-1
- [x] **P1.T5: Extract screen construction** — `app/screens.ts` builds spar, cup,
  graduation and the HUD with their handler objects in the current order — covers: FR-1, FR-7
- [x] **P1.T6: Extract runtime graphics** — `app/runtime.ts` takes the graphics-health
  reducer, its cause copy and visibility handling; `main.ts` ends as boot + composition — covers: FR-1

## Phase 2: HUD trio

- **Goal:** `hud.ts`, `hud/plates.ts` and `hud/copy.ts` are each under the cap with
  identical rendered output and identical hint-trigger behaviour.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-7, NFR-2, NFR-7
- **Touches:** `apps/client/src/hud.ts`, `apps/client/src/hud/*.ts`,
  `apps/client/src/hud/copy*.ts` (new), `apps/client/src/hud/plates*.ts` (new),
  `apps/client/src/hud.test.ts` (import paths only)
- **Verification:** `bun run verify && bun run build`, plus browser smoke
  (care plates, hint dismissal persistence, settings chip reachable mid-battle)
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 9511846
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-2.md

- [x] **P2.T1: Split the plates** — `plates-score`, `plates-lineage`,
  `plates-creature`, `plates-callout`, plus `ladder-read` for the view-models — covers: FR-2
  - [x] `hud/plates.ts` keeps re-exporting the same names
- [x] **P2.T2: Split the copy** — `copy-care`, `copy-cup`, `copy-growth`, `hints`;
  `hud/copy.ts` re-exports — covers: FR-2, FR-7
- [x] **P2.T3: Split the HUD body** — `hud/shell.ts` (build + refs), `hud/update.ts`
  (state → plates), `hud/hints.ts` (onboarding); `hud.ts` becomes the facade — covers: FR-2

## Phase 3: Scene, camera, effects

- **Goal:** scene composition, dressing and the frame loop are separate; effect layers
  and camera framing are separate; a full battle still looks and sounds identical.
- **Depends on:** Phase 1
- **Covers:** FR-3, NFR-1, NFR-6
- **Touches:** `apps/client/src/scene.ts`, `apps/client/src/scene/*.ts` (new),
  `apps/client/src/staging-fx.ts`, `apps/client/src/fx/*.ts`,
  `apps/client/src/orbit-camera.ts`, `apps/client/src/camera/*.ts` (new)
- **Verification:** `bun run verify && bun run build`, plus a battle played to a
  verdict to exercise projectiles, bursts and hit-stop
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 97a9bba
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-3.md

- [x] **P3.T1: Split the scene** — composition vs ground/prop dressing vs frame loop;
  `scene.ts` keeps its exported handle and options — covers: FR-3
- [x] **P3.T2: Split the effects** — hit-stop, projectiles and bursts into `fx/`
  modules that the existing `createBattleEffects` composes — covers: FR-3
- [x] **P3.T3: Split the camera** — arena framing vs drag/orbit, building on
  `orbit-logic.ts`; the exported factory and options are unchanged — covers: FR-3

## Phase 4: Screens and dev harness

- **Goal:** every screen module is under the cap; the dev harness splits like shipping
  code; each entry HTML still works.
- **Depends on:** Phase 2 (HUD plates feed the cup and spar screens)
- **Covers:** FR-4, FR-5, NFR-2
- **Touches:** `apps/client/src/cup-screens.ts`, `apps/client/src/cup/*.ts`,
  `apps/client/src/spar.ts`, `apps/client/src/spar/*.ts`,
  `apps/client/src/graduation.ts`, `apps/client/src/graduation/*.ts`,
  `apps/client/src/mock.ts`, `apps/client/src/mock/*.ts` (new)
- **Verification:** `bun run verify && bun run build`, plus a cup run, a graduation
  (seeded save) and `mock.html` in the browser
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 3466438
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-4.md

- [x] **P4.T1: Split the cup screens** — bracket, coach, results, give-up and battle
  chips under `cup/` — covers: FR-4
- [x] **P4.T2: Split spar** — screen vs setup vs casting under `spar/` — covers: FR-4
- [x] **P4.T3: Split graduation** — screen vs modal shell under `graduation/` — covers: FR-4
- [x] **P4.T4: Split the harness** — `mock.ts` into sections + showcase under `mock/` — covers: FR-5

## Phase 5: The guard

- **Goal:** the 12 KB rule is enforced across the whole client tree, and it fails with
  an actionable message.
- **Depends on:** Phases 1–4 (clean up first, guard last)
- **Covers:** FR-6, NFR-3, NFR-4, NFR-5, NFR-7
- **Touches:** `apps/client/src/module-size.test.ts`,
  `conductor/tech-stack.md`, `conductor/tracks/20261020-client-decomposition/verification/*`
- **Verification:** `bun run verify && bun run build`; the negative control must fail
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 57ac657
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-5.md, conductor/tracks/20261020-client-decomposition/verification/integrated.md

- [x] **P5.T1: One guard** — walk every `.ts` under `apps/client/src`, skip `*.test.ts`
  and `vite-env.d.ts`, assert the cap, report path + bytes per offender; delete
  `size-probe.test.ts` — covers: FR-6
- [x] **P5.T2: Negative control** — a test writing an oversized temp module proves the
  guard rejects it, then removes the file; dated note in `tech-stack.md` — covers: FR-6
- [x] **P5.T3: Integrated verification** — full suite, build, determinism gate, browser
  smoke of every surface, and the phase evidence trail — covers: all

## Phase R1: Review Fixes

- **Goal:** close the five round-1 findings: dangling head SHAs in the phase reports,
  contradictory suite counts, and the three guard-quality gaps (symlinked folders and
  non-`.ts` sources, a fixture written into the repo, a misquoted report format).
- **Depends on:** Phase 5
- **Covers:** F1, F2, F3, F4, F5
- **Touches:** `apps/client/src/module-size.test.ts`,
  `conductor/tracks/20261020-client-decomposition/verification/*`,
  `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build` plus the guard's own suite
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 440965b
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-R1.md

- [x] **R1.T1: Records resolve** - name the checkpoint in every phase report, note the
  squash, and reconcile the suite counts between `phase-5.md` and `integrated.md`
  - covers: F1, F2
- [x] **R1.T2: Guard sees everything** - follow symlinked folders via `statSync`,
  measure `.ts`/`.tsx`/`.mts`, keep `.test.*` and `vite-env.d.ts` exempt
  - covers: F3
- [x] **R1.T3: Control leaves no trace** - build the oversized fixture in an OS temp
  folder and remove it recursively in `finally` - covers: F4
- [x] **R1.T4: Note matches the code** - quote the real offender line in
  `tech-stack.md` and record the widened extensions - covers: F5
## Phase R2: Review Fixes

- **Goal:** close the four round-2 findings: stale evidence prose for the temp-folder
  control and the widened extension set, a write that could still leak the temp folder,
  and one self-contradicting clause in the `tech-stack.md` note.
- **Depends on:** Phase R1
- **Covers:** N1, N2, N3, N4
- **Touches:** `apps/client/src/module-size.test.ts`,
  `conductor/tracks/20261020-client-decomposition/verification/*`,
  `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build` plus the guard's own suite
- **Status:** verified
- **Result:** verified
- **Checkpoint:** PENDING
- **Evidence:** conductor/tracks/20261020-client-decomposition/verification/phase-R2.md

- [x] **R2.T1: Evidence matches the guard** - rewrite the control and exclusion prose in
  `phase-5.md` and `integrated.md` (AC-2, AC-3) and drop the obsolete insert block
  - covers: N1, N2
- [x] **R2.T2: No leaked folder** - move the fixture write inside the `try` so a write
  failure still cleans up - covers: N3
- [x] **R2.T3: One clause, one rule** - the note's opening says `.ts`/`.tsx`/`.mts`
  - covers: N4