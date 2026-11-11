# Phase 1 — Diagnose the stall

**Track:** `20261112-capshare-pacing` (chore, high)
**Phase:** 1 of 3 — "Diagnose the stall"
**Branch:** `chore/20261112-capshare-pacing`
**Phase base:** `8e5740ec`
**Covers:** FR-1, AC-1
**Scope of this phase:** measurement and written diagnosis only. No source file was
touched; the phase diff is this file.

## What was measured, and how

The subject is the **shipped tree** (nothing in it was changed for this phase).

1. `bun run telemetry` played the shipped 42-fight sample (`matchups()`:
   `home = roster[i % 15]`, `away = roster[(i*5+7) % 15]` with a hop past mirrors,
   three seeds `20261108 + i + offset` per pairing, `i` in `0..13`). It reported
   **25 time-outs / 17 knockouts**, `capShare 25/42 (59.5%)`, all 14 bounds `ok`.
2. For **each of the 25 time-outs** the fight was replayed headlessly with
   `bun run trace --owned <home> --rival <away> --seed <seed> --check`. The
   trace rebuilds the resolver's own loop, cross-checks itself against
   `resolveContinuous`, and prints per side: stats (clamped), body radius, branch,
   the four-move carried kit, the doctrine profile (aggression, strafe, dodge
   threshold, preferred mm, reach edge), blows, accepted commits, damage and
   damage share, gap min/median/max, distinct 100 mm cells, stamina/poise minima
   and the final state hash. Each trace reproduced its telemetry row exactly
   (time, blows, commits, gap, cells), so the two harnesses agree fight for fight.
   The 24 diagnostic runs used `--every 1000` to bound the step log; the
   verification fight was run **exactly as the brief wrote it**.
3. Two fights were additionally replayed at full resolution (`--every 0` /
   default) to read the event stream: `fire_drake v earth_tortoise` seed
   `20261108` and `embercub v earth_tortoise` seed `20261120`. Those two logs are
   the source of the mechanism claims below (which move landed, which was
   slipped, which commit was refused).

### What the sample actually is

- 14 pairings × 3 seeds. Because `5i mod 15` has period 3, only three species
  ever appear on the away side (`roster[7]`, `roster[12]`, `roster[2]`).
- **`earth_tortoise` is a side in 15 of the 25 time-outs** (5 pairings × 3 seeds),
  not 12: `fire_drake v earth_tortoise`, `electric_hound v earth_tortoise`,
  `reefclaw v earth_tortoise`, `earth_tortoise v embercub`, `embercub v
  earth_tortoise`. The other 10 time-outs contain no tortoise.
- Tactics come from seed parity (`measureFight`): even seed → home `balanced`
  (press), away `specials` (kite); odd seed → home kite, away press. No `rule`
  and no `punish` doctrine is ever in play in this sample, so a "refused by the
  doctrine rule" hold can only be the `counter`/`punish` path — which the sample
  never selects. Every hold here is geometric or resource-based.

## Table A — per-fight evidence (25 time-outs)

`tactics h/a` is `aggression%` of the press/kite profile the side actually ran.
`gap@cap` is the centre gap at step 2000. `dmg` is damage dealt as a share of the
foe's pool. `stam/poise` are the minima over the fight.

