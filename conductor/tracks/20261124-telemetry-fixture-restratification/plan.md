# Telemetry Fixture Re-stratification — Implementation Plan

> **Branch:** `chore/20261124-telemetry-fixture-restratification`
> **Base:** `main` @ `d29042de`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline and frozen derivation evidence

- **Goal:** A committed pre-change record proves the unchanged-tree telemetry, matrix, and audit readings and reproduces the frozen before/after bound table used to approve this track.
- **Depends on:** none
- **Covers:** FR-1, AC-1, NFR-1, NFR-2
- **Touches:** `conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-1.md`, `.conductor/evidence/20261124-telemetry-fixture-restratification/**`
- **Verification:** `bun run telemetry`; `bun run balance`; `bun run fixture-audit`; read-only derivation with `pool(matchups().map((matchup) => measureFight(matchup, { statBasis: "midpoint", doctrine: "press" })))`; `git status --porcelain`
- **Status:** verified

- [x] **P1.T1: Capture the unchanged-tree baseline** — covers: FR-1, AC-1
  - [ ] **P1.T1.1:** Record `bun run telemetry` at `11/42 (26.2%)` with reference + split composition and every current bound reading from the frozen before-column.
  - [ ] **P1.T1.2:** Record `bun run balance` at `370/1680 (22.0%)` with all gates green and `bun run fixture-audit` at `1680/580/370` / `+12.5 points`.
  - [ ] **P1.T1.3:** Prove a clean tree and that no source file changed during the baseline sweep.
- [x] **P1.T2: Reproduce the frozen derivation** — covers: FR-1, AC-1
  - [ ] **P1.T2.1:** Run the read-only derivation script and record the after-column readings for all 14 metrics at midpoint stats + press doctrine on the unchanged 42-pairing walk.
  - [ ] **P1.T2.2:** Confirm exactly two violations (`engagementMax` 6061 > 4500, `distinctPositions` 19 < 20) and that the other twelve bounds pass.
  - [ ] **P1.T2.3:** Record the approved target values `engagementMax = 8000` and `distinctPositions = 16`, with all other values frozen.
- [x] **P1.T3: Write phase evidence** — covers: FR-1, AC-1
  - [ ] **P1.T3.1:** Write `verification/phase-1.md` with the command table, frozen before/after table, AC-1 mapping, and raw scratch paths.
  - [ ] **P1.T3.2:** Commit the evidence with one conventional commit; no source, config, or package file changed.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-1.md
-->

**Result:** verified
**Checkpoint:** 2ce1a939
**Evidence:** conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-1.md


## Phase 2: Representative gate and failing-first tests

