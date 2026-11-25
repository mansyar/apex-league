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
- **Status:** pending

- [ ] **P1.T1: Pin the doc truth baseline** — covers: FR-1, FR-2, FR-3, FR-4, AC-6
  - [ ] **P1.T1.1:** Record the current statements in `conductor/product.md` and `docs/save-schema.md` about stable capacity, active partner, and lifecycle.
  - [ ] **P1.T1.2:** Confirm `SAVE_VERSION` is `26` from the sim source and note the stale `25` in the doc.
- [ ] **P1.T2: Ratify the decisions in docs** — covers: FR-1, FR-2, FR-3, FR-4, AC-1, AC-2
  - [ ] **P1.T2.1:** Add an explicit ratification note to `conductor/product.md`: unlimited stable, one active partner, no release seam.
  - [ ] **P1.T2.2:** Correct `docs/save-schema.md` to version `26` and state no capacity limit, one active `creature`, frozen `stable` pets, and no release path.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-1.md
-->

## Phase 2: Decision record and integrated verification

- **Goal:** Record the revisit trigger and roadmap-only follow-ups, prove the diff is doc-only, and pass the full configured gate.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, AC-3, AC-4, AC-5, AC-7, NFR-2, NFR-4
- **Touches:** `conductor/tracks/20261126-stable-capacity-ranch-release/verification/phase-1.md`, `conductor/tracks/20261126-stable-capacity-ranch-release/verification/integrated.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Record the decision and doc truth evidence** — covers: FR-5, AC-3, AC-4, AC-6
  - [ ] **P2.T1.1:** Write the revisit trigger and roadmap-only follow-up policy into evidence.
  - [ ] **P2.T1.2:** Show the final diff touched only Conductor state and the two approved docs; no sim/client/server/save/generated change.
- [ ] **P2.T2: Run the integrated gate** — covers: FR-6, AC-5, AC-7, NFR-2, NFR-4
  - [ ] **P2.T2.1:** Run `bun run verify && bun run build` and record typecheck, tests, Biome, determinism, module-size, and build results.
  - [ ] **P2.T2.2:** Write `verification/integrated.md` mapping AC-1..AC-7 to evidence.

<!--
Review fixes, if any, are appended by `conductor-review` as:

## Phase R1: Review Fixes
-->
