# Phase 6 — Real-Time Controller

- **Track:** `20261108-continuous-arena-battle` (Continuous Arena Battle)
- **Phase:** 6 — Real-Time Controller (FR-11; AC-11)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `c932e8f97fc86c81b66f11aa61a1dddb72c9626f`
- **Head commit (code):** `ef0b5a93` (this evidence file is committed on top)
- **Result:** **verified**

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Static + unit + determinism | `bun run verify` | 0 | 4 workspace typechecks clean (voxel 160, sim 190, server 44, client 468 files); 3660 pass / 1 skip / 0 fail across 3661 tests in 342 files; Biome clean over 854 files; voxel determinism gate byte-identical for 48 GLBs + 5 props |
| Build | `bun run build` | 0 | Vite 8.3.4, 370 modules transformed, `dist/assets/index-BMW0jNlc.js` 996.02 kB (pre-existing chunk-size warning) |

`verify` and `build` were run as two separate invocations, which is what the brief
asks for and what this executor is permitted.

### Rework

First pass:

- `bun run verify` failed two checks. `module-size.test.ts` reported `controller.ts`
  at 13,969 B — 1,681 B over the 12,288 B cap — because the first draft carried long
  per-helper doc blocks. The module was rewritten leaner: the `decidedAtStep` and
  `strafeSign` state fields were dropped (the first is derivable from `decisions` and
  `step`, the second from `side`), `DEFAULT_PROFILE` and its dead `??` fallback went
  with them, and the prose was compressed to one or two lines per helper. No
  behaviour changed.
- The same run failed the lock test: `expect(ordered.intent).toBe(before.intent)`
  expected `{x:0,z:0}` and received `{x:1000,z:0}`. The test treated `undefined` as
  an attack — opening fighters omit `attack` rather than setting it to `null`, so
  `!== null` was true on the opening step. `Boolean(...)` fixed it; the controller
  itself already used a truthiness check and was correct.
- A later run was green on tests and failed only Biome: two import orders (`type`
  specifiers sorted first) and one `if` that measured 81 columns. All three were
  fixed by hand exactly as Biome suggested.

Rework 1 (the dodge price):

- Review found the dodge cost was reported but never debited, so a non-committing
  fighter could dodge on every cadence for free. The price is now charged at the
  step that owns fighter state (see Deviations).
- `bun run verify` then failed the sim typecheck on `step.test.ts:240`, which passes
  `HOLD` as a zero `facing`. Widening `MoveIntent` made `HOLD` a union, which is not
  assignable to `Dir2`; `HOLD` is now typed `Dir2` (a zero direction is both a facing
  and an order), and the test's intent — a zero facing is refused — is unchanged.
- The next run failed only Biome on the two new files: one import order and two
  `createFight(...)` calls the formatter wanted on one line. Fixed by hand.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-11 | The controller's decision cadence is observable and unchanged between identical runs | The cadence is state, not a hidden clock: `ControllerState.decisions` counts decisions and `nextDecisionMs(state) = decisions * DECISION_MS`. `controller.test.ts` "a decision lands on every sixth 20 ms step" pins `DECISION_MS = 120`, `DECISION_STEPS = 6`, and that the cadence divides the step exactly; "a 600-step fight takes exactly 100 decisions a side" drives a real fight and asserts `decisions === [100, 100]` and `nextDecisionMs === 12000` for both sides; "between decisions the controller repeats the intent it holds" shows the state object and the intent are identity-equal off-cadence and that no commit is asked for; "the same seed and the same tuning order the same fight" runs the same 600 steps twice and compares hashes, verbs, intents, commits, and decision counts; "a different tuning orders a different fight" shows the sequence is not constant. `advance.test.ts` "a fight that dodges past its pool still hashes identically" re-runs a 30-step dodge script — through both the paid and the refused path — and compares the whole hash stream and every dodge report. | met |
| AC-10 (dodge half) | Insufficient stamina is refused, and the pool recovers | `advance.test.ts` "an empty pool refuses the dodge, and the body holds" gives a fighter `staminaMax: 4` (below the 8-point price) and asserts the order is refused (`dodges === [{key, paid: false}]`), stamina is unchanged, the regen bank is untouched, and neither position nor velocity moved; "a refusal costs nothing and leaves the fighter free to act" shows the same fighter can still commit and still move on the next step, so a refusal neither charges nor wedges; "a dodge pays its price and moves the body sideways" asserts `stamina === before - DODGE_STAMINA_COST`, a paid report, and lateral displacement only. | met |

