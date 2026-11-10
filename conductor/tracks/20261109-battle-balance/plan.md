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
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 39b1b5ef
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-10.md`

- [x] **P10.T1: Variance** — covers: FR-21
  - [ ] P10.T1.1 Roll every attack against its authored accuracy, and make a miss an observable event with a reason.
  - [ ] P10.T1.2 Add a bounded damage spread that cannot push any base hit past the 12% ceiling.
  - [ ] P10.T1.3 Prove determinism is intact: same seed and sides replay byte-identically, different seeds diverge.
- [x] **P10.T2: The gate** — covers: FR-7
  - [ ] P10.T2.1 Count independent fights only (unique seeds), and report the sample size and binomial standard error with every row.
  - [ ] P10.T2.2 Replace the point band with a decision rule under which a truly balanced species passes at least 95% of the time, and state the rule in the evidence.
- [x] **P10.T3: Diversity** — covers: FR-21
  - [ ] P10.T3.1 Report outcome diversity across seeds and bound it, so "varies" is measured rather than assumed.

## Phase 11: Roster Re-tune

- **Goal:** every species is a coin flip, measured on a gate that means something.
- **Depends on:** Phase 10
- **Covers:** FR-5, FR-4, FR-6, AC-5, AC-4, AC-6
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/battle/moves.ts`, `packages/sim/src/bosses.ts`, `packages/sim/src/battle/frames.ts` + co-located tests
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`, `bun run telemetry` (four separate commands)
- **Status:** blocked
- **Result:** blocked - superseded by Phase 12 (measurement) and Phase 13 (re-tune)
- **Why:** the gate cannot see a species' stats. `speciesSide` clamps the reference
  line 189/10/10/10 into each species' `statBounds`, so a stat only registers when its
  bounds exclude 10. Kit shape was therefore the only visible lever, and it is a 20-40
  point cliff in a 15-way round robin: one reorder swung fire_drake 35.7 -> 78.6 and
  earth_tortoise 44.6 -> 17.9 in the same pass, and two coordinate-descent searches only
  reached 12-14/15 at identity-destroying assignments. A probe roster scored 15/15 but
  only by combining kit order with stat deltas the harness cannot express, so it was
  discarded rather than shipped. No files changed; the tree is at `39b1b5ef`.
- **Evidence:** ./verification/phase-11.md

- [ ] **P11.T1: Kit shape and species** — covers: FR-5
  - [ ] P11.T1.1 Make the leading kit rows a tuning lever: which four moves a species leads with, and their cooldown tiers.
  - [ ] P11.T1.2 Bring every species inside the band on the sound gate, justified by mechanism.
- [ ] **P11.T2: Pacing held** — covers: FR-4
  - [ ] P11.T2.1 Prove the resolvability targets and all telemetry bounds still hold after the roster moves.
- [ ] **P11.T3: Bosses** — covers: FR-6
  - [ ] P11.T3.1 Record each boss's intended stage and its measured answer.
- [ ] **P11.T4: Tier order** — covers: FR-19
  - [ ] P11.T4.1 Confirm the ladder still ascends after the re-tune and the heavy still earns its slot.

## Phase 12: Measure the Creature

- **Goal:** the gate can see a species' stats, so a stat is a lever.
- **Depends on:** Phase 10 (checkpoint `39b1b5ef`); Phase 11 is blocked, not a dependency.
- **Covers:** FR-22, AC-19.
- **Touches:** `packages/sim/scripts/battle-balance-report.ts`,
  `packages/sim/src/battle/continuous/balance-report.test.ts`.
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`,
  `bun run telemetry` - four separate commands.
