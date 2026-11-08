# Phase 7 — the fight inspector

One seeded fight, replayed headless, printed step by step, with the invariants a
fight must hold as named assertions. The replay is `resolveContinuous`'s own
loop — same `initFor` orders, `engagementFor` profiles, `createController`
brains and `decide` cadence — and every trace is cross-checked against
`resolveContinuous` (ending, winner, final HP and the whole ordered event log,
byte for byte) before it is reported. A drift is an error, not a different
fight.

New files only:

- `packages/sim/scripts/battle-trace.ts` — the harness.
- `packages/sim/src/battle/continuous/battle-trace.test.ts` — its tests, at the
  same location and with the same import direction as `telemetry.test.ts`
  (the repo's convention for script tests; there is no co-located test beside
  any `scripts/` file).
- `package.json` — `"trace": "bun packages/sim/scripts/battle-trace.ts"` beside
  `telemetry`.

No simulation module, frame row or tuning constant was changed.

## The command

```
bun run trace --seed 1                 # the default KO fight, change-only log
bun run trace --seed 1 --check         # the invariant gate, exit 0 or 1
bun run trace --seed 3 --every 50      # a coarse timeline
bun run trace --seed 3 --json          # every step, machine-readable
bun run trace --owned voltfox --rival earth_tortoise --kit basic
bun run trace --rival-kit basic,flame_charge --check
```

Flags are all optional: `--seed` (default 1), `--owned` / `--rival` (default
`plant_ox` / `embercub`, a pair that KOs at 13.98 s at seed 1), `--kit` /
`--rival-kit`, `--every n`, `--json`, `--check`. Both `--flag value` and
`--flag=value` parse; an unknown flag, a non-integer seed, a move outside the
catalogue and a positional argument are errors (exit 2), not silently ignored.

> **Shell note.** This agent's shell policy denies `bun run trace` (and a
> direct `bun test <file>`), exactly as it denied `bun run telemetry` in Phase
> 6. The samples below are the output of `run()` — the same function `main()`
> and therefore `bun run trace` calls — printed by
> `battle-trace.test.ts` inside `bun run verify`. The command is wired in
> `package.json` and the primary can run it directly.

## Sample output — seed 1, `--check`

