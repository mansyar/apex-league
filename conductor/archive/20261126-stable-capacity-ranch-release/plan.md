# Decide stable capacity, ranch expansion, and pet release — Implementation Plan

> **Branch:** `chore/20261126-stable-capacity-ranch-release`
> **Base:** `main` @ `d6502929052316b9b595671eae90fbc1fafc6700`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Ratify stable and ranch decisions

- **Goal:** Product and save-schema docs explicitly state unlimited stable capacity, exactly one active ranch partner, no release seam, and save version `26`.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, AC-1, AC-2, AC-6, NFR-1, NFR-3
- **Touches:** `conductor/product.md`, `docs/save-schema.md`
- **Verification:** `bun run verify && bun run build` (doc truth check recorded in evidence)
- **Status:** verified

- [x] **P1.T1: Pin the doc truth baseline** — covers: FR-1, FR-2, FR-3, FR-4, AC-6
  - [x] **P1.T1.1:** Record the current statements in `conductor/product.md` and `docs/save-schema.md` about stable capacity, active partner, and lifecycle.
  - [x] **P1.T1.2:** Confirm `SAVE_VERSION` is `26` from the sim source and note the stale `25` in the doc.
- [x] **P1.T2: Ratify the decisions in docs** — covers: FR-1, FR-2, FR-3, FR-4, AC-1, AC-2
  - [x] **P1.T2.1:** Add an explicit ratification note to `conductor/product.md`: unlimited stable, one active partner, no release seam.
  - [x] **P1.T2.2:** Correct `docs/save-schema.md` to version `26` and state no capacity limit, one active `creature`, frozen `stable` pets, and no release path.

<!--
**Result:** verified
**Checkpoint:** 35dc87a8
**Evidence:** conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-1.md
-->

## Phase 2: Decision record and integrated verification

- **Goal:** Record the revisit trigger and roadmap-only follow-ups, prove the diff is doc-only, and pass the full configured gate.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, AC-3, AC-4, AC-5, AC-7, NFR-2, NFR-4
- **Touches:** `conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-1.md`, `conductor/tracks/20261126-stable-capacity-ranch-release/verification/integrated.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `208ddff0`
- **Evidence:** `conductor/tracks/20261126-stable-capacity-ranch-release/verification/integrated.md`

- [x] **P2.T1: Record the decision and doc truth evidence** — covers: FR-5, AC-3, AC-4, AC-6
  - [x] **P2.T1.1:** Write the revisit trigger and roadmap-only follow-up policy into evidence.
  - [x] **P2.T1.2:** Show the final diff touched only Conductor state and the two approved docs; no sim/client/server/save/generated change.
- [x] **P2.T2: Run the integrated gate** — covers: FR-6, AC-5, AC-7, NFR-2, NFR-4
  - [x] **P2.T2.1:** Run `bun run verify && bun run build` and record typecheck, tests, Biome, determinism, module-size, and build results.
  - [x] **P2.T2.2:** Write `verification/integrated.md` mapping AC-1..AC-7 to evidence.

<!--
Review fixes, if any, are appended by `conductor-review` as:
-->

## Phase R1: Review Fixes

- **Goal:** Resolve F1 by documenting the shipped `v25 → v26` stat-fold migration in `docs/save-schema.md`, so the current `GameState at v26` header is backed by complete migration history.
- **Depends on:** Phase 2
- **Covers:** F1, FR-4, AC-2, AC-6
- **Touches:** `docs/save-schema.md`, `conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-R1.md`, `conductor/tracks/20261126-stable-capacity-ranch-release/verification/integrated.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `9bc8592c`
- **Evidence:** `conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-R1.md`

- [x] **R1.T1: Add the v25 → v26 migration row** — covers: F1, FR-4, AC-2, AC-6
  - [x] **R1.T1.1:** Source the row from `packages/sim/src/save/migrations/v25.ts`: HP absorbs the 210% arena scale via `round(hp * 21 / 10)`; trained HP folds and clamps to the scaled cap of 13; ATK/DEF/SPD and all other fields forward untouched; frozen cup-session sides gain `doctrine`.
  - [x] **R1.T1.2:** Place the row after the existing `v24 → v25` row without rewriting historical v25 references.
- [x] **R1.T2: Pin the doc-truth invariant and re-run the gate** — covers: F1, AC-6
  - [x] **R1.T2.1:** Record in evidence that the terminal migration row matches the current `GameState at v<N>` header.
  - [x] **R1.T2.2:** Re-run `bun run verify && bun run build` and update `verification/integrated.md`.
