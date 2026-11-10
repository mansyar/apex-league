# Battle Variance — Implementation Plan

> **Branch:** `feat/20261110-battle-variance`
> **Base:** `main` @ `d7e5af3c4427acf87670ad8ebde467fc12331c9f`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Honour the Ladder

- **Goal:** The accuracy number on the card is the probability that lands.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2
- **Touches:** `packages/sim/src/battle/continuous/roll.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/battle/moves-band.test.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P1.T1: Make authored accuracy real** — covers: FR-1, AC-1
  - [ ] **P1.T1.1: Remove the MISS_SCALE transform so each row below 100 rolls its authored probability and 100 consumes no RNG**
  - [ ] **P1.T1.2: Re-author the 49 accuracy values against pacing headroom and re-pin forced goldens row by row**
- [ ] **P1.T2: Hold the damage ceiling** — covers: FR-2, AC-2
  - [ ] **P1.T2.1: Prove no rolled hit breaches 12% after the best roll with the band test green at 49/49**

## Phase 2: Execution Noise

- **Goal:** The same matchup fights differently per seed and identically per replay, without changing any doctrine band or strategy.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-7, AC-3, AC-4, AC-7
- **Touches:** `packages/sim/src/battle/continuous/controller-noise.ts`, `packages/sim/src/battle/continuous/controller.ts`, `packages/sim/src/battle/continuous/step.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Seeded timing jitter** — covers: FR-3, AC-3
  - [ ] **P2.T1.1: Vary cadence and commit phasing per seed with the RNG cursor in the state hash**
- [ ] **P2.T2: Execution-only decision noise** — covers: FR-4, AC-4
  - [ ] **P2.T2.1: Vary commit timing, dodge side, and punish-window use; pin doctrine bands, strafe intent, and dodge policy unchanged**
- [ ] **P2.T3: Determinism both ways** — covers: FR-7, AC-7
  - [ ] **P2.T3.1: Same seed byte-identical, different seeds different fights, misses as events with reasons**

## Phase 3: Kite Finds a Win

- **Goal:** Kite records a non-zero win share without redesigning any doctrine.
- **Depends on:** Phase 2
- **Covers:** FR-6, AC-6
- **Touches:** `packages/sim/src/battle/continuous/controller-profile.ts`, `packages/sim/src/species/discovery.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Minimal Kite fix** — covers: FR-6, AC-6
  - [ ] **P3.T1.1: Give Kite its way in with the smallest lever that moves its probe row above zero**
  - [ ] **P3.T1.2: Prove Press, Circle, and Counter stay non-zero in the same probe**

## Phase 4: Gate and Re-measure

- **Goal:** The matrix reports at least half distinct fights with every pacing, cap, decisive, quality, and damage bound green.
- **Depends on:** Phase 3
- **Covers:** FR-5, FR-8, AC-5, AC-8
- **Touches:** `packages/sim/scripts/battle-balance-report.ts`, `packages/sim/src/battle/continuous/balance-report.test.ts`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run telemetry`
- **Status:** pending

- [ ] **P4.T1: Distinct half** — covers: FR-5, AC-5
  - [ ] **P4.T1.1: Report median distinct at or above 56 of 112 with distinct-derived errors; keep DISTINCT_FLOOR at 12**
- [ ] **P4.T2: Bounds hold** — covers: FR-8, AC-8
  - [ ] **P4.T2.1: Hold cap, decisive, cap-win quality, median, p05, damage, bosses, and telemetry 13/13 with no bound widened**
