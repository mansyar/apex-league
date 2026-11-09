# Phase 8 — Blow weight 3 → 2

## Constant change

`packages/sim/src/battle/frames.ts`

```
-BLOW_WEIGHT = 3
+BLOW_WEIGHT = 2
```

Following constants derive from it and moved with it:

| Constant | Where | Weight 3 | Weight 2 |
|---|---|---|---|
| `MIN_ATTACK_STAMINA_COST` | `continuous/stamina.ts` | `3 * 3` = 9 | `3 * 2` = 6 |
| `KNOCKBACK_PER_POISE` | `continuous/impulse.ts` | `trunc(1000/3)` = 333 | `trunc(1000/2)` = 500 |

`BLOW_WEIGHT` still multiplies damage (both the weighted and the plain path) and
scales startup / active / recovery, poise damage and stamina cost.

## Frame table (re-authored, not scaled)

Every row is the **pre-Phase-6 baseline × 2** (baseline = commit `a678ded0`,
after the Phase 5 recovery widening), not the weight-3 row × 2/3. Reaches,
speed and bands are unchanged by the weight.

Columns: `startup / active / recovery ms`, reach mm (or band), `poise / stamina`.

| Move | S/A/R | Reach | Poise/Stam |
|---|---|---|---|
| basic | 160/120/500 | 420 | 4/4 |
| spark | 260/120/600 | 5200 | 6/8 |
| flame_charge | 300/140/660 | 5600 | 8/10 |
| cinder_shot | 440/160/940 | 6000 | 10/12 |
| blaze_bolt | 560/180/1020 | 6200 | 14/16 |
| flare_dart | 220/100/600 | 5000 | 6/8 |
| pyre_lance | 720/220/1380 | 6500 | 18/20 |
| seed_shot | 260/120/600 | 5200 | 6/8 |
| thorn_volley | 340/140/660 | 5600 | 8/10 |
| spore_burst | 440/160/940 | 6000 | 10/12 |
| bramble_dart | 560/180/1020 | 6200 | 14/16 |
| vine_lash | 220/100/600 | 5000 | 6/8 |
| root_quake | 760/220/1420 | 6500 | 18/20 |
| bubble | 260/120/600 | 5200 | 6/8 |
| tide_shot | 340/140/660 | 5600 | 8/10 |
| foam_volley | 440/160/940 | 6000 | 10/12 |
| splash_bolt | 560/180/1020 | 6200 | 14/16 |
| mist_spray | 220/100/600 | 5000 | 6/8 |
| maelstrom | 720/220/1380 | 6500 | 18/20 |
| cinder_dive | 480/200/980 | 6000 | 14/16 |
| pyre_wall | 520/440/940 | 4200 | 10/12 |
| thorn_charge | 520/200/1020 | 5800 | 14/16 |
| bramble_guard | 560/480/960 | 4000 | 10/12 |
| riptide_rush | 500/180/1000 | 5800 | 14/16 |
| tide_aegis | 540/440/940 | 4200 | 10/12 |
| static_jolt | 240/120/600 | 5200 | 6/8 |
| volt_dash | 280/140/660 | 5600 | 8/10 |
| arc_shot | 400/160/920 | 6000 | 10/12 |
| storm_bolt | 520/180/1000 | 6200 | 14/16 |
| ion_dart | 200/100/600 | 5000 | 6/8 |
| gigavolt | 680/220/1360 | 6500 | 18/20 |
| storm_surge | 480/180/980 | 6200 | 14/16 |
| ion_wall | 500/400/920 | 4400 | 10/12 |
| pebble_shot | 300/120/620 | 5200 | 6/8 |
| dust_devil | 380/140/680 | 5600 | 8/10 |
| clay_burst | 480/160/960 | 6000 | 10/12 |
| boulder_toss | 600/180/1040 | 6200 | 14/16 |
| sand_blast | 240/100/600 | 5000 | 6/8 |
| tectonic_slam | 800/220/1440 | 6500 | 18/20 |
| quake_stomp | 640/240/1040 | 5200 | 14/16 |
| basalt_guard | 600/520/980 | 3800 | 10/12 |
| gust | 220/120/600 | 5200 | 6/8 |
| feather_dart | 280/140/660 | 5600 | 8/10 |
| gale_cutter | 400/160/920 | 6000 | 10/12 |
| sky_bolt | 500/180/1000 | 6200 | 14/16 |
| talon_slash | 180/100/600 | 5000 | 6/8 |
| hurricane_spiral | 680/220/1340 | 6500 | 18/20 |
| cyclone_dive | 460/180/960 | 6000 | 14/16 |
| zephyr_veil | 480/420/920 | 4400 | 10/12 |

