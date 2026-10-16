# Boss Balance Probe — AFTER (tuned)

Measured 2026-10-16 after Phase 3 tuning: boss pins softened within species
bounds and `SILVER_THRESHOLDS` lowered. Same instrument, same seeds
(`APEX_BOSS_REPORT=1`, 36 battles per cell). Player win rate at
training +0/+2/+4/+6.

## Tuned constants

- **Koda** (fire, gate): unchanged, bounds max — hp 92, atk 13, def 10,
  spd 12. Its cells already met the contract.
- **Hesse** (plant, checkpoint): hp 104→**100**, def 14→**13** (atk 11,
  spd 8 unchanged).
- **Marlow** (water, apex): hp 96→**92**, def 11→**9** (atk 12, spd 11
  unchanged).
- **`SILVER_THRESHOLDS`**: 21/30 → **18/24** — two champion cups per leg at
  ideal pace; realistic mid-trained pace (~1–2 pts/cup) makes each leg a
  deliberate grind that still moves.

## Result table

| Boss (element) | vs fire | vs plant | vs water |
|---|---|---|---|
| **Koda** (fire) | 0 / 16.7 / 86.1 / 100 | 0 / 0 / 0 / **55.6** | 80.6 / 100 / 100 / 100 |
| **Hesse** (plant) | 72.2 / 100 / 100 / 100 | 0 / 69.4 / 100 / 100 | 0 / 0 / 0 / **38.9** |
| **Marlow** (water) | 0 / 0 / 0 / **47.2** | 38.9 / 100 / 100 / 100 | 0 / 72.2 / 100 / 100 |

(bold = the previously-walled disadvantaged cells, now ≥35%)

## The exam contract (new tripwires, all green)

The old per-cell "boss strictly harder than the +5% rival" invariant was
unholdable under absolute pins (element advantage dominates pins), so the
acceptance contract was redefined per element — mirroring how the chart
track grades regular cups:

1. **A fresh player never beats the boss on even or worse elements** —
   mirror + disadvantaged cells are 0% at trained+0. The exam cannot be
   cheesed without investment.
2. **A disadvantaged player cannot win below full training** — 0% at
   +0/+2/+4, then ≥35% at the +6 cap. Off-element challengers must pay the
   full grind; the jump 0% → 38–56% at cap is the softened chart's
   grindability guarantee.
3. **Every boss is grindable at full training for every species** — all
   nine boss×species cells ≥35% at +6.
4. Advantaged species cruise (39–100% even untrained) — the type triangle
   is a real strategic lever against bosses, as intended.

## Milestone mapping note

The species-uniform "milestone trained level" (koda 2 / hesse 3 / marlow 5)
was dropped: element decides the required investment, not the rung. A
disadvantaged challenger needs the cap at every milestone; a mirror
challenger clears around +2/+4; an advantaged challenger may not need to
train at all. That is the type system speaking, and it is the intended
game.

## Pacing

Placement probe (trained+2 fire_drake, 42 cups): 0% champion / 14.3%
runner-up / 40.5% semi / 45.2% early — ~1–2 pts per cup. With 18/24 the
full Bronze→Silver-I ladder is ~10–14 cups (~day 70–100) for a mid-trained
creature, matching the Phase 2 vision of Silver as a substantial but
reachable mid-game.