## Requirements

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| FR-10 (dodge half) | Stamina gates dodges, and movement stays free | A dodge order carries its verb on the intent (`DodgeIntent`), and `advance.ts` is the one place that charges it: `applyIntent` calls `spendDodge` before moving, bursts only when the pool paid, and refuses into `moveFighter(fighter, HOLD, ...)` when it did not — the refusal reported on `StepOutcome.dodges` the same way a refused commit is observable as `false`. A plain intent never touches the pool, so movement stays free. The controller still gates its own dodge on `spendDodge` and reports the price as `dodgeCost`, so the gate and the pool cannot drift. `advance.test.ts` covers paid, refused, refusal-is-free, and determinism; `controller.test.ts` "a fighter who cannot pay the dodge does not dodge" covers the controller-side gate. | met |
| FR-11 | The controller emits advance, retreat, strafe, hold, commit, and dodge intents on a fixed decision cadence with commitment locks | `controller.ts` defines the six verbs as `ControllerVerb` and resolves exactly one per cadence step. `advance`/`retreat`/`strafe` are movement intents built from `shotDirection` (unit thousandths, so diagonals are not faster); `hold` is `HOLD`; `commit` names a move id for the step's existing commit path; `dodge` is a `DodgeIntent` — a lateral burst the step charges `DODGE_STAMINA_COST` for. `controller.test.ts` "the six verbs" covers advance (out of range), strafe (in band, perpendicular to the approach), retreat (inside the inner band), commit (in band on a press slot, naming `blaze_bolt`), and dodge (an inbound shot on the line, with `dodgeCost === DODGE_STAMINA_COST`, a lateral direction, and `"dodge" in intent` true); "a fighter who cannot pay the dodge does not dodge" covers the refusal; "a locked fighter keeps its intent and asks for no commit" covers the lock. "a fight progresses" asserts both fighters move, at least one attack is committed, the cadence matches the step count, and every reported verb is one of the six. | met |
| FR-6 (controller side) | No twitch re-decision inside a commitment | `decide` returns the held verb and intent untouched whenever `me.attack` is set — startup, active, and recovery alike — and never asks for a commit, so a swing cannot be cancelled by intent churn and a refused commit cannot be spammed. `controller.test.ts` drives 300 steps of a `rush` fight, and on every cadence step where side 0 holds an attack asserts the intent is identity-equal, the verb is unchanged, and `commit` is null; every commit it does ask for must be accepted (`expect(fight.commit(...)).toBe(true)`), which is the anti-spam assertion. | met |
| NFR-1 | Integer arithmetic, one seeded RNG, no wall clock | The controller reads only `FightState` and its own state. It draws no random number at all — no `Math.random`, no `Date`, no `rng` — because `Fight` exposes no RNG handle; a profile's shares instead partition a fixed ten-decision cycle, which is what gives each archetype a rhythm. Every threshold is a squared integer distance and every direction comes from the integer `shotDirection`. The dodge charge is `spendStamina`, whole points. Identical seeds therefore produce identical intent sequences and identical hashes, asserted by the determinism tests on both sides of the seam. | met |
| NFR-3 | New sim modules under 12,288 B | `module-size.test.ts` is green inside `bun run verify`. `controller.ts` (348 lines) is under the cap after the first rework, and the new `advance.ts` (193 lines) and `advance.test.ts` are under it too; co-located suites are exempt in any case. Extracting the pipeline *shrank* `step.ts` from 12,143 B to roughly 8.6 KB, which retires the Phase 5 capacity warning. | met |

## What changed

