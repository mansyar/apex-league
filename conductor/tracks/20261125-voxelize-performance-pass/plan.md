# Voxelize Performance Pass — Implementation Plan

> **Branch:** `chore/20261125-voxelize-performance-pass`
> **Base:** `main` @ `10af88e843af49ce8ae5657093265a0f8fbf2432`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline and benchmark harness

- **Goal:** establish a repeatable untouched baseline and profiling-backed bottleneck record without changing production pipeline code.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2, NFR-9
- **Touches:** `packages/voxel/scripts/benchmark-voxelize.ts`, `packages/voxel/scripts/benchmark-voxelize.test.ts`, `conductor/tracks/20261125-voxelize-performance-pass/verification/phase-1.md`, `.conductor/evidence/20261125-voxelize-performance-pass/baseline/**`
- **Verification:** `bun packages/voxel/scripts/benchmark-voxelize.ts`; `bun test --timeout 120000 packages/voxel/scripts/benchmark-voxelize.test.ts`; `bun test --check --parallel=4 --timeout 120000 packages/voxel`; `bun run check`; `bunx biome check packages/voxel/scripts/benchmark-voxelize.ts packages/voxel/scripts/benchmark-voxelize.test.ts`; `git diff --quiet 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD -- packages/voxel/src`; `git diff --check 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD`; `git status --porcelain`
- **Status:** verified

- [x] **P1.T1: Build the deterministic benchmark harness** — covers: FR-1
  - [x] **P1.T1.1: Enumerate the fixed corpus** — exactly 21 registered archetypes × baby/juvenile/champion at seed 42.
  - [x] **P1.T1.2: Measure repeatably** — warm up each case, collect repeated `voxelize()` samples, and report per-case plus median timings.
  - [x] **P1.T1.3: Emit stable evidence** — machine-readable summary with Bun version, platform, timestamp, corpus identity, and raw sample data.
  - [x] **P1.T1.4: Test the harness** — pin corpus count/order, stage coverage, seed, and report schema without asserting unstable wall-clock values.
- [x] **P1.T2: Capture untouched baseline timings** — covers: FR-2
  - [x] **P1.T2.1: Run the fixed benchmark** on the phase base with no production edits and retain raw output.
  - [x] **P1.T2.2: Time the capped voxel-package gate** using `bun test --check --parallel=4 --timeout 120000 packages/voxel` under comparable load.
- [x] **P1.T3: Identify the measured bottleneck** — covers: FR-2
  - [x] **P1.T3.1: Profile or instrument the baseline** using scratch-only tooling; do not add production timing output.
  - [x] **P1.T3.2: Record hotspot evidence** tying the dominant cost to `voxelize()`, SDF evaluation, mesher/AO, or another measured stage.
- [x] **P1.T4: Commit baseline evidence** — covers: FR-8
  - [x] **P1.T4.1: Write `verification/phase-1.md`** with commands, raw evidence pointers, baseline numbers, profile findings, and AC-1/AC-2 mapping.
  - [x] **P1.T4.2: Prove no production-source change** and commit only the benchmark harness/tests plus phase evidence.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261125-voxelize-performance-pass/verification/phase-1.md
-->

**Result:** verified
**Checkpoint:** e95c9766
**Evidence:** conductor/tracks/20261125-voxelize-performance-pass/verification/phase-1.md
## Phase 2: Profiling-driven pipeline optimization

- **Goal:** implement measured voxelize/mesher optimizations that preserve exact semantics and demonstrate progress toward both approved speed targets.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, FR-7, AC-3, AC-4, AC-5, AC-6, NFR-2, NFR-3, NFR-4, NFR-5, NFR-8
- **Touches:** `packages/voxel/src/voxelizer.ts`, `packages/voxel/src/sdf.ts`, `packages/voxel/src/mesher.ts`, `packages/voxel/src/ao.ts`, `packages/voxel/src/voxelizer.test.ts`, `packages/voxel/src/sdf.test.ts`, `packages/voxel/src/mesher.test.ts`, `packages/voxel/src/mesher-ao.test.ts`, `packages/voxel/src/ao.test.ts`, `packages/voxel/src/mesh-baseline.test.ts`, `conductor/tracks/20261125-voxelize-performance-pass/verification/phase-2.md`, `.conductor/evidence/20261125-voxelize-performance-pass/optimization/**`
- **Verification:** `bun packages/voxel/scripts/benchmark-voxelize.ts`; `bun test --timeout 120000 packages/voxel/src/voxelizer.test.ts packages/voxel/src/sdf.test.ts packages/voxel/src/mesher.test.ts packages/voxel/src/mesher-ao.test.ts packages/voxel/src/ao.test.ts packages/voxel/src/mesh-baseline.test.ts`; `bun test --check --parallel=4 --timeout 120000 packages/voxel`; `bun run verify`; `bun run build`; `git diff --check 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD`; `git status --porcelain`
- **Status:** verified

