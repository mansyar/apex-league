# Phase 2 — Fixed-Step Engine Core

- **Track:** 20261108-continuous-arena-battle — Continuous Arena Battle
- **Phase:** 2 — Fixed-Step Engine Core (FR-1, FR-2, FR-3, AC-1, AC-2, AC-3)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `c940d71cb69c5230b17be38a809ef9f05207f397`
- **Head commit (code under verification):** `2f7fd51f576b7f8f4fab501c70aad9b3cb3ed943`
- **Result:** **verified** — `bun run verify` and `bun run build` both exit 0.

## Commands

Run as two separate invocations (the agent rules forbid joining them with `&&`).

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bun run verify` | 0 | 4 workspace typechecks clean (voxel 160, sim 176, server 44, client 468 files); 3551 tests across 335 files — 3550 pass, 1 skip, 0 fail, 439,953 assertions; `biome check` 840 files clean (no warnings, no fixes applied); voxel determinism gate byte-identical for all 48 creature GLBs plus the 5 props. |
| build | `bun run build` | 0 | Vite 8.3.4 built 370 modules; `dist` assets emitted (996 kB main chunk — the pre-existing >500 kB warning, not an error). |

### Rework

Two rework rounds, both in phase-owned test/format code; the final run above is
clean and no check was left unrun.

1. `movement.test.ts` compared `targetVelocity` diagonal `z` against the axis
   intent's `z`, which is 0 by construction. The assertion now pins the real
   property: a diagonal component (707) is smaller than the axis component
   (1000), so a diagonal is never faster than an axis move.
2. Two formatter-only breaks reported by `biome check` (a wrapped `sameWay`
   expression and a wrapped ternary in the stepper test) and one import-order
   break (`FighterState` before `FightState`). Fixed by hand; no lint
   suppression and no config change.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Repeat run is byte-identical: same seed and same inputs produce the same state hashes. | `step.test.ts` "the same seed and the same intents replay the same hashes" replays a 150-step scripted exchange twice and compares the whole hash array and the final state; "a different intent sequence walks a different fight" proves the hash tracks behaviour rather than being constant; "the same state hashes the same every time" and "the hash is a 32-bit word" pin the hash contract. | met |
| AC-2 | Position is a 3-vector in millimetres and every sampled `y` is 0. | `types.ts` — `Vec3` in mm, `FighterState.pos`; `openFighter` builds `pos` with `y: 0` and `integrate` always emits `y: 0`. `step.test.ts` "every sampled position keeps y at 0 and every component whole" samples 200 steps and asserts `y === 0`, integer components, and that both axes stay inside the fence. | met |
| AC-3 | An engagement shows more than one distinct position and lateral movement. | `step.test.ts` "a scripted exchange visits many distinct positions" runs 120 steps of closing then circling, collecting `x,z` per side and the home side's `z` values: both sides exceed 10 distinct positions and `z` takes more than one value. | met |

## Requirements

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Fixed 20 ms steps, one seeded RNG per fight, a stable state hash. | `STEP_MS = 20` in `types.ts`; `step.test.ts` "a step advances one step and one step of time" (step 0→1, elapsed 0→20 ms) and "a held fighter keeps its position and its velocity" (20 steps → 400 ms). `createFight` builds exactly one `makeRng(seed >>> 0)` and threads it into every step through `StepContext`; `stateHash` is FNV-1a over the quantized state in a fixed field order, mirroring `keyHash` in `battle/clock/engine.ts`. | met |
| FR-2 | Fighter state carries a fixed-point 3-vector position in mm with `y` pinned to 0, plus velocity and facing. | `types.ts` `FighterState` (`key`, `pos: Vec3`, `vel: Vec3`, `facing: Dir2`, `spd`) and `FightState` (`step`, `elapsedMs`, `bounds`, two fighters in fixed order). Velocity is fixed-point mm/ms in thousandths (1000 = 1 mm/ms = 1 m/s); facing is an 8-way planar direction. | met |
| FR-3 | Continuous movement toward an intent, speed from `spd`, acceleration and deceleration, lateral strafing. | `movement.ts` — `topSpeed(spd)` = base + gain × `spd` (the one speed tunable), `targetVelocity`, `approach` (per-step accel/decel rates), `integrate` (position + fence), `facingFor`, `moveFighter`. `movement.test.ts` covers the ramp `[400, 800, 1000, 1000]`, the shed `[400, 0, 0]`, the reversal `[400, -200, -600, -1000]`, diagonal speed, lateral-only movement, fence clamping, and facing. | met |

## What changed

- `packages/sim/src/battle/continuous/types.ts` (new, ~2.5 KB) — `STEP_MS = 20`,
  `DIR_SCALE = 1000`, `Vec3`, `Dir2`, `MoveIntent`, `HOLD`,
  `FACING_POSITIVE_Z`, `ArenaBounds`, `FighterState`, `FightState`.
- `packages/sim/src/battle/continuous/movement.ts` (new, ~4 KB) —
  `VEL_UNITS_PER_MM_PER_MS`, `SPEED_BASE_MILLI_MM_PER_MS`,
  `SPEED_GAIN_MILLI_MM_PER_MS`, `ACCEL_…`/`DECEL_MILLI_MM_PER_MS_PER_STEP`,
  `topSpeed`, `targetVelocity`, `accelerate`, `integrate`, `facingFor`,
  `moveFighter`.
- `packages/sim/src/battle/continuous/step.ts` (new, ~5 KB) — `FighterInit`,
  `FightConfig`, `StepResult`, `Fight`, `StepContext`, `stepFight`,
  `stateHash`, `createFight` (validation + the single RNG stream).
- `packages/sim/src/battle/continuous/movement.test.ts` (new) — 13 tests.
- `packages/sim/src/battle/continuous/step.test.ts` (new) — 14 tests.
- Nothing outside `Touches` changed; `frames.ts`, `rng.ts`, and
  `battle/index.ts` are untouched.

## Evidence paths

- `packages/sim/src/battle/continuous/types.ts`
- `packages/sim/src/battle/continuous/movement.ts`
- `packages/sim/src/battle/continuous/step.ts`
- `packages/sim/src/battle/continuous/movement.test.ts`
- `packages/sim/src/battle/continuous/step.test.ts`
- `conductor/tracks/20261108-continuous-arena-battle/verification/phase-2.md`

## Deviations

- None. `packages/sim/src/battle/index.ts` is outside `Touches`, so the new
  modules are not re-exported from the battle barrel yet; tests import
  `./types`, `./movement`, and `./step` directly, as the brief asks.

## Notes

- **Units.** Distance is millimetres, time is milliseconds, velocity is
  fixed-point thousandths of a mm/ms (1000 units = 1 mm/ms = 1 m/s), so a
  step of velocity integrates to whole millimetres by one rounded division.
  Rounding is half-away-from-zero, which keeps mirrored paths identical.
- **Intent is a direction, not a named verb.** `MoveIntent` is a planar
  vector in thousandths; axis moves use ±1000 and diagonals use ±707, so a
  diagonal is never faster than an axis move. Phase 6's controller resolves
  advance/retreat/strafe/hold into these vectors using the two positions,
  which keeps `movement.ts` free of opponent coupling.
- **Speed tunable.** `topSpeed(spd) = 100 + 90 × spd` (thousandths of mm/ms),
  i.e. `spd` 10 → 1.0 m/s and `spd` 16 → 1.54 m/s. Accel 400 and decel 600
  units per step are per-step rates, so they are frame-rate independent by
  construction; balance tuning is a later track.
- **Fence.** Bounds are a config parameter, never a constant. A clamped axis
  is pinned to the bound and its velocity zeroed in the same step, so a
  fighter pinned at the wall reports the same position for every further step
  (the "does not oscillate" test asserts one distinct `x` over 20 steps).
- **RNG seam.** `createFight` creates the fight's only `makeRng(seed)` and
  passes it to every step through `StepContext`. Movement draws nothing from
  it; Phase 3+ (strike accuracy, dodges) will, on that same stream, so the
  replay contract holds from the start.
- **Hash.** FNV-1a over `step`, `elapsedMs`, the four bounds, then each side's
  key characters, position, velocity, facing, and `spd`, in that fixed order;
  negatives fold in as unsigned 32-bit words. Swapping the two sides changes
  the hash, which pins the field order.
- **Determinism.** No `Math.random`, no `Date`, no wall clock, no
  trigonometry anywhere in the new modules; the factory refuses non-integer
  seeds, bounds, stats, and starts so a bad input fails at construction rather
  than drifting mid-fight.
- Every new module is well under the 12,288 B sim cap (the module-size guard
  passed as part of `bun run verify`).
