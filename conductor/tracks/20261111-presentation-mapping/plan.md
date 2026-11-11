# Presentation Mapping — Implementation Plan

> **Branch:** `feat/20261111-presentation-mapping`
> **Base:** `main` @ `3c525eae943c1d793b97ceba706cccc01c052453`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Pose Foundation

- **Goal:** Hitstun flinch, poise-break crumple, and startup crouch play from the existing stream, with mapping tests for every event kind.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-5, FR-10, AC-1, AC-2, AC-5, AC-10
- **Touches:** `apps/client/src/choreo*.ts`, `apps/client/src/fighter-driver.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** in_progress

- [ ] **P1.T1: Hitstun flinch + poise-break crumple** — covers: FR-1
  - [ ] **P1.T1.1: Flinch for the sim's hitstun window**
  - [ ] **P1.T1.2: Distinct crumple until the break ends**
- [ ] **P1.T2: Startup crouch** — covers: FR-5
- [ ] **P1.T3: Stream-to-pose mapping tests** — covers: FR-10, AC-10

## Phase 2: Dodge, Knockback, Contact

- **Goal:** Dodge roll, knockback recoil with planted feet and fence pins, contact squash/offset.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-7, AC-3, AC-4, AC-7
- **Touches:** `apps/client/src/fighter-driver.ts`, `apps/client/src/staging*.ts`, `apps/client/src/effects*`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Dodge roll along the dodge vector** — covers: FR-3
- [ ] **P2.T2: Knockback recoil, planted feet, fence-pin report** — covers: FR-4
- [ ] **P2.T3: Contact squash + render offset** — covers: FR-7

## Phase 3: Telegraph + Shader Accents

- **Goal:** Reach-derived telegraph wedge and the bounded shader set (squash-stretch, hit wobble/flash, KO dissolve, telegraph rings), capped concurrency.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-8, AC-6, AC-8
- **Touches:** `apps/client/src/dense-playback.ts`, `apps/client/src/effects*`, shader files, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Reach-derived wedge** — covers: FR-6
- [ ] **P3.T2: Bounded shader accents with capped instances** — covers: FR-8

## Phase 4: Reduced Motion + Visual Pass

- **Goal:** Reduced-motion flashes, replay-parity proof, playwright visual pass at desktop + phone, reference frame-time profile held.
- **Depends on:** Phase 3
- **Covers:** FR-9, NFR-1, NFR-3, NFR-5, AC-9, AC-11
- **Touches:** `apps/client/src/*` (reduced-motion path), `verification/` evidence, visual pass artifacts
- **Verification:** `bun run verify && bun run build` + playwright visual pass (desktop + phone)
- **Status:** pending

- [ ] **P4.T1: Reduced-motion flashes, outcome-identical** — covers: FR-9, AC-9
- [ ] **P4.T2: Replay-parity proof (hashes equal main)** — covers: NFR-1, AC-11
- [ ] **P4.T3: Visual pass + frame-time profile** — covers: NFR-3