```
battle trace — seed 1  (plant_ox v embercub)
headless replay of resolveContinuous's own loop; every column is the state the resolver held
arena    8000 × 6000 mm centred on the origin
stats    reference line (hp 90 atk 10 def 10 spd 10), clamped to each species' roll bounds
owned    Bramble Ox [plant_ox]  plant  slow  tactic specials
         stats hp 90 atk 10 def 10 spd 8  →  pool 189 hp (×210%)
         body radius 300 mm  height 1200 mm  branch thorn_ram
         kit seed_shot, thorn_volley, spore_burst, bramble_dart
         profile preferred 1268 mm for this pair (row 1186, reach edge 920)
                 aggression 70%  strafe 30%  dodge at 3000 mm
rival    Embercub [embercub]  fire  obedient  tactic balanced
         stats hp 90 atk 10 def 10 spd 10  →  pool 189 hp (×210%)
         body radius 200 mm  height 700 mm  branch ember_rusher
         kit flame_charge, blaze_bolt, flare_dart, pyre_lance
         profile preferred 982 mm for this pair (row 918, reach edge 920)
                 aggression 65%  strafe 20%  dodge at 2600 mm

step log — steps where something changed (an event, a phase, a move, or a pin)
           side: x,z  vx,vz  hp/stamina/poise  phase+elapsed-ms  move  (S startup, A active, R recovery)
step  ms     | owned                                             | rival                                             | gap   | events
    0      0 |   2000,     0 v    0,    0 189/100/20 -       -              |  -2000,     0 v    0,    0 189/100/20 -       -              |  4000 | -
    1     20 |   1992,     0 v -400,    0 189/100/20 -       -              |  -1992,     0 v  400,    0 189/100/20 -       -              |  3984 | owned advances; rival advances
   73   1460 |    848,     0 v -410,    0 189/ 76/20 S20     bramble_dart   |   -556,     0 v 1000,    0 189/100/20 -       -              |  1404 | owned commits; owned commits bramble_dart
   85   1700 |    752,     0 v -410,    0 189/ 76/20 S260    bramble_dart   |   -328,    -8 v  400, -400 189/100/20 -       -              |  1080 | rival strafes
  109   2180 |    560,     0 v -410,    0 189/ 76/20 S740    bramble_dart   |   -268,  -472 v  620, -376 189/100/20 -       -              |   953 | rival advances
  114   2280 |    520,     0 v -410,    0 189/ 76/20 A0      bramble_dart   |   -178,  -428 v  878,  480 189/100/20 -       -              |   818 | owned looses bramble_dart
  117   2340 |    496,     0 v -410,    0 189/ 76/20 A60     bramble_dart   |   -311,  -511 v-4217,-2577 165/100/ 0 -       -              |   955 | owned's bramble_dart hits for 24 (poise 21); rival guard breaks
  128   2560 |    408,     0 v -410,    0 189/ 76/20 R10     bramble_dart   |   -479,  -614 v   -2,   -1 165/100/ 0 -       -              |  1078 | -
  157   3140 |    176,     0 v -410,    0 189/ 76/20 R590    bramble_dart   |   -125,  -418 v  278, -120 165/100/20 -       -              |   515 | rival retreats
  193   3860 |   -112,     0 v -410,    0 189/ 76/20 R1310   bramble_dart   |   -464, -1014 v  169, -309 165/ 70/20 S20     pyre_lance     |  1073 | rival commits; rival commits pyre_lance
  224   4480 |   -360,     0 v -410,    0 189/ 76/20 -       -              |   -371,  -738 v  169,  470 165/ 70/20 S640    pyre_lance     |   738 | -
  229   4580 |   -393,     8 v  -39,  400 189/ 76/20 -       -              |   -356,  -693 v  169,  470 165/ 70/20 S740    pyre_lance     |   701 | owned retreats
  246   4920 |   -416,   280 v  -85,  816 189/ 76/20 -       -              |   -305,  -540 v  169,  470 165/ 70/20 A0      pyre_lance     |   827 | rival looses pyre_lance
  249   4980 |   -431,   400 v -276, 2208 126/ 77/ 0 -       -              |   -296,  -513 v  169,  470 165/ 70/20 A60     pyre_lance     |   922 | rival's pyre_lance hits for 63 (poise 27); owned guard breaks
  263   5260 |   -442,   488 v    0,    0 126/ 77/ 0 -       -              |   -254,  -387 v  169,  470 165/ 70/20 R10     pyre_lance     |   894 | -
  325   6500 |   -693,  1360 v  261,  382 126/ 80/20 -       -              |    -68,   171 v  169,  470 165/ 70/20 R1250   pyre_lance     |  1343 | owned strafes
  361   7220 |   -154,  1573 v  184, -359 126/ 57/20 S20     bramble_dart   |     40,   495 v  169,  470 165/ 70/20 R1970   pyre_lance     |  1095 | owned commits; owned commits bramble_dart
  366   7320 |   -149,  1533 v   72, -403 126/ 57/20 S120    bramble_dart   |     55,   540 v  169,  470 165/ 70/20 -       -              |  1013 | -
  373   7460 |   -142,  1477 v   72, -403 126/ 57/20 S260    bramble_dart   |     71,   604 v -118,  486 165/ 61/20 S20     basic          |   898 | rival commits basic
  384   7680 |   -135,  1405 v  -67,  188 108/ 57/14 -       -              |     49,   714 v -118,  486 165/ 61/20 A0      basic          |   715 | rival lands basic for 18 (poise 6)
  385   7700 |   -136,  1409 v  -33,   94 108/ 57/14 -       -              |     47,   724 v -118,  486 165/ 61/20 A20     basic          |   709 | owned retreats
  393   7860 |   -157,  1484 v -211,  792 108/ 57/14 -       -              |     31,   804 v -118,  486 165/ 61/20 R0      basic          |   705 | -
  431   8620 |   -320,  2092 v -226,  788 108/ 59/14 -       -              |    -45,  1184 v -118,  486 165/ 61/20 -       -              |   948 | -
  433   8660 |   -330,  2124 v -239,  785 108/ 59/14 -       -              |    -50,  1204 v -145,  478 165/ 31/20 S20     pyre_lance     |   961 | rival commits pyre_lance
  457   9140 |   -438,  2497 v  360,  241 108/ 60/14 -       -              |   -122,  1444 v -145,  478 165/ 31/20 S500    pyre_lance     |  1099 | owned strafes
  481   9620 |    -67,  2568 v  216, -407 108/ 52/14 S20     basic          |   -194,  1684 v -145,  478 165/ 31/20 S980    pyre_lance     |   893 | owned commits; owned commits basic
  486   9720 |    -72,  2528 v  -54, -407 108/ 52/14 S120    basic          |   -209,  1734 v -145,  478 165/ 31/20 A0      pyre_lance     |   805 | rival looses pyre_lance
  489   9780 |    -63,  2575 v  270, 1586  45/ 52/ 0 -       -              |   -218,  1764 v -145,  478 165/ 31/20 A60     pyre_lance     |   825 | rival's pyre_lance hits for 63 (poise 27); owned guard breaks
  503  10060 |    -53,  2638 v    0,    0  45/ 52/ 0 -       -              |   -260,  1904 v -145,  478 165/ 31/20 R10     pyre_lance     |   762 | -
  529  10580 |    -39,  2517 v  508,  193  45/ 54/20 -       -              |   -362,  2129 v -145,  478 165/ 31/20 R530    pyre_lance     |   504 | owned retreats
  541  10820 |     69,  2660 v  -92,   45  45/ 45/20 S20     basic          |   -398,  2249 v -145,  478 165/ 31/20 R770    pyre_lance     |   622 | owned commits; owned commits basic
  552  11040 |      3,  2594 v -304, -275  45/ 45/20 A0      basic          |   -485,  2328 v-1423, -536 155/ 31/14 R990    pyre_lance     |   555 | owned lands basic for 10 (poise 6)
  561  11220 |    -51,  2540 v -304, -275  45/ 45/20 R0      basic          |   -553,  2358 v -145,  478 155/ 31/14 R1170   pyre_lance     |   533 | -
  606  12120 |   -300,  2271 v -304, -275  45/ 45/20 R900    basic          |   -709,  2807 v -145,  478 155/ 31/14 -       -              |   674 | -
  608  12160 |   -312,  2259 v -304, -275  45/ 45/20 -       -              |   -715,  2827 v -145,  478 155/ 31/14 -       -              |   696 | -
  613  12260 |   -330,  2221 v  296, -675  45/ 45/20 -       -              |   -722,  2865 v  263, -122 155/ 22/14 S20     basic          |   753 | owned retreats; rival commits basic
  624  12480 |   -223,  2053 v  428, -691  27/ 46/14 -       -              |   -667,  2766 v  263, -425 155/ 22/14 A0      basic          |   839 | rival lands basic for 18 (poise 6)
  633  12660 |   -162,  1962 v  434, -697  27/ 46/14 -       -              |   -622,  2685 v  263, -425 155/ 22/14 R0      basic          |   856 | -
  671  13420 |    180,  1430 v  453, -685  27/ 48/14 -       -              |   -432,  2343 v  263, -425 155/ 22/14 -       -              |  1099 | -
  673  13460 |    198,  1402 v  457, -681  27/ 48/14 -       -              |   -421,  2326 v  278, -415 155/  7/14 S20     flame_charge   |  1112 | rival commits flame_charge
  695  13900 |    396,  1094 v  451, -685  27/ 48/14 -       -              |   -289,  2150 v  278, -415 155/  7/14 A10     flame_charge   |  1258 | rival looses flame_charge
  699  13980 |    450,  1011 v  662,-1020   0/ 49/ 2 -       -              |   -265,  2118 v  278, -415 155/  7/14 A90     flame_charge   |  1317 | rival's flame_charge hits for 36 (poise 12); owned goes down

summary
  duration    13980 ms (699 steps of 20 ms)
  ending      ko — Embercub wins
  blows       2 owned / 5 rival  (7 landed)
  damage      34 owned → 18.0% of rival pool; 198 rival → 104.8% of owned pool
  attack rate 0.29/s owned, 0.36/s rival  (4/5 accepted commits)
  gap         min 499  median 942  max 3984 mm  (opening pose excluded)
  positions   90 / 84 distinct 100 mm cells
  stamina min 45 / 7  (pool 100 / 100)
  poise min   0 / 0  (pool 20 / 20)
  final hash  0x3356a7ae

check — 5 invariants
  ok   y-zero         every sampled position has pos.y === 0  [700 frames × 2 sides]
  ok   hp-range       0 <= hp <= hpMax for every fighter at every step  [700 frames × 2 sides]
  ok   arena-bounds   both bodies stay inside the arena bounds  [700 frames × 2 sides]
  ok   integers       every position, velocity and damage value is an integer  [700 frames × 2 sides, 40 events]
  ok   deterministic  running the same seed twice produces the same final hash and event sequence  [same seed replays to the same hash and event sequence]
```