- `packages/sim/src/battle/continuous/controller.ts` (new, 348 lines) —
  `DECISION_MS = 120`, `DECISION_STEPS = 6`, `RANGE_BAND_MM = 400`, private
  `CYCLE = 10`; `ControllerVerb` (the six verbs); `ControllerProfile`
  (`aggression`, `preferredRangeMm`, `strafeBias`, `dodgeThresholdMm`) with a frozen
  `CONTROLLER_PROFILES` table keyed off `Temperament` (`rush` 80/1400/15/2600,
  `slow` 40/2600/45/3400, `obedient` 60/2000/30/3000 — the neutral default) and
  `profileFor`; `ControllerState` (`decisions`, `intent`, `verb`),
  `createController`, `nextDecisionMs`; `DecisionInput`, `ControllerDecision`
  (`state`, `verb`, `intent`, `commit`, `dodgeCost`); `decide` and its helpers
  (`hold`, `planarGapSq`, `aimAt`, `awayFrom`, `strafeIntent`, `pressIntent`,
  `incomingShot`, `dodgeIntent`, `chooseMove`). `dodgeIntent` now returns a
  `DodgeIntent` so the step can charge for it.
- `packages/sim/src/battle/continuous/controller.test.ts` (new, 415 lines, 16 tests)
  — cadence and observability, the six verbs, the affordability refusal, the
  commitment lock, the archetype table, determinism, and fight progress.
- `packages/sim/src/battle/continuous/advance.ts` (new, 193 lines) — the per-step
  pipeline extracted from `step.ts`: `stepFight`, `StepOutcome`, `StepResult`,
  `StepContext`, `DodgeReport`, and the private `applyIntent`, `launchShots`,
  `settleMeters`. `applyIntent` is the dodge seam: it charges `spendDodge` before a
  burst and refuses an unpayable order into a hold.
- `packages/sim/src/battle/continuous/advance.test.ts` (new, 96 lines, 4 tests) — the
  dodge price, the refusal, the refusal-is-free case, and determinism across a run
  that outruns its pool.
- `packages/sim/src/battle/continuous/types.ts` — `MoveIntent` is now
  `Dir2 | DodgeIntent`; `DodgeIntent` carries `{ dodge: Dir2 }`; `HOLD` is typed
  `Dir2` (a zero direction is both a facing and an order).
- `packages/sim/src/battle/continuous/movement.ts` — `directionOf(intent)` narrows an
  order to its direction, and `targetVelocity`/`facingFor` read through it, so the
  kinematics never look at the verb. No behaviour change for a plain intent.
- `packages/sim/src/battle/continuous/step.ts` — the pipeline moved out to
  `advance.ts`; the file keeps `FighterInit`, `FightConfig`, `Fight`, `stateHash`,
  `createFight` and the commit path, and re-exports `StepResult` so existing callers
  are unaffected. `advance` now surfaces `dodges` on its result.

## Evidence paths

- `packages/sim/src/battle/continuous/controller.ts`, `controller.test.ts`
- `packages/sim/src/battle/continuous/advance.ts`, `advance.test.ts`
- `packages/sim/src/battle/continuous/types.ts`, `movement.ts`, `step.ts`
- `conductor/tracks/20261108-continuous-arena-battle/verification/phase-6.md`

## Deviations

- `packages/sim/src/battle/continuous/types.ts` — outside Touches, but the minimum
  seam the rework brief names: the dodge needs a distinct order the step can tell
  from a strafe. `MoveIntent` gains the `DodgeIntent` variant and `HOLD` is retyped
  `Dir2` so it can still be used as a facing.
- `packages/sim/src/battle/continuous/movement.ts` — outside Touches. Widening
  `MoveIntent` would otherwise force every kinematic helper to re-implement the
  narrowing; one exported `directionOf` keeps them reading a direction.
- `packages/sim/src/battle/continuous/step.ts` — outside Touches. It is the seam that
  owns fighter state, so the charge belongs on its path, but adding it in place
  pushed the file past the 12,288 B cap. As the rework brief directs, the per-step
  pipeline was extracted to `continuous/advance.ts` rather than the file being
  compressed by deleting comments, and `step.ts` keeps its factory, hash, and commit
  path.
- `packages/sim/src/battle/continuous/advance.ts`,
  `packages/sim/src/battle/continuous/advance.test.ts` — new files created by that
  split, outside the phase's original Touches.

## Notes

- **The cadence is arithmetic, not a timer.** A decision lands on every step where
  `step % 6 === 0`, guarded so it cannot fire twice on the same step, so after `n`
  steps a side has taken exactly `ceil(n / 6)` decisions and the next lands at
  `decisions * 120` ms. That is what makes "the counter matches the step count
  divided by the cadence" an exact assertion rather than an approximation, and it
  keeps the controller free of any clock of its own.