- [x] **P2.T1: Add semantic characterization coverage** — covers: FR-5, FR-7
  - [x] **P2.T1.1: Pin voxelizer equivalence** for representative simple and overlapping fields, including paint order and surface classes.
  - [x] **P2.T1.2: Pin SDF and mesher equivalence** against existing expected geometry and mesh baselines.
  - [x] **P2.T1.3: Add cache/worker characterization tests first** if Phase 2 introduces either mechanism; otherwise record N/A. (N/A — no cache or worker introduced.)
- [x] **P2.T2: Optimize the voxelizer/SDF hot path** — covers: FR-3
  - [x] **P2.T2.1: Apply the smallest profiling-supported change** such as allocation hoisting, precomputation, bounded rejection, or loop restructuring.
  - [x] **P2.T2.2: Re-run focused parity tests and the fixed benchmark** after each substantive change.
- [x] **P2.T3: Optimize mesher/AO only where measured** — covers: FR-3
  - [x] **P2.T3.1: Address a demonstrated mesher/AO hotspot** or record evidence that no further change is justified.
  - [x] **P2.T3.2: Preserve greedy-mesh scan order, corner occlusion, classes, and byte output.**
- [x] **P2.T4: Evaluate caches or workers conditionally** — covers: FR-4
  - [x] **P2.T4.1: Use only if profiling shows additional material benefit**; otherwise record N/A with measurements.
  - [x] **P2.T4.2: If used, document deterministic keys, bounds, invalidation/lifetime, concurrency behavior, and startup overhead.** (N/A — no cache or worker introduced.)
  - [x] **P2.T4.3: Prove mixed-input and concurrent-call correctness** with focused tests. (N/A — no cache or worker introduced.)
- [x] **P2.T5: Verify optimization and commit evidence** — covers: FR-8
  - [x] **P2.T5.1: Record before/after benchmark and package-gate timings** with raw repeated-run evidence.
  - [x] **P2.T5.2: Run focused tests, package gate, full verify, and build** and record exact outcomes.
  - [x] **P2.T5.3: Write `verification/phase-2.md`** with techniques, parity proof, conditional N/A decisions, and AC mapping; commit only allowed files.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261125-voxelize-performance-pass/verification/phase-2.md
-->

**Result:** verified
**Checkpoint:** e95a1552
**Evidence:** conductor/tracks/20261125-voxelize-performance-pass/verification/phase-2.md
## Phase 3: Final verification, documentation, and integrated evidence

- **Goal:** prove both approved speed targets, full configured verification, byte-identical artifacts, scoped changes, and a dated technology note.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-8, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10, NFR-1, NFR-6, NFR-7, NFR-9
- **Touches:** `conductor/tech-stack.md`, `conductor/tracks/20261125-voxelize-performance-pass/verification/phase-3.md`, `conductor/tracks/20261125-voxelize-performance-pass/verification/integrated.md`, `.conductor/evidence/20261125-voxelize-performance-pass/final/**`
- **Verification:** `bun packages/voxel/scripts/benchmark-voxelize.ts`; `bun test --check --parallel=4 --timeout 120000 packages/voxel`; `bun run verify`; `bun run build`; `bun run gate:determinism`; `bun run test:fuzz`; `bun run telemetry`; `bun run balance`; `git diff --check 10af88e843af49ce8ae5657093265a0f8fbf2432..HEAD`; `git status --porcelain`
- **Status:** verified

- [x] **P3.T1: Prove the performance targets** — covers: FR-6
  - [x] **P3.T1.1: Re-run the fixed benchmark** under comparable conditions and calculate median reduction against Phase 1.
  - [x] **P3.T1.2: Re-run the capped voxel-package gate** and calculate wall-time reduction against Phase 1.
  - [x] **P3.T1.3: Stop blocked if either approved target is unmet** after bounded optimization; do not move the target or weaken checks. (N/A — both targets met.)
- [x] **P3.T2: Prove correctness and freeze boundaries** — covers: FR-5, NFR-1, NFR-6, NFR-7
  - [x] **P3.T2.1: Run full configured verification** including verify, build, determinism, fuzz, telemetry, and balance.
  - [x] **P3.T2.2: Prove all GLBs, manifests, props, mesh baselines, and battle hash remain byte-identical.**
  - [x] **P3.T2.3: Prove the final diff contains only allowed pipeline/tests/benchmark/docs/Conductor artifacts** with no manifest, dependency, artifact, or out-of-scope source change.
- [x] **P3.T3: Document the new performance baseline** — covers: FR-8
  - [x] **P3.T3.1: Add one dated `conductor/tech-stack.md` note** with baseline, final timings, percentage improvements, technique, and residual risks.
- [x] **P3.T4: Commit integrated evidence** — covers: FR-8
  - [x] **P3.T4.1: Write `verification/phase-3.md` and `verification/integrated.md`** with baseline/profile/optimization/final tables, identity proof, scope proof, deviations, and AC-1..AC-10 mapping.
  - [x] **P3.T4.2: Confirm clean diff-check and worktree**, then commit only the dated note and evidence files.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261125-voxelize-performance-pass/verification/integrated.md
-->

**Result:** verified
**Checkpoint:** 9e9e55a9
**Evidence:** conductor/tracks/20261125-voxelize-performance-pass/verification/integrated.md