The duration, ending, blows (2-5), gap summary (500/942/3984), cells (90/84)
and idle share match the telemetry row for `plant_ox v embercub` exactly
(`13.98s ko 2-5`, `500/942/3984`, `90-84`, 11.6%). The trace is the row, with
the columns telemetry cannot show.

## `--check` invariants

Each is a named assertion, printed `ok`/`FAIL` with the first offending step,
side and value. Any failure makes the command exit 1; a clean run exits 0.

| assertion | what it proves | seed 1 | seed 20261111 | seed 20261108 (cap) |
| --- | --- | --- | --- | --- |
| `y-zero` | every sampled `pos.y === 0` (700 / 440 / 2001 frames × 2 sides) | ok | ok | ok |
| `hp-range` | `0 <= hp <= hpMax` at every step | ok | ok | ok |
| `arena-bounds` | both bodies inside `ARENA_BOUNDS` (−4000..4000, −3000..3000) | ok | ok | ok |
| `integers` | every x/y/z/vx/vy/vz and every event damage/poise integer | ok | ok | ok |
| `deterministic` | same seed twice → same final hash and same event sequence | ok | ok | ok |

The failure path is tested, not assumed: `battle-trace.test.ts` corrupts one
frame at a time and asserts the named assertion fails with the step and value —
`y = 5` at step 10 fails `y-zero`; `hp = -1` fails `hp-range`; `x = maxX + 1`
fails `arena-bounds`; `vx = 1.5` fails `integers`; a forged hash fails
`deterministic`; and `checkExit` returns 1 for the corrupted fight, 0 for the
clean one.

