# Phase 2 — Spacing

**Track:** `20261109-battle-spacing-cadence`
**Branch:** `feat/20261109-battle-spacing-cadence`
**Date:** 2026-11-09
**Scope:** preferred range and the retreat rule. No cadence, stamina, frame or
`HP_SCALE_PERCENT` value was changed.

## Commands

| Command | Exit | Note |
| --- | --- | --- |
| `bun run verify` | 1 | Types clean, **3,794 pass / 1 skip / 14 fail**. No failure is in a file this phase owns; every one is an outcome pin Phase 3/4 moves. See *Failures* below. |
| `bun run build` | 0 | Vite built 398 modules in 332 ms. |
| `bun run telemetry` | denied | The shell policy rejects the command (as in Phase 1). The after-table below is the identical `measure()` report printed by `telemetry.test.ts` inside `bun run verify`; the primary can re-run the readable command. |

The module-size guard was the one in-scope failure on the first pass
(`resolve.ts` 12,457 B, 169 B over) and is green again (doc text tightened, no
behaviour change).

## The change

### New tunables

| Name | Module | Value | Meaning |
| --- | --- | --- | --- |
| `PREFERRED_REACH_BAND_PERMILLE` | `controller-profile.ts` | `500` | How far above the reach edge the calmest row may hold, in permille of the edge: 500 puts the top of the band at 1.5x the edge (FR-1). |
| `REFERENCE_REACH_EDGE_MM` | `controller-profile.ts` | `860` | The innate strike's authored reach (420 mm) plus two default radii (2 x 220 mm). Rows are authored at this edge. |
| `RETREAT_FRACTION_PERMILLE` | `controller.ts` | `600` | A fighter closer than 0.6x its preferred range retreats (FR-2). |
| `RETREAT_ROOM_RADII` | `controller.ts` | `2` | A retreat needs at least two body radii of open floor behind it, or the fighter holds/circles instead. |

The tactic overlays stopped being millimetre offsets and became permille
multipliers, because a fixed offset no longer means anything against a derived
range:

| Tactic | Before | After |
| --- | --- | --- |
| `balanced` | `rangeMm: -300` | `rangePermille: 950` |
| `specials` | `rangeMm: +300` | `rangePermille: 1150` |

`aggression` overlays are unchanged (`-10` / `+10`).

### Preferred range

`preferredRangeFor(profile, reachEdge)` is
`max(reachEdge, trunc(profile.preferredRangeMm * reachEdge / REFERENCE_REACH_EDGE_MM))`,
and `reachEdgeMm(me, foe)` is the innate strike's reach plus both body radii.
Each row is authored at the reference edge through its existing `aggression`
field:

```
above = trunc((100 - aggression) * PREFERRED_REACH_BAND_PERMILLE / 100)
preferredMm = trunc(REFERENCE_REACH_EDGE_MM * (1000 + above) / 1000)
```

| Row | Aggression | Preferred at the 860 mm reference edge | At a 1,000 mm pair edge |
| --- | --- | --- | --- |
| `rush` | 85 | 924 mm | 1,074 mm |
| `obedient` | 75 | 967 mm | 1,124 mm |
| `slow` | 60 | 1,032 mm | 1,200 mm |

All three stay strictly ordered `rush < obedient < slow` and every row exceeds
`RANGE_BAND_MM` (the existing table test still passes). Each sits between its
own reach edge and 1.5x it; a large body pair is held at the same share of its
own reach rather than at a fixed millimetre count.

### The retreat rule

```
preferred = preferredRangeFor(profile, reachEdgeMm(me, foe))
threshold = controller.verb === "retreat" ? preferred : 0.6 x preferred
if gap < threshold:
    if retreatRoom(me, awayFrom(me, foe), bounds) >= 2 x me.radiusMm:
        order "retreat" (away from the foe)
    else:
        press slot -> commit, otherwise circle (never a step into the fence)
```

- **Fires at crowding, not at contact.** The old inner edge was
  `preferred - RANGE_BAND_MM`, which sat inside the bodies. 0.6x the preferred
  range is the band in which the pair is too close to fight from.
- **Hysteresis, no oscillation.** Once `retreat` is the held verb the threshold
  rises to the preferred range, so the fighter keeps giving ground until it has
  the range it wanted; it cannot re-close on the next 120 ms window and
  re-trigger. This is the fix for the 2,014 baseline retreats at a 539 mm
  median.
- **Never into a fence.** `retreatRoom` (in `controller-aim.ts`) measures the
  open floor along the retreat direction, scaled per axis by the unit
  direction's component. Less than two radii of room means the cornered fighter
  takes its press slot or circles instead, so it cannot shiver against the wall.
- **Observable.** The order is the existing `ControllerDecision.verb`, so the
  decision report and the telemetry replay count it unchanged.

