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
- **Status:** in_progress

- [ ] **P1.T1: Doctrine model** — covers: FR-11
  - [ ] P1.T1.1 Replace the two tactics with four frozen doctrines: Press, Circle, Kite, Counter.
  - [ ] P1.T1.2 Derive each doctrine's range band from the reach edge, keeping the band outside contact.
- [ ] **P1.T2: Precedence** — covers: FR-12
  - [ ] P1.T2.1 Doctrine owns intent; temperament shades intensity inside the band and cannot cross its floor or ceiling.
  - [ ] P1.T2.2 Test: `rush` and `slow` on the same doctrine both stay inside the band.
- [ ] **P1.T3: Effect and legibility** — covers: FR-15, FR-16
  - [ ] P1.T3.1 Test: Circle yields more rear hits than Press on the same matchup and seed.
  - [ ] P1.T3.2 HUD names the doctrine in force.

## Phase 2: Conditional Rule

**Goal:** one coach's note that overrides the plan in a stated situation.

- **Depends on:** Phase 1
- **Covers:** FR-13, AC-13
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, new `controller-rule.ts`, `apps/client/src/spar/`, `apps/client/src/cup/` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P2.T1: Rule set** — covers: FR-13
  - [ ] P2.T1.1 Four rules: save the heavy for a break, dodge every telegraph, disengage below a stamina floor, never commit into a startup.
  - [ ] P2.T1.2 Exactly one equipped; an unequipped rule has no effect; a rule returns to the doctrine after firing.
- [ ] **P2.T2: Safety** — covers: FR-13
  - [ ] P2.T2.1 An impossible rule (stamina floor with no stamina) holds or strafes instead of deadlocking.

## Phase 3: AI Execution

**Goal:** the controller executes the plan competently and never invents one.

- **Depends on:** Phase 2
- **Covers:** FR-14, AC-14
- **Touches:** `packages/sim/src/battle/continuous/controller*.ts`, `resolve.ts` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P3.T1: Spacing** — covers: FR-14
  - [ ] P3.T1.1 Model the opponent's reach and hold just outside it.
- [ ] **P3.T2: Punishment** — covers: FR-14
  - [ ] P3.T2.1 Step out of a whiff and commit into its recovery; test proves both halves.
  - [ ] P3.T2.2 Time commitments for recovery and poise breaks rather than raw affordability.
- [ ] **P3.T3: Discipline** — covers: FR-14
  - [ ] P3.T3.1 Reserve stamina for a punish window.
  - [ ] P3.T3.2 Bounded pattern memory of the opponent's dodge direction and opening move.

## Phase 4: Damage Band

**Goal:** no blow is a footnote and none decides a fight alone.

- **Depends on:** Phase 3
- **Covers:** FR-1, FR-8, AC-1, AC-8
- **Touches:** `packages/sim/src/battle/frames.ts`, `moves.ts`, `continuous/damage.ts` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P4.T1: Band** — covers: FR-1
  - [ ] P4.T1.1 Author all 49 rows so every move lands between 4% and 12% of the reference pool.
  - [ ] P4.T1.2 Test walks every move and asserts the band; record any tier exception with a reason.
- [ ] **P4.T2: Tiers** — covers: FR-8
  - [ ] P4.T2.1 Heavy still costs more stamina, recovers slower and lands harder than light.

## Phase 5: Stat Fold and Migration

**Goal:** the sheet shows the numbers the fight uses.

- **Depends on:** Phase 4
- **Covers:** FR-2, FR-3, FR-9, FR-10, AC-2, AC-3
- **Touches:** `packages/sim/src/battle/continuous/hp.ts`, `damage.ts`, `resolve.ts`, `packages/sim/src/save/` + co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P5.T1: Fold** — covers: FR-2
  - [ ] P5.T1.1 Fold the HP scale and blow weight into stored stats and move power; no multiplier remains between sheet and resolver.
- [ ] **P5.T2: Migration** — covers: FR-3, FR-9
  - [ ] P5.T2.1 Bump `SAVE_VERSION` and add a migration that folds the scale with integer rounding.
  - [ ] P5.T2.2 Map old `balanced`/`specials` tactics onto doctrines.
  - [ ] P5.T2.3 Measure drift: a pre-change fight versus the same fight after, under 1% per trained HP point.
- [ ] **P5.T3: Legacy** — covers: FR-10
  - [ ] P5.T3.1 Re-pin every frozen balance suite the fold moves, listed row by row.

## Phase 6: Balance Report Harness

**Goal:** every claim in the spec is one deterministic command.

- **Depends on:** Phase 5
- **Covers:** FR-7, FR-4, FR-5, FR-6, AC-4, AC-5, AC-6, AC-7
- **Touches:** new `packages/sim/scripts/battle-balance-report.ts`, new `packages/sim/src/battle/continuous/balance-report.test.ts`, `package.json`
- **Verification:** `bun run verify && bun run build && bun run balance`
- **Status:** pending

- [ ] **P6.T1: Report** — covers: FR-7
  - [ ] P6.T1.1 Report the species matrix, win rates, doctrine effects, damage shares, durations and cap share; state the sample size.
  - [ ] P6.T1.2 Exit non-zero naming the violated target.
- [ ] **P6.T2: Measurements** — covers: FR-4, FR-5, FR-6
  - [ ] P6.T2.1 Species measured under a standard doctrine; doctrines measured separately; mirrors excluded.
  - [ ] P6.T2.2 Bosses listed with their documented answer, beatable at stage and not trivially.
  - [ ] P6.T2.3 Measure the current roster and record the gaps as the re-tune baseline.

## Phase 7: Chart Symmetry

**Goal:** no element is structurally favoured.

- **Depends on:** Phase 6
- **Covers:** FR-18, AC-10
- **Touches:** `packages/sim/src/battle/chart.ts` + co-located tests
- **Verification:** `bun run verify && bun run build && bun run balance`
- **Status:** pending

- [ ] **P7.T1: Symmetry** — covers: FR-18
  - [ ] P7.T1.1 Two 3-cycles: fire>plant>water>fire, electric>earth>wind>electric.
  - [ ] P7.T1.2 Test: every element wins exactly once and loses exactly once; the factor stays 1.5x / 0.667x.

## Phase 8: Roster Re-tune

**Goal:** every species is playable.

- **Depends on:** Phase 7
- **Covers:** FR-5, FR-4, AC-5, AC-4
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/battle/frames.ts`, `moves.ts`, `bosses.ts` + co-located tests
- **Verification:** `bun run verify && bun run build && bun run balance && bun run telemetry`
- **Status:** pending

- [ ] **P8.T1: Species** — covers: FR-5
  - [ ] P8.T1.1 Bring every available species inside 45-55%, adjusting stats and move power only.
- [ ] **P8.T2: Pacing** — covers: FR-4
  - [ ] P8.T2.1 Cap share at or below one in three with a majority inside 25-40 s.
- [ ] **P8.T3: Bosses** — covers: FR-6
  - [ ] P8.T3.1 Document an answer per boss and prove it at the intended stage.
