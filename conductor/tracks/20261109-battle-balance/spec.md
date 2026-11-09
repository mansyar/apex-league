# Battle Agency and Balance — Specification

> Stable IDs. `FR-n`, `NFR-n`, `AC-n`. Do not renumber after approval; mark
> withdrawn items `Withdrawn`.

## Overview

Two changes to the continuous battle engine, in this order. First, give the player
real agency over how a fight is fought — four positioning doctrines, one
conditional rule, and a controller that executes the plan competently instead of
inventing its own. Then, with the controller frozen, balance the numbers underneath
it: a compressed damage band, one stat sheet with no hidden multipliers, and a
roster measured against a stated win-rate target.

## Problem / Motivation

**Agency.** The player chooses species, training and kit, then watches. The only
in-fight input is a two-way tactic that sets two knobs (`preferredRangeMm`,
`aggression`), while strafing and dodge thresholds belong to the creature's
temperament. So flanking and rear hits — the mechanics that let a disadvantaged
element win — are produced by the AI, not by the player. A fire creature beating
water is currently luck, not play. This also contradicts the product's framing:
raising is the game, battles are the exam, but the exam asks the player nothing.

**Balance.** The engine is mechanically sound and numerically wrong.

1. **Fights are bimodal.** 6 of 14 sampled matchups end under 25 s, 6 reach the
   40 s cap, and the median (38.56 s) is an artefact of those two clumps. A basic
   strike deals 2.6-3.2% of a pool while `pyre_lance` deals 22-27%.
2. **The sheet lies.** The arena shows `floor(stats.hp * 210 / 100)` while the
   setup panel shows raw HP/ATK/DEF/SPD, and `BLOW_WEIGHT = 2` multiplies damage
   after the ATK term. Three invisible multipliers mean no outcome is predictable
   from the numbers shown.
3. **The roster has never been measured** against a target.

## Goals & Success Metrics

- The player's doctrine measurably changes where the fight happens and who lands
  rear hits, and the player can attribute a loss to doctrine, rule, kit or training.
- The controller executes the doctrine and never contradicts it.
- No catalog move deals less than 4% or more than 12% of a reference pool.
- Every available species lands within 45-55% across the seeded matrix.
- The arena, setup panel and ranch show one set of stat numbers.
- At most one fight in three is decided at the cap; the majority finish in 25-40 s.
- One deterministic command reports all of the above and fails on a violated target.

## Scope

**In scope**

- Four positioning doctrines replacing the two tactics.
- One conditional rule slot ("coach's note").
- Controller execution work: opponent reach model, whiff punishing, commitment
  timing, stamina discipline, bounded pattern memory.
- Doctrine and rule UI in the spar and cup entry flows.
- Damage band compression across the 49-row catalog.
- Folding `HP_SCALE_PERCENT` and `BLOW_WEIGHT` into stats and move power, with a
  save migration that also maps old tactics onto doctrines.
- Roster re-tune to the win-rate target, and a deterministic balance report.
- Re-pinning the outcome fixtures the changes move.

**Out of scope**

- Real-time player input; the fight stays auto-battled.
- New species, new moves, new elements, new mechanics beyond doctrine and rule.
- Stronger type multipliers; the chart stays at 1.5x / 0.667x (see FR-17).
- Verticality, blocking, ring-out, cover.
- The frozen legacy gauge clock and its replay path.

## Functional Requirements

### Agency

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-11 | Four doctrines replace the two tactics: Press (close, aggressive, minimal strafe), Circle (strafe-heavy, seeks the rear arc), Kite (long range, retreats below it, high dodge), Counter (mid range, waits for startup, punishes recovery). | Must |
| FR-12 | The doctrine decides intent and temperament decides intensity within it: doctrine sets the range band, strafe intent and dodge policy; temperament shades how hard the plan is executed inside that band and may not cross its floor or ceiling. | Must |
| FR-13 | One conditional rule slot overrides the doctrine in a stated situation: save the heavy for a break, dodge every telegraph, disengage below a stamina floor, or never commit into a startup. Exactly one may be equipped. | Must |
| FR-14 | Controller execution improves without changing strategy: it models the opponent's reach, steps out of a whiff and punishes recovery, times commitments for recovery and poise breaks, reserves stamina for punish windows, and remembers the opponent's recent dodge direction and opening move. | Must |
| FR-15 | Each doctrine measurably changes positioning: rear-hit share, median gap and dodge rate differ between doctrines in the report. | Must |
| FR-16 | Every fight is attributable: the HUD names the doctrine in force and the rule that fired, so a loss can be traced to a player decision. | Must |

