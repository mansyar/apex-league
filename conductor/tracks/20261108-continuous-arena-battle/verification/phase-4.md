# Phase 4 — Projectiles and Dodge

- **Track:** `20261108-continuous-arena-battle` (Continuous Arena Battle)
- **Phase:** 4 — Projectiles and Dodge (FR-8; AC-8)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `b840806a5accdd2c621a7787b582437c8a5e5e88`
- **Head commit (code):** `df404399f8920dc9214a1f8e63ee01897d08bb84` (this evidence file is committed on top)
- **Result:** **verified**

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Static + unit + determinism | `bun run verify` | 0 | 4 workspace typechecks clean (voxel 160, sim 182, server 44, client 468 files); 3605 pass / 1 skip / 0 fail across 3606 tests in 338 files; Biome clean over 846 files; voxel determinism gate byte-identical for 48 GLBs + 5 props |
| Build | `bun run build` | 0 | Vite 8.3.4, 370 modules transformed, `dist/assets/index-BMW0jNlc.js` 996.02 kB (pre-existing chunk-size warning) |

`verify` and `build` were run as two separate invocations; the phase config joins
them with `&&`, which this executor is not permitted to use.

### Rework

- First `bun run verify` failed the sim typecheck: the new test imported
  `FighterState` from `./step` (where it is re-exported only as an import) instead
  of `./types`. Import moved; no behaviour change.
- Biome then flagged import order and two line-wrapping preferences in
  `projectile.ts` / `projectile.test.ts`. Fixed; the second run was green.
- No source logic was changed after the first green test run.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-8 | A projectile fired from far lands later than the same move fired from near | `projectile.test.ts` "a shot from far lands later than the same shot from near": `spark` (12 mm/ms, 240 mm/step) against a stationary victim resolves on step 13 at 1500 mm and step 25 at 4500 mm; both report `outcome: "hit"`, and the far arrival is strictly later | met |

## Requirements

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| FR-8 | Travel time is distance ÷ move speed; the dodge is judged on the target's lateral motion, not a one-tick window | `projectile.ts`: launch on the active window, integer travel of `speedMmPerMs × STEP_MS` accumulated from the launch, arrival at `along − BODY_RADIUS_MM`; the integer cross-product offset from the fixed launch line decides the dodge against `DODGE_CLEARANCE_MM` (220 mm). Tests: "each step covers the authored speed times the step", "arrival is a body radius short of the line position", "the same strafe dodges a far shot but not a near one", "perpendicular offset is a cross product, never trigonometry" | met |
| NFR-1 | Integer arithmetic, one seeded RNG, no wall clock | Direction from an integer square root, positions rebuilt from cumulative whole millimetres (no per-step rounding drift), arrival by dot product and dodge by cross product; no RNG draw added and no `Math.random` / `Date`. Replay test: "identical fights replay identical shots and hashes" | met |
| NFR-3 | New sim modules under 12,288 B | `module-size.test.ts` green inside `bun run verify` | met |

## What changed

