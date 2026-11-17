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
- **Status:** verified
- **Result:** verified — throughput shortfall on both sides in all 20 capped fights, `COMMIT_SKIP_DENOM` recommended first, no bound touched
- **Checkpoint:** b97075da
- **Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-1.md

- [x] **P1.T1: Reproduce both shipped readings** — covers: FR-1
  - [x] **P1.T1.1: Record telemetry `cap share: 20/42 (47.6%)` with all 14 bounds green and balance `224/840 (26.7%)`, 15/15 species and 49/49 moves in band**
  - [x] **P1.T1.2: Record the trace hash `0xb6cce858` and the five invariants as the pre-change replay baseline**
- [x] **P1.T2: Name the mechanism** — covers: FR-1, AC-1
  - [x] **P1.T2.1: Tabulate the clock-bound fights from the fixture with pairing, seed, commits, hits, idle share, median gap and damage throughput for both sides**
  - [x] **P1.T2.2: State which side fails to convert and why, separating throughput from band, reach, stamina, cooldown, rule refusal and opponent kiting; cite the trace lines used for each claim**
  - [x] **P1.T2.3: Recommend the first controller rung and record what would make the phase blocked rather than a licence to move a bound**

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
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, `controller-noise.ts`, `controller-state.ts`, `controller-profile.ts`, `controller*.test.ts`, `packages/sim/src/cup/ghost.ts`, `ghost.test.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `pacing.test.ts`, `balance-report.test.ts`, `conductor/tracks/20261117-global-pacing/verification/phase-2.md`
- **Verification:** `bun run telemetry`, then `bun run balance`, then `bun run trace --seed 20261111 --check`, then `bun run verify`, then `bun run build` (five separate commands)
- **Status:** blocked
- **Result:** blocked — the only fixture passer (`DECISION_MS` 240→200, 13/42) turned four matrix species rows red and flipped `bun run balance` to exit 1; all other rungs stayed above 14/42
- **Checkpoint:** bd2def07
- **Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-2.md

- [x] **P2.T1: Sweep the controller rungs** — covers: FR-2, FR-9
  - [x] **P2.T1.1: Candidate order is cheapest first — commit-skip denominator, cadence-skip denominator, punish-skip denominator, then cycle/press shares and decision cadence (`DECISION_MS`) — changing one knob at a time inside integer arithmetic**
  - [x] **P2.T1.2: Measure each rung on the 42-fight fixture first, then confirm every surviving rung on the 840-fight matrix; record cap share, dead-zone share, idle, commits, median duration, species band and damage band for each**
  - [x] **P2.T1.3: Reject and record any rung that breaks a bound, floor, tolerance, species band, damage band, median duration, decisive share or the tortoise identity fence**
- [ ] **P2.T2: Ship the smallest passing change** — covers: FR-2, FR-4, FR-7, FR-8, FR-10 — **failed: no rung passed both gates without breaking a green row**
  - [ ] **P2.T2.1: Only code the winning rung; keep integer arithmetic, the single seeded RNG and byte-identical replay, and leave cap-win quality and `CAP_MARGIN_FLOOR_BP` untouched** — **no winning rung existed; every knob was restored**
  - [ ] **P2.T2.2: Prove the final tree reproduces the agreed cap shares with all gate rows green** — **base tree still reads 20/42 and 224/840; target not met**
- [ ] **P2.T3: Promote the two debt pins** — covers: FR-5, AC-5 — **not performed: the pins must stay red while the target is missed**
  - [ ] **P2.T3.1: Replace the failing one-in-three debt assertion in `telemetry.test.ts` with a normal passing expectation, retaining the old figure in its comment**
  - [ ] **P2.T3.2: Promote `pacing.test.ts`'s `test.failing` majority-by-KO body to a normal test only if it now passes; never add `.skip`**
- [x] **P2.T4: Settle the version guard** — covers: FR-6, NFR-1, AC-6
  - [ ] **P2.T4.1: Bump `SIM_VERSION` 3 → 4 and update every ghost pin when policy, frame data or resolution changed** — **not applicable: no policy shipped**
  - [x] **P2.T4.2: If no policy changed, keep 3 and show the trace hash is unchanged** — `0xb6cce858` re-proven
- [x] **P2.T5: Record the sweep and the verdict** — covers: FR-9, AC-2, AC-7, AC-9, AC-10
  - [x] **P2.T5.1: Paste the fixture and matrix tables, the rejected rungs and the before/after gate output; state plainly if the phase is blocked instead of claiming a target met**

> **Blocked, not downgraded.** AC-4 was not met. Every knob was restored to its
> exact base value, no bound/floor/tolerance/`DISTINCT_FLOOR`/cap duration/target
> moved, and all five verification commands passed on the unchanged base. The
> plan's Phase 3 stats fallback remains unexecuted because the active goal treats
> a blocked phase as a hard stop.
>
> **Amended 2026-11-17 (user decision, resumed goal):** Phase 2 remains blocked as evidence.
> The user chose the combined fix, so FR-11/AC-11 were added (no IDs renumbered) and Phase 3
> is re-scoped below from a stats-only fallback to controller policy plus the minimum species
> corrections that restore every green row.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-2.md
-->

## Phase 3: Combined cadence and species correction

- **Goal:** re-apply the one controller rung that met both cap targets (`DECISION_MS` 240→200) and
  correct only the species rows it broke, inside their original stat envelopes, so both samples and
  every other gate row are green without moving a bound or tolerance.
- **Depends on:** Phase 2 (blocked; resolved by the FR-11/AC-11 amendment recorded above)
- **Covers:** FR-3, FR-4, FR-5, FR-6, FR-8, FR-9, FR-11, FR-12, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- **Touches:** the source files from attempt 1 (`controller-state.ts`, `controller.test.ts`, `species/starters.ts`, `species/discovery.ts`, `species/rewards.ts`, read-only `species/identity.test.ts`, `cup/ghost.ts`, `ghost.test.ts`, `continuous/telemetry.test.ts`, `continuous/pacing.test.ts`, `continuous/balance-report.test.ts`) **plus the cadence- and species-sensitive test files that `bun run verify` reports as moved**, including `battle/continuous/controller-doctrine.test.ts` (Circle probe), `battle/continuous/battle-trace.test.ts`, `apps/client/src/bracket-model.test.ts`, `apps/client/src/morning-after/derive.test.ts`, `packages/sim/src/bosses.test.ts`, `breeding.test.ts`, `branch-balance.test.ts`, `legacy.test.ts`, `species.test.ts`, `cup/rival-roster.test.ts`, `cup.golden.test.ts`, `cup.test.ts`, `battle/clock.contract.test.ts`, `battle/exhibition.test.ts`, `battle/continuous/stream.test.ts` and `battle/continuous/fixture-audit.test.ts`; plus `conductor/tracks/20261117-global-pacing/verification/phase-3.md`
- **Verification:** `bun run telemetry`, then `bun run balance`, then `bun run trace --seed 20261111 --check`, then `bun run verify`, then `bun run build` (five separate commands)
- **Status:** in_progress

> **Attempt 1 was blocked** at `3d26ede2`: the 200 ms + in-envelope species tree met
> 13/42 and 190/840 with all 15 species green, but `bun run verify` failed 30
> assertions (17 cadence-caused, 13 species-caused) across at least 12 test files.
> The user chose to expand scope and accept the measured Circle/cup behaviour
> changes on 2026-11-17, so FR-12/AC-12 were added and this phase reopened.
> The blocked attempt and its full rung table remain in `verification/phase-3.md`.

- [x] **P3.T1: Re-apply the winning cadence** — covers: FR-2, FR-11
  - [x] **P3.T1.1: Set `DECISION_MS` 200 / `DECISION_STEPS` 10 and update the `controller.test.ts` pin with a comment naming the Phase 2 measurement** — measured then reverted
  - [x] **P3.T1.2: Re-run the fixture (13/42) and matrix (188/840) to confirm the Phase 2 rung reproduces before touching any species value** — reproduced exactly
- [x] **P3.T2: Correct only the broken species rows** — covers: FR-3, FR-8, FR-11, AC-3, AC-11
  - [x] **P3.T2.1: For `fire_drake`, `plant_ox`, `voltfox` and `shalemole`, move the smallest whole-point stat value that restores each row inside its published band, never widening a roll envelope** — found a solution restoring all 15 rows at 190/840
  - [x] **P3.T2.2: Prove `identity.test.ts` is unchanged and green, and that no archetype, element, temperament, kit or frame-data value moved**
  - [x] **P3.T2.3: Record every rejected stat rung with its win rate and the reason it was rejected** — evidence §4
- [ ] **P3.T3: Promote the debt pins** — covers: FR-5, AC-5 — **not performed: the candidate tree could not ship**
  - [ ] **P3.T3.1: Replace the failing one-in-three debt assertion in `telemetry.test.ts` with a normal passing expectation, retaining the old 20/42 figure in its comment**
  - [ ] **P3.T3.2: Promote `pacing.test.ts`'s `test.failing` majority-by-KO body only if its body passes, never adding `.skip`** — **measured 16/42 by KO, so the body correctly stays failing**
- [ ] **P3.T4: Settle the version guard** — covers: FR-6, NFR-1, AC-6 — **not shipped; candidate hash `0xe00a0782` recorded, base stays `0xb6cce858`**
  - [ ] **P3.T4.1: Bump `SIM_VERSION` 3 → 4 and update both ghost pins, since controller policy moved**
  - [ ] **P3.T4.2: Re-run the trace, record the new hash and prove replay remains byte-identical for the same seed**
- [x] **P3.T5: Record the verdict** — covers: FR-9, AC-2, AC-7, AC-9, AC-11
  - [x] **P3.T5.1: Paste the full gate output and a before/after table proving no gate bound, roll envelope, tolerance or target moved**
  - [x] **P3.T5.2: State plainly if any row is still red instead of claiming a target met**
- [ ] **P3.T6: Re-pin the moved golden, digest and relation tests (attempt 2)** — covers: FR-12, AC-12
  - [ ] **P3.T6.1: Apply the 200 ms cadence and the in-envelope species corrections together, then let `bun run verify` enumerate every failing assertion**
  - [ ] **P3.T6.2: Re-author each moved expectation to the new measured value with a comment naming the cadence or species change; delete no probe, add no `.skip`, and weaken no gate bound, species band or damage band**
  - [ ] **P3.T6.3: Extend `verification/phase-3.md` with the attempt-2 result: every re-pinned file, old → new values, the accepted Circle/cup behaviour changes, the new trace hash and all five green gates**
  - [ ] **P3.T6.4: Prove the final tree still reads fixture ≤ 14/42, matrix ≤ 1/3, 15/15 species and 49/49 moves, with both debt pins promoted and `SIM_VERSION` 4**

> **Blocked, not downgraded.** No candidate shipped. The tree is byte-identical
> to the phase base; all five verification commands pass on it. Making the
> candidate green needs 12 test files outside Touches plus a product decision
> about Circle flanks and which cup runs stay winnable. No bound, tolerance,
> envelope, assertion or target moved.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-global-pacing/verification/phase-3.md
-->

## Phase 4: Record the whole track

- **Goal:** the integrated record states the final cap shares, the sweep verdict, the version decision and every debt still owed, with the full gate output pasted from the final tree.
- **Depends on:** Phase 3
- **Covers:** FR-9, FR-10, FR-11, NFR-2, AC-8, AC-9, AC-11
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