## Before / after — 14 seeded matchups

Same sample, seeds and stat line as `pacing.test.ts` and Phase 1.

| Metric | Baseline (Phase 1) | After | Harness bound | Spec target |
| --- | --- | --- | --- | --- |
| Engagement min | 379 mm | **389 mm** | <= 900 mm | — |
| Engagement median | 539 mm | **880 mm** | <= 1500 mm | >= 900 mm (AC-1) |
| Engagement max | 3984 mm | **3984 mm** | <= 4500 mm | — |
| Attack rate, home | 1.99/s | **1.20/s** | <= 2.50/s | <= 0.70/s (AC-4) |
| Attack rate, away | 1.79/s | **1.13/s** | <= 2.50/s | <= 0.70/s (AC-4) |
| Attack rate, combined | 3.78/s | **2.33/s** | reported | — |
| Idle share | 31.4% | **27.9%** | <= 40% | — |
| Contact share | 54.8% | **2.9%** | <= 70% | < 40% (AC-2) |
| Retreats, home | 686 | **4,072** | >= 14 | >= 1 per fight (AC-3) |
| Retreats, away | 1,328 | **4,810** | >= 14 | >= 1 per fight (AC-3) |
| Distinct positions | min 45 / median 91 | **min 40 / median 112** | >= 30 | — |
| Cap share | 6/14 (42.9%) | **7/14 (50.0%)** | <= 50% | <= 1/3 (AC-7) |
| Fight length | 25.28–40.00 s | **16.16–40.00 s** | reported | 25–40 s (AC-7) |

Reading the movement:

- **Spacing is real.** Contact share fell from 54.8% to **2.9%** and the median
  engagement nearly doubled to 880 mm. The median is just short of AC-1's
  900 mm; the remaining gap is a tuning question for Phase 4 (the band is a
  named tunable), not a structural one.
- **The retreat verb now means something.** The per-step tally rose because a
  retreat is now a sustained order that is held across many steps instead of a
  one-step twitch; the count is a count of ordered steps, not of new decisions.
  AC-3's "at least one per fight" holds in every sampled fight.
- **Attack rate halved** without touching cadence, stamina or frame data: the
  fighters now spend the fight at the edge of reach instead of inside it, so
  fewer windows resolve in range. It is still above the 0.70/s target, which is
  Phase 3's job.
- **Fight length is the casualty.** Two fights (wind_falcon v water_axolotl at
  16.16 s, electric_hound v earth_tortoise at 20.82 s) fall below the 25 s
  floor and the KO share is 7/14. Spacing made the glass cannons lethal at
  range; cadence and stamina (Phase 3) are the intended fix, and P4.T2 owns the
  band. This is reported, not papered over.

### Per-fight rows after

| # | Matchup | Time | Ending | Blows | Commits | Gap min/med/max | Cells | Idle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | fire_drake v earth_tortoise | 40.00 s | time | 38-41 | 55-42 | 559/784/3984 | 110-75 | 34.9% |
| 2 | plant_ox v embercub | 31.98 s | ko | 30-30 | 32-42 | 500/942/3984 | 149-130 | 24.1% |
| 3 | water_axolotl v electric_hound | 40.00 s | time | 53-20 | 58-45 | 440/781/3984 | 183-154 | 24.4% |
| 4 | electric_hound v earth_tortoise | 20.82 s | ko | 10-19 | 25-19 | 540/982/3984 | 43-40 | 37.5% |
| 5 | fernstag v embercub | 32.84 s | ko | 38-27 | 44-39 | 481/888/3984 | 136-113 | 24.5% |
| 6 | wind_falcon v water_axolotl | 16.16 s | ko | 9-22 | 19-22 | 459/804/3984 | 73-79 | 28.2% |
| 7 | reefclaw v earth_tortoise | 40.00 s | time | 44-14 | 47-28 | 632/1026/3984 | 236-158 | 38.0% |
| 8 | earth_tortoise v embercub | 40.00 s | time | 28-27 | 44-48 | 500/766/3984 | 73-104 | 31.1% |
| 9 | cindermoor v water_axolotl | 21.96 s | ko | 21-21 | 28-28 | 588/1155/3984 | 68-83 | 21.4% |
| 10 | voltfox v earth_tortoise | 30.08 s | ko | 39-24 | 39-32 | 600/1037/3984 | 87-45 | 26.7% |
| 11 | galeheron v embercub | 40.00 s | time | 38-31 | 41-42 | 389/875/3984 | 235-145 | 23.7% |
| 12 | shalemole v water_axolotl | 40.00 s | time | 27-55 | 49-57 | 476/922/3984 | 196-245 | 20.6% |
| 13 | embercub v earth_tortoise | 40.00 s | time | 27-28 | 48-44 | 500/766/3984 | 104-73 | 31.1% |
| 14 | mossboar v embercub | 29.94 s | ko | 20-30 | 29-35 | 471/944/3984 | 119-135 | 23.1% |