- `packages/sim/src/battle/continuous/projectile.ts` (new) — `ProjectileState`
  (id, owner, move, launch origin, unit direction, speed, cumulative travel, current
  position), `launchProjectile` (aimed at the victim's body centre; null for melee),
  `shotDirection` (integer `isqrt` normalisation to `DIR_SCALE`), `pointAt`,
  `advanceProjectile`, `perpendicularOffsetMm`, `hasArrived`,
  `resolveProjectiles` (advance → arrive → dodge or damage, reporting `ShotReport`),
  `DODGE_CLEARANCE_MM = BODY_RADIUS_MM`.
- `packages/sim/src/battle/continuous/projectile.test.ts` (new, 22 tests) — launch,
  travel, arrival, dodge, damage reuse, step integration, determinism.
- `packages/sim/src/battle/continuous/types.ts` (+4 lines) — `FightState.projectiles`.
- `packages/sim/src/battle/continuous/step.ts` (+84/−5) — `StepOutcome.shots`,
  `Fight.advance` returning them, `launchShots` on the active-window transition,
  `resolveProjectiles` between the strike pass and movement, projectile fields in
  `stateHash`, empty list at fight creation.
- `packages/sim/src/battle/continuous/strike.ts` (+9/−2) — `typeAgainst` exported
  for reuse; `resolveStrikes` skips non-melee moves.

## Evidence paths

- `packages/sim/src/battle/continuous/projectile.ts`, `projectile.test.ts`
- `packages/sim/src/battle/continuous/step.ts`, `types.ts`, `strike.ts`
- `conductor/tracks/20261108-continuous-arena-battle/verification/phase-4.md`

## Deviations

- `packages/sim/src/battle/continuous/types.ts` — outside Touches, named in the
  brief as a small integration edit. `FightState.projectiles` is the shared state
  the step and projectile modules agree on, so the list lives beside `FightState`;
  additive only, Phase 2/3 tests unchanged.
- `packages/sim/src/battle/continuous/step.ts` — outside Touches, named in the
  brief. Changes are the launch seam (`launchShots`), the resolve pass
  (`resolveProjectiles`), the `shots` report on `StepOutcome`/`StepResult`, the
  projectile mix in `stateHash`, and the empty list at creation. `moveFighter` and
  the strike ordering are untouched.
- `packages/sim/src/battle/continuous/strike.ts` — outside Touches and not named in
  the brief. Two minimal changes: (a) `typeAgainst` is exported so the shot path
  reuses the exact typeless-is-neutral rule instead of duplicating it; (b)
  `resolveStrikes` skips non-melee moves, because FR-8 says a ranged move launches a
  projectile *instead of* resolving instantly — without the guard Phase 3's strike
  pass also lands an instant hit during the same active window. Both changes leave
  melee behaviour identical; every Phase 3 test is unchanged and green.

## Notes

- **Aim choice (documented in `launchProjectile`):** the shot is aimed at the
  victim's body centre at the instant the active window opens, not along the
  shooter's facing. A stationary shooter therefore cannot miss by facing alone, and
  lateral movement is the only way to dodge — which is what FR-8 asks the arena to
  decide.
- **Launch cadence:** one shot per committed move, launched on the step the active
  window opens (the transition from startup to active). The shot is appended after
  the resolve pass, so its first advance is the following step. Ids are
  `step × 2 + side`, unique because a side opens at most one window per step.
- **Arrival:** the shot resolves when its cumulative travel reaches the victim's
  line position less one body radius, so one long step cannot tunnel past a body.
  A shot that never arrives cannot happen inside the fence: travel is monotonic and
  the victim's line position is bounded by the arena.
- **Dodge:** at arrival the victim's perpendicular offset from the fixed launch line
  is an integer cross product scaled back to mm; more than
  `DODGE_CLEARANCE_MM = BODY_RADIUS_MM = 220 mm` is a miss (`outcome: "dodged"`,
  damage 0). No roll is used, so a far shot is dodgeable by a strafe that a near
  shot beats — pinned by "the same strafe dodges a far shot but not a near one"
  (700 mm hits, 4500 mm dodges).
- **Accuracy:** deliberately not applied. FR-8 names distance and lateral motion as
  the causes of a miss; `MoveDef.accuracy` stays a catalog field for a later tuning
  track. The fight's single seeded RNG is untouched by this phase, so the stream is
  still clean for Phase 5+.
- **Damage:** arrival reuses `positionalDamage` with `hitPosition` and `typeAgainst`
  — the same type × position × counter path a melee strike takes. A shot on a
  recovering victim is a counter, a shot on a starting victim interrupts it. `hp` is
  still not on `FighterState`; applying reported damage remains Phase 7's scope, as
  Phase 3's evidence records.
- **Known debt carried, not introduced:** Phase 3 records that an active window
  resolves once per step, so a 60 ms melee window can land three blows. That is
  balance debt for the tuning track and is untouched here; a projectile fires once
  per window by construction ("one committed move fires exactly once").
- **Determinism:** the hash now covers the projectile list (count, id, owner and
  move characters, origin, direction, speed, cumulative travel, current position),
  so a shot in flight is part of the replay identity.
- **Scope held:** `frames.ts`, `moves.ts`, `clock/`, `chart.ts` untouched; no poise,
  stamina, knockback, endings, or controller work.
- **Tasks:** P4.T1 (projectile entities, travel from distance at authored speed,
  resolved on arrival) and P4.T2 (dodge from lateral motion relative to the shot
  line) are both delivered in `df404399`.
