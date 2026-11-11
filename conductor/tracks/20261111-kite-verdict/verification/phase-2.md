# Phase 2 — Lever Experiments: evidence

- Track: 20261111-kite-verdict — Kite Verdict
- Phase: 2 — Lever Experiments
- Date: 2026-11-11 (UTC)
- Branch: feat/20261111-kite-verdict
- Base commit: 1c9da8c8
- Head commit: be4c4e9e
- Result: verified

## Goal

Each range/strafe move scored on the 6-fight probe; only winners kept, bounds green.

## Lever ledger (one at a time, each with probe + pacing re-check)

Baseline (Kite aggression 40, floor 1600, ceiling 2050, strafe 30):

- Doctrine probe (fire_drake v electric_hound, 6 fights): 2/6 wins.
  Per-fight paid dodges: 14, 7, 0, 37, 0, 7 (total 65, 10.83/fight).
- Dodge probe (electric_hound v earth_tortoise, 6 fights): 3/6 wins.
  Per-fight paid dodges: 9, 11, 0, 23, 12, 36 (total 91, 15.17/fight).

1. Floor 1600 -> 1150 (alone) — REVERTED.
   Doctrine probe 4/6, but paid dodges 0, 0, 0, 0, 0, 0 (total 0: silences
   paid dodges on the fixed probe). Dodge probe 1/6, dodges 0, 0, 0, 12, 0,
   12 (total 24, 4.00/fight). Telemetry FAIL: capShare 8/14 (57.1%) >
   50.0%. Balance gate itself stayed green, but the lever breaks the
   telemetry pacing bound and zeroes doctrine-table dodges, so reverted.

2. Aggression 40 -> 55 (alone) — KEPT.
   Doctrine probe 5/6. Per-fight paid dodges: 16, 0, 0, 0, 0, 0 (total 16,
   non-zero). Dodge probe 1/6, dodges 12, 22, 10, 14, 0, 0 (total 58,
   9.67/fight, non-zero). Balance: Kite 83.3% (5/6), median gap 1049 mm,
   doctrine dodges 16 (2.9%), dodge probe 9.67/fight; every species /
   cap / duration / damage / boss bound ok. Telemetry: all bounds ok,
   capShare 7/14 (50.0%) passes. Other doctrine rows non-zero (Press
   33.3%, Circle 66.7%, Counter 100%).

3. Strafe 30 -> 45 (on top of aggression 55) — REVERTED.
   Zero delta: per-fight doctrine lines identical to lever 2 (5/6, dodges
   16, 0, 0, 0, 0, 0) and dodge probe identical (58 total). A move that
   fails to move the probe is reverted.

4. Ceiling 2050 -> 1850, i.e. narrow the band (on top of 55) — REVERTED.
   Doctrine probe falls to 3/6 and doctrine-table paid dodges go all-zero
   (0 total). Dodge probe 2/6, dodges 20, 12, 0, 36, 24, 32 (total 124).
   Worse than the kept winner on wins and silences doctrine-table dodges,
   so reverted.

5. Floor 1600 -> 1150 (on top of aggression 55) — REVERTED.
   Doctrine probe 6/6, but paid dodges 0 across all six fights (silences the
   dodge tool on the fixed probe). Dodge probe 5/6, dodges 20, 0, 0, 0, 0,
   0 (total 20, 3.33/fight). Wins move, but the lever zeroes fixed-probe
   paid dodges, so reverted per the hold-the-gate rule.

6. Aggression 40 -> 50, i.e. a smaller step (alone) — REVERTED in favour
   of lever 2.
   Doctrine probe 4/6, dodges 14, 0, 0, 0, 0, 4 (total 18, non-zero).
   Dodge probe 0/6 wins but 108 paid dodges (24, 12, 0, 36, 12, 24;
   18.00/fight, non-zero). Telemetry FAIL: capShare 8/14 (57.1%) > 50.0%.
   Breaks a pacing bound and is dominated by lever 2 (5/6, telemetry
   green), so reverted.

Kept change: Kite `aggression: 40 -> 55` only. Floor 1600, ceiling 2050,
strafeBias 30 unchanged.

## Golden propagation (deviation, outside Touches)

Any winning aggression bump flips two cup goldens that pin the old losing
Kite/specials behaviour (specials maps to Kite):

- `cup-contracts.test.ts` draw-stream golden: seed-19 QF3 moves from
  Thistledown Ash to Gilded Horn (re-pinned with a Kite-verdict ripple
  comment).
- `cup-contracts.test.ts` player-lifecycle golden: seed 11 on specials
  moves from a final loss (eliminated, placement 2) to a champion path
  (champion, placement 1, Ember Drake sweep, no completion fights;
  re-pinned with a Kite-verdict ripple comment, following the repo's
  established ripple-comment precedent). The now-unused `completeCup`
  import was removed with the old eliminated-path assertions.