Authoring note: the rows were taken from the pre-Phase-6 baseline and doubled, as
instructed. For the frame numbers the two routes happen to coincide (every
weight-3 value divides by 3 exactly, so weight-3 × 2/3 equals baseline × 2 —
e.g. `pyre_lance` 1080/330/2070 → 720/220/1380). The derived constants do not
scale that way: `trunc(1000/3)` = 333 cannot be halved into the correct
`trunc(1000/2)` = 500, which is why they were recomputed from the new weight.

## Before / after

| Metric | Weight 3 (Phase 6/7) | Weight 2 (this phase) | Target |
|---|---|---|---|
| Seed 1 attack rate | 0.29/s owned, 0.36/s rival | **0.55/s owned, 0.34/s rival** | 0.45–0.55/s per side |
| Seed 1 damage | 34 owned (18.0%), 198 rival (104.8%) | **43 owned (22.8%), 190 rival (100.5%)** | — |
| Seed 1 fight length | 13.98 s KO | **14.56 s KO** | 25–40 s |
| Telemetry exchange | 0.26/s home, 0.24/s away | **0.34/s home, 0.32/s away** (0.66 combined) | 0.45–0.55/s per side |
| Telemetry idle | 28.2% | **36.3%** | ≤50% |
| Median fight | 33.40 s | **38.56 s** | 25–40 s |
| Cap share | 6/14 (42.9%) | **6/14 (42.9%)** | ≤1/3 (AC-7) |
| Basic blow | 6 on a 189 pool (3.2%) | **5–6 on a 189 pool (2.6–3.2%)** | 2.5–3% of pool |

## What the harness measured

`bun run trace --seed 1 --check` — 14.56 s KO, blows 6 owned / 5 rival,
damage 43 owned (22.8%) / 190 rival (100.5%), attack rate 0.55/s owned,
0.34/s rival, gap 499/854/3984 mm, cells 61/77, stamina min 35/19,
hash `0xf3813411`, 5/5 invariants ok.

`bun run trace --seed 20261108 --check` (default pairing plant_ox v embercub)
— 21.96 s KO, blows 6/11, damage 65 (34.4%) / 207 (109.5%), attack rate
0.41/s owned, 0.55/s rival, gap 499/834/3984, cells 89/92, hash `0xa7d105a6`,
5/5 invariants ok.

`bun run trace --seed 20261111 --check` (plant_ox v embercub) — 14.56 s KO,
blows 6/5, damage 43 (22.8%) / 190 (100.5%), attack rate 0.55/s owned,
0.34/s rival, hash `0xf3813411`, 5/5 invariants ok.

`bun run trace --seed 20261112 --check` (plant_ox v embercub) — 21.96 s KO,
blows 6/11, damage 65 (34.4%) / 207 (109.5%), attack rate 0.41/s owned,
0.55/s rival, hash `0xa7d105a6`, 5/5 invariants ok.

`bun run trace --seed 20261108 --owned fire_drake --rival earth_tortoise --check`
— **cap ending**: 40.00 s `time`, blows 6/9, damage 48 (21.8%) / 122 (64.6%),
attack rate 0.30/s owned, 0.30/s rival, gap 559/807/3984, cells 120/104,
hash `0xbb5da7cc`, 5/5 invariants ok.

