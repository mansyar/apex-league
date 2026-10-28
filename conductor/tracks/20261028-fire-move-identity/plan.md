# Fire Move Identity — Implementation Plan

> **Branch:** `feat/20261028-fire-move-identity`
> **Base:** `main` @ `50e083d8`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Per-Row Look Override + Geometry Pieces

- **Goal:** Any move row can select its own shot geometry + trail; new `fork`, `chunk`, `needle`, `jet` pieces exist with unit pins.
- **Depends on:** none
- **Covers:** FR-1
- **Touches:** `apps/client/src/move-fx/looks.ts`, `apps/client/src/move-fx/moves.ts`, `apps/client/src/fx/shot-geometry.ts`, `apps/client/src/move-fx/*.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

**Result:** verified
**Evidence:** conductor/tracks/20261028-fire-move-identity/verification/phase-1.md

- [x] **P1.T1: Row-level look override in `fxFor`** — covers: FR-1
- [x] **P1.T2: New geometry pieces (fork, chunk, needle, jet) + gather effect** — covers: FR-1
- [x] **P1.T3: Unit pins (override fallthrough, piece determinism, vertex-level distinctness)** — covers: FR-1

## Phase 2: Fast Pair — Spark Fork + Flare Needle

- **Goal:** Spark reads as zigzag crackle, Flare Dart as flat pierce; Move Lab GIFs for both.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-4, AC-1, AC-3
- **Touches:** `apps/client/src/move-fx/moves/fire.ts`, `apps/client/src/move-fx/moves/fallback.test.ts`
- **Verification:** `bun run verify && bun run build` + GIFs `fire-spark.gif`, `fire-flare_dart.gif`
- **Status:** verified

**Result:** verified
**Evidence:** conductor/tracks/20261028-fire-move-identity/verification/phase-2.md

- [x] **P2.T1: Spark zigzag fork (no travel ball, snap flash)** — covers: FR-2, AC-1
- [x] **P2.T2: Flare Dart needle (flat, trailless, pierce impact)** — covers: FR-4, AC-3

## Phase 3: Heavy Pair — Cinder Lob + Blaze Artillery

- **Goal:** Cinder Shot lobs and falls with drip + scorch; Blaze Bolt gathers visibly then lands the biggest bloom + burn.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-5, AC-2, AC-4
- **Touches:** `apps/client/src/move-fx/moves/fire.ts`, `apps/client/src/move-fx/moves/fallback.test.ts`
- **Verification:** `bun run verify && bun run build` + GIFs `fire-cinder_shot.gif`, `fire-blaze_bolt.gif`
- **Status:** verified

**Result:** verified
**Evidence:** conductor/tracks/20261028-fire-move-identity/verification/phase-3.md

- [x] **P3.T1: Cinder Shot lobbed chunk (positive gravity, drip trail, scorch)** — covers: FR-3, AC-2
- [x] **P3.T2: Blaze Bolt charge gather + heavy smoke bolt + lingering burn** — covers: FR-5, AC-4

## Phase 4: Pyre Wall Encirclement

- **Goal:** Wall ring ~2.5× around the defender within existing timing, denser jets + scorch ring.
- **Depends on:** Phase 1
- **Covers:** FR-6, AC-5
- **Touches:** `apps/client/src/move-fx/moves/fire.ts`, `apps/client/src/move-fx/moves/verbs.ts`
- **Verification:** `bun run verify && bun run build` + GIF `fire-pyre_wall.gif`
- **Status:** verified

**Result:** verified
**Evidence:** conductor/tracks/20261028-fire-move-identity/verification/phase-4.md

- [x] **P4.T1: Scaled wall (ring size, jet density, scorch decal, timing held)** — covers: FR-6, AC-5

## Phase 5: Body-First Dash Trio

- **Goal:** Charge tackles through horizontally with zero shots, Dive craters vertically, Lance railguns pass-through — attacker motion dominates.
- **Depends on:** Phase 1
- **Covers:** FR-7, AC-6
- **Touches:** `apps/client/src/move-fx/moves/fire.ts`, `apps/client/src/move-fx/moves/verbs.ts`, `apps/client/src/move-fx/steps/fire.ts`
- **Verification:** `bun run verify && bun run build` + GIFs `fire-flame_charge.gif`, `fire-cinder_dive.gif`, `fire-pyre_lance.gif`
- **Status:** pending

- [ ] **P5.T1: Flame Charge pure body hit — ZERO shots, attacker crosses the arena, wreath + ground trail + cone arrival** — covers: FR-7, AC-6
- [ ] **P5.T2: Cinder Dive vertical crater (rise-plunge, radial eruption, pilot shot minimized or removed)** — covers: FR-7, AC-6
- [ ] **P5.T3: Pyre Lance pass-through beam (exit burst behind defender)** — covers: FR-7, AC-6

## Phase 6: GIF Catalog + Acceptance Sweep

- **Goal:** 8 per-move GIFs captured, user sign-off recorded, full gate green, grayscale spot-check.
- **Depends on:** Phases 2–5
- **Covers:** FR-8, AC-7
- **Touches:** `conductor/tracks/20261028-fire-move-identity/verification/`
- **Verification:** `bun run verify && bun run build` + 8 GIFs in evidence folder
- **Status:** pending

- [ ] **P6.T1: Capture 8 GIFs + grayscale readability pass** — covers: FR-8
- [ ] **P6.T2: Record user sign-off + close acceptance** — covers: AC-7