### Balance

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Every catalog move deals between 4% and 12% of a reference pool, measured on the reference body. | Must |
| FR-2 | Creature stats are the numbers fought: no scale or weight multiplier sits between the stat sheet and the resolver. | Must |
| FR-3 | The HP scale is migrated into stored stats in place, and old `balanced`/`specials` tactics map onto doctrines, so an existing creature keeps fighting. | Must |
| FR-4 | At most one fight in three is decided at the cap, and the majority finish inside 25-40 s. | Must |
| FR-5 | Every available species lands within 45-55% win rate across the seeded matrix, measured under a standard doctrine. | Must |
| FR-6 | Bosses and gatekeepers are excluded from the band, but each must have a documented answer available at its intended stage. | Must |
| FR-7 | One deterministic command reports the matrix, win rates, doctrine effects, damage shares and durations, and fails on a violated target. | Must |
| FR-8 | Damage, poise and stamina tiers stay distinct: a heavy move costs more and lands harder than a light one. | Must |
| FR-9 | The migration preserves each creature's current fight behaviour within a stated, measured tolerance. | Must |
| FR-10 | Folding the weight into power may change legacy gauge-clock outcomes, since legacy ghosts are already skipped at `SIM_VERSION` 2; every frozen balance suite is re-pinned deliberately and listed. | Must |
| FR-17 | The type chart stays at 1.5x / 0.667x. Upsets come from training and positioning, not from weakening or strengthening type. | Must |
| FR-18 | The elemental chart is made symmetric: fire>plant>water>fire and electric>earth>wind>electric, so every element wins once and loses once. | Must |
| FR-19 | Every special carries a real per-move cooldown on the live path, derived from its authored `cooldown` tier, so a special cannot be fired again until its timer expires. The basic strike has no cooldown. Cooldown is per move and separate from recovery and from the shared stamina pool, so a kit is a rotation rather than a best-move button. The specific durations are provisional when the mechanism lands and are owned by the balance phase. | Must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Integer arithmetic only in the step function; one seeded RNG; identical replay hash. |
| NFR-2 | The balance report runs headless, deterministically, and finishes well inside the phase test budget. |
| NFR-3 | New and changed modules stay under the 12 KB per-file guard. |
| NFR-4 | The full suite stays inside the 150 s phase budget. |
| NFR-5 | No network or API change beyond the save version marker. |
| NFR-6 | Doctrines and rules are legible without documentation: the name plus one sentence explains the plan. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-11 | Each doctrine produces a distinct engagement profile, and a test asserts Circle earns strictly more flank-or-rear hits than Press on the same matchup and seed. Rear hits are reported separately and stay rare: the rear arc is reached only when a committed swing is fully punished, so no floor is set on rear hits. | FR-11, FR-15 |
| AC-12 | Temperament changes execution inside the doctrine's band and a test proves it cannot cross the band: a `rush` and a `slow` creature on the same doctrine both stay within its range floor and ceiling. | FR-12 |
| AC-13 | Each rule changes an observable decision, exactly one can be equipped, and an unequipped rule has no effect. | FR-13 |
| AC-14 | A test proves the controller steps out of a whiff and punishes the recovery, and reserves stamina for a break window. | FR-14 |
| AC-15 | The HUD shows the doctrine and the rule that fired for every fight. | FR-16 |
| AC-1 | A test walks all 49 moves and asserts each lands inside 4-12% of the reference pool. | FR-1 |
| AC-2 | No production module reads an HP scale or blow weight. | FR-2 |
| AC-3 | A pre-change save loads, its creature fights within tolerance, old tactics map to doctrines, and the save is written at the new version. | FR-3, FR-9 |
| AC-4 | The report shows cap share at or below one in three and a majority inside 25-40 s. | FR-4 |
| AC-5 | The report shows every available species inside 45-55%, and fails when one is not. | FR-5 |
| AC-6 | Every boss is listed with its documented answer and is beatable at its stage, not trivially. | FR-6 |
| AC-7 | The report is one command, deterministic across runs, exiting non-zero naming the violated target. | FR-7 |
| AC-8 | A test asserts a heavy move costs more stamina, recovers slower and lands harder than a light one. | FR-8 |
| AC-9 | `bun run verify`, `bun run build`, `bun run telemetry` and the report all pass. | FR-1..18 |
| AC-10 | The chart is symmetric: every element has exactly one win and one loss. | FR-18 |
| AC-16 | A special cannot be committed again before its cooldown expires, the basic strike is always available, and within the damage band every special hits strictly harder than the basic with the tiers strictly ordered. | FR-1, FR-8, FR-19 |

## Edge Cases