| # | pairing | seed | tactics h/a | winner | gap@cap | commits h/a | blows h/a | dmg h/a | idle | stam/poise h/a |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | fire_drake v earth_tortoise | 20261108 | press 95 / kite 45 | tortoise | 1010 | 13/11 | 5/9 | 39.7% / 71.3% | 21.5% | 0/0 — 30/0 |
| 2 | fire_drake v earth_tortoise | 20261109 | kite 65 / press 75 | tortoise | 1625 | 12/10 | 4/7 | 25.9% / 77.0% | 13.8% | 0/0 — 2/0 |
| 3 | fire_drake v earth_tortoise | 20261110 | press 95 / kite 45 | tortoise | 770 | 14/5 | 6/5 | 36.0% / 49.4% | 33.8% | 0/0 — 76/0 |
| 4 | plant_ox v embercub | 20261109 | kite 45 / press 85 | embercub | 1279 | 11/13 | 9/8 | 49.1% / 87.3% | 30.0% | 0/0 — 0/0 |
| 5 | water_axolotl v electric_hound | 20261110 | press 85 / kite 65 | axolotl | 758 | 14/12 | 10/3 | 83.1% / 18.0% | 29.8% | 0/4 — 16/0 |
| 6 | water_axolotl v electric_hound | 20261111 | kite 55 / press 95 | axolotl | 1351 | 9/14 | 8/5 | 75.7% / 35.4% | 33.0% | 42/0 — 0/0 |
| 7 | electric_hound v earth_tortoise | 20261111 | kite 65 / press 75 | tortoise | 1487 | 13/9 | 4/9 | 31.2% / 70.1% | 17.8% | 0/0 — 0/2 |
| 8 | electric_hound v earth_tortoise | 20261112 | press 95 / kite 45 | tortoise | 980 | 14/12 | 6/11 | 55.0% / 60.5% | 22.4% | 0/0 — 28/0 |
| 9 | electric_hound v earth_tortoise | 20261113 | kite 65 / press 75 | hound | 1113 | 13/9 | 5/8 | 65.1% / 61.6% | 16.1% | 0/0 — 0/0 |
| 10 | wind_falcon v water_axolotl | 20261114 | press 95 / kite 55 | falcon | 390 | 16/10 | 9/6 | 63.5% / 59.4% | 33.9% | 0/0 — 38/0 |
| 11 | reefclaw v earth_tortoise | 20261114 | press 75 / kite 45 | reefclaw | 1536 | 13/7 | 8/5 | 60.8% / 37.6% | 32.3% | 0/0 — 0/0 |
| 12 | reefclaw v earth_tortoise | 20261115 | kite 45 / press 75 | reefclaw | 1549 | 7/8 | 6/0 | 55.0% / **0.0%** | 22.2% | 0/20 — 6/0 |
| 13 | reefclaw v earth_tortoise | 20261116 | press 75 / kite 45 | reefclaw | 806 | 12/5 | 7/0 | 66.7% / **0.0%** | 24.8% | 2/20 — 12/0 |
| 14 | earth_tortoise v embercub | 20261115 | kite 45 / press 85 | embercub | 1240 | 5/12 | 1/7 | **5.2%** / 52.4% | 38.9% | 72/0 — 0/16 |
| 15 | earth_tortoise v embercub | 20261116 | press 75 / kite 55 | embercub | 972 | 10/13 | 4/8 | 36.4% / 53.4% | 28.5% | 4/0 — 0/0 |
| 16 | earth_tortoise v embercub | 20261117 | kite 45 / press 85 | embercub | 964 | 9/12 | 3/6 | **17.3%** / 43.9% | 21.3% | 36/0 — 0/8 |
| 17 | shalemole v water_axolotl | 20261119 | kite 65 / press 85 | axolotl | 1238 | 13/13 | 9/12 | 73.6% / **96.1%** | 23.8% | 0/0 — 0/0 |
| 18 | shalemole v water_axolotl | 20261120 | press 95 / kite 55 | shalemole | 1440 | 15/10 | 8/7 | 70.8% / 65.7% | 24.1% | 0/0 — 0/0 |
| 19 | shalemole v water_axolotl | 20261121 | kite 65 / press 85 | axolotl | 1286 | 12/14 | 11/12 | 93.3% / **97.8%** | 22.8% | 24/0 — 0/0 |
| 20 | embercub v earth_tortoise | 20261120 | press 85 / kite 45 | embercub | 1041 | 13/6 | 8/0 | 59.3% / **0.0%** | 30.4% | 0/20 — 58/0 |
| 21 | embercub v earth_tortoise | 20261121 | kite 55 / press 75 | embercub | 978 | 9/8 | 6/1 | 47.6% / **6.4%** | 27.1% | 0/14 — 0/0 |
| 22 | embercub v earth_tortoise | 20261122 | press 85 / kite 45 | embercub | 595 | 15/9 | 9/6 | 59.3% / 45.7% | 32.9% | 0/0 — 0/0 |
| 23 | mossboar v embercub | 20261121 | kite 65 / press 85 | embercub | 938 | 9/12 | 7/7 | 40.5% / 58.6% | 33.4% | 0/0 — 0/0 |
| 24 | mossboar v embercub | 20261122 | press 95 / kite 55 | embercub | 810 | 12/11 | 8/8 | 47.4% / 87.1% | 26.1% | 0/0 — 0/0 |
| 25 | mossboar v embercub | 20261123 | kite 65 / press 85 | embercub | 471 | 11/12 | 8/8 | 50.3% / 76.3% | 28.9% | 0/0 — 0/0 |

