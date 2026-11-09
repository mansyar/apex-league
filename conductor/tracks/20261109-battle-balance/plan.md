# Battle Agency and Balance — Implementation Plan

> **Branch:** feat/20261109-battle-balance
> **Base:** main @ d36d5995
>
> Phase states: `pending` | `in_progress` | `verified` | `failed` | `blocked`.
> Only the primary agent writes this file.

Agency phases come first so every balance number is measured against a controller
that has stopped moving. The report harness lands before the roster re-tune so the
numbers are measured by a tool that predates them.

---

## Phase 1: Doctrines

**Goal:** the player picks where the fight happens, and it happens there.

- **Depends on:** none
- **Covers:** FR-11, FR-12, FR-15, FR-16, AC-11, AC-12, AC-15
- **Touches:** `packages/sim/src/battle/continuous/controller-profile.ts`, `controller.ts`, `resolve.ts`, `apps/client/src/spar/`, `apps/client/src/cup/`, `apps/client/src/battleHud.ts` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** ef514222
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-1.md`

- [x] **P1.T1: Doctrine model** — covers: FR-11
  - [ ] P1.T1.1 Replace the two tactics with four frozen doctrines: Press, Circle, Kite, Counter.
  - [ ] P1.T1.2 Derive each doctrine's range band from the reach edge, keeping the band outside contact.
- [x] **P1.T2: Precedence** — covers: FR-12
  - [ ] P1.T2.1 Doctrine owns intent; temperament shades intensity inside the band and cannot cross its floor or ceiling.
  - [ ] P1.T2.2 Test: `rush` and `slow` on the same doctrine both stay inside the band.
- [x] **P1.T3: Effect and legibility** — covers: FR-15, FR-16
  - [ ] P1.T3.1 Test: Circle yields more rear hits than Press on the same matchup and seed.
  - [ ] P1.T3.2 HUD names the doctrine in force.

## Phase 2: Conditional Rule

**Goal:** one coach's note that overrides the plan in a stated situation.

- **Depends on:** Phase 1
- **Covers:** FR-13, AC-13
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, new `controller-rule.ts`, `apps/client/src/spar/`, `apps/client/src/cup/` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 122b93b2
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-2.md`

- [x] **P2.T1: Rule set** — covers: FR-13
  - [ ] P2.T1.1 Four rules: save the heavy for a break, dodge every telegraph, disengage below a stamina floor, never commit into a startup.
  - [ ] P2.T1.2 Exactly one equipped; an unequipped rule has no effect; a rule returns to the doctrine after firing.
- [x] **P2.T2: Safety** — covers: FR-13
  - [ ] P2.T2.1 An impossible rule (stamina floor with no stamina) holds or strafes instead of deadlocking.

## Phase 3: AI Execution

**Goal:** the controller executes the plan competently and never invents one.