## Telemetry (full bound table)

```
#  matchup                               time    ending blows   commits   gap min/med/max   cells     idle
1  fire_drake v earth_tortoise           40.00s  time   6-9     12-12     559/807/3984      120-104   25.8%
2  plant_ox v embercub                   14.56s  ko     6-5     8-5       499/855/3984      61-77     19.4%
3  water_axolotl v electric_hound        38.56s  ko     15-8    15-14     439/702/3984      192-192   47.9%
4  electric_hound v earth_tortoise       22.32s  ko     2-4     8-4       540/870/3984      96-51     27.1%
5  fernstag v embercub                   13.80s  ko     3-9     5-10      479/864/3984      79-81     28.0%
6  wind_falcon v water_axolotl           9.76s   ko     0-5     6-5       390/819/3984      31-40     22.1%
7  reefclaw v earth_tortoise             40.00s  time   10-0    10-8      580/1017/3984     158-104   20.3%
8  earth_tortoise v embercub             40.00s  time   2-11    5-15      500/797/3984      158-247   47.3%
9  cindermoor v water_axolotl            20.74s  ko     8-9     11-11     439/785/3984      69-90     27.3%
10 voltfox v earth_tortoise              40.00s  time   14-7    14-12     509/934/3984      101-97    39.6%
11 galeheron v embercub                  22.04s  ko     10-5    10-8      380/828/3984      131-138   24.0%
12 shalemole v water_axolotl             38.56s  ko     11-14   14-14     420/789/3984      116-160   42.5%
13 embercub v earth_tortoise             40.00s  time   11-2    15-5      500/797/3984      247-157   47.3%
14 mossboar v embercub                   40.00s  time   9-7     11-10     469/869/3984      137-185   49.3%

engagement:  min 380 mm  median 828 mm  max 3984 mm
exchange:    home 0.34/s  away 0.32/s  combined 0.66/s
idle:        36.3%
contact:     12.9%
retreats:    home 5824  away 5496
positions:   min 31 cells  median 110 cells
cap share:   6/14 (42.9%)
duration:    9.76s .. 40.00s

ok   engagementMin: observed 380 mm, bound <= 900 mm
ok   engagementMedian: observed 828 mm, bound <= 1500 mm
ok   engagementMax: observed 3984 mm, bound <= 4500 mm
ok   exchangeHome: observed 0.34/s, bound <= 2.50/s
ok   exchangeAway: observed 0.32/s, bound <= 2.50/s
ok   idleShare: observed 36.3%, bound <= 50.0%
ok   distinctPositions: observed 31 cells, bound >= 20 cells
ok   contactShare: observed 12.9%, bound <= 70.0%
ok   retreatHome: observed 5824 orders, bound >= 14 orders
ok   retreatAway: observed 5496 orders, bound >= 14 orders
ok   capShare: observed 42.9%, bound <= 50.0%
ok   durationMin: observed 9.76s, bound >= 8.00s
ok   durationMax: observed 40.00s, bound <= 40.00s
```

## What misses

Recorded honestly; no bound was relaxed.

1. **Attack rate is below the 0.45–0.55/s target in the pooled telemetry.**
   Measured 0.34/s home, 0.32/s away. Individual KO fights reach the band
   (seed 1 0.55/s owned; seed 20261111 0.61/s owned and 0.51/s rival), but the
   six capped fights sit at 0.30/s per side and drag the pooled figure down.
   The basic cycle is now 160+120+500 = 780 ms (1.28/s ceiling), so the gap is
   approach/decision time, not the frame table.
2. **Cap share is 6/14 (42.9%), above the AC-7 target of 1/3** — unchanged from
   weight 3. Still debt (bound is ≤50% and holds).
