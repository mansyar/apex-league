# Global Pacing — Implementation Plan

> **Branch:** `chore/20261117-global-pacing`
> **Base:** `main` @ `0c9b8fca`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Measure the clock-bound fights

- **Goal:** the stall mechanism is documented from real traces before any behaviour changes, with per-fight commit/hit/idle/throughput figures and both shipped cap shares reproduced.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `conductor/tracks/20261117-global-pacing/verification/phase-1.md` (evidence only — no source file)
- **Verification:** `bun run telemetry`, then `bun run balance`, then `bun run trace --seed 20261111 --check` (three separate commands)
- **Status:** pending

- [ ] **P1.T1: Reproduce both shipped readings** — covers: FR-1
  - [ ] **P1.T1.1: Record telemetry `cap share: 20/42 (47.6%)` with all 14 bounds green and balance `224/840 (26.7%)`, 15/15 species and 49/49 moves in band**
  - [ ] **P1.T1.2: Record the trace hash `0xb6cce858` and the five invariants as the pre-change replay baseline**
- [ ] **P1.T2: Name the mechanism** — covers: FR-1, AC-1
  - [ ] **P1.T2.1: Tabulate the clock-bound fights from the fixture with pairing, seed, commits, hits, idle share, median gap and damage throughput for both sides**
  - [ ] **P1.T2.2: State which side fails to convert and why, separating throughput from band, reach, stamina, cooldown, rule refusal and opponent kiting; cite the trace lines used for each claim**
  - [ ] **P1.T2.3: Recommend the first controller rung and record what would make the phase blocked rather than a licence to move a bound**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-1.md
-->

## Phase 2: Raise throughput in the shared controller