- **Depends on:** Phase 2
- **Covers:** FR-14, AC-14
- **Touches:** `packages/sim/src/battle/continuous/controller*.ts`, `resolve.ts` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 02cc32ec
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-3.md`

- [x] **P3.T1: Spacing** — covers: FR-14
  - [ ] P3.T1.1 Model the opponent's reach and hold just outside it.
- [x] **P3.T2: Punishment** — covers: FR-14
  - [ ] P3.T2.1 Step out of a whiff and commit into its recovery; test proves both halves.
  - [ ] P3.T2.2 Time commitments for recovery and poise breaks rather than raw affordability.
- [x] **P3.T3: Discipline** — covers: FR-14
  - [ ] P3.T3.1 Reserve stamina for a punish window.
  - [ ] P3.T3.2 Bounded pattern memory of the opponent's dodge direction and opening move.

## Phase 4: Damage Band

**Goal:** no blow is a footnote and none decides a fight alone.

- **Depends on:** Phase 3
- **Covers:** FR-1, FR-8, FR-19, AC-1, AC-8, AC-16
- **Touches:** `packages/sim/src/battle/frames.ts`, `moves.ts`, `continuous/damage.ts` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** d02a42fe
- **Evidence:** [phase-4.md](./verification/phase-4.md)

- [x] **P4.T1: Band** — covers: FR-1
  - [ ] P4.T1.1 Author all 49 rows so every move lands between 4% and 12% of the reference pool.
  - [ ] P4.T1.2 Test walks every move and asserts the band; record any tier exception with a reason.
- [x] **P4.T2: Tiers** — covers: FR-8
  - [ ] P4.T2.1 Heavy still costs more stamina, recovers slower and lands harder than light.
- [x] **P4.T3: Per-move cooldown** — covers: FR-19, AC-16
  - [ ] P4.T3.1 Turn the authored `cooldown` tier into a live per-move timer in ms on `FighterState`, mixed into the state hash and decremented by the step.
  - [ ] P4.T3.2 A move on cooldown cannot be committed; the basic strike is always available; a test proves both.
  - [ ] P4.T3.3 Re-measure pacing: cooldown lengthens the attack interval, so report durations and cap share against the 25-40 s band and the one-in-three target.

## Phase 5: Stat Fold and Migration

**Goal:** the sheet shows the numbers the fight uses.

- **Depends on:** Phase 4
- **Covers:** FR-2, FR-3, FR-9, FR-10, AC-2, AC-3
- **Touches:** `packages/sim/src/battle/continuous/hp.ts`, `damage.ts`, `resolve.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/creature.ts`, `packages/sim/src/save/` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 6094903f
- **Evidence:** [phase-5.md](./verification/phase-5.md)

- [x] **P5.T1: Fold** — covers: FR-2
  - [x] P5.T1.1 Fold the HP scale and blow weight into stored stats and move power; no multiplier remains between sheet and resolver.
  - [x] P5.T1.2 Scale the HP training cap with the fold so a fully trained creature is worth the same HP as before, and a trained HP point keeps its value.
- [x] **P5.T2: Migration** — covers: FR-3, FR-9
  - [x] P5.T2.1 Bump `SAVE_VERSION` and add a migration that folds the scale with integer rounding.
  - [x] P5.T2.2 Map old `balanced`/`specials` tactics onto doctrines.
  - [x] P5.T2.3 Measure drift: a pre-change fight versus the same fight after, under 1% per trained HP point.
- [x] **P5.T3: Legacy** — covers: FR-10
  - [x] P5.T3.1 Re-pin every frozen balance suite the fold moves, listed row by row.

## Phase 6: Balance Report Harness

**Goal:** every claim in the spec is one deterministic command.

- **Depends on:** Phase 5
- **Covers:** FR-7, FR-4, FR-5, FR-6, AC-4, AC-5, AC-6, AC-7
- **Touches:** new `packages/sim/scripts/battle-balance-report.ts`, new `packages/sim/src/battle/continuous/balance-report.test.ts`, `package.json`
- **Verification:** `bun run verify && bun run build && bun run balance`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 94bad595
- **Evidence:** [phase-6.md](./verification/phase-6.md)

- [x] **P6.T1: Report** — covers: FR-7
  - [x] P6.T1.1 Report the species matrix, win rates, doctrine effects, damage shares, durations and cap share; state the sample size.
  - [x] P6.T1.2 Exit non-zero naming the violated target.
- [x] **P6.T2: Measurements** — covers: FR-4, FR-5, FR-6
  - [x] P6.T2.1 Species measured under a standard doctrine; doctrines measured separately; mirrors excluded.
  - [x] P6.T2.2 Bosses listed with their documented answer, beatable at stage and not trivially.
  - [x] P6.T2.3 Measure the current roster and record the gaps as the re-tune baseline.

## Phase 7: Chart Symmetry

**Goal:** no element is structurally favoured.

- **Depends on:** Phase 6
- **Covers:** FR-18, AC-10
- **Touches:** `packages/sim/src/battle/chart.ts` + co-located tests
- **Verification:** `bun run verify && bun run build && bun run balance`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** f375e61f
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-7.md`

- [x] **P7.T1: Symmetry** — covers: FR-18
  - [ ] P7.T1.1 Two 3-cycles: fire>plant>water>fire, electric>earth>wind>electric.
  - [ ] P7.T1.2 Test: every element wins exactly once and loses exactly once; the factor stays 1.5x / 0.667x.

## Phase 8: Resolvability

**Goal:** the standard doctrine can actually finish a fight.

