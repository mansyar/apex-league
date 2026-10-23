# Test Suite Speedup — Implementation Plan

- **Branch:** `chore/20261023-test-suite-speedup`
- **Base:** `main` @ `18eebd04065dc971c38e5e16c8dfa721f55ea277`

Phase states: `pending` → `in_progress` → `verified` / `failed` / `blocked`. Only the primary agent writes this file.

## Constraints that apply to every phase

- **Slicing changes seed counts only.** No assertion is weakened, skipped, or removed; the sweep flag (`APEX_FUZZ_SWEEP=full`) is the only way a full seed list runs, and unset means smoke.
- **No production-code module is touched** — `apps/client`, `packages/sim`, and voxel production modules stay out of scope; the determinism gate script is unchanged.
- **No new dependency** in any workspace; no `any`, no `@ts-ignore`, no default exports (style guides binding for every touched line).
- **Byte caps:** every touched `*.test.ts` file is exempt by the existing guards; `package.json`, `conductor/workflow.md`, and workflow YAML are not modules.
- **Purity:** the voxel fuzz suites must remain deterministic — a gate run uses the same seeds every time, and the full sweep is reproducible.
- **Measured numbers go in evidence.** Every phase's evidence file records the commands it ran, exit codes, and the wall-clock measurements against the spec's numeric targets.
- `verify_phase` (`bun run verify && bun run build`) also runs at every phase acceptance, in addition to the phase's own Verification command.
- Global NFR coverage: every phase's verification includes the full static/lint legs, so NFR-2 and NFR-5 are verified in each phase; NFR-3 is verified wherever the determinism gate runs.

## Phase 1: The Parallel Runner & the Tiered Policy

