# Probe-before — current chart (2/1·1/2), HP ×1

Measured 2026-10-16 via `bosses.balance.test.ts` report mode
(`APEX_BOSS_REPORT=1`) on branch `track/silver_ladder_bosses_20261016`,
commits up to `cb6d402`. Cells are player-win rates over 36 duels each
(6 creature seeds × 6 battle seeds); boss cells use the bounds-max pinned
bosses; rival cells use the +5% ramped final rival (same species as player).

## Mirror curves (chart-invariant, the healthy signal)

| player → boss | +0 | +2 | +4 | +6 |
|---|---|---|---|---|
| fire_drake → Koda | 0% | 19.4% | 38.9% | 100% |
| plant_ox → Hesse | 0% | 38.9% | 91.7% | 100% |
| water_axolotl → Marlow | 0% | 25.0% | 88.9% | 100% |

## Cross cells under the 2/1·1/2 chart (all binary)

| player → boss (boss element) | +0 | +2 | +4 | +6 |
|---|---|---|---|---|
| fire_drake → Koda (mirror) | 0% | 19.4% | 38.9% | 100% |
| plant_ox → Koda (disadvantaged) | 0% | 0% | 0% | 0% |
| water_axolotl → Koda (advantaged) | 100% | 100% | 100% | 100% |
| plant_ox → Hesse (mirror) | 0% | 38.9% | 91.7% | 100% |
| fire_drake → Hesse (advantaged) | 100% | 100% | 100% | 100% |
| water_axolotl → Hesse (disadvantaged) | 0% | 0% | 0% | 0% |
| water_axolotl → Marlow (mirror) | 0% | 25.0% | 88.9% | 100% |
| fire_drake → Marlow (disadvantaged) | 0% | 0% | 0% | 0% |
| plant_ox → Marlow (advantaged) | 100% | 100% | 100% | 100% |

## Factor-pair sensitivity sweep (same instrument, patched chart)

Player win rates vs the bounds-max pinned bosses (adv = boss-advantaged cell):

| cell | 2/1·1/2 | 3/2·2/3 | 4/3·3/4 |
|---|---|---|---|
| Koda vs plant (adv) | 0/0/0/0 | 0/0/14/67 | 0/0/25/94 |
| Hesse vs water (adv) | 0/0/0/0 | 0/0/0/6 | 0/0/6/44 |
| Marlow vs fire (adv) | 0/0/0/0 | 0/0/0/0 | 0/0/0/6 |
| Koda vs water (player adv) | 100×4 | 100×4 | 94/100/100/100 |
| Hesse vs fire (player adv) | 100×4 | 78/100/100/100 | 33/100/100/100 |
| Marlow vs plant (player adv) | 100×4 | 64/100/100/100 | 44/100/100/100 |

Finding: no factor pair makes every ordered pair tunable on its own —
species/kit/quantization idiosyncrasies dominate specific pairings
(Marlow-vs-fire stays ~0% even at cap under every candidate). The
disadvantaged-side curve must therefore be measured at **equal effective
stats** (the honest baseline), which the chart track's `chart.balance.test.ts`
tripwires encode.

## Rival-relative cells (+5% ramped final rival, same species)

| player species | +0 | +2 | +4 | +6 |
|---|---|---|---|---|
| fire_drake | 16.7% | 25.0% | 33.3% | 97.2% |
| plant_ox | 0% | 33.3% | 91.7% | 100% |
| water_axolotl | 2.8% | 22.2% | 80.6% | 100% |

## Generated-cup placement distribution (trained+2 fire_drake, 42 cups)

| placement | count | share |
|---|---|---|
| 1 champion | 0 | 0.0% |
| 2 runner-up | 6 | 14.3% |
| 3 semifinal | 14 | 33.3% |
| 4 early exit | 22 | 52.4% |

## Climb cadence (whole champion-cups per leg)

Bronze III→II: 2 cups · Bronze II→I: 2 cups · Silver III→II: 3 cups ·
Silver II→I: 3 cups (provisional SILVER_THRESHOLDS 21/30).

## Training economics

+1 stat point/day (AP-gated focus → overnight settlement), cap +6/stat
(~24 points ≈ 24+ dedicated days); cups every 7 days.
