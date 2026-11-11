# Minimum Reach — Implementation Plan

> **Branch:** `feat/20261111-minimum-reach`
> **Base:** `main` @ `e9a0f4b848ce92d6bf98669bd2b6e897991806d3`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Authored minimum reach

- **Goal:** every frame row carries a validated `minReachMm`, with first-pass values in place.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `packages/sim/src/battle/frames.ts`, `packages/sim/src/battle/frames.test.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 493f201a
- **Evidence:** conductor/tracks/20261111-minimum-reach/verification/phase-1.md

- [x] **P1.T1: Add the field and its validator** — covers: FR-1
  - [x] **P1.T1.1: `minReachMm` on `FrameData`, a `0` default in `frame()`, and validator rules `>= 0`, `< reachMm`, basic `0`; `frames.test.ts` pins both failure directions.**
- [x] **P1.T2: Author the first pass** — covers: FR-1, AC-1
  - [x] **P1.T2.1: Every row with `reachMm >= 5000` set to `1200`, every row below `0`; test proves the rule row by row and that the basic is `0`.**

## Phase 2: Interval geometry, the range miss, and the controller

- **Goal:** strikes and shots respect the inner edge, a point-blank commit reports a distinct `range` miss, the chooser refuses a move whose dead zone it stands in, the replay version is 3, and the gate is still green.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, FR-6, FR-8, AC-2, AC-3, AC-4, AC-5, AC-7
- **Touches:** `packages/sim/src/battle/continuous/contact.ts`, `packages/sim/src/battle/continuous/strike.ts`, `packages/sim/src/battle/continuous/projectile.ts`, `packages/sim/src/battle/continuous/contact.test.ts`, `packages/sim/src/battle/continuous/strike.test.ts`, `packages/sim/src/battle/continuous/projectile.test.ts`, `packages/sim/src/battle/continuous/controller-moves.ts`, `packages/sim/src/battle/continuous/controller-punish.ts`, `packages/sim/src/battle/continuous/controller-rule.ts`, `packages/sim/src/battle/continuous/controller.test.ts`, `packages/sim/src/battle/continuous/controller-punish.test.ts`, `packages/sim/src/battle/continuous/controller-rule.test.ts`, `packages/sim/src/battle/frames.ts`, `packages/sim/src/battle/frames.test.ts`, `packages/sim/src/cup/ghost.ts`, `packages/sim/src/cup/ghost.test.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** verified
- **Result:** verified
- **Checkpoint:** dd3ab23d
- **Evidence:** conductor/tracks/20261111-minimum-reach/verification/phase-2.md

- [x] **P2.T1: One interval test in contact** — covers: FR-2, AC-2
  - [x] **P2.T1.1: A helper answering "inside the interval" from gap and min/reach, used by both resolution paths; boundary test lands at exactly `minReach + radii` and whiffs one millimetre inside.**
- [x] **P2.T2: Strikes and shots honour the inner edge** — covers: FR-2, FR-3, AC-2, AC-3
  - [x] **P2.T2.1: A shot carries the minimum reach and the shooter radius it needs; a point-blank shot passes the body instead of hitting, and the same shot at the boundary hits.**
- [x] **P2.T3: A distinct range miss** — covers: FR-5, AC-2, AC-3
  - [x] **P2.T3.1: `WhiffReport`/`ShotReport` gain the `range` reason, distinct from `accuracy` and from `dodged`; strike and shot tests assert the reason, not just the miss.**
- [x] **P2.T4: The chooser refuses the dead zone** — covers: FR-4, AC-4
  - [x] **P2.T4.1: `inReach` becomes interval-aware in `chooseMove` and the punish chooser; point-blank returns the basic, the same gap outside the dead zone returns the long move, and `opponentReachMm` stays conservative with a test pinning that. (The authored value that exercises it in a real fight belongs to Phase 4.)**
- [x] **P2.T5: Keep the gate green while the mechanic lands** — covers: FR-6, AC-5
  - [x] **P2.T5.1: `minReachMm` is the first knob; species stats move only inside their existing roll bounds; every moved value is recorded as a deviation. (Measured: no positive value on the 42 long rows survives the frozen `capShare` pin, so the value ships at `0` until Phase 3 re-derives the sample.)**
- [x] **P2.T6: Bump `SIM_VERSION` to 3** — covers: FR-8, AC-7
  - [x] **P2.T6.1: Constant, version note and both test pins updated; `bun run trace --seed N --check` still passes its five invariants.**

## Phase 3: Balance and the dead-zone gate

- **Goal:** the roster gate and telemetry are green with measured headroom, and the dead-zone metric is enforced.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-7, AC-5, AC-6, NFR-2
- **Touches:** `packages/sim/src/battle/frames.ts`, `packages/sim/src/battle/frames.test.ts`, `packages/sim/src/species/**`, `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `packages/sim/src/battle/continuous/balance-report.test.ts`
- **Verification:** `bun run balance`, `bun run telemetry`, `bun run verify`, `bun run build` — four separate commands
- **Status:** pending

- [ ] **P3.T1: Measure and tune min reach** — covers: FR-6, AC-5
  - [ ] **P3.T1.1: Re-run the gate and move the single `minReachMm` knob until the roster holds, recording each candidate's figures; stats move inside their existing roll bounds only if min-reach tuning cannot restore the gate.**
- [ ] **P3.T2: Add the dead-zone metric** — covers: FR-7, AC-6
  - [ ] **P3.T2.1: Count whiffs whose only failure was the inner edge as a share of commits, with a loose ceiling and measured headroom; `telemetry.test.ts` pins 14/14 and the new bound's value.**
- [ ] **P3.T3: Re-pin what the mechanic moved** — covers: FR-6, NFR-2
  - [ ] **P3.T3.1: Update the inset margin test and any report expectation the new numbers legitimately change, values only; no existing bound, floor or tolerance edited.**

## Phase 4: The wedge tells the truth

- **Goal:** the tell wedge draws its inner dead-zone edge from the authored value.
- **Depends on:** Phase 1
- **Covers:** FR-9, AC-8
- **Touches:** `apps/client/src/tell-wedge.ts`, `apps/client/src/tell-scale.ts`, `apps/client/src/tell-scale.test.ts`, `apps/client/src/dense-playback.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** pending

- [ ] **P4.T1: Derive the inner edge** — covers: FR-9, AC-8
  - [ ] **P4.T1.1: `tellInnerWorld(minReachMm, radiusMm)` clamped below the outer radius; the wedge geometry cuts the hole; test pins the inner radius and that it never exceeds the outer.**
- [ ] **P4.T2: Keep the replay hash untouched** — covers: NFR-1, NFR-4
  - [ ] **P4.T2.1: Client-only; a playback test proves the same seed still produces the same dense stream and hash.**
