# Phase 3 — Strikes, Commitment, Trades

- **Track:** `20261108-continuous-arena-battle` (Continuous Arena Battle)
- **Phase:** 3 — Strikes, Commitment, Trades (FR-4, FR-6, FR-7; AC-4, AC-6, AC-7)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `367c8b8706479aba5654c3fa860577675906e184`
- **Head commit (code):** `50d57751592fa71c638516c025b302f071741cab` (this evidence file is committed on top)
- **Result:** **verified**

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Static + unit + determinism | `bun run verify` | 0 | 4 workspace typechecks clean (voxel 160, sim 180, server 44, client 468 files); 3583 pass / 1 skip / 0 fail across 3584 tests in 337 files (440,036 assertions); Biome clean over 844 files; voxel determinism gate byte-identical for 48 GLBs + 5 props |
| Build | `bun run build` | 0 | Vite 8.3.4, 370 modules transformed, `dist/assets/index-BMW0jNlc.js` 996.02 kB (pre-existing chunk-size warning) |

`verify` and `build` were run as two separate invocations; the phase config joins
them with `&&`, which this executor is not permitted to use.

### Rework

- First `bun run verify` of the lifecycle commit failed 2 of my own tests, not the
  engine: the replacement test assumed spark's 130 ms startup was 80 ms, and the
  counter test committed the attacker while the victim's active window could still
  interrupt its startup. Both expectations corrected; no source change.
- Biome then flagged one optional-chain preference in `strike.ts`, import order in
  `step.ts` and `strike.test.ts`, and one wrapped template literal. Fixed; the
  second run was green.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-4 | Strike aimed away misses on distance alone; flank hit deals more than front with identical stats | `strike.test.ts` "a strike aimed away does not land" (target 420 mm away, inside reach, attacker facing away → zero strikes); `damage.test.ts` "a flank hit beats a front hit", "chip damage still rewards position", "a counter beats the plain blow" | met |
