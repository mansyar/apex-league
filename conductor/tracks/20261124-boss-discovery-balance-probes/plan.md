# Boss Discovery Balance Probes — Implementation Plan

> **Branch:** `chore/20261124-boss-discovery-balance-probes`
> **Base:** `main` @ `6e4b3893971832ae652a9d21713e906e9e4be459`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline and nine-line boss probe

- **Goal:** A committed deterministic baseline and dedicated probe cover the nine uncovered discovery lines with the approved fresh/cap gates and full measured report.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, AC-1, AC-2, AC-3, AC-4, NFR-1, NFR-2, NFR-7, NFR-8
- **Touches:** `packages/sim/src/battle/species-discovery-boss.balance.test.ts`, `verification/phase-1.md`, `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/**`
- **Verification:** `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`; `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`; `bun test --timeout 120000 packages/sim/src/bosses.balance.test.ts packages/sim/src/species-electric.balance.test.ts packages/sim/src/battle/species-balance.test.ts packages/sim/src/battle/species-roster.balance.test.ts packages/sim/src/battle/species-wave4-discovery.balance.test.ts packages/sim/src/battle/species-discovery-balance.test.ts`; `bun run check`; `bunx biome check packages/sim/src/battle/species-discovery-boss.balance.test.ts`
- **Status:** verified

- [x] **P1.T1: Freeze the nine-line target and baseline methodology** — covers: FR-1, FR-2, AC-1, AC-2
  - [ ] **P1.T1.1:** Assert the exact nine target ids and explicitly exclude starters, rewards, and wave-4 lines.
  - [ ] **P1.T1.2:** Reuse the frozen creature/battle seeds, training levels, balanced tactic, production boss-side builder, and production resolver.
- [x] **P1.T2: Implement fresh/cap gates and measured report mode** — covers: FR-3, FR-4, AC-3, AC-4
  - [ ] **P1.T2.1:** Assert zero wins only for boss-advantaged fresh cells; leave electric/earth/wind fresh cells intentionally unconstrained.
  - [ ] **P1.T2.2:** Assert every target is at least 35% against every authored boss at training cap.
  - [ ] **P1.T2.3:** Add opt-in full 9×6×4 report output with exact won/game tallies.
- [x] **P1.T3: Capture the pre-tuning matrix and verify determinism** — covers: FR-4, FR-5, AC-4, AC-5
  - [ ] **P1.T3.1:** Run report mode before any balance-data edit and save the complete matrix.
  - [ ] **P1.T3.2:** Run report mode a second time and prove byte-identical output.
  - [ ] **P1.T3.3:** Run the focused probe and every existing balance suite; record any new-gate failure as the tuning trigger.
- [x] **P1.T4: Commit phase evidence** — covers: FR-7, AC-5
  - [ ] **P1.T4.1:** Write `verification/phase-1.md` with commands, baseline matrix, gate results, scope proof, and AC mapping.
  - [ ] **P1.T4.2:** Commit only the new probe and phase evidence with conventional commits.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-boss-discovery-balance-probes/verification/phase-1.md
-->
**Result:** verified
**Checkpoint:** cd136a46
**Evidence:** conductor/tracks/20261124-boss-discovery-balance-probes/verification/phase-1.md
## Phase 2: Conditional targeted balance tuning

- **Goal:** The new gates pass with the smallest justified data change, or the phase records a verified no-tuning result; every existing balance pin remains unchanged and green.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, AC-5, AC-6, NFR-3, NFR-6
- **Touches:** `packages/sim/src/species/discovery.ts`, `packages/sim/src/bosses.ts` (only when Phase 1 proves a failure), `verification/phase-2.md`, `.conductor/evidence/20261124-boss-discovery-balance-probes/tuning/**`
- **Verification:** `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`; `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`; `bun test --timeout 120000 packages/sim/src/bosses.balance.test.ts packages/sim/src/species-electric.balance.test.ts packages/sim/src/battle/species-balance.test.ts packages/sim/src/battle/species-roster.balance.test.ts packages/sim/src/battle/species-wave4-discovery.balance.test.ts packages/sim/src/battle/species-discovery-balance.test.ts`; `bun run balance`; `bun run verify`
- **Status:** in_progress