Read together: **no fight in the 25 has a silent side.** The lowest commit count
on any side is 5 (tortoise, #3, #14), the lowest blow count on a side that
committed at least five times is 0, and the pooled idle share is 26.6% — idle
includes hitstun and the attacker's own recovery, not a stand-off. The fight is
therefore never "neither side engaged". The question is *whose output collapsed*.

## Table B — per-fight verdict: who failed to close, and why

The checklist was applied in the brief's order for every fight: threat band
(`threatBandFor`) vs the side's own carried-kit interval `[minReach + r₁ + r₂,
reach + r₁ + r₂]` and `spd`; then interval / stamina / cooldown / doctrine
refusal; then whether the *opponent* was the one backing off.

**Band and interval, computed per pairing** (edge = `420 + r₁ + r₂`, doctrine
rows scaled by edge/860, floor lifted to `opponentReach + 80` where that is
higher; every carried kit row has `minReachMm = 90`):

| pairing | edge | press band (floor/pref/ceiling) | kite band (floor/pref/ceiling) | carried-kit interval | spd |
| --- | --- | --- | --- | --- | --- |
| fire_drake v earth_tortoise | 980 | 1060 / 1078 / 1469 | 1568 / 1787 / 2008 | [650, 6760] both | 10 / 5 |
| plant_ox v embercub | 920 | 1000 / 1012 / 1380 | 1472 / 1678 / 1886 | [590, 6700] / [590, 7000] | 9 / 10 |
| water_axolotl v electric_hound | 860 | 940 / 946 / 1290 | 1376 / 1569 / 1763 | [530, 6640] / [630, 6740] | 10 / 10 |
| electric_hound v earth_tortoise | 960 | 1040 / 1056 / 1440 | 1536 / 1751 / 1967 | [630, 6740] / [630, 6740] | 10 / 5 |
| wind_falcon v water_axolotl | 810 | 890 / 891 / 1215 | 1296 / 1477 / 1660 | [480, 6590] / [510, 6420] | 17 / 10 |
| reefclaw v earth_tortoise | 1000 | 1080 / 1100 / 1500 | 1600 / 1824 / 2050 | [670, 6580] / [670, 6780] | 7 / 5 |
| earth_tortoise v embercub | 920 | 1000 / 1012 / 1380 | 1472 / 1678 / 1886 | [590, 6700] / [590, 7000] | 5 / 10 |
| shalemole v water_axolotl | 840 | 920 / 924 / 1260 | 1344 / 1532 / 1722 | [510, 6420] both | 8 / 10 |
| embercub v earth_tortoise | 920 | 1000 / 1012 / 1380 | 1472 / 1678 / 1886 | [590, 7000] / [590, 6700] | 10 / 5 |
| mossboar v embercub | 890 | 970 / 979 / 1335 | 1424 / 1623 / 1824 | [560, 6970] / [590, 7000] | 8 / 10 |

The bands match every trace header (e.g. `reefclaw v earth_tortoise` prints
`preferred 1100` press / `1824` kite; `wind_falcon v water_axolotl` prints `891`).
Two facts fall straight out:

- **The band never excludes the interval.** Every band sits inside
  `[inner, outer]` with 3.7-6.4 m of reach in hand. Out-of-interval holds cannot
  happen except at body contact, where the gap drops below the 590-670 mm inner
  edge (radii sum + 90). That is a fallback case the controller already answers
  with `basic` (melee, 420 mm reach, no dead zone), and the logs show it doing so.
- **The kite band is unreachable for the tortoise.** Its kite floor is 1472-1600 mm,
  but its median gap in those fights is 970-1425 mm, and its top speed at spd 5
  is `100 + 90×5 = 550` milli-mm/ms (0.55 mm/ms) against 1.0 mm/ms (spd 10),
  1.18 (12) and 1.63 (17) for the species it meets. It cannot open the range, so
  the retreat latch (`retreating → threshold = preferredMm`) turns its decisions
  into retreats: `gap@cap` 1487-1625 in #2, #7, #11, #12, #18, and the full log of
  #20 shows the rival retreating at gaps 1540, 1536, 1470 … for the whole fight.

Verdicts. "Clock" means both sides converted normally and neither pool emptied.

| # | stalling side | why it could not close (checked against the list) |
| --- | --- | --- |
| 1 | fire_drake (the losing side; the tortoise also failed to finish) | Not interval: gap 560-1010, band 1060-1469, kit [650, 6760]. Not stamina at the cap (0 but it kept committing). Cause: **conversion** — 5 blows from 13 commits (38%), and the full log shows every `blaze_bolt` (560 ms startup) slipped by the tortoise; its 5 hits are `spark`/`cinder_shot` only. The tortoise converted 9/11 (82%) but 127 damage is 71.3% of a 178 pool: it was one exchange short of the KO. |
| 2 | fire_drake (losing side) | Drake kited: 4 blows / 12 commits (33%), 25.9%. Tortoise pressed 10 times, landed 7 (70%), 77.0% of the drake's pool — it was winning the exchange and still did not get the last blow. gap@cap 1625 = both sides backing off at the end. |
| 3 | earth_tortoise | **Under-commit, not under-convert**: 5 commits against the drake's 14, yet 5/5 landed (100%) for 49.4%. Band: kite floor 1568 vs median gap 1173 and spd 5 vs 10 — it could not hold the band, so the retreat latch kept it out of its press slots. Stamina never bound (min 76). |
| 4 | neither; embercub failed to finish | Ox 9/11 (82%), cub 8/13 (62%), damage 49.1% vs **87.3%**. Both sides converted; the cub was 12.7% of a 189 pool short. Clock. |
| 5 | electric_hound | 3 blows from 12 commits (25%), 18.0%. Not interval (gap 438-758 inside [630, 6740]) and not stamina (min 16). It converted: the axolotl slipped its shots at 438-758 mm. Axolotl 10/14 (71%), 83.1%. |
| 6 | electric_hound | 5/14 (36%), 35.4%. Axolotl kited (9 commits) but landed 8 (89%) for 75.7%. gap@cap 1351 — the hound pressed and could not land. |
| 7 | electric_hound | 4/13 (31%), 31.2%. Tortoise pressed, 9/9 (100%), 70.1%. Hound's stamina min 0; gap@cap 1487 (hound kited at the end). |
| 8 | neither; hound lower | 6/14 (43%) vs 11/12 (92%); 55.0% vs 60.5%. Both converted, tortoise more; gap@cap 980. Clock. |
| 9 | neither; hound converted worse but hit harder | 5/13 (38%) → 65.1%; tortoise 8/9 (89%) → 61.6%. Both over 60%. Clock. |
| 10 | neither | 9/16 (56%) vs 6/10 (60%), 63.5% vs 59.4%, `gap@cap 390` = bodies in contact at the bell. Nothing held; the pools outlasted the clock. |
| 11 | earth_tortoise | 7 commits (vs 13) and 5 blows, 37.6%. Kite floor 1600 vs median gap 1221, spd 5 vs 7. Under-commit + conversion. |
| 12 | earth_tortoise | **Committed 8 times and landed 0 blows** (0.0%). Press band 1080-1500, median gap 1320, kit [670, 6780]: no interval or stamina block (min 6). Every shot was slipped/missed. The reefclaw converted 6/7 (86%) and won on points. |
| 13 | earth_tortoise | Kite, 5 commits, **0 blows**, 0.0%; gap@cap 806 (it was dragged into contact and still missed). Reefclaw 7/12 (58%), 66.7%. |
| 14 | earth_tortoise | Kite, 5 commits vs 12, 1 blow, **5.2%**; stamina min 72 (unused). The retreat latch owned this fight: floor 1472 vs median gap 1169, spd 5 vs 10. |
| 15 | earth_tortoise | Press, 10 commits, 4 blows (40%), 36.4%. Band 1000-1380 vs median 1264 — it was in band and still could not land. Embercub 8/13 (62%), 53.4%. |
| 16 | earth_tortoise | Kite, 9 commits, 3 blows (33%), **17.3%**. Embercub 6/12 (50%), 43.9%. |
| 17 | neither; axolotl 3.9% short | 9/13 (69%) vs 12/13 (92%), 73.6% vs **96.1%**. 21 blows landed. Clock, one blow. |
| 18 | neither | 8/15 (53%) vs 7/10 (70%), 70.8% vs 65.7%, gap@cap 1440 (both kiting at the bell). Clock. |
| 19 | neither; axolotl 2.2% short | 11/12 (92%) vs 12/14 (86%), 93.3% vs **97.8%**. 23 blows landed, loser at 4 HP. Clock. |
| 20 | earth_tortoise | **6 commits, 0 blows, 0.0%**, stamina min 58 (never spent). Full log: every `boulder_toss`/`clay_burst` (512/480 ms startups) is slipped by the cub at 920-1050 mm; the cub lands 8/13 (62%). |
| 21 | earth_tortoise | Press, 8 commits, 1 blow (13%), **6.4%**. Cub 6/9 (67%), 47.6%. |
| 22 | neither; tortoise below half | 9/15 (60%) vs 6/9 (67%), 59.3% vs 45.7%, gap@cap 595 (contact). Clock. |
| 23 | neither | 7/9 (78%) vs 7/12 (58%), 40.5% vs 58.6%. Clock. |
| 24 | neither; cub 12.9% short | 8/12 (67%) vs 8/11 (73%), 47.4% vs **87.1%**. Clock. |
| 25 | neither | 8/11 (73%) vs 8/12 (67%), 50.3% vs 76.3%, gap@cap 471 (contact). Clock. |

Tally: **9 tortoise collapses** (#3, #11-#16, #20, #21), **5 opponent conversion
failures** (#1, #2, #5, #6, #7 — all against a foe that slips well), **11
clock-bound** fights where both sides converted (#4, #8, #9, #10, #17, #18, #19,
#22, #23, #24, #25).

## The three cross-cutting findings

### 1. The stall is not a hold; it is a throughput shortfall

Every stalled fight lands blows on both sides. Pooled, the sample deals
2.5-7.6 damage per second against 160-189 HP pools, so a knockout needs 41-73 s
and the cap is 40 s. The clearest cases are the ones with the most action:
#19 lands 23 blows and still ends at 93.3% / 97.8%; #17 lands 21 and ends at
96.1%; #4 ends at 87.3%. These are not stand-offs — they are fights that were
one to three blows short of a KO when the bell rang. No controller, band or
movement change is implicated; the exchange rate is ~0.3 commits/s per side and
the pools are deep.

### 2. The tortoise-local defect is real but narrower than "it cannot close"

- Its **carried four are the four slowest moves it owns**: `pebble_shot`
  (300/120/750, 8 stamina), `dust_devil` (380/140/822, 10), `clay_burst`
  (480/160/1162, 12), `boulder_toss` (512/180/1258, 16) — cycles 1170, 1342,
  1802, 1950 ms. Its fastest shot, `sand_blast` (240/100/726, 8 stamina, cycle
  1066 ms), is in the six-move pool but **not carried** (`sideOf` and the cup take
  `kit.slice(0, 4)`). Every other stalling species *does* carry a 1046-1066 ms
  move (`embercub` → `flare_dart`, `shalemole` → `sand_blast`, `mossboar` →
  `vine_lash`, `reefclaw` → `mist_spray`).
- Its long startups are what its opponents slip against. In seed `20261108` the
  tortoise's 9 blows decompose as 4× `basic` (9-12 damage), 4× `boulder_toss`
  (17-18) and 1× `dust_devil` (15); `clay_burst` was committed and never landed.
  In seed `20261120` it committed 6 shots and landed none, while the cub slipped
  each 480-512 ms startup. Its reliable damage is the `basic` fallback, not the
  kit.
- Its **kite band is unoccupiable at spd 5** (finding above): floor 1472-1600 mm
  against a 970-1425 mm reality. The retreat latch then spends its decisions
  backing off instead of committing — the 5-9 commit fights.
- Stamina is a secondary limiter only: minima of 0 occur, but the tortoise's
  stamina at the cap is 6-76 in most of its fights, and it never refuses a commit
  for stamina in the two full logs.

What it is **not**: a band/interval mismatch (bands sit inside the interval with
metres to spare), and not an opponent-side refusal to engage.

### 3. The non-tortoise stalls are the same throughput shortfall

`shalemole v water_axolotl` (#17-#19), `mossboar v embercub` (#23-#25),
`water_axolotl v electric_hound` (#5-#6), `plant_ox v embercub` (#4) and
`wind_falcon v water_axolotl` (#10) all run healthy commit rates (9-16 per side),
land 13-23 blows, and cap with both sides at 40-98% of the foe's pool. Two of
them are decided by 2.2-3.9% of a pool. There is no species-local defect to point
at in those five pairings; they are the global pacing property of finding 1.

## Synthesis

**The stall is not tortoise-local.** It has two independent sources:

1. **Tortoise-local (9 of 25):** the tortoise's carried kit is the slow half of
   its pool, its long startups are slipped, and its kite band is 1.5× the range
   its own `spd` can hold — so in those fights its damage share collapses to
   0-17% and the opponent coasts to points. This is inside FR-2's surface: the
   four it selects, and the stat envelope inside `[11,15]` atk / `[163,209]` hp /
   `[10,13]` def.
2. **Global (11 of 25 clock-bound, plus the 5 opponent-conversion fights):** a
   40 s cap against 160-189 HP pools and ~0.3 commits/s per side. FR-2 cannot
   reach this, and the brief's fence is right to forbid it.

**Debt to record (not this track's scope):**

- **D-1 (global pacing):** 11/25 stalled fights had both sides converting and
  ended 2-13% short of a KO. Fixing that means touching damage, pools, the
  exchange cadence or the cap — every one of those is out of scope here. Own
  track.
- **D-2 (kite band vs `spd`):** the kite doctrine's floor (1472-1600 mm at these
  edge lengths) is unholdable by a `spd 5` body (0.55 mm/ms) against 1.0-1.63.
  The retreat latch is doing what it was written to do; the band is what does not
  fit a slow body. `threatBandFor`/`bandFor` and the controller are explicitly out
  of scope (FR-2a fence, spec "Out of scope"), so if Phase 2 cannot move the
  number inside the tortoise's own data, this is the reason and the phase is
  **blocked**, not licensed to raise `spd`.
- **D-3 (sample composition):** the fixture is 14 pairings × 3 seeds with three
  species ever away; the 840-fight matrix reads 26.7% cap on the same tree. The
  59.5% is largely a composition reading. FR-3/Phase 3 owns it; the two readings
  are not comparable and must not be presented as a before/after pair.

## Recommendation for Phase 2 (inside FR-2's surface)

**Try kit selection first, stat envelope second.**

1. **Reorder the six so `sand_blast` is carried in place of `clay_burst`:**
   `pebble_shot, dust_devil, sand_blast, boulder_toss, clay_burst,
   tectonic_slam`. This is a pure reorder — the species keeps its own six moves
   (FR-2a), `spd` stays 5, `hp`/`def` are untouched.
   Expected: the carried cycle mix goes from {1170, 1342, 1802, 1950} to
   {1170, 1342, 1066, 1950}, the cheapest shot's stamina from 12 to 8, and the
   fastest available startup from 480 to 240 ms — halving the slip window at the
   970-1425 mm range where the tortoise actually fights. `clay_burst` is the
   move to drop because it never landed in either full-resolution log, while
   `boulder_toss` supplied 4 of the 9 blows in seed `20261108`.
   Expect the **9 tortoise-collapse fights to move first** (commits 5-9 → 8-12,
   landed blows 0-1 → 3-6, damage share 0-17% → 25-40%). On the *old* sample
   that would be 19/42 (45%), but that number is not the target and is not
   comparable to the re-composed sample.
2. If that is not enough, **raise `atk` 11 → 13** (inside `[11,15]`) as a
   separate step, so the effect is attributable. It raises damage per landed blow
   but not commit count; watch the species win band for oppressiveness, since the
   tortoise already wins 5 of these 15 fights on points with `atk 11`.
3. **Do not** touch `spd` (fenced by FR-2a), the band, the controller, or another
   species. If both steps leave the tortoise's 9 collapse fights unchanged, the
   binding constraint is D-2 and the phase should report `blocked` with these
   numbers rather than widen the fence.

## Commands

| # | command | exit | result |
| --- | --- | --- | --- |
| 1 | `bun run telemetry` | 0 | `cap share: 25/42 (59.5%)`; all 14 bounds `ok` (engagement 379/1087/3992 mm, exchange 0.31/0.28/s, idle 26.6%, contact 7.1%, retreats 20977/20263, dead zone 22 (2.4%), positions 63/176, duration 18.44-40.00 s) |
| 2 | `bun run trace --owned fire_drake --rival earth_tortoise --seed 20261108 --check` | 0 | `time — Basalt Tortoise wins`; 5/5 invariants (`y-zero`, `hp-range`, `arena-bounds`, `integers`, `deterministic`); hash `0xbf421ad9` |
| 3-27 | `bun run trace --owned <home> --rival <away> --seed <seed> --check --every 1000` for the other 24 time-outs | 0 each | 5/5 invariants each; the summaries are Table A |

Every trace reproduced its `bun run telemetry` row (time, blows, commits, gap,
cells), so the per-fight numbers in Table A are the shipped tree's own.

## Deviations

- **Ad-hoc probe could not run.** The plan was to measure the per-decision
  "why no legal move" attribution with a throwaway script under
  `.conductor/evidence/`. The shell permits only the named/configured commands
  (`bun <file>` returns `permission denied`), so the script was deleted unrun and
  every number here comes from `bun run telemetry` and `bun run trace`. The
  attribution was done instead from the trace summaries plus the two
  full-resolution event logs, which is why findings 2 and 3 quote landed-move
  decompositions rather than a per-decision census.
- 24 of the 25 trace runs add `--every 1000` to the brief's command to bound the
  step log. The verification fight (command 2) ran exactly as written.
- No file outside this one was created, edited or committed.

## Notes for the primary

1. **The brief's "12 of the 25" is 15.** Five tortoise pairings × three seeds
   (`fire_drake`, `electric_hound`, `reefclaw`, `earth_tortoise v embercub`,
   `embercub v earth_tortoise`). Ten time-outs contain no tortoise.
2. **The seed column in the brief is correct** — all 25 seeds were confirmed by
   replaying them and matching the telemetry row (e.g. `plant_ox v embercub`
   `20261109` = row 4, `20261111` = row 6, the KO).
3. **Doctrine refusal is not in play.** The sample selects only press and kite
   (`doctrineForTactic`), and `sideOf` sets no coach rule, so `ruleRefuses` can
   never fire here. Every hold is geometric (retreat latch), resource-based, or a
   landing failure. A diagnosis that blames "the doctrine rule" would be wrong on
   this tree.
4. **The number is mostly composition.** 11/25 stalls are global throughput and 5
   more are the foe's conversion, so a tortoise-only fix cannot clear the fixture;
   the re-composed 42-distinct sample (FR-3) is what makes AC-4 reachable. Do not
   let Phase 2 be judged on the old 42.
5. **The honest blocker, if it comes to that, is D-2** (kite floor 1472-1600 vs
   `spd 5`). It is recorded above with numbers so a `blocked` report from Phase 2
   can cite this file instead of widening the fence.

## Primary verification

Run independently by the primary on the phase tip, after the subagent's own runs.

| Command | Exit | Result |
| --- | --- | --- |
| `bun run telemetry` | 0 | `cap share: 25/42 (59.5%)`, `dead zone: 22 commits (2.4%)`, 14/14 bounds `ok` |
| `bun run trace --owned fire_drake --rival earth_tortoise --seed 20261108 --check` | 0 | `ending time — Basalt Tortoise wins`, hash `0xbf421ad9`, 5/5 invariants |

**Diff review.** `git diff --name-only 8e5740ec..HEAD` lists exactly one file,
`conductor/tracks/20261112-capshare-pacing/verification/phase-1.md`. No file under
`packages/` or `apps/` moved, which is the phase's whole contract: this phase
measures the shipped tree and changes nothing. The tree is clean, and the single
commit is `36ed901d docs(conductor): diagnose the 25 stalled fights in the capshare
sample`.

**Claim check.** The two headline claims were re-derived from the primary's own
runs rather than taken on trust: the sample still reads 25/42 with `capShare`
sitting 0.5 points under its ceiling, and the stalled fight still ends at the
40 s bell with the tortoise ahead on points. The per-fight tables (A and B) and the
three cross-cutting findings are the subagent's work; their arithmetic is
internally consistent with the telemetry aggregate (`exchangeHome` 0.31/s,
`idleShare` 26.6%, `contactShare` 7.1%) and with the trace summary for the one
fight the primary replayed by hand.

**Corrections accepted.** The brief said `earth_tortoise` is a side in 12 of the
25 time-outs; the true figure is 15 (five pairings × three seeds), and ten
time-outs contain no tortoise at all. The brief's seed column was right. Both
corrections are recorded above and change no requirement: FR-1 asked for the cause
per fight, and it is now named for all 25.

**Consequence for Phase 2, recorded here so the plan is not read as an oversight.**
The synthesis says the stall is **not** tortoise-local: 9 of 25 are the tortoise's
own carried-kit defect, and 16 are global throughput (11 clock-bound with both
sides converting, 5 opponent conversion). FR-2's fence is therefore correct and
stays: Phase 2 may move only the tortoise's kit selection and its stat envelope.
The ≤ 52% target does not require reaching the global 16 — flipping the 9 tortoise
collapses alone takes the shipped sample to 16/42 (38%), which clears the bar with
margin, and the remaining caps become debt **D-1** for a pacing track that is
allowed to touch damage, pools, cadence or the cap. If Phase 2's in-surface levers
fail to move those 9, the phase reports `blocked` citing **D-2** (kite floor
1472-1600 mm against `spd 5`), not a licence to raise `spd`.
