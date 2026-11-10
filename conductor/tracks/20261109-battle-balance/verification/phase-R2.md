# Phase R2 — Honest Pacing

Branch `feat/20261109-battle-balance`, base `f0a1ad0e`, phase commits
`6499e441` (honest gate + FR-20 targets), `2e5977df` (ladder + stall species),
`b4cfbfb5` (frozen-suite re-pins).

## Verdict: the gate is honest; one target is on the frontier

The round-2 review was right: the old band counted every cap fight, so 264
fights that ended at exactly 40.00 s were reported as "inside 25-40 s". The gate
now excludes `reason === "time"` and prints `resolvedInBand` and `capShare`
separately, and it gates FR-20's knockout share and median duration.

The target state is **not** reached. `resolvedInBand` is **41.0%** against the
**>= 50.0%** bound — 9.0 points short. Every other target in the brief's target
state is met, all 15 species rows are verified, and no bound was widened.

This is the frontier, reported as the brief instructs: the honest band cannot
be pushed to 50% by compressing the authored ladder alone. Every deeper step
slows the fast fights but pushes 35-40 s knockouts over the 40 s cap faster
than it pulls sub-25 s fights up. Measured on the way here:

| ladder step | resolvedInBand | capShare | knockoutShare |
| --- | --- | --- | --- |
| R1 ladder (baseline) | 23.1% | 31.4% | 68.3% |
| deeper than final (chip 11, mid 13, mid2 15, bolt 16, heavy 18, branch 17/14) | 40.7% | 34.0% | 66.0% |
| **final (chip 12, mid 14, mid2 16, bolt 17, heavy 19, branch 15/12)** | **41.0%** | **30.0%** | **70.0%** |
| shallow parity-breaking variant (branch 18/80 vs 15/100) | 42.6% | 30.0% | 70.0% |

The 42.6% row is not legal under the phase's authority: `18 * 80% = 14.4` does
not equal `15 * 100% = 15`, so it breaks the branch expected-damage parity
invariant. The parity lattice is `5k/80 ↔ 4k/100` (15/12, 20/16, 25/20), and no
member of it near the required weight preserves the ladder's tier order and the
4-12% band. The 42.6% state was therefore rejected, not shipped.

Which target gave way: **`resolvedInBand` only**, by 9.0 points. `capShare`
(30.0% vs <= 33.3%), `knockoutShare` (70.0% vs >= 66.7%), `medianDuration`
(31.21 s vs < 40.00 s), `durationP05` (14.96 s vs >= 8.00 s), `durationMax`
(40.00 s vs <= 40.00 s) and `damageBand` (49/49) all hold. All 15 species rows
hold their two-sided 95% bound and their distinct-fight floor.

## Bucket table

Baseline histogram (5 s buckets, cap fights are exactly 40.00 s and sit in the
last bucket):

| bucket | 0-5 | 5-10 | 10-15 | 15-20 | 20-25 | 25-30 | 30-35 | 35-40 | cap 40.00 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 0 | 8 | 106 | 98 | 170 | 88 | 68 | 38 | 264 |
| after | — | — | — | — | — | — | — | — | 252 |

The after histogram was temporary instrumentation and was removed before the
final run; the summary rows below are the shipped figures.

| bucket | baseline | after | delta |
| --- | --- | --- | --- |
| KO under 25 s | 382 (45.5%) | 244 (29.0%) | -138 |
| KO inside 25-40 s (`resolvedInBand`) | 194 (23.1%) | **344 (41.0%)** | +150 |
| decided at the cap | 264 (31.4%) | 252 (30.0%) | -12 |
| draws | 2 (0.2%) | 0 (0.0%) | -2 |
| total | 840 | 840 | — |

Median duration 26.72 s -> 31.21 s. Minimum 6.68 s -> 6.68 s. p05 11.94 s ->
14.96 s. Knockout share 68.3% (574/840) -> 70.0% (588/840).

## Targets

| target | bound | baseline | after | status |
| --- | --- | --- | --- | --- |
| `resolvedInBand` | >= 50.0% of all fights in 25.00-40.00 s, cap fights excluded | 23.1% (194/840) | **41.0% (344/840)** | FAIL (frontier) |
| `capShare` | <= 33.3% (at most one fight in three) | 31.4% (264/840) | 30.0% (252/840) | ok |
| `knockoutShare` | >= 66.7% (two fights in three, FR-20 / AC-17) | 68.3% (574/840) | 70.0% (588/840) | ok |
| `medianDuration` | < 40.00 s (FR-20 / AC-17) | 26.72 s | 31.21 s | ok |
| `durationP05` | >= 8.00 s | 11.94 s | 14.96 s | ok |
| `durationMax` | <= 40.00 s | 40.00 s | 40.00 s | ok |
| `damageBand` | 49/49 moves inside 4-12% of the 189 pool | 49/49 | 49/49 | ok |
| species rows | two-sided 95% + distinct floor 12 | 14/15 ok | 15/15 ok | ok |
| boss rows | 0 < player wins < 30 | 6/6 ok | 6/6 ok | ok |