- [ ] **P2.T1: Decide whether tuning is required** — covers: FR-5, AC-5
  - [ ] **P2.T1.1:** If all Phase 1 gates pass, record “no tuning required” and make no balance-data edit.
  - [ ] **P2.T1.2:** If a gate fails, identify the exact species/boss/training cells and classify the smallest viable adjustment surface.
- [ ] **P2.T2: Apply minimal tuning only when justified** — covers: FR-5, FR-6, AC-5, AC-6
  - [ ] **P2.T2.1:** Change only existing discovery-species or authored-boss data fields within the same identities.
  - [ ] **P2.T2.2:** Keep every existing balance test and pinned value byte-identical; stop blocked if no candidate can preserve them.
- [ ] **P2.T3: Record before/after matrix and hash** — covers: FR-7, AC-5, AC-7
  - [ ] **P2.T3.1:** Re-run the full report and record exact changed cells.
  - [ ] **P2.T3.2:** Record the pre/post `bun run balance` hash and explain any delta.
- [ ] **P2.T4: Verify and commit tuning evidence** — covers: FR-6, FR-7, AC-6
  - [ ] **P2.T4.1:** Run every Phase 2 verification command and prove existing pins are unchanged.
  - [ ] **P2.T4.2:** Write `verification/phase-2.md` and commit the minimal data delta plus evidence, or commit evidence-only when no tuning is needed.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-boss-discovery-balance-probes/verification/phase-2.md
-->

## Phase 3: Final verification, documentation, and integrated evidence

- **Goal:** All configured checks are green, the final scope is proven, conditional dated docs are accurate, and the integrated record hands off a complete nine-line boss probe.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, AC-7, AC-8, AC-9, AC-10, NFR-4, NFR-5, NFR-6, NFR-8
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md` (only when balance data changed), `verification/integrated.md`, `verification/phase-3.md`, `.conductor/evidence/20261124-boss-discovery-balance-probes/final/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`; `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`; `git diff --check 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD`; `git diff --quiet 6e4b3893971832ae652a9d21713e906e9e4be459..HEAD -- . ':!packages/sim/src/battle/species-discovery-boss.balance.test.ts' ':!packages/sim/src/species/discovery.ts' ':!packages/sim/src/bosses.ts' ':!conductor/**'`; `git status --porcelain`
- **Status:** pending

- [ ] **P3.T1: Run the full configured verification set** — covers: FR-7, AC-7, NFR-6
  - [ ] **P3.T1.1:** Run verify, build, balance, determinism, and fuzz separately; record exit codes and the final hash.
  - [ ] **P3.T1.2:** Re-run the focused probe and report mode; record exact final matrix and determinism.
- [ ] **P3.T2: Prove scope and frozen contracts** — covers: AC-6, AC-8, AC-10, NFR-1, NFR-3, NFR-4
  - [ ] **P3.T2.1:** Prove existing balance tests/pins are byte-identical and no unrelated runtime/config/dependency file changed.
  - [ ] **P3.T2.2:** Run diff-check, corrected scope check, and clean-tree check.
- [ ] **P3.T3: Write conditional dated documentation** — covers: FR-8, AC-8
  - [ ] **P3.T3.1:** If balance data changed, add one dated product note and one tech-stack note describing the measured reason and unchanged product direction.
  - [ ] **P3.T3.2:** If no balance data changed, record doc-sync as none and leave product/tech-stack untouched.
- [ ] **P3.T4: Commit integrated evidence** — covers: FR-7, AC-9, AC-10
  - [ ] **P3.T4.1:** Write `verification/phase-3.md` and `verification/integrated.md` with baseline, matrix, tuning decision, freeze proof, commands, hash, docs, and full AC mapping.
  - [ ] **P3.T4.2:** Commit evidence and any conditional docs with conventional commits; leave a clean tree.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-boss-discovery-balance-probes/verification/integrated.md
-->