- **Depends on:** Phase 7
- **Covers:** FR-20, FR-4, FR-19, AC-17, AC-4
- **Touches:** `packages/sim/src/battle/continuous/{impulse,stamina,cooldown,controller-profile}.ts`, `packages/sim/src/battle/frames.ts` (recovery and poise only), `moves.ts` (power inside the band) + co-located tests
- **Verification:** `bun run verify && bun run build && bun run balance && bun run telemetry`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 8a68c189
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-8.md`

- [x] **P8.T1: Resolve** — covers: FR-20
  - [ ] P8.T1.1 Raise the standard-doctrine knockout majority to at least two in three and hold the cap share at or below one in three, measured with `bun run balance`.
  - [ ] P8.T1.2 Get the median duration strictly below the cap, in the 25-40 s band, without raising `FIGHT_CAP_MS`.
- [x] **P8.T2: Levers** — covers: FR-4
  - [ ] P8.T2.1 Move one lever at a time, recording the measured effect of each (knockback, hitstun, recovery, cooldown, stamina, press profile, power inside the band).
  - [ ] P8.T2.2 Keep the base-hit band at 4-12% and the rear-counter ceiling where they are; the fix is not "more damage per blow".
- [x] **P8.T3: Cooldown durations** — covers: FR-19
  - [ ] P8.T3.1 Replace the provisional Phase 4 cooldown table with tuned values, judged on the matrix and the pacing band.
  - [ ] P8.T3.2 Prove a heavy is still worth carrying: it must out-damage the moves available while it cools, or its cooldown comes down.

## Phase 9: Roster Re-tune

**Goal:** every species is playable.

- **Depends on:** Phase 8
- **Covers:** FR-5, FR-4, FR-6, AC-5, AC-4, AC-6
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/battle/frames.ts`, `moves.ts`, `bosses.ts` + co-located tests
- **Verification:** `bun run verify && bun run build && bun run balance && bun run telemetry`
- **Status:** blocked
- **Result:** blocked on FR-5 — the 56-fight sample is 28 distinct fights counted
  twice, so a truly balanced species fails the +/-5 point band about 60% of the
  time; the remaining spread is kit shape, not stat lines. Superseded by Phase 10
  (variance and a sound gate) and Phase 11 (re-tune).

- [ ] **P9.T1: Species** — covers: FR-5
  - [ ] P9.T1.1 Bring every available species inside 45-55%, adjusting stats and move power only.
- [ ] **P9.T2: Pacing** — covers: FR-4
  - [ ] P9.T2.1 Cap share at or below one in three with a majority inside 25-40 s, held after the species changes.
- [ ] **P9.T3: Bosses** — covers: FR-6
  - [ ] P9.T3.1 Document an answer per boss and prove it at the intended stage.

## Phase 10: Outcome Variance

- **Goal:** a fight varies between seeds, and a replay still repeats exactly.
- **Depends on:** Phase 9
- **Covers:** FR-21, FR-7, AC-18, AC-7
- **Touches:** `packages/sim/src/battle/continuous/strike.ts`, `projectile.ts`, `step.ts`, `advance.ts`, `report.ts`, `packages/sim/scripts/battle-balance-report.ts` + co-located tests
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`, `bun run telemetry` (four separate commands)
- **Status:** pending

- [ ] **P10.T1: Variance** — covers: FR-21
  - [ ] P10.T1.1 Roll every attack against its authored accuracy, and make a miss an observable event with a reason.
  - [ ] P10.T1.2 Add a bounded damage spread that cannot push any base hit past the 12% ceiling.
  - [ ] P10.T1.3 Prove determinism is intact: same seed and sides replay byte-identically, different seeds diverge.
- [ ] **P10.T2: The gate** — covers: FR-7
  - [ ] P10.T2.1 Count independent fights only (unique seeds), and report the sample size and binomial standard error with every row.
  - [ ] P10.T2.2 Replace the point band with a decision rule under which a truly balanced species passes at least 95% of the time, and state the rule in the evidence.
- [ ] **P10.T3: Diversity** — covers: FR-21
  - [ ] P10.T3.1 Report outcome diversity across seeds and bound it, so "varies" is measured rather than assumed.

## Phase 11: Roster Re-tune

- **Goal:** every species is a coin flip, measured on a gate that means something.
- **Depends on:** Phase 10
- **Covers:** FR-5, FR-4, FR-6, AC-5, AC-4, AC-6
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/bosses.ts`, `packages/sim/src/battle/frames.ts` + co-located tests
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`, `bun run telemetry` (four separate commands)
- **Status:** pending

- [ ] **P11.T1: Kit shape and species** — covers: FR-5
  - [ ] P11.T1.1 Make the leading kit rows a tuning lever: which four moves a species leads with, and their cooldown tiers.
  - [ ] P11.T1.2 Bring every species inside the band on the sound gate, justified by mechanism.
- [ ] **P11.T2: Pacing held** — covers: FR-4
  - [ ] P11.T2.1 Prove the resolvability targets and all telemetry bounds still hold after the roster moves.
- [ ] **P11.T3: Bosses** — covers: FR-6
  - [ ] P11.T3.1 Record each boss's intended stage and its measured answer.
- [ ] **P11.T4: Tier order** — covers: FR-19
  - [ ] P11.T4.1 Confirm the ladder still ascends after the re-tune and the heavy still earns its slot.