- **Goal:** a conservative controller-policy change lowers the fixture cap share to at most 14/42 while the matrix stays at most 1/3 and every other gate row remains green, with the two debt pins promoted and ghosts re-versioned.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, NFR-1, NFR-2, NFR-3, NFR-4, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, `controller-noise.ts`, `controller-profile.ts`, `controller*.test.ts`, `packages/sim/src/cup/ghost.ts`, `ghost.test.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `pacing.test.ts`, `conductor/tracks/20261117-global-pacing/verification/phase-2.md`
- **Verification:** `bun run telemetry`, then `bun run balance`, then `bun run trace --seed 20261111 --check`, then `bun run verify`, then `bun run build` (five separate commands)
- **Status:** pending

- [ ] **P2.T1: Sweep the controller rungs** — covers: FR-2, FR-9
  - [ ] **P2.T1.1: Candidate order is cheapest first — commit-skip denominator, cadence-skip denominator, punish-skip denominator, then cycle/press shares — changing one knob at a time inside integer arithmetic**
  - [ ] **P2.T1.2: Measure each rung on the 42-fight fixture first, then confirm every surviving rung on the 840-fight matrix; record cap share, dead-zone share, idle, commits, median duration, species band and damage band for each**
  - [ ] **P2.T1.3: Reject and record any rung that breaks a bound, floor, tolerance, species band, damage band, median duration, decisive share or the tortoise identity fence**
- [ ] **P2.T2: Ship the smallest passing change** — covers: FR-2, FR-4, FR-7, FR-8, FR-10
  - [ ] **P2.T2.1: Only code the winning rung; keep integer arithmetic, the single seeded RNG and byte-identical replay, and leave cap-win quality and `CAP_MARGIN_FLOOR_BP` untouched**
  - [ ] **P2.T2.2: Prove the final tree reproduces the agreed cap shares with all gate rows green**
- [ ] **P2.T3: Promote the two debt pins** — covers: FR-5, AC-5
  - [ ] **P2.T3.1: Replace the failing one-in-three debt assertion in `telemetry.test.ts` with a normal passing expectation, retaining the old figure in its comment**
  - [ ] **P2.T3.2: Promote `pacing.test.ts`'s `test.failing` majority-by-KO body to a normal test only if it now passes; never add `.skip`**
- [ ] **P2.T4: Settle the version guard** — covers: FR-6, NFR-1, AC-6
  - [ ] **P2.T4.1: Bump `SIM_VERSION` 3 → 4 and update every ghost pin when policy, frame data or resolution changed**
  - [ ] **P2.T4.2: If no policy changed, keep 3 and show the trace hash is unchanged**
- [ ] **P2.T5: Record the sweep and the verdict** — covers: FR-9, AC-2, AC-7, AC-9, AC-10
  - [ ] **P2.T5.1: Paste the fixture and matrix tables, the rejected rungs and the before/after gate output; state plainly if the phase is blocked instead of claiming a target met**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-2.md
-->

## Phase 3: Stats inside authored bounds, only if needed

- **Goal:** if no controller-only rung reached both targets, a second sweep of effective stats inside existing authored bounds closes the remaining gap without weakening any fence; if Phase 2 already met both targets, this phase proves the tree is unchanged and records a no-op.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-4, FR-8, FR-9, AC-3, AC-7, AC-10
- **Touches:** `packages/sim/src/species/rewards.ts`, `starters.ts`, `discovery.ts`, `packages/sim/src/species/identity.test.ts` (read only — never edited), `packages/sim/src/battle/continuous/balance-report.test.ts`, `conductor/tracks/20261117-global-pacing/verification/phase-3.md`
- **Verification:** `bun run telemetry`, then `bun run balance`, then `bun run trace --seed 20261111 --check`, then `bun run verify`, then `bun run build` (five separate commands)
- **Status:** pending

- [ ] **P3.T1: Decide whether this phase is needed** — covers: FR-3, AC-10
  - [ ] **P3.T1.1: If Phase 2 met both targets, run the five commands untouched and record a no-op with the two cap shares**
  - [ ] **P3.T1.2: If Phase 2 reported blocked, sweep effective stats only inside each species' authored roll bounds, one value at a time, with the identity test green before and after**
  - [ ] **P3.T1.3: Record every rejected stat rung and never move a bound, floor, tolerance, `DISTINCT_FLOOR`, archetype, element, temperament or kit entry**
- [ ] **P3.T2: Prove the resulting tree** — covers: FR-4, FR-8, AC-3, AC-7
  - [ ] **P3.T2.1: Re-run both gates and show the fixture at most 14/42, the matrix at most 1/3 and every other row green**
  - [ ] **P3.T2.2: Show `git diff` contains no authored bound change and that `identity.test.ts` is unchanged**
- [ ] **P3.T3: Settle the version guard for a stats-only tree** — covers: FR-6, AC-6
  - [ ] **P3.T3.1: Leave `SIM_VERSION` as phase 2 left it and prove the trace hash moved only if a policy change shipped**
  - [ ] **P3.T3.2: Re-pin only figures that actually moved, with comments explaining why, and weaken no assertion**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-3.md
-->

## Phase 4: Record the whole track

- **Goal:** the integrated record states the final cap shares, the sweep verdict, the version decision and every debt still owed, with the full gate output pasted from the final tree.
- **Depends on:** Phase 3
- **Covers:** FR-9, FR-10, NFR-2, AC-8, AC-9
- **Touches:** `conductor/tracks/20261117-global-pacing/verification/integrated.md` (evidence only — no source file)
- **Verification:** `bun run verify`, then `bun run build` (two separate commands)
- **Status:** pending

- [ ] **P4.T1: Write the integrated record** — covers: FR-9, FR-10
  - [ ] **P4.T1.1: Paste the final telemetry, balance, trace, verify and build output with the before/after cap shares side by side**
  - [ ] **P4.T1.2: State which lever shipped, which were tried and rejected, what `SIM_VERSION` is and why, and which debts remain (D-1/D-2/D-3, kite band, fixture bias)**
  - [ ] **P4.T1.3: Map every FR, NFR and AC to its evidence and record any honest miss as debt rather than silent scope reduction**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 4
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** - covers: <finding ID>
-->