- **Status:** verified
- **Result:** verified
- **Checkpoint:** bf6be3ca
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-12.md`

- [x] **P12.T1: Measure each species at its own typical roll** - covers: FR-22
  - [x] **P12.T1.1:** Build each measured side from that species' `statBounds` midpoint
        (integer midpoint per stat) instead of the clamped reference line, and state the
        definition in the report header.
  - [x] **P12.T1.2:** Keep the equal-investment reference line in the output as a
        diagnostic only - printed, never gating - so "is any species stronger at equal
        investment" stays answerable.
- [x] **P12.T2: Prove a stat is visible to the gate** - covers: AC-19
  - [x] **P12.T2.1:** A test that moves one species' `atk` bounds by 2 and shows its
        measured win rate moves, so a future re-tune can rely on the gate.
  - [x] **P12.T2.2:** Re-baseline every row, re-pin what the new measurement moves, and
        report the new spread with n and the binomial standard error per species.

## Phase 13: Roster Re-tune

- **Goal:** every species is a coin flip, on a gate that can see the whole creature.
- **Depends on:** Phase 12.
- **Covers:** FR-5, FR-4, FR-6, FR-19, AC-5, AC-4, AC-6.
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/battle/moves.ts`,
  `packages/sim/src/bosses.ts`, `packages/sim/src/battle/frames.ts` + co-located tests.
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`,
  `bun run telemetry` - four separate commands.
- **Status:** verified
- **Result:** verified
- **Checkpoint:** c1b460e7
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-13.md`

- [x] **P13.T1: Species into band** - covers: FR-5, AC-5
  - [x] **P13.T1.1:** Bring every species inside 45-55% by stats and kit shape, preferring
        the smaller change and justifying each by mechanism.
  - [x] **P13.T1.2:** Show the whole roster passing the gate - `bun run balance` exits 0.
- [x] **P13.T2: Pacing held** - covers: FR-4, AC-4
  - [x] **P13.T2.1:** Cap share at most one in three, knockout share at least two in three,
        median strictly below `FIGHT_CAP_MS` and inside 25-40 s, all 13 telemetry bounds.
- [x] **P13.T3: Bosses** - covers: FR-6, AC-6
  - [x] **P13.T3.1:** Record each boss's intended stage, what the player brings, and its
        measured win rate; `0 < wins < fights` is the floor, not the target.
- [x] **P13.T4: Tier order** - covers: FR-19
  - [x] **P13.T4.1:** The ladder still ascends and the heavy still earns its slot.

## Phase R1: Review Fixes

- **Goal:** the gate measures what it claims to measure, and the doctrine table shows the
  behaviour the doctrines claim to have.