- **Doctrine versus temperament.** The doctrine owns intent; temperament shades
  intensity inside the doctrine's band and may not cross its floor or ceiling.
  A `rush` creature on Kite still kites — it kites harder, not closer.
- **Temperament must stay reachable.** After the split it still decides commit
  eagerness, dodge eagerness and strafe intensity within the band, so a creature's
  personality is visible in play rather than decorative.
- **Rule versus doctrine.** A rule fires inside the doctrine's plan and returns to
  it afterwards; a rule may not silently become a second doctrine. Precedence is
  specified and tested.
- **Impossible rule.** "Disengage below 30% stamina" against a creature with no
  stamina left must not deadlock the controller; it holds or strafes.
- **Circle at the fence.** Seeking the rear arc can corner the fighter; it must
  release and re-approach rather than oscillating against the boundary.
- **Mirror doctrine.** Both sides choosing Circle must not orbit forever; the
  report asserts fights still resolve.
- **Old saves** store `balanced`/`specials`; both must map onto a doctrine, or a
  loading player has no plan.
- **Boss doctrine.** Bosses use doctrines too, and their documented answer must be
  stated in terms of a doctrine a player of that stage can have.
- **Trained HP pays 4.2 per point** (`hp + 2 * trained.hp`, then the 210% scale).
  Exact preservation is impossible; FR-9 requires the drift be measured, not
  asserted.
- **`BLOW_WEIGHT` is shared with the frozen legacy clock** via `strikeDamage`;
  folding it into power moves legacy outcomes too (FR-10).
- **Matrix cost** grows quadratically; the report samples a fixed seeded subset per
  species and states the sample size.
- **Mirror matches** are excluded from the win-rate matrix.
- **Species with one available form** still appear in the matrix.
- **Form and affinity** must not be folded away while unifying the sheet.
- **Doctrine must not masquerade as species strength**: species are measured under
  a standard doctrine, doctrines measured separately.
- **In-flight cup save** must complete after the migration.
- **Legacy ghosts** stay on `SIM_VERSION` 2 handling: skipped, not migrated.
- **A move that cannot reach 4% without breaking its tier** is a recorded
  exception with a reason.

## Dependencies

- **Tracks:** none open. Builds on the merged engine and spacing/cadence tracks.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the reference pool for FR-1 is default body against default body
  at the reference stat line.
- **Assumption:** 45-55% is reachable through stats, move power and doctrines; if
  not, that is a reported finding rather than a reason to change the engine.
- **Assumption:** the controller stabilises before any balance number is measured,
  which is why agency phases precede balance phases.
- **Resolved (2026-11-09, owner):** FR-9 tolerance is integer rounding with
  measured drift under 1% per trained HP point; scaled storage rejected.
- **Resolved (2026-11-09, owner):** upsets come from training plus positioning;
  the chart stays weak at 1.5x/0.667x and training stays at `TRAINING_CAP` 6.
- **Resolved (2026-11-09, owner):** agency is doctrine plus one conditional rule;
  controller improvements are execution-only, never adaptive strategy.
- **Resolved (2026-11-09, owner):** specials hit harder than the basic strike and
  pay for it with a per-move cooldown derived from the authored 1/2/3 tier, held on
  `FighterState` and mixed into the state hash. Cooldown is separate from recovery
  and from the shared stamina pool, so a kit is a rotation rather than a
  best-move button; the basic strike is always available.
- **Resolved (2026-11-09, owner):** an angle is earned by a step-around burst
  (2.5x walk, 150-200 ms, own stamina price) against a body whose turn rate
  depends on what it is doing: free when idle, reduced in startup and recovery,
  zero in the active window and in hitstun. Measured angular gain is 2.86 deg per
  step for the cut against 0.69 during startup or recovery, so one full basic
  swing earns at most 88.9 deg and the >120 deg rear arc is not reachable inside
  a single commitment. Rear therefore stays a rare crit and AC-11 measures
  flank-or-rear hits, which the mechanic does reach.

## References

- `conductor/product.md` — battle system, ladder, species roster.
- `conductor/workflow.md` — verification layers and commands.
- `conductor/archive/20261109-battle-spacing-cadence/spec.md` — deferred follow-ups.
- `packages/sim/src/battle/continuous/controller*.ts` — profile, aim, moves, threat.
- `packages/sim/src/battle/continuous/{damage,hp,resolve}.ts` — the multipliers.
- `packages/sim/src/battle/frames.ts`, `moves.ts` — power and frame data.
- `packages/sim/src/save/{schema,migrate}.ts` — `SAVE_VERSION` and the chain.
- `packages/sim/src/bosses.ts` — boss definitions and pinned kits.