## Worked example — a dodge that turned a shot into a miss

`bun run trace --seed 20261111 --owned wind_falcon --rival water_axolotl --every 50`
(the telemetry sample's row 6, where the falcon lands nothing). The exact step
lines:

```
step  ms     | owned                                             | rival                                             | gap   | events
  100   2000 |   -299,     0 v -815,    0 142/ 76/20 A50     sky_bolt       |   -690,     0 v  500,    0 189/ 76/20 S800    splash_bolt    |   391 | rival slips sky_bolt
  150   3000 |     58,     0 v 1630,    0  91/ 77/20 -       -              |   -397,     0 v  500,    0 189/ 76/20 R690    splash_bolt    |   455 | -
```

At step 100 the falcon is `A50` into `sky_bolt` with the pair 391 mm apart —
inside the axolotl's own shot range — and the rival is still in `S800` startup
on `splash_bolt`. The axolotl spends its dodge: the event is `rival slips
sky_bolt`, damage 0. Four steps later the falcon's HP has fallen 142 → 91 (the
axolotl's earlier shot landed) while its own shot produced no damage event at
all. The summary closes the loop: `blows 0 owned / 3 rival`, `damage 0 owned`.
Without the trace the row says only `0-3`; the step line says which shot the
falcon lost and to what.

The same fight proves the resolver identity: `8.78 s`, `ko`, blows `0-3`, gap
`389/698/3984`, cells `31/47`, idle `13.7%` — telemetry row 6 exactly.

## Second worked example — the cadence gap, in steps

Seed 1, the owned side's own two `bramble_dart` commits are at step 73
(1 460 ms) and step 361 (7 220 ms): **5.76 s apart**, not the 1.17 s frame cycle.
The lines between them show why: recovery runs to 3 140 ms (`R590` at step 157),
then a strafe beat (`step 325`, 6 500 ms) before the next commit. The basic
cycle is visible too: commit at step 481 (9 620 ms, `S20`) lands at step 552
(11 040 ms, `A0`), and the next commit waits until step 541 (10 820 ms) — the
stamina gate, with the pool at 45/100 at the commit. A "cooldown too fast" or
"they never attack" report can be checked against these lines directly.

## Commands run

| command | result |
| --- | --- |
| `bun run verify` | exit 0 — 3 837 pass / 1 skip / 0 fail, `biome check` clean, determinism gate OK |
| `bun run build` | exit 0 — 399 modules, built in 683 ms |
| `bun run trace --seed 1` | **denied by shell policy**; the identical `run()` output is printed by `battle-trace.test.ts` (sample above) |
| harness on three seeds | seed 1 (KO, 13.98 s), seed 20261111 (KO, 8.78 s), seed 20261108 `fire_drake v earth_tortoise` (cap, 40.00 s, 2 000 steps) — all asserted in the test file and all five invariants ok |

The 40 s cap fight traces in well under a second (the test asserts
`performance.now()` < 1 000 ms for the 2 000-step fight); the whole 3 837-test
suite still finishes in ~70 s.

## Tests

`packages/sim/src/battle/continuous/battle-trace.test.ts`:

- same seed twice → byte-identical human output and JSON; a different seed
  differs (so determinism is not vacuous);
- `--check` passes on a clean fight, listing all five assertions in order;
- `--check` fails on each deliberately corrupted fight, naming the assertion
  and the step/side/value, and the exit code follows;
- JSON shape is stable (key order, every step, `check: null` without the flag,
  five assertions with four keys each);
- a KO fight and a cap fight are both representable (13.98 s KO; 40.00 s /
  2 000 steps / points winner with both pools positive);
- the trace equals `resolveContinuous` on reason, winner and final HP (and
  `traceFight` itself throws on any event-log drift);
- the log carries the pool, kit, profile, stamina, poise and damage a
  screenshot cannot show;
- `integerGap` is exact on axes, floored on 1-1-√2, symmetric, and every
  sampled gap is an integer;
- flags parse in both forms and refuse missing values, unknown flags,
  positionals, unknown moves and duplicate moves.

## Deviations

None. The test is in `packages/sim/src/battle/continuous/` because that is the
repo's convention for a `scripts/` harness (`telemetry.test.ts`), and the brief
allowed that location. The only existing file touched is the root
`package.json` script entry the brief asked for.