Species rows after: fire_drake 58.9 (17 distinct), plant_ox 57.1 (20),
water_axolotl 50.0 (16), electric_hound 48.2 (16), fernstag 60.7 (19),
wind_falcon 42.9 (18), reefclaw 71.4 (16), earth_tortoise 26.8 (14),
cindermoor 67.9 (15), voltfox 32.1 (14), galeheron 39.3 (13), shalemole 33.9
(13), embercub 42.9 (12), mossboar 64.3 (16), mistkit 53.6 (17).

The only gate failure is the honest band line:
`resolvedInBand: observed 41.0% (344/840; 58.5% of 588 resolved), bound >=
50.0% of all fights in 25.00s..40.00s, cap fights excluded`.

## Authored ladder, old -> new

| row | R1 power | R2 power | share of 189 |
| --- | --- | --- | --- |
| basic | 9 | 9 | 4.76% |
| light | 11 | 10 | 5.29% |
| chip | 13 | 12 | 6.35% |
| mid | 15 | 14 | 7.41% |
| mid2 | 18 | 16 | 8.47% |
| bolt | 19 | 17 | 8.99% |
| heavy | 21 | 19 | 10.05% |
| branch reliable | 16 | 12 | 6.35% |
| branch heavy | 20 | 15 | 7.94% |

Tier order is strictly ascending (10 < 12 < 14 < 16 < 17 < 19), every row is
distinct, and all 49 catalog rows are inside 4-12%. `heavy` still out-earns
`light` on cooldown DPS (19/2600 = 7.31 > 10/1500 = 6.67) and the branch pair
keeps expected-damage parity (15 x 80% = 12 x 100%). The basic strike was not
touched.

The structural finding that drove the cut: the matrix uses
`species.kit.slice(0, 4)` — light, mid, mid2, bolt — so the fast fights are the
first-four-row fights, and a 1.875x positional stack on an 11.11% base is ~21%
of the pool. Compressing the top of the authored ladder (heavy 21 -> 19, bolt
19 -> 17, mid2 18 -> 16) slows exactly those fights without touching the frozen
type chart or damage ratios.

## Species stat changes (the stall lever)

| species | field | before | after |
| --- | --- | --- | --- |
| earth_tortoise | def | 17..20 | 9..12 |
| earth_tortoise | hp | 163..209 | unchanged |
| earth_tortoise | spd | 3..5 | unchanged |
| earth_tortoise | atk | 10..14 | unchanged |
| shalemole | def | 11..14 | 10..13 |

The tortoise's attack and speed were not touched, per the brief. The defense
floor was the cap lever: at 17..20 the tortoise stalled 96 of its 112 games to
the cap; at 9..12 it stalls 24 and its distinct count rises 6 -> 14, which also
clears the AC-5 floor. Its win rate settles at 26.8%, inside its two-sided
bound (se 13.4%, |26.8 - 50| = 23.2 <= 26.2). The "hardest defense floor in the
game" identity is retired in `species.test.ts`; the HP ceiling and
slowest-speed identity are kept.

Cap share did not cross 33.3% at any point in the final ladder, so the
tortoise's stall was never shortened with `spd` or its attack.

## Doctrine engagement (FR-15 / AC-11, R2 T5)

The doctrine table's own dodge column now differs by doctrine (Circle 2.8%,
others 0.0%; two distinct non-zero probe rates, so the T5 assertion has teeth),
and the probe rate is printed alongside:

| doctrine | fights | win rate | rear-or-flank | dodges | dodge rate | probe/fight |
| --- | --- | --- | --- | --- | --- | --- |
| Press | 6 | 100.0% | 0.0% | 0 | 0.0% | 0.00 |
| Circle | 6 | 100.0% | 16.7% | 0 | 0.0% | 6.00 |
| Kite | 6 | 0.0% | 0.0% | 16 | 2.8% | 24.00 |
| Counter | 6 | 100.0% | 0.0% | 0 | 0.0% | 8.00 |

Dodge probe (paid dodges where a dodge is observable, 6 fights each): Press 0,
Circle 36, Kite 144, Counter 48. Baseline was Press 0, Circle 36, Kite 120,
Counter 174; the roster change moved Kite and Counter.

Kite verdict, recorded: **0/6** — a doctrine that loses every sampled fight is
not a choice. The owner must decide whether Kite is a trap or a missing tool.

