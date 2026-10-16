# Boss Balance Probe — BEFORE (fresh, post element_chart_20261016)

Measured 2026-10-16 under the pinned **3/2 · 2/3** chart and **HP×2** scale
(`APEX_BOSS_REPORT=1`, 12 battle seeds × 6 creature seeds = 36 per cell).
Player win rate, training levels +0/+2/+4/+6 (cap 6), boss = absolute
bounds-max pinned build (hp doubled with the scale: koda 92 / hesse 104 /
marlow 96).

## Boss difficulty table

| Boss (element) | vs fire | vs plant | vs water |
|---|---|---|---|
| **Koda** (fire, Promotion gate) | 0 / 16.7 / 86.1 / 100 | 0 / 0 / 0 / 55.6 | 80.6 / 100 / 100 / 100 |
| **Hesse** (plant, Silver III checkpoint) | 72.2 / 100 / 100 / 100 | 0 / 30.6 / 97.2 / 100 | 0 / 0 / 0 / 19.4 |
| **Marlow** (water, Silver I apex) | 0 / 0 / 0 / 19.4 | 38.9 / 100 / 100 / 100 | 0 / 27.8 / 97.2 / 100 |

Baseline — fresh +5% ramped same-species final rival: a full-trained (+6)
player beats it **100%** of the time at every element; untrained ~0–3%.

## Read

1. **Mirror exams are ideal.** Koda-fire 0→16.7→86.1→100 is a textbook
   difficulty curve: fresh players always lose, +2 rarely wins, +4 usually,
   +6 always. Hesse-plant and Marlow-water have the same shape shifted one
   level earlier.
2. **The gate is grindable for every species.** Koda: plant (disadvantaged)
   reaches 55.6% at full training — inside the chart track's ≥35% band.
3. **Two boss cells stay below the band at full training**: Hesse vs water
   **19.4%** and Marlow vs fire **19.4%** — the boss-advantaged extremes.
   Both stall at the same 19.4% (attrition/tiebreak-limited wins), ~same
   odds as losing every exchange but winning the tiebreak lottery.
4. **Advantaged matchups are cruise** (72–100% even untrained) — the type
   system dominates pins, so "boss strictly harder than the +5% rival per
   cell" can never hold with absolute pins; the invariant needs redefining,
   not more pin tuning.
5. **Cadence (idealized)**: champion-per-cup legs are bronze 2/2, silver
   3/3 with provisional `SILVER_THRESHOLDS {silverII: 21, silverI: 30}`.
   Realistic pace is slower: trained+2 players place 0% champion /
   14.3% runner-up / 40.5% semi / 45.2% early (42-cup placement probe),
   i.e. ~1–2 pts/cup → provisional Silver could mean 10+ cups (~70+ days)
   per leg for a mid-trained creature.

## Parked tripwires (`test.skip` in bosses.balance.test.ts)

- "bosses are strictly harder than the +5% final rival" — unholdable per
  cell under any absolute-pin design (advantaged cells invert it).
- "each boss is beatable by its milestone player" — the single
  species-uniform milestone trained level (koda 2 / hesse 3 / marlow 5)
  fails for the disadvantaged species at those levels.