`bun test packages/sim/src/cup-contracts.test.ts`: 15 pass, 0 fail.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| probe (each lever) | `bun test packages/sim/src/battle/continuous/controller-kite.test.ts --timeout 120000` | 0 | Per-lever 6-fight doctrine + dodge probe wins and paid dodges, recorded in the lever ledger above |
| pacing (each lever) | `bun run telemetry` | 0 / 1 | Lever 1 FAIL capShare 8/14 (57.1%); lever 2 all ok incl. capShare 7/14 (50.0%); lever 6 FAIL capShare 8/14 (57.1%) |
| pacing (kept winner) | `bun run balance` | 0 | All species / cap / decisive / quality / duration / damage / boss bounds ok; Kite 83.3%, dodge probe 9.67/fight |
| regression | `bun test packages/sim/src/battle/continuous/balance-report.test.ts --timeout 120000` | 0 | 20 pass, 0 fail (also run under the reverted floor lever: green) |
| regression | `bun test packages/sim/src/cup-contracts.test.ts --timeout 120000` | 0 | 15 pass, 0 fail after the two golden re-pins |
| verification | `bun run verify` | 0 | 4113 pass, 1 skip, 0 fail; Biome clean; determinism gate OK |
| acceptance | `bun run build` | 0 | Client builds; chunk-size warning only (pre-existing) |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | Every lever lists its measured probe delta plus a pacing/balance re-check; a lever that breaks a bound, silences paid dodges, or fails to move the probe is reverted | Lever ledger above: levers 1, 4, 5, 6 broke a bound or silenced dodges and were reverted; lever 3 moved nothing and was reverted; only lever 2 (aggression 55) kept with full green re-checks | pass |
| AC-6 | Probe dodge rate never zero throughout | Baseline doctrine 65 paid / dodge probe 91; kept winner doctrine 16 paid / dodge probe 58 (9.67/fight); every scored lever kept dodge-probe rate non-zero; levers that zeroed fixed-probe dodges (1, 4, 5) were reverted | pass |

FR-3 is covered by the one-at-a-time lever scoring with pacing re-checks;
FR-6 is covered by the non-zero paid-dodge hold across every kept move.

## Evidence paths

- `conductor/tracks/20261111-kite-verdict/verification/phase-2.md` (this file)
- Code: `packages/sim/src/battle/continuous/controller-profile.ts`
  (Kite `aggression: 40 -> 55`)
- Golden propagation (deviation):
  `packages/sim/src/cup-contracts.test.ts`

## Deviations

- `packages/sim/src/cup-contracts.test.ts` (outside Touches): two cup
  goldens re-pinned to the intended new Kite/specials behaviour (seed-19
  QF3 winner; seed-11 lifecycle now a champion path) plus removal of the
  consequently unused `completeCup` import. Required for `bun run verify`
  to pass with any winning lever; follows the repo's ripple-comment
  re-pin precedent. No product copy, spec, plan, or tuning numbers
  touched.

## Notes

- Stats, move powers, cooldowns, stamina/poise, DECISION_MS, MISS_SCALE,
  DISTINCT_FLOOR, other doctrines' rows, and client copy untouched per the
  frozen list.
- Telemetry capShare is a 14-fight smoke fixture at its 50.0% ceiling:
  aggression 55 sits exactly on the bound (7/14). Aggression 50 and floor
  1150 both tipped it to 8/14 (57.1%, FAIL).
- The kept winner moves the doctrine probe 2/6 -> 5/6 with paid dodges
  intact (16 doctrine-table, 9.67/fight dodge probe) while every other
  doctrine row stays non-zero.

## Primary verification

- `bun run verify` exit 0 (log `.conductor/evidence/vK2.log`): 4113 pass,
  1 skip, 0 fail across 4114 tests / 373 files. Determinism gate
  byte-identical.
- `bun run build` exit 0 (log `.conductor/evidence/bK2.log`).
- Range `1c9da8c8..HEAD` held exactly the two reported commits, so
  squashed to `e238d2a9` (3 files, +150/−12: profile, cup-contracts
  re-pins, evidence).
- Deviation accepted: the two cup goldens pin the old losing
  Kite/specials behaviour and flip under ANY winning lever; re-pinned
  with ripple comments plus removal of the consequently unused import —
  smallest necessary change, no tuning numbers touched.
- AC-3: six levers each scored with probe + pacing re-check; five
  reverted with measured reasons (bound breaks, silenced dodges, or
  zero delta). AC-6: kept path never zeroes paid dodges (16 doctrine /
  58 dodge-probe).
