# Nightly fuzz red: crab boundary — Implementation Plan

> **Branch:** `fix/20261118-crab-fuzz-boundary`
> **Base:** `main` @ `b7fcaf47fad9810396b13c3776589448423d4fda`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Correct crab foot placement and refresh deterministic artifacts

- **Goal:** no crab voxel touches the grid boundary in the full fuzz sweep, and the seed-42 crab GLB/manifest pairs match the corrected generator byte-for-byte.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, NFR-4, AC-2, AC-3, AC-4, AC-5
- **Touches:** `packages/voxel/src/crab.ts`, `artifacts/crab-42*.glb`, `artifacts/crab-42*.manifest.json`, `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-1.md`
- **Verification:** `bun run verify && bun run build && bun run test:fuzz`
- **Status:** verified

- [x] **P1.T1: Raise the crab leg foot floor** — covers: FR-1, FR-5, FR-3, AC-2, AC-4
  - [x] **P1.T1.1:** Increase the `footY` expression in `crab.ts` so the leg capsule/sphere cannot reach `y = 0` at maximum girth; keep leg radii unchanged.
  - [x] **P1.T1.2:** Confirm the full fuzz sweep reports zero boundary violations across all shards and that crab proportion/audit tests remain green.
- [x] **P1.T2: Regenerate affected deterministic artifacts** — covers: FR-4, NFR-1, AC-3
  - [x] **P1.T2.1:** Use the documented `export-artifact.ts` path to regenerate all three seed-42 crab GLB/manifest pairs.
  - [x] **P1.T2.2:** Re-run `bun run gate:determinism` and record old/new hashes plus the regeneration command in phase evidence.

<!--
**Result:** verified
**Checkpoint:** d2c9f679
**Evidence:** conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-1.md
-->

## Phase 2: Gate-visible regression coverage and scope proof

- **Depends on:** Phase 1
- **Goal:** the previously failing seeds 24 and 37 are explicit PR-visible boundary assertions, and the change set is proven confined to the approved paths.
- **Covers:** FR-2, FR-6, NFR-4, NFR-5, AC-1, AC-6
- **Touches:** `packages/voxel/src/fuzz/boundary.crab.20-29.test.ts`, `packages/voxel/src/fuzz/boundary.crab.30-39.test.ts`, `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-2.md`
- **Verification:** `bun run verify && bun run build && bun run test:fuzz`
- **Status:** verified

- [x] **P2.T1: Make the failing seeds gate-visible** — covers: FR-2, AC-1
  - [x] **P2.T1.1:** Add explicit seed 24 and seed 37 cases to the two crab boundary shards (or a dedicated co-located regression test) asserting no coordinate equals `0` or `CRAB_GRID - 1`.
  - [x] **P2.T1.2:** Record that these assertions fail on the pre-fix generator evidence and pass on the fixed code.
- [x] **P2.T2: Record scope and evidence** — covers: FR-6, NFR-5, AC-6
  - [x] **P2.T2.1:** Run a `git diff --name-only` scope check against the plan Touches and record exact commands, counts, and hashes in phase evidence.

<!--
**Result:** verified
**Checkpoint:** 8de7d999
**Evidence:** conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-2.md
-->

## Phase R1: Review Fixes

- **Goal:** Resolve F1 and F2 by restoring the three-seed PR smoke slice in both crab boundary shards while keeping the named seed-24 / seed-37 regression tests that make the fix gate-visible.
- **Depends on:** Phase 2
- **Covers:** F1, F2, NFR-4
- **Touches:** `packages/voxel/src/fuzz/boundary.crab.20-29.test.ts`, `packages/voxel/src/fuzz/boundary.crab.30-39.test.ts`, `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-R1.md`
- **Verification:** `bun run verify && bun run build && bun run test:fuzz`
- **Status:** verified

- [x] **R1.T1: Restore the unchanged PR smoke slice** — covers: F1, F2, NFR-4
  - [x] **R1.T1.1:** In both shards, restore `const CHUNK = process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)`, remove `SMOKE_CHUNK`, and leave the named seed-24 / seed-37 regression tests, assertions, comments, and `FULL_CHUNK` untouched.

<!--
**Result:** verified
**Checkpoint:** 12264d57
**Evidence:** conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-R1.md
-->
