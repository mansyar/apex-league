# Battle Variance — close-out (2026-11-11, owner decision: record frontier, open re-tune)

All 4 phases executed, 18/18 tasks done, 0 phases green. No phase was skipped;
every red is a recorded waiver or a measured frontier, never an untouched task.

## What this track delivered (all merged-ready mechanism, no bound widened)

- **Honest accuracy (P1):** `MISS_SCALE` deleted; authored ladder is now the real
  probability (basic 9/100, light 10/100, flame 14/99, mid 16/88, bolt 17/95,
  chip 12/99, heavy 19/100). Measured ±0.02 over 20k draws; 100 never draws.
  Cost of honesty: capShare 33.6% at the time (healed to 21.0% by P2).
- **Execution noise (P2):** `controller-noise.ts` — cadence hold 1/16,
  press-commit skip 1/32, punish skip 1/16, dodge-side mirror, all through the
  seeded RNG with the cursor in the state hash. Same seed byte-identical;
  different seeds differ. Distinct median 46 → 109/112; diversity 34.8% of
  ordered pairings flip winner across seeds.
- **Kite pin (P3):** Kite 2/6 (Press 2/6, Circle 4/6, Counter 6/6) —
  zero production change, co-located regression test.
- **Re-baselined gate (P4):** distinct pins 48/50 → 100/109, design-band list
  11 → 8 ids, KNOWN_MISSES refilled to the 4 measured rows. No production diff.

## The frontier (why the gate is red)

`bun run balance` exits 1 on exactly 4 species rows, each 5–11 pts outside its
significance interval (distinct-derived, DISTINCT_FLOOR 12):

| Row | Rate (wins/112, distinct, se) | Miss |
|---|---|---|
| plant_ox | 67.9% (76, 102, 5.0%) | +8.2 pts over edge |
| earth_tortoise | 29.5% (33, 100, 5.0%) | −10.7 pts under edge |
| cindermoor | 59.8% (67, 110, 4.8%) | +5.5 pts over edge |
| galeheron | 33.9% (38, 109, 4.8%) | −6.7 pts under edge |

Variance tightens intervals around the same point estimates — it cannot move a
67.9% row. The only remaining lever is species stat tuning, out of scope here.

## Everything else green

Pacing: cap 21.0% ≤ 33.3%, decisive 97.1% ≥ 66.7%, quality 87.5% ≥ 66.7%,
median 30.04 s in 25–40 s, p05 16.38 s ≥ 8 s, damage 49/49, 6/6 bosses.
Telemetry 13/13 (cap 7/14 = 50.0%, zero headroom — held, not fixed).
`bun run build` exit 0. `bun run verify`: 3986 pass / 1 fail (the gate
assertion only).

## Handoff

Branch `feat/20261110-battle-variance` left unmerged (merging would carry a red
gate onto main). Next: a roster re-tune track moves the 4 rows above into the
45–55% design band by species stats/kit, with this track's gate as its starting
line and its green pacing as the guardrail.