- **The held intent is the same object.** Off-cadence, `decide` returns the state and
  intent by reference, so the tests can assert identity rather than deep equality —
  "the fight keeps moving under one intent" is literally one object.
- **The lock covers startup.** FR-6 lets a startup be interrupted by a hit, but the
  controller is the one thing that must not exploit it: it never re-decides out of
  startup, active, or recovery. A fighter can therefore be hit out of a swing but
  cannot cancel its own.
- **Archetypes are one table.** `CONTROLLER_PROFILES` is a total
  `Record<Temperament, ControllerProfile>`, so a missing temperament is a compile
  error rather than a silent fallback, and no species or boss gets a row of its own.
  A rival and a boss read the same row shape; Phase 8 can hand either one a
  `profileFor(species.temperament)`.
- **Aggression and strafe bias partition a cycle.** Inside the preferred band,
  `slot = (decisions - 1) % 10` is compared against `round(aggression / 10)` press
  slots and then `round(strafeBias / 10)` strafe slots, with the remainder spent
  closing. `rush` presses 8 of 10 and circles 2; `slow` presses 4, circles 5, closes
  1. That is the whole "personality" mechanism, and it is a table lookup.
- **Dodge is still a movement intent — now a paid one.** A dodge is one cadence of
  full-magnitude perpendicular intent, which is a burst because the intent is
  perpendicular to the line the body is standing on rather than along its own
  approach. The verb rides on the order (`DodgeIntent`) instead of being implied, so
  the step can charge for it without the controller or the kinematics knowing about
  stamina. `movement.ts` changed by one narrowing helper, not by a burst subsystem.
- **The seam now charges, and the charge is observable.** `advance.ts` spends
  `DODGE_STAMINA_COST` before the burst and reports `{ key, paid }` on
  `StepOutcome.dodges`; an unpayable order becomes a hold, so the body neither
  bursts nor slides. A refusal is therefore visible to Phase 9's telemetry instead of
  being an invisible no-op, and it is exercised in the suite: 30 steps of dodging
  outrun a full 100-point pool, so the determinism test walks both paths.
- **Where the price lives.** The controller still calls `spendDodge` as an
  affordability gate and still reports `dodgeCost`, but the debit happens in the step
  — the only writer of fighter state. Phase 7's runner needs to do nothing about
  dodges: it passes the intent through `advance` and the pool is charged.
- **`step.ts` is no longer at its cap.** The pipeline extraction took it from
  12,143 B to roughly 8.6 KB, so Phase 7 can integrate through the step path without
  extracting anything. The Phase 5 capacity warning is retired.
- **Tasks:** P6.T1 (intent model and cadence) and P6.T2 (commitment locks and
  archetype parameters) are both delivered in `251a89fd` - one commit, because both
  are facets of one decision function and neither would compile or be meaningful
  split out - and the dodge price found by review is closed in `ef0b5a93`.

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static | `bun run verify` | 0 | 4 workspace typechecks clean; 3661 tests / 342 files, 3660 pass, 1 skip, 0 fail; biome 854 files clean; determinism gate byte-identical |
| build | `bun run build` | 0 | Vite built 370 modules; only the pre-existing chunk-size warning |

Verified by the primary agent. The phase was squashed to `5a2e6221` (all four
commits in the range were reported).

**Rework 1 (found by primary review, not by the phase agent):** the controller
gated its dodge decision through `spendDodge` and reported `dodgeCost`, but the
returned fighter was discarded and the step never charged the pool, so a fighter
that was not committing could dodge on every cadence forever. FR-10 says stamina
gates attacks **and** dodges. The fix added a `DodgeIntent` variant, charged
`DODGE_STAMINA_COST` at the step seam, turned an unpayable order into a hold
reported as `{ key, paid: false }` on `StepOutcome.dodges`, and — because that
pushed `step.ts` past the module cap — extracted the per-step pipeline into
`continuous/advance.ts`.

**Capacity after the split:** `step.ts` 7,962 B, `advance.ts` 6,436 B,
`controller.ts` 12,158 B (130 B of headroom). The Phase 5 warning on `step.ts` is
retired; `controller.ts` is now the tightest file and Phase 7 should not grow it.
