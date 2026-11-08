# Phase 1 — Measure the Clinch

**Track:** `20261109-battle-spacing-cadence`
**Branch:** `feat/20261109-battle-spacing-cadence`
**Date:** 2026-11-09
**Scope:** measurement only. No profile, cost, cadence or frame value was changed.

## Commands

| Command | Exit | Note |
| --- | --- | --- |
| `bun run telemetry` | denied | The shell policy rejects the command. The baseline below is the identical `measure()` report printed by `telemetry.test.ts` inside `bun run verify`; the primary can re-run the readable command. |
| `bun run verify` | 1 | Types clean, `3,802 pass / 1 skip / 0 fail`. Biome reports one error, on `conductor/tracks/20261109-battle-spacing-cadence/metadata.json` (Conductor state, not this phase's file; the primary must format it). No source or test file in this phase fails. |
| `bun run build` | 0 | Vite built 398 modules in 440 ms. |

## Baseline — 14 seeded matchups

Sample: the same 14 matchups and seeds `pacing.test.ts` pins, through
`resolveContinuous`, reference stat line `hp 90 / atk 10 / def 10 / spd 10`
clamped into each species' roll bounds.

| Metric | Observed | Harness bound | Spec target |
| --- | --- | --- | --- |
| Engagement min | 379 mm | ≤ 900 mm | — |
| Engagement median | 539 mm | ≤ 1500 mm | ≥ 900 mm (AC-1) |
| Engagement max | 3984 mm | ≤ 4500 mm | — |
| Attack rate, home | 1.99/s | ≤ 2.50/s | ≤ 0.70/s (AC-4) |
| Attack rate, away | 1.79/s | ≤ 2.50/s | ≤ 0.70/s (AC-4) |
| Attack rate, combined | 3.78/s | reported | — |
| Idle share | 31.4% | ≤ 40% | — |
| Contact share | 54.8% | ≤ 70% | < 40% (AC-2) |
| Retreats, home | 686 orders | ≥ 14 orders | ≥ 1 per fight (AC-3) |
| Retreats, away | 1328 orders | ≥ 14 orders | ≥ 1 per fight (AC-3) |
| Distinct positions | min 45, median 91 cells | ≥ 30 cells | — |
| Cap share | 6/14 (42.9%) | ≤ 50% | ≤ 1/3 (AC-7) |
| Fight length | 25.28–40.00 s | reported | 25–40 s (AC-7) |

### Per-fight rows

| # | Matchup | Time | Ending | Blows | Commits | Gap min/med/max | Cells | Idle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | fire_drake v earth_tortoise | 40.00 s | time | 85-85 | 85-86 | 558/562/3984 | 102-91 | 36.1% |
| 2 | plant_ox v embercub | 29.24 s | ko | 46-59 | 46-59 | 499/538/3984 | 92-90 | 36.9% |
| 3 | water_axolotl v electric_hound | 27.20 s | ko | 46-59 | 46-60 | 439/450/3984 | 83-66 | 22.2% |
| 4 | electric_hound v earth_tortoise | 40.00 s | time | 91-38 | 92-38 | 539/542/3984 | 123-121 | 22.8% |
| 5 | fernstag v embercub | 25.28 s | ko | 53-55 | 53-56 | 479/503/3984 | 66-82 | 38.2% |
| 6 | wind_falcon v water_axolotl | 29.60 s | ko | 67-53 | 68-53 | 389/415/3984 | 91-89 | 22.2% |
| 7 | reefclaw v earth_tortoise | 40.00 s | time | 54-84 | 55-86 | 579/616/3984 | 116-45 | 40.3% |
| 8 | earth_tortoise v embercub | 40.00 s | time | 66-85 | 67-86 | 482/541/3984 | 94-111 | 37.0% |
| 9 | cindermoor v water_axolotl | 34.40 s | ko | 74-57 | 74-57 | 439/508/3984 | 89-110 | 25.9% |
| 10 | voltfox v earth_tortoise | 39.68 s | ko | 90-58 | 90-58 | 509/520/3984 | 137-82 | 38.4% |
| 11 | galeheron v embercub | 40.00 s | time | 61-55 | 62-57 | 379/465/3984 | 201-136 | 35.4% |
| 12 | shalemole v water_axolotl | 39.68 s | ko | 88-69 | 89-69 | 419/468/3984 | 50-87 | 22.4% |
| 13 | embercub v earth_tortoise | 40.00 s | time | 85-66 | 86-67 | 482/541/3984 | 111-93 | 37.0% |
| 14 | mossboar v embercub | 38.48 s | ko | 86-71 | 87-71 | 469/478/3984 | 60-90 | 22.2% |

## Reading

**Spacing is contact, not reach.** The median centre-to-centre gap is **539 mm**
against body-radius sums of roughly 440–560 mm, so the typical fight step has
the two bodies inside each other's silhouette. Contact share confirms it
directly: **54.8%** of fight time is spent inside both radii plus 40 mm. The
379 mm minimum is real overlap, not staging; the 3984 mm maximum is the opening
pose at stream index 0. The preferred ranges themselves (450 / 550 / 650 mm,
then ±300 mm from the tactic overlay and floored at 400 mm) are centred on the
contact band, so the controller is trying to hold a distance at which the bodies
already touch. Moving the preferred range out toward the reach edge (Phase 2) is
the change that can move the median, not a new verb.

**Cadence is sustained, not intermittent.** Both sides commit **3.78 attacks per
second combined** (1.99 home, 1.79 away). A basic strike is 280 ms and the
controller re-decides every 120 ms, so a recovery that ends before the next
decision window is immediately re-committed. The spec's 0.70/s ceiling is about
five times below the measured rate; a decision cadence and a binding stamina
pool (Phase 3) both have to move for the rate to fall that far.

**Retreats fire, but they do not make space.** The sample issues **2,014 retreat
orders** (686 home, 1,328 away) — far from "nobody retreats". What the count
shows is oscillation: the inner edge of the band is `preferred − 400 mm`, which
for the slower and tactic-boosted rows sits at or inside the contact distance.
The fighter retreats the moment it touches, then advances again as soon as the
gap leaves that inner edge. The result is a clinch shimmy: the verb fires
constantly while the median stays at 539 mm and contact stays at 54.8%. The
count also is not uniform — at least one sampled fight orders no retreat at all,
so AC-3's "one per fight" is not yet true even though the sample total is large.

**Pacing is close but the cap share is high.** Fight length is already inside the
25–40 s band (25.28–40.00 s), but **6 of 14 (42.9%)** end at `FIGHT_CAP_MS`,
above the one-in-three goal. Idle time is 31.4%, so the fights are not stalled;
they are long because the exchanges are dense and the damage is small.

**What Phase 2 and Phase 3 must move.** Phase 2 must put the preferred range at
the reach edge and make the retreat threshold meaningful; the baseline shows the
verb exists but the geometry makes it ineffective. Phase 3 must slow the
decision cadence and make stamina bind; the baseline shows the attack rate is
roughly three to five times the target and that neither the 280 ms strike nor the
120 ms decision window currently stops a re-commit.

## Acceptance criteria at baseline

| AC | Baseline | Status |
| --- | --- | --- |
| AC-1: median engagement ≥ 900 mm | 539 mm | not met (expected before tuning) |
| AC-2: contact < 40% of fight time | 54.8% | not met (expected before tuning) |
| AC-4: attack rate ≤ 0.70/s per side | 1.99/s, 1.79/s | not met (expected before tuning) |
| AC-3: ≥ 1 retreat order per fight | 2,014 total; not every fight | partly observable; the order is now counted |

## Deviations

No file outside `Touches` was changed. The two existing exchange bounds changed
from a floor (`>= 1/s`) to a ceiling (`<= 2.5/s`): the metric is now the attack
rate FR-3 and FR-4 constrain, and a floor would contradict the target. The
metric name and the `ok <metric>: observed ..., bound ...` report format are
unchanged.

## Notes

- **Retreat measurement.** The stream records positions and attack phases, not
  the controller verb, so the harness replays the resolver's own loop with the
  same `initFor` orders, `engagementFor` profiles, `createController` brains and
  `createFight` step. The replay must land on the resolver's step count and hit
  points or `measureFight` throws, so the tally cannot describe a different
  fight.
- **New bounds.** Contact share ≤ 70%, retreats ≥ 14 orders per side (one per
  fight over the sample), attack rate ≤ 2.50/s per side. Each `why` carries the
  measured value; Phase 4 tightens them to the spec targets after tuning.
- **Contact definition.** Both body radii are read through the same
  branch → species → archetype path the resolver uses (`radiusOf`), plus 40 mm.
  The per-step gap is the rounded centre-to-centre distance already reported.
- `bun run telemetry` was denied by the shell policy. The numbers above are the
  same `measure()` output, printed by `telemetry.test.ts` under `bun run verify`.
- `bun run verify` fails only on the pre-existing `metadata.json` formatting in
  the track directory, which this phase is not allowed to edit.