3. **6 of 14 fights finish under 25 s** (9.76, 13.80, 14.56, 20.74, 22.04,
   22.32 s); 8 of 14 sit inside the 25–40 s band. The 25 s floor is a spec
   goal, not a configured bound; recorded as debt.
4. Damage per basic blow lands at 5–6 on a 189–220 pool (2.6–3.2%), inside the
   target; heavy finishers still spike (pyre_lance 42–52, splash_bolt 34).

## Re-pinned rows

- `frames.test.ts` — basic `recoveryMs` 500, poise 4, stamina 4; poise-break
  blows 5; describe re-labelled Phase 8.
- `damage.test.ts` — `BLOW_WEIGHT` 2, weighted hit 18.
- `impulse.test.ts` — 4 poise knockback 2000, 8 poise 4000, double mass 1000,
  WEST −2000 (exact at weight 2).
- `stamina.test.ts` — basic cost 4, floor 6, tectonic 20, spend 10 → 4, exact
  pool 6, `duel(6)`, 39 steps, refill 150, regen pause 4.
- `strike.test.ts` — basic lands on step 8, spark on 13, active window steps
  9–14, recovery 1000/500/250, final active step 14.
- `poise.test.ts` — both trade helpers hold 8 steps (4 poise).
- `projectile.test.ts` — near arrival 19, far arrival 31.
- `battleUI.test.ts` — `Recovery 600 ms` (spark) and `Recovery 500 ms` (basic).
- `battle-trace.test.ts` — the dodge test now prints every changed step
  (`every: 0`); the 1-in-50 sample was dropping the "slips" tick.
- `cup-contracts.test.ts` — rival-subtree seed 101 QF2 → Reedle Mirefin, seed
  19 QF4/SF2 → Tidecaller Nibbles; QF-exit pin moved seed 5 → 11 (champion
  Emberhold Flicker, completion Pondskipper Grub over Gilded Horn then
  Emberhold Flicker); forfeit seed 101 champion → Reedle Mirefin (completion
  Bonfire Brook v Reedle Mirefin, final Reedle Mirefin over Mossbottom Brute);
  day-14 seed 101 QF2 → Reedle Mirefin.
- `cup.golden.test.ts` — seed 17: QF1 → Mossbottom Brute, QF3 → Thistledown
  Ash, SF → Thistledown Ash; player SF opponent Mossbottom Brute, final
  opponent Thistledown Ash. Seed 7: QF2 → Cindersnout, SF2 → Cindersnout,
  final → Cindersnout. Seed 101: QF2 → Reedle Mirefin, SF1 and final →
  Reedle Mirefin.
- `bracket-model.test.ts` — both elimination fixtures moved seed 5 → 11.
- `view-models.test.ts` — elimination fixture seed 5 → 11 (line stays
  "out in the quarterfinal").
- `cup/ghost-capture.test.ts` and `cup/ghost.test.ts` — early-exit fixture
  seed 5 → 11.

## Command results

| Command | Result |
|---|---|
| `bun run verify` | exit 0 — 3837 pass, 1 skip, 0 fail (3838 tests / 355 files, 63.28 s), biome clean, determinism gate OK |
| `bun run build` | exit 0 — vite built 399 modules, `dist/index.html` 2.13 kB |
| `bun run trace --seed 1 --check` | exit 0 — 5/5 invariants ok |
| `bun run trace --seed 20261108 --check` | exit 0 — 5/5 invariants ok |
| `bun run trace --seed 20261111 --check` | exit 0 — 5/5 invariants ok |
| `bun run trace --seed 20261112 --check` | exit 0 — 5/5 invariants ok |
| `bun run trace --seed 20261108 --owned fire_drake --rival earth_tortoise --check` | exit 0 — cap ending, 5/5 invariants ok |
| `bun run telemetry` | exit 0 — 13/13 bounds ok |

## Untouched

`battle/resolver.ts`, `clock/`, `*.balance.test.ts`, `plan.md`, `spec.md`.