## Failures — every one is an outcome pin, none is in a file this phase owns

`bun run verify` stops at the test step, so `biome check` and
`gate:determinism` did not run in this pass. `bun run check` (types) passed and
the controller suite is green, including the five new spacing tests.

### Pacing (`packages/sim/src/battle/continuous/pacing.test.ts`) — Phase 3/4

| Line | Pin | Before | Observed after |
| --- | --- | --- | --- |
| 126 | every fight 25,000–40,000 ms | 25.28–40.00 s | **16.16–40.00 s** (wind_falcon v water_axolotl; electric_hound v earth_tortoise 20.82 s) |
| 139 | a majority ends by KO (> 7/14) | 8/14 | **7/14** |

### Double KO (`packages/sim/src/battle/continuous/resolve.test.ts`) — Phase 4

| Line | Pin | Before | Observed after |
| --- | --- | --- | --- |
| 189 | seed 1 gunner v swinger(26) is a `double_ko` | `double_ko` | **`ko`** — the shot and the killing blow no longer land on the same step; the structural double-KO coverage needs a new seed (P4.T3). |

### Cup, bracket, ghost and view-model goldens — Phase 4 (P4.T3)

All of these are the same cause: under the new spacing the player creature wins
more, so the pinned elimination seeds no longer eliminate. Every row that must
be re-pinned:

| File:line | Row | Before | Observed after |
| --- | --- | --- | --- |
| `apps/client/src/bracket-model.test.ts:257` | seed 5, `specials`, SF1 verdict | QF exit, SF1 is a completion match | player reaches the final |
| `apps/client/src/bracket-model.test.ts:550` | seed 5, `specials`, `cupPlacement` | `4` (quarterfinal) | **`2`** (final) |
| `packages/sim/src/cup-contracts.test.ts:220` | seed 1 rival verdicts, first row | `Tidecaller Nibbles` | **`Reedle Mirefin`** |
| `packages/sim/src/cup-contracts.test.ts:253` | seed 17, `balanced`, status | `eliminated` | **`champion`** |
| `packages/sim/src/cup-contracts.test.ts:290` | seed 5, `specials`, player verdicts | length `1` (QF exit) | **length `3`** (final) |
| `packages/sim/src/cup-contracts.test.ts:308` | seed 101 forfeit, champion | `Tidecaller Nibbles` | **`Mossbottom Brute`** |
| `packages/sim/src/cup.golden.test.ts:292` | seed 17 champion path, rival verdicts | `Emberhold Flicker` takes the Quarterfinal | **`Mossbottom Brute`** takes the Quarterfinal |
| `packages/sim/src/cup.golden.test.ts:429` | seed 101 forfeit, champion | `Tidecaller Nibbles` | **`Reedle Mirefin`** |
| `apps/client/src/cup/view-models.test.ts:98` | elimination exit stage | `out in the quarterfinal` | **`out in the final`** |
| `apps/client/src/cup/ghost-capture.test.ts:73` | seed 5 session is finished | `completeCup` succeeds | **throws** "The player is still live in this cup" |
| `packages/sim/src/cup/ghost.test.ts:85` | seed 5, `specials`, status | `eliminated` | **`player-turn`** (still live) |

These are authored balance expectations (who wins a cup, from which round the
player exits), which is a product decision and P4.T3's job; this phase did not
re-pin them.

## Deviations

No file outside `Touches` was changed. `controller-aim.ts` is in `Touches` and
holds the new `retreatRoom`; `resolve.ts` changed only the tactic-overlay block
(the `rangeMm` field became `rangePermille`, and `engagementFor` applies it as a
share) so a tactic cannot push the derived band back inside the bodies.

## Notes

- **Retreat tally.** `retreatsOf` counts ordered steps, and the controller holds
  a verb between decisions; a sustained retreat therefore adds ~6 to the tally
  per decision, which is why the count is much larger than the 686/1,328
  baseline. The meaningful change is that a retreat now lasts until the range is
  restored. `retreatHome`/`retreatAway` bounds (>= 14) still pass.
- **Determinism.** Nothing here reads wall time, draws a random number or
  rounds through a float: the new arithmetic is `Math.trunc`/`Math.min` on
  integers and the existing integer `shotDirection`. `gate:determinism` did not
  run because the test step failed first; the controller's own determinism test
  passes.
- **Cup ripple is expected, not silent.** 11 of the 14 failures are cup/bracket
  pins; they are listed row by row above so P4.T3 can re-pin them in one pass
  after Phase 3 moves the numbers again.