| AC-6 | Startup hit cancels the attack; recovery hit deals counter bonus | `strike.test.ts` "a hit during startup cancels the attack" (victim's attack becomes `null`, report `interrupted: true`); "a hit during recovery is a counter" (counter damage > plain damage, `counter: true`) | met |
| AC-7 | Two simultaneous active frames both register damage in the same step | `strike.test.ts` "both active frames land in the same step" (two reports, both damage > 0, neither `interrupted`, both attacks still `active`) | met |

## Requirements

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| FR-4 | Attacks resolve against actual positions: Euclidean reach plus positional bonus | `withinReach` compares squared planar distance; `inFrontArc` gates with integer dot/cosine; `positionalDamage` folds type × position × counter into the existing `strikeDamage` num/den before the floor | met |
| FR-6 | Committed attack not cancellable after startup; startup hit interrupts; strike during recovery is a counter | `canCommit` / `commitAttack` / `Fight.commit`; `resolveStrikes` clears a startup victim's attack and flags `interrupted`; recovery victims take the counter ratio | met |
| FR-7 | Overlapping active frames trade, both land | `resolveStrikes` reads one pre-step snapshot for both sides; trade test above | met |
| NFR-1 | Integer arithmetic, one seeded RNG, no wall clock | new modules use only integer add/subtract/compare; no RNG draw added, no `Math.random` / `Date`; replay determinism test | met |
| NFR-3 | New modules under 12,288 B | `module-size.test.ts` green in `bun run verify` | met |

## What changed

- `packages/sim/src/battle/continuous/damage.ts` (new, ~2.5 KB) — `Ratio`,
  positional ratios (front 1/1, flank 5/4, rear 3/2, counter 5/4), `HitPosition`,
  `positionRatio`, `positionalDamage` folding type × position × counter into one
  integer num/den before the existing floor; non-front/counter blows are raised to
  at least `plain + 1`, so a bonus is never lost to chip rounding.
- `packages/sim/src/battle/continuous/strike.ts` (new, ~8.5 KB) — reach
  (`withinReach`), the single tunable front arc `FRONT_ARC_COS` (90° half-width =
  180° total) and `FLANK_COS` (60°), `inFrontArc`, `hitPosition`, `ATTACK_PHASES`,
  `phaseDuration`, `advanceAttack` (carries the remainder across boundaries),
  `advanceFighterAttack`, `canCommit`, `commitAttack`, `StrikeStats` /
  `NEUTRAL_STATS`, `StrikeReport`, `resolveStrikes`.
- `packages/sim/src/battle/continuous/types.ts` (+19 lines) — `AttackPhase`,
  `AttackState` (move, phase, elapsed), optional `FighterState.attack`.
- `packages/sim/src/battle/continuous/step.ts` (+113/−19) — strike integration:
  `stats` on `FighterInit` / `StepContext`, `StepOutcome` / `StepResult.strikes`,
  `Fight.commit`, `stepFight` advancing attacks then resolving from the pre-step
  snapshot, attack state mixed into `stateHash`, stats validation.
- `packages/sim/src/battle/continuous/damage.test.ts` (new, 8 tests) and
  `strike.test.ts` (+10 tests, 24 total).

## Evidence paths

- `packages/sim/src/battle/continuous/damage.ts`, `damage.test.ts`
- `packages/sim/src/battle/continuous/strike.ts`, `strike.test.ts`
- `packages/sim/src/battle/continuous/step.ts`, `types.ts`

## Deviations

- `packages/sim/src/battle/continuous/types.ts` — outside Touches.
  `FighterState.attack` is the contract the step and strike modules share, so the
  optional attack state had to live beside `FighterState`; additive only, Phase 2
  tests unchanged.
- `packages/sim/src/battle/continuous/step.ts` — outside Touches but named in the
  brief as a small integration edit. Changes: strike imports, stats on init and
  context, `StepOutcome` / `StepResult.strikes`, `Fight.commit`, `stepFight`
  rewritten to advance → resolve → move, attack in `stateHash`, stats validation.
  `moveFighter` untouched; no restructuring beyond the step pipeline.

## Notes

- **Units:** mm, ms, and a facing vector at `DIR_SCALE = 1000`. Reach is a squared
  planar compare (`dx² + dz² ≤ reach²`), so no square roots; the arc gate compares
  `dot²·den² ≥ |a|²·|b|²·num²` against `FRONT_ARC_COS`, so no trigonometry.
- **The one arc knob:** `FRONT_ARC_COS = 0 / 1` is a 90° half-width, i.e. 180°
  total, documented as the single tunable. `FLANK_COS = 1/2` splits front from
  rear at 60° either side of the target's facing; hits outside it are flanks,
  inside it are front or rear by the dot sign.
- **Commitment:** a commit during startup replaces the attack; a commit during
  active or recovery is refused and `Fight.commit` returns false. A startup hit
  clears the victim's attack outright; an active or recovery hit never does,
  which is what makes a trade a trade.
- **Active windows resolve once per step:** a 60 ms active window can land up to
  three blows (one per 20 ms step) while the target stays in reach. The phase
  contract defines attack state as phase + elapsed only, so no per-activation
  "already landed" flag was added; how many blows one activation should deal is a
  balance decision for the follow-up tuning track.
- **Type factors:** typeless basic strikes and fights without stats use 1/1;
  elemental moves use `typeFactor` when both sides name an element.
- **Damage order:** type × position × counter multiply into the
  numerator/denominator of the existing
  `max(1, floor(power·atk·num / (def·den)))` shape, so Phase 3 does not fork the
  formula.
- **Determinism:** no RNG draw was added; the single seeded stream stays unused by
  strikes, so Phase 4 can consume it. Attack state is mixed into the FNV-1a hash
  (presence, move id chars, phase index, elapsed).
- **Scope held:** `frames.ts`, `moves.ts`, `chart.ts`, `policy.ts` untouched; no
  projectiles, poise, stamina, controller, or endings.

## Primary verification

| Check | Result |
|---|---|
| `bun run verify` | exit 0 |
| `bun run build` | exit 0 |
| Tasks P3.T1-P3.T3 | done |

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static | `bun run verify` | 0 | 4 workspace typechecks clean; 3584 tests / 337 files, 3583 pass, 1 skip, 0 fail; biome 844 files clean; determinism gate byte-identical |
| build | `bun run build` | 0 | Vite built 370 modules; only the pre-existing chunk-size warning |

Verified by the primary agent, not taken from the subagent report. The phase was
squashed to `16603677` (all three commits in the range were reported; no merge or
unreported commit).

**Deferred, recorded deliberately:** `FighterState` still carries no `hp` field,
so `StrikeReport.damage` is reported but never subtracted from a pool. That is
Phase 7's scope (FR-12 endings), not Phase 3's (FR-4/6/7 resolve and trade). Phase
7 must add `hp` to `FighterState`, apply `strike.damage` in `stepFight`, and
include it in `stateHash` — noted here so it cannot be missed.