- **Goal:** the capped parallel runner is the configured phase command, the tiered verification policy is documented, and the measured speedups (including guards proven under worker isolation) are recorded.
- **Depends on:** none.
- **Covers:** FR-1, FR-5, FR-6, NFR-2, NFR-5, AC-4, AC-5 — and the
  configuration half of FR-2/AC-1 (the script and its first measurement; the
  ≤ 150 s numeric target is the track end-state and is re-measured by
  P3.T3.2 after the voxel smoke slices shrink the suite's critical path).
- **Touches:** `package.json`, `conductor/workflow.md`, `conductor/tracks/20261023-test-suite-speedup/verification/phase-1.md`.
- **Verification:** `bun run test:phase && bun run check && biome check`
- **Status:** verified

- **Result:** verified
- **Checkpoint:** e17e5a3
- **Evidence:** conductor/tracks/20261023-test-suite-speedup/verification/phase-1.md

- [x] **P1.T1: Add the capped parallel script and measure** — covers: FR-1, FR-2, FR-6
  - [x] **P1.T1.1: Add the `test:phase` script** — root `package.json` gains `"test:phase": "bun test --check --parallel=4 --timeout 120000"`.
  - [x] **P1.T1.2: Measure the full suite under it** — run `bun run test:phase`, record wall-clock (target ≤ 150 s), test/expect/file counts identical to the serial baseline (2,453 tests / 126,812 expect / 194 files as of base).
  - [x] **P1.T1.3: Prove the guards under workers** — run the three module-size guard suites under the capped runner (`bun test --check --parallel=4 --timeout 120000 module-size`) and record that each guard's negative control test passes (it fires inside the suite, under worker isolation).
- [x] **P1.T2: Workflow config and tiered policy (primary-executed)** — covers: FR-1, FR-5
  - *The phase subagent's permissions deny edits under `conductor/**`; the primary performs this task and records it in evidence.*
  - [x] **P1.T2.1: Add `test_phase` to the Workflow Config** — `commands.test_phase: "bun test --check --parallel=4 --timeout 120000"` alongside the existing commands.
  - [x] **P1.T2.2: Document the tiered phase-verification policy** — in Verification Strategy: phase test legs run the touched package's suite via the capped runner; full `bun run verify && bun run build` remains mandatory at every phase acceptance.
  - [x] **P1.T2.3: Record the worker-cap rationale** — the 20-core dev machine with co-running projects; uncapped parallel stays CI/verify-only.

<!-- Primary: after acceptance, append Result / Checkpoint / Evidence here.
     Example:
     **Result:** verified
     **Checkpoint:** <short-sha>
     **Evidence:** conductor/tracks/20261023-test-suite-speedup/verification/phase-1.md -->

## Phase 2: The Voxel Smoke Slices

- **Goal:** every voxel fuzz suite runs a fixed, documented first-quarter smoke slice by default and its full seed list under the sweep flag, with the PR-gate voxel leg measured at ≤ 35 s.
- **Depends on:** Phase 1.
- **Covers:** FR-3, NFR-1, NFR-4, AC-2.
- **Touches:** `packages/voxel/src/fuzz/**`, `conductor/tracks/20261023-test-suite-speedup/verification/phase-2.md`.
- **Verification:** `bun test --check --parallel=4 --timeout 120000 packages/voxel && bun run check && biome check`
- **Status:** in_progress

- [x] **P2.T1: Slice the boundary fuzz suites** — covers: FR-3
  - [x] **P2.T1.1: Apply the slicing pattern** — in each of the 8 boundary fuzz files: keep the full seed list as a named const; derive the gate slice as its first quarter; select via `process.env.APEX_FUZZ_SWEEP === "full" ? FULL : GATE`; state the rule in the file's header comment.
  - [x] **P2.T1.2: Keep every bucket present** — no fuzz file is deleted or merged; each file still runs (fewer seeds each).
- [x] **P2.T2: Slice the budget fuzz suites** — covers: FR-3
  - [x] **P2.T2.1: Apply the same pattern** — the 4 budget fuzz files, identical rule and header documentation.
- [x] **P2.T3: Slice the determinism fuzz suites** — covers: FR-3
  - [x] **P2.T3.1: Apply the same pattern** — the 2 per-archetype determinism fuzz files, identical rule; the twice-build property is unchanged (both builds run on the selected seeds).
- [x] **P2.T4: Measure and document** — covers: FR-3, AC-2
  - [x] **P2.T4.1: Measure the gate leg** — `bun test --check --parallel=4 --timeout 120000 packages/voxel` wall-clock (target ≤ 35 s), recorded with test counts.
  - [x] **P2.T4.2: Spot-check the full sweep** — run one suite with `APEX_FUZZ_SWEEP=full` and record its seed count restoring to the full list, plus wall-clock.
  - [x] **P2.T4.3: Document the slices** — per-file gate-seed counts listed in evidence.

<!-- Primary: after acceptance, append Result / Checkpoint / Evidence here. -->

## Phase 3: The Nightly Sweep & the Full Gate

- **Goal:** the full-seed sweep is wired into the nightly workflow behind a `test:fuzz` script, and every numeric metric in the spec is measured end to end on the finished track.
- **Depends on:** Phase 2.
- **Covers:** FR-2, FR-4, FR-7, NFR-3, AC-1, AC-3, AC-6.
- **Touches:** `package.json`, `.github/workflows/nightly.yml`, `conductor/tracks/20261023-test-suite-speedup/verification/phase-3.md`.
- **Verification:** `bun run test:fuzz && bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Add the `test:fuzz` script** — covers: FR-4
  - [ ] **P3.T1.1: Add the script** — root `package.json` gains `"test:fuzz": "bun test --check --parallel --timeout 120000 packages/voxel/src/fuzz"` with the sweep env set so the full lists run (the script must set `APEX_FUZZ_SWEEP=full`; use a cross-platform form, e.g. a tiny bun runner or `env`-prefix compatible with the CI shell).
  - [ ] **P3.T1.2: Run it green locally** — record wall-clock of the full sweep and the total seed count across suites.
- [ ] **P3.T2: Wire the nightly workflow** — covers: FR-4
  - [ ] **P3.T2.1: Add the command to nightly.yml** — one step running `bun run test:fuzz` beside the existing determinism-gate step; YAML stays valid; nothing else in the file changes.
- [ ] **P3.T3: Final end-to-end measurements** — covers: FR-2, FR-7, NFR-3, AC-6
  - [ ] **P3.T3.1: Measure the full verify** — `bun run verify` wall-clock (target ≤ 120 s) with the determinism gate reporting 18 GLBs + props byte-identical.
  - [ ] **P3.T3.2: Re-confirm the phase leg** — `bun run test:phase` wall-clock again, recorded next to the Phase 1 measurement.
  - [ ] **P3.T3.3: Run the full gate** — `bun run verify && bun run build` green, exit codes recorded.

<!-- Primary: after acceptance, append Result / Checkpoint / Evidence here. -->

<!-- Review note: conductor-review appends "## Phase R<n>: Review Fixes" here if findings need fixing. -->