- **Goal:** `bun run telemetry` gates a representative 42-fight sample with exactly the two approved bound changes, while the historical sample stays available through a `--smoke` flag and regression tests prove the change failing-first.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, FR-6, AC-2, AC-3, AC-4, AC-5, AC-6, NFR-1, NFR-2, NFR-3, NFR-4, NFR-6, NFR-7
- **Touches:** `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/scripts/fixture-audit.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `packages/sim/src/battle/continuous/fixture-audit.test.ts`, `conductor/tracks/20261124-telemetry-fixture-restratification/spec.md`, `conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-2.md`, `.conductor/evidence/20261124-telemetry-fixture-restratification/**`
- **Verification:** `bun run telemetry`; `bun packages/sim/scripts/battle-telemetry.ts --smoke`; `bun test --timeout 120000 packages/sim/src/battle/continuous/telemetry.test.ts packages/sim/src/battle/continuous/fixture-audit.test.ts`; `bun run verify`; `bun run build`
- **Status:** verified

- [x] **P2.T1: Add the representative sample and smoke flag** — covers: FR-2, FR-3, AC-2, AC-3
  - [ ] **P2.T1.1:** Make `measure()` and `bun run telemetry` use midpoint stats and press doctrine over the unchanged 42 distinct stride-11 pairings and one seed each.
  - [ ] **P2.T1.2:** Add a `--smoke` invocation that preserves the reference + split sample, its historical readings, and no gate enforcement, without editing `package.json`.
  - [ ] **P2.T1.3:** Confirm the representative readings match the frozen after-column, including `5/42 (11.9%)` cap share and `12500 ms` minimum duration.
- [x] **P2.T2: Apply exactly the two approved bound changes** — covers: FR-4, AC-4
  - [ ] **P2.T2.1:** Change `engagementMax` 4500 → 8000 and `distinctPositions` 20 → 16, keeping their original `max`/`min` direction.
  - [ ] **P2.T2.2:** Rewrite both `why` strings with the before and after readings; leave the other twelve values, including `capShare = 0.6`, byte-identical.
- [x] **P2.T3: Prove the tests fail before and pass after** — covers: FR-5, AC-5
  - [ ] **P2.T3.1:** Add a co-located regression test pinning the representative composition, both bound values, and the unchanged smoke composition, with no gate added to the smoke diagnostic.
  - [ ] **P2.T3.2:** Demonstrate the test fails against the pre-change tree and passes after, recording both outputs.
- [x] **P2.T5: Keep the four-cell audit truthful** — covers: FR-6, AC-6
  - [ ] **P2.T5.1:** Amended 2026-11-24: the gate now measures cell D, so the audit must name cell A as the historical reference + split smoke sample and assert D against `measure()`; keep 1680/580/370 and +12.5 points unchanged.
  - [ ] **P2.T5.2:** Preserve the per-fight artifact as a documented structural exception under the owner revision (AC-11) and record the cadence-resonance follow-up without changing the game.
- [x] **P2.T4: Write phase evidence** — covers: FR-2, FR-3, FR-4, FR-5, AC-2, AC-3, AC-4, AC-5
  - [ ] **P2.T4.1:** Run both telemetry invocations, the focused test, `bun run verify`, and `bun run build`, recording exit codes and sim hash `0xff6f3d62`.
  - [ ] **P2.T4.2:** Write `verification/phase-2.md` and commit the source, test, and evidence changes in one conventional commit.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-2.md
-->

**Result:** verified
**Checkpoint:** ae4db559
**Evidence:** conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-2.md


## Phase 3: Audit truth, dated documentation, and final verification

- **Goal:** The audit and current documentation describe both samples and D-4 closure; the full configured check suite is green with unchanged scope, and integrated evidence is committed.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, AC-7, AC-8, AC-9, AC-10, NFR-5, NFR-6, NFR-7
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md`, `conductor/tracks/20261124-telemetry-fixture-restratification/verification/integrated.md`, `conductor/tracks/20261124-telemetry-fixture-restratification/verification/phase-3.md`, `.conductor/evidence/20261124-telemetry-fixture-restratification/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `bun run telemetry`; `bun run fixture-audit`; `git diff --check <base>..HEAD`; `git status --porcelain`
- **Status:** verified

- [x] **P3.T1: Audit explanation moved into Phase 2 (amended 2026-11-24)** — covers: FR-6, AC-6
  - [x] **P3.T1.1:** Completed as P2.T5; `bun run fixture-audit` names both samples and preserves `1680/580/370` and `+12.5 points`.
  - [x] **P3.T1.2:** Completed as P2.T5; historical figures remain labelled historical.
- [x] **P3.T2: Record the dated disposition** — covers: FR-7, AC-7
  - [ ] **P3.T2.1:** Add a dated 2026-11-24 note to `conductor/product.md` closing D-4 as re-stratified, with the frozen bound table and no new product direction.
  - [ ] **P3.T2.2:** Add a dated note to `conductor/tech-stack.md` covering the new gate composition, the smoke flag, and the unchanged matrix gate and D-1 fence.
- [x] **P3.T3: Run final verification and write integrated evidence** — covers: FR-8, AC-8, AC-9, AC-10
  - [ ] **P3.T3.1:** Run all five configured commands separately, plus telemetry and fixture-audit, recording exit codes, battle hash `0xff6f3d62`, and the 42-fight budget.
  - [ ] **P3.T3.2:** Prove the scope diff excludes `SIM_VERSION`, ghost, controller, species, fences, matrix, schema, protocol, and deploy files, and that no module-cap allowlist was added.
  - [ ] **P3.T3.3:** Write `verification/integrated.md` and `verification/phase-3.md` with command tables, the frozen bound table, AC-1..AC-10 mapping, scope proof, and D-4 disposition, then commit.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-telemetry-fixture-restratification/verification/integrated.md
-->

**Result:** verified
**Checkpoint:** 81a7fa6c
**Evidence:** conductor/tracks/20261124-telemetry-fixture-restratification/verification/integrated.md

