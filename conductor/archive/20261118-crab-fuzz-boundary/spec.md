# Nightly fuzz red: crab boundary — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Fix a reproducible voxel-boundary defect in the crab archetype that has kept the
nightly determinism workflow red for at least 20 consecutive runs while PR
checks stayed green. Restore a green full fuzz sweep, lock the failing seeds
into gate-visible coverage, and openly regenerate any committed determinism
artifacts whose bytes legitimately change.

## Problem / Motivation

The scheduled nightly workflow has failed every sampled night from 29 Oct to
17 Nov 2026 with the same two fuzz failures. Local `bun run test:fuzz`
reproduces it: 93 pass / 2 fail, with four boundary violations each at seeds 24
and 37, all crab leg voxels at `y = 0` on the 56³ grid. PR checks miss this
because their smoke slice runs only the first three seeds per shard. Left
alone, the team loses trust in the nightly safety net and a real geometry
invariant stays broken.

## Goals & Success Metrics

- **Goal:** no crab voxel touches the grid boundary for any full-sweep seed;
  nightly-equivalent verification is green.
- **Metric:** `bun run test:fuzz` exits 0 with zero violations; `bun run verify &&
  bun run build` is green; determinism gate is byte-identical after any
  explicitly recorded artifact regeneration.

## Scope

### In Scope

- Raise the crab leg `footY` floor in `packages/voxel/src/crab.ts`.
- Add targeted regression coverage for seeds 24 and 37.
- Make the full fuzz sweep green.
- Regenerate `artifacts/crab-42*.{glb,manifest.json}` only if generator output
  changes, and record old/new hashes in evidence.

### Out of Scope

- Sim, battle, save, UI, or dependency changes.
- Other archetypes and any general voxelizer refactor.
- Expanding the PR fuzz smoke slice.
- Device-lab, pacing, and roster product decisions.

## Bug Details

- **Reproduction steps:**
  1. On `main`, run `bun run test:fuzz` (sets `APEX_FUZZ_SWEEP=full`).
  2. Observe shards `boundary.crab.20-29` and `boundary.crab.30-39` fail at
     `expect(violations).toBe(0)` with `Received: 4`.
  3. Seed 24 legs land at `[19,0,33]`, `[36,0,33]`, `[19,0,22]`, `[36,0,22]`;
     seed 37 at `[18,0,34]`, `[37,0,34]`, `[18,0,21]`, `[37,0,21]`.
- **Expected behavior:** no voxel coordinate equals `0` or `CRAB_GRID - 1` (55).
- **Actual behavior:** four leg voxels sit on `y = 0` for each failing seed.
- **Root-cause hypothesis:** `footY = 2.4 + 0.4 * bg` combined with leg radii up
  to `1.9 * bg` (and the hip sphere) lets the leg capsule bottom reach the
  ground plane at some girths.
- **Regression test:** make seeds 24 and 37 gate-visible with explicit boundary
  assertions; the test must fail before the fix and pass after.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Raise the crab leg foot placement floor so no leg voxel touches `y = 0` or the opposite boundary for any full-sweep seed. | must |
| FR-2 | Add explicit regression coverage for seeds 24 and 37 that fails on the unfixed generator and passes after the fix. | must |
| FR-3 | Keep `bun run test:fuzz` (full sweep) green with zero boundary violations across all shards. | must |
| FR-4 | If generator output changes, regenerate the committed seed-42 crab GLB/manifest pairs and update the determinism gate baseline; record old/new hashes. | must |
| FR-5 | Preserve the existing leg thickness and proportion-audit contracts; do not fix the bug by shrinking the leg capsule radius. | must |
| FR-6 | Confine changes to `packages/voxel/**`, the `artifacts/crab-42*` fixtures, and Conductor evidence/state. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism gate is byte-identical after fixture regeneration; no gate loosening or skipped comparison. |
| NFR-2 | Voxel module size cap (24,576 B) remains satisfied. |
| NFR-3 | No new dependency, save-schema, `SIM_VERSION`, or public-contract change. |
| NFR-4 | PR fuzz smoke slice remains unchanged; `APEX_FUZZ_SWEEP=full` stays exclusive to `bun run test:fuzz`. |
| NFR-5 | Evidence records the exact commands, failure/pass counts, and old/new artifact hashes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Regression test for seeds 24 and 37 fails before the fix and passes after. | FR-2 |
| AC-2 | `bun run test:fuzz` exits 0 with zero violations and all shards passing. | FR-1, FR-3 |
| AC-3 | Determinism gate is green after explicit artifact regeneration; old/new hashes are recorded. | FR-4, NFR-1, NFR-5 |
| AC-4 | Crab proportion/audit tests pass with leg radius unchanged. | FR-5 |
| AC-5 | `bun run verify && bun run build` exits 0. | FR-6, NFR-2, NFR-3, NFR-4 |
| AC-6 | Scope check shows only approved paths changed. | FR-6 |

## Edge Cases

- All three life stages (baby, juvenile, champion) and carapace/claw style
  variants sampled by the full sweep must remain in bounds.
- The far plane `y = 55` and x/z planes must remain clear, not just the
  reproduced y-plane.
- Seed 42 crab artifacts may change; the gate must be updated through the
  documented export path, never by bypassing comparison.
- A fix that changes proportion-audit measurements must be rejected, not tuned
  by shrinking legs.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** `product.md` has no `Open Questions & Assumptions` section;
  no prior product answer applies to this defect.
- **Assumption:** the nightly workflow is intended as a correctness safety net,
  so a fully green `bun run test:fuzz` is the completion bar.
- **Assumption:** changing committed seed-42 GLB bytes is acceptable when
  generator behavior legitimately changes, provided hashes are recorded in
  evidence.

## References

- Nightly workflow run `44079330042` and 20-run failure history.
- Local `bun run test:fuzz` output: 93 pass / 2 fail; seeds 24 and 37.
- `packages/voxel/src/crab.ts`,
  `packages/voxel/src/fuzz/boundary.crab.*.test.ts`,
  `packages/voxel/scripts/determinism-gate.ts`,
  `packages/voxel/scripts/export-artifact.ts`.
