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
- **Status:** pending

- [ ] **P1.T1: Add the field and its validator** — covers: FR-1
  - [ ] **P1.T1.1: `minReachMm` on `FrameData`, a `0` default in `frame()`, and validator rules `>= 0`, `< reachMm`, basic `0`; `frames.test.ts` pins both failure directions.**
- [ ] **P1.T2: Author the first pass** — covers: FR-1, AC-1
  - [ ] **P1.T2.1: Every row with `reachMm >= 5000` set to `1200`, every row below `0`; test proves the rule row by row and that the basic is `0`.**

## Phase 2: Interval geometry and the range miss

- **Goal:** strikes and shots respect the inner edge and report a distinct `range` miss; the replay version is 3.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-5, FR-8, AC-2, AC-3, AC-7
- **Touches:** `packages/sim/src/battle/continuous/contact.ts`, `packages/sim/src/battle/continuous/strike.ts`, `packages/sim/src/battle/continuous/projectile.ts`, `packages/sim/src/battle/continuous/contact.test.ts`, `packages/sim/src/battle/continuous/strike.test.ts`, `packages/sim/src/battle/continuous/projectile.test.ts`, `packages/sim/src/cup/ghost.ts`, `packages/sim/src/cup/ghost.test.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** pending

- [ ] **P2.T1: One interval test in contact** — covers: FR-2, AC-2
  - [ ] **P2.T1.1: A helper answering "inside the interval" from gap and min/reach, used by both resolution paths; boundary test lands at exactly `minReach + radii` and whiffs one millimetre inside.**
- [ ] **P2.T2: Report the range miss** — covers: FR-3, FR-5, AC-2, AC-3
  - [ ] **P2.T2.1: `WhiffReport`/`ShotReport` gain the `range` reason, distinct from `accuracy` and from `dodged`; strike and shot tests assert the reason, not just the miss.**
- [ ] **P2.T3: Bump `SIM_VERSION` to 3** — covers: FR-8, AC-7
  - [ ] **P2.T3.1: Constant, version note and both test pins updated; `bun run trace --seed N --check` still passes its five invariants.**

## Phase 3: Controller respects the blind spot

- **Goal:** a point-blank fighter chooses the basic, never a move whose dead zone it stands in.
- **Depends on:** Phase 2
- **Covers:** FR-4, AC-4
- **Touches:** `packages/sim/src/battle/continuous/controller-moves.ts`, `packages/sim/src/battle/continuous/controller-punish.ts`, `packages/sim/src/battle/continuous/controller-rule.ts`, `packages/sim/src/battle/continuous/controller.test.ts`, `packages/sim/src/battle/continuous/controller-punish.test.ts`, `packages/sim/src/battle/continuous/controller-rule.test.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** pending

- [ ] **P3.T1: Filter the chooser** — covers: FR-4, AC-4
  - [ ] **P3.T1.1: `inReach` becomes interval-aware in `chooseMove`; the punish chooser uses the same test; point-blank returns the basic, and the same gap outside the dead zone returns the long move.**
- [ ] **P3.T2: Keep the threat model conservative** — covers: FR-4
  - [ ] **P3.T2.1: `opponentReachMm` still reports the maximum reach; test pins that the threat band does not shrink for a long-move foe.**

## Phase 4: Balance and the dead-zone gate

- **Goal:** the roster gate and telemetry are green with the blind spot live, and the dead-zone metric is enforced.
- **Depends on:** Phase 3
- **Covers:** FR-6, FR-7, AC-5, AC-6
- **Touches:** `packages/sim/src/battle/frames.ts`, `packages/sim/src/species/**`, `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `packages/sim/src/battle/continuous/balance-report.test.ts`
- **Verification:** `bun run balance`, `bun run telemetry`, `bun run verify`, `bun run build` — four separate commands
- **Status:** pending

- [ ] **P4.T1: Measure and tune min reach** — covers: FR-6, AC-5
  - [ ] **P4.T1.1: Re-run the gate and move the single `1200` knob until the roster holds, recording each candidate's figures; stats move inside their existing roll bounds only if min-reach tuning cannot restore the gate.**
- [ ] **P4.T2: Add the dead-zone metric** — covers: FR-7, AC-6
  - [ ] **P4.T2.1: Count whiffs whose only failure was the inner edge as a share of commits, with a loose ceiling and measured headroom; `telemetry.test.ts` pins 14/14 and the new bound's value.**
- [ ] **P4.T3: Re-pin what the mechanic moved** — covers: FR-6, NFR-2
  - [ ] **P4.T3.1: Update the inset margin test and any report expectation the new numbers legitimately change, values only; no existing bound, floor or tolerance edited.**

## Phase 5: The wedge tells the truth

- **Goal:** the tell wedge draws its inner dead-zone edge from the authored value.
- **Depends on:** Phase 1
- **Covers:** FR-9, AC-8
- **Touches:** `apps/client/src/tell-wedge.ts`, `apps/client/src/tell-scale.ts`, `apps/client/src/tell-scale.test.ts`, `apps/client/src/dense-playback.ts`
- **Verification:** `bun run verify` and `bun run build` as two separate commands
- **Status:** pending

- [ ] **P5.T1: Derive the inner edge** — covers: FR-9, AC-8
  - [ ] **P5.T1.1: `tellInnerWorld(minReachMm, radiusMm)` clamped below the outer radius; the wedge geometry cuts the hole; test pins the inner radius and that it never exceeds the outer.**
- [ ] **P5.T2: Keep the replay hash untouched** — covers: NFR-1, NFR-4
  - [ ] **P5.T2.1: Client-only; a playback test proves the same seed still produces the same dense stream and hash.**