- **Depends on:** Phase 13 (checkpoint `c1b460e7`).
- **Covers:** FR-5, FR-15, FR-12, FR-13, FR-21, FR-4, AC-5, AC-11.
- **Touches:** `packages/sim/scripts/battle-balance-report.ts`,
  `packages/sim/scripts/battle-telemetry.ts`,
  `packages/sim/src/battle/continuous/{balance-report,telemetry}.test.ts`,
  `packages/sim/src/species/**`, `packages/sim/src/species.test.ts`,
  `packages/sim/src/battle/continuous/{controller-profile,controller-rule,roll}.ts` +
  tests.
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`,
  `bun run telemetry` - four separate commands.
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 7adc8e9b
- **Evidence:** `conductor/tracks/20261109-battle-balance/verification/phase-R1.md`

- [x] **R1.F1: Significance from distinct fights** - covers: FR-5, AC-5
  - [x] **R1.F1.1:** Effective standard error from the distinct-fight count, a stated
        distinct floor, and `UNVERIFIED` as a gate failure rather than a pass.
  - [x] **R1.F1.2:** Make `earth_tortoise` measurable - its fights must resolve rather
        than always reach the cap - and re-check the band and pacing.
- [x] **R1.F2: The doctrine table shows real dodges** - covers: FR-15, AC-11
  - [x] **R1.F2.1:** Count paid dodges rather than projectile evasions, add a separate
        rear column, and assert a non-zero dodge rate for the dodging doctrine.
  - [x] **R1.F2.2:** Explain or fix the Press/Kite engagement-profile overlap with numbers.
- [x] **R1.F3: Spec and artifact agree** - covers: FR-5, AC-5
  - [x] **R1.F3.1:** Amend FR-5/AC-5 to the authorised decision rule with 45-55% as the
        design target, re-word P13.T1.1, and name the out-of-band rows in `KNOWN_MISSES`.
- [x] **R1.F4: Restore the falcon's frailty** - covers: FR-5
  - [x] **R1.F4.1:** Falcon HP ceiling at or below the tortoise's HP floor, re-tuned with
        ATK, SPD or kit shape.
  - [x] **R1.F4.2:** Replace the `durationMin` gate with `durationP05` and keep
        `durationMin` as a diagnostic; restore a non-tautological bulk assertion.
- [x] **R1.F5: Press's floor is a lever or it is not** - covers: FR-12
- [x] **R1.F6: Accuracy debt in the spec** - covers: FR-21
- [x] **R1.F7: keep_back defers to the doctrine's strafe** - covers: FR-13
- [x] **R1.F8: Say which command gates the cap share** - covers: FR-4
- [x] **R1.F9: Correct the duration targets' requirement labels** - covers: FR-4

## Phase R2: Honest Pacing

- **Goal:** the gate tells the truth about pacing, and the distribution actually narrows.
- **Depends on:** Phase R1 (`7adc8e9b`).
- **Covers:** FR-4, FR-20, FR-5, FR-15, AC-4, AC-17, AC-5, AC-11.
- **Touches:** `packages/sim/scripts/{battle-balance-report,battle-telemetry}.ts`,
  `packages/sim/src/battle/continuous/{balance-report,pacing}.test.ts`,
  `packages/sim/src/battle/moves.ts`, `packages/sim/src/species/**`,
  `packages/sim/src/battle/clock.contract.test.ts` + tests.
- **Verification:** `bun run verify`, `bun run build`, `bun run balance`,
  `bun run telemetry` - four separate commands.
- **Status:** verified
- **Result:** verified - the gate is honest and green: cap share 30.0%, decisive share 92.4%, median 31.21 s, p05 14.96 s, damage 49/49, 15/15 species inside the 95% interval, `bun run balance` exit 0 for the first time. The knockout-only band is a printed diagnostic because the owner ruled an outlasting win legitimate. Roster balance is not claimed: 12 of 15 rows sit outside the printed 45-55% design band on intervals 24-28 points wide, recorded as debt that needs the diversity lever first.
- **Checkpoint:** e1d9a9e7
- **Evidence:** conductor/tracks/20261109-battle-balance/verification/phase-R2.md

- [x] **R2.T1: The band counts only resolved fights** - covers: FR-4, AC-4
  - [x] **R2.T1.1:** Carry the ending reason beside each duration and exclude
        `reason === "time"` from the band; print `resolvedInBand` and `capShare`
        separately and set the bound on `resolvedInBand`.
- [x] **R2.T2: The gate gates FR-20** - covers: FR-20, AC-17
  - [x] **R2.T2.1:** Add a `knockoutShare` target (>= two in three) and a
        `medianDuration` target (strictly below `FIGHT_CAP_MS`), both naming FR-20/AC-17,
        with tests that each produces a violation when missed.
- [x] **R2.T3: The miss list names the design-band rows** - covers: FR-5, AC-5
  - [x] **R2.T3.1:** Print the design-band miss list and assert it against a maintained
        array, so a row drifting across 45% or 55% fails the suite.
- [x] **R2.T4: Narrow the distribution** - covers: FR-4, FR-20
  - [x] **R2.T4.1:** Compress the top of the authored ladder so heavy-move fights stop
        ending under 25 s, keeping the tier order strict and every row inside 4-12%.
  - [x] **R2.T4.2:** Reach `capShare` <= 33.3%, a median inside 25-40 s, a fifth
        percentile >= 8 s and a decisive share >= 66.7% at the same time, with the
        knockout-only band printed as a diagnostic.
- [x] **R2.T5: The doctrine dodge column is real** - covers: FR-15, AC-11
  - [x] **R2.T5.1:** Print a dodge rate that differs by doctrine in the doctrine table
        itself, and record the Kite 0/6 result as a finding with a verdict.
- [x] **R2.T6: Correct the record** - covers: FR-10, FR-20
  - [x] **R2.T6.1:** Restore legacy clock knockback coverage or assert its absence
        explicitly; fix the stale comments and the evidence figures.
- [x] **R2.T7: Measure the outlasting win** - covers: FR-20, AC-17
  - [x] **R2.T7.1:** Print the cap-margin distribution and gate a decisive share
        (knockouts plus cap wins above the margin floor) at two in three.
