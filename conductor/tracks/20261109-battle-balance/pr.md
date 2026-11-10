# Battle agency and balance

Two changes in order: give the player agency over **how** a fight is fought, then balance the
numbers against a controller that has stopped moving.

## Agency

- **Four doctrines** — Press, Circle, Kite, Counter. Each sets the range band (derived from
  the reach edge, never a fixed number inside two touching bodies), the strafe intent and the
  dodge policy. Circle seeks the rear arc, which needed a **step-around burst** (2.5x walk,
  its own stamina price) because a walk-speed strafe turns the line at 1.15 deg/step against
  a 2.86 deg/step tracking rate — a rear arc was geometrically unreachable without it.
- **One conditional note** — save the heavy for a break, dodge every telegraph, keep
  something back below a stamina floor, never commit into a startup that reaches. Exactly one
  equipped, inert when none is, and an impossible note cannot deadlock (it holds or strafes).
- **A controller that executes competently and never invents a plan** — an opponent reach
  model, whiff-and-punish (measured: step out of a swing, land 17 into its recovery), commit
  timing against recovery and poise breaks, a stamina reserve that binds only near a break,
  and a bounded 3-field memory. Execution-only: `controller-profile.ts` is byte-identical to
  the phase before it.
- Temperament now shades **intensity inside** the doctrine's band rather than owning spacing,
  so a `rush` creature on Kite kites harder, not closer.

## Balance

- **One stat sheet.** `HP_SCALE_PERCENT` and `BLOW_WEIGHT` are folded into the authored stats
  and move power, so the sheet shows the numbers the fight uses. Save v26 migrates stored HP
  in place and maps old tactics onto doctrines; measured drift under 0.5%.
- **A damage band** — every one of the 49 moves lands between 4% and 12% of the reference
  pool on a front, non-counter, chart-neutral hit. A rear counter stacks to 1.875x and reaches
  ~21%, stated as an earned-angle reward rather than an accident.
- **Real per-move cooldowns** from the authored tier, charged at commit so a whiffed heavy
  still pays, separate from recovery and stamina. A heavy must out-earn the light it displaces
  or its cooldown comes down — it now does, 8.15-8.72 vs 8.00 power/s.
- **A symmetric chart** — fire>plant>water>fire and electric>earth>wind>electric at
  1.5x/0.667x, so no species is structurally favoured. Upsets come from training plus
  positioning, as ruled.
- **Seeded variance** — accuracy rolls and a bounded downward damage spread, with the RNG
  cursor in the state hash, so a rematch differs and a replay still repeats exactly.
- **A gate that tells the truth.** `bun run balance` measures each species at its bounds
  midpoint, gates on a two-sided 95% interval derived from **distinct** fights rather than
  game count, and fails a row it cannot judge instead of passing it.

## Three reviews, and the numbers that were wrong twice

The first pacing pass reported 54.5% and was manufactured (cap fights counted as in-band). The
second green gate was blind (`finalHp` looked up by display name, so `distinct` counted winner
and duration only, inflating every interval to 24-28 points). Both were caught by review, not by
tests, which is why the shipped gate now carries a test that two fights sharing winner and
duration but differing in final HP count as two distinct fights.

## The one that mattered most

The first pacing pass looked like a 54.5% success and was manufactured: every cap-decided
fight lasts exactly 40.00 s, and the band counted those as "inside 25-40 s". The honest share
was 23.1%. Worse, the metric could only be improved by weakening the archetype it was
punishing — a tank that survives and holds more HP **is winning**.

The owner ruled an outlasting win legitimate. The gate now bounds cap share (<= 1/3), the
median (25-40 s), the fastest fifth (>= 8 s) and a **decisive** share (knockouts plus cap wins
with a real HP margin, >= 2/3), and prints the knockout-only band as a diagnostic. Nothing was
hidden and nothing was widened: a median bound, a percentile floor and a margin floor are
stricter than an unbounded "majority in band".

## Measured

| Row | Before this track | After |
| --- | --- | --- |
| cap share (matrix) | 83.8% | **30.0%** |
| decisive share | not measured | **92.4%** |
| median duration | 40.00 s (the cap) | **30.69 s** |
| fifth percentile | not measured | **14.96 s** |
| damage band | basics 1.2%, heavies 22-27% | **49/49 inside 4-12%** |
| attack rate | 3.78/s combined (a clinch) | 0.66/s, median gap ~1.1 m |
| species rows inside the 95% gate | never measured | **15/15**, on distinct fights |
| cap-win quality | not measured | **74.6%** of cap wins clear the margin floor |

`bun run verify` 3,975 pass / 1 skip / 0 fail; `bun run build` exit 0; `bun run balance` exit
0 for the first time in this track; `bun run telemetry` 13/13 (cap share 7/14 = 50.0%, exactly
at its bound).

## Known and recorded, not claimed fixed

- **The roster is still not balanced, and the gate now says so honestly.** Three of fifteen
  species sit inside the printed 45-55% design band and twelve outside it, because 112 games are
  only 21-35 distinct fights - a 17-21 point interval. All fifteen pass the two-sided 95% test
  with the error derived from distinct fights, which is what exposed the four rows this track
  actually moved (reefclaw 71.4 -> 55.4, voltfox 33.9 -> 51.8, shalemole 33.9 -> 57.1, and the
  tank below). Widening variance comes before narrowing that band.
- **The tank needed a landable swing, not legs.** `earth_tortoise` read 26.8% and closed to a
  988 mm median gap while losing 8 blows to 10, and 1 blow to 11 against a neutral opponent,
  because `recoveryMsFor` scales recovery by `10 / spd` and `spd 4` means 2.5x recovery on every
  swing. Shortening `startupMs` 600 -> 512 on the one move it actually commits to took the row to
  39.3% inside its bound without touching recovery, power or pacing. Recorded residual: the
  axolotl matchup is unchanged at 1 blow to 11, because there the tank's swings are evaded rather
  than interrupted, so the row went green on other pairings.

🤖 Generated with [Conductor](https://github.com/mansyar/apex-league)