## Findings recorded, not gated

- Reference-line spread at equal investment: baseline **fire_drake 25.0% ..
  voltfox 89.3%**; after **earth_tortoise 14.3% .. voltfox 89.3%**. Kit shape,
  not stats, dominates the equal-investment line (FR-22 diagnostic).
- Design-band miss list (12 rows, printed and asserted against the maintained
  array in `balance-report.test.ts`): fire_drake 58.9, plant_ox 57.1, fernstag
  60.7, wind_falcon 42.9, reefclaw 71.4, earth_tortoise 26.8, cindermoor 67.9,
  voltfox 32.1, galeheron 39.3, shalemole 33.9, embercub 42.9, mossboar 64.3.
  The baseline list had six rows; the compressed ladder widens the spread even
  as it verifies every row's significance bound. This is AC-5 debt for the
  roster, not an FR-4 gate.
- Heavy is worse per stamina point than light on sustained DPS (carried from
  R1; unchanged in kind).

## Re-pins (FR-10 / FR-21, deliberate)

- `moves.test.ts`: all six element tier tables and the original-row pins
  (10/14/16/17/12/19), branch pair 15/12, earth TIERS.
- `heavy-hit.test.ts`: projectile atk 44 -> 48 (Spark 10 lands 48 like Strike
  9), downing-blow killer 78 -> 85 (still past 84 HP), innate-Strike special
  side atk 11 -> 12 (18 damage through the 3/2 chart).
- `continuous/projectile.test.ts`: Spark literals 11 -> 10.
- `projectile.test.ts`: Blaze Bolt 28 -> 25 (fire into plant, power 17),
  in-flight Bramble Dart 8 -> 7 and Bolt 32 -> 33.
- `resolver.test.ts`: one-sided KO final HP `{Bolt:31, Reed:-11}`.
- `affinity.test.ts`: Blaze Bolt 57 -> 51, power 17.
- `clock.contract.test.ts`: all 27 GOLDEN digests recaptured for the new
  ladder and the two stat floors; legacy knockback coverage restored with a
  synthetic heavy-blow fixture (hp 100, atk 100 vs def 10, basic power 9 -> 90
  damage crosses `STAGGER_DAMAGE_FRACTION` 0.35) that asserts a `knockback`
  event and a `down`, because the matrix no longer reaches that arm.
- `cup-contracts.test.ts` / `cup.golden.test.ts`: seed-1 SF2 draw resolved to
  Emberhold Flicker; seed-101 forfeit champion Bonfire Brook and its final row.
- `species.test.ts`: tortoise defense-floor identity retired (HP ceiling and
  slowest speed kept).
- `branch-balance.test.ts` and `species-discovery-balance.test.ts`: the two
  `.failing` debt markers removed because both pass under R2.
- `pacing.test.ts`: stale "25-40s band 57.1%" comment replaced with the honest
  R2 numbers; the `test.failing` majority-KO marker stays as debt.

## Frozen items untouched

`FIGHT_CAP_MS` (40 000), the type chart, the 4-12% damage band bounds, the
damage ratios, `DECISION_MS`, training caps, the doctrine definitions, turn
budgets, `MISS_SCALE`, `DISTINCT_FLOOR` (12), and the basic strike's power (9).

## Verification commands (run separately, in this order)

| command | exit | result |
| --- | --- | --- |
| `bun run verify` | **0** | 3970 pass, 1 skip, 0 fail, 461 239 expects across 367 files; formatter clean; determinism gate regenerated all 46 creature GLBs and 5 props byte-identical |
| `bun run build` | **0** | client built in 289 ms, 410 modules |
| `bun run balance` | **1** | 840 fights, ko 588 / time 252 / draw 0; the single FAIL is `resolvedInBand` 41.0% vs >= 50.0% (the documented frontier) |
| `bun run telemetry` | **0** | 14 matchups; cap share 7/14 (50.0%, bound <= 50.0%), duration 24.72-40.00 s, all 13 bounds ok |

Determinism: the balance report replays byte for byte (the byte-identical test
passes), and the fight RNG is seeded from the matrix seeds; two runs of
`bun run balance` printed identical figures.

## Debt carried forward

1. `resolvedInBand` 41.0% vs >= 50.0%: the band needs a variance lever (species
   attack/defense spread or the accuracy ladder), not a mean shift on the
   authored ladder. Recorded as the R2 frontier.
2. Twelve species rows sit outside the 45-55% printed design target while all
   fifteen pass the two-sided 95% bound; the reference-line spread says kit
   shape, not stats, is the cause.
3. Kite loses 0/6 in the doctrine table; needs an owner decision (trap vs
   missing tool).
