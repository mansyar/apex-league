# Phase 1 — Diagnose: where Kite's fight is lost

- Track: `20261111-kite-verdict`
- Phase: 1 (Diagnose) — FR-1, FR-2 / AC-1, AC-2
- Date: 2026-11-11 (UTC+11)
- Branch: `feat/20261111-kite-verdict`
- Base: `85f8b4a0`
- Head: `f81fbea0` (code commit; the evidence commit below sits on top)
- Result: **diagnosed, read-only** — no production/pacing/doctrine/bounds changes

## Contracts

- `bun run verify` → 4113 pass, 1 skip, 0 fail; biome clean on all touched
  files; the single remaining error is the pre-existing unformatted
  `conductor/tracks/20261111-kite-verdict/metadata.json` (track setup,
  out of scope — never edited per Conductor rules).
- `bun run build` → exit 0 (`@apex/client` built in 553 ms).

## FR-1 / AC-1 — per-fight baseline on pinned seeds (typical line)

Pinned seeds `20261109, 20261110, 20261111` × orders 0/1, measured side
varies, opponent press. Recorded in `probeFights` / `dodgeProbeFights`
(`controller-kite.test.ts`) and printed into the CI log by the FR-1 test.
Cross-checked against the official balance report in the same `verify` run.

Doctrine table — fire_drake measured, electric_hound press:

| seed | order | winner | reason | paid dodges (measured) | finalHp |
|------|-------|--------|--------|-------------------------|---------|
| 20261109 | 0 | measured | ko | 14 | drake 42, hound 0 |
| 20261110 | 0 | opponent | ko | 7 | drake 0, hound 47 |
| 20261111 | 0 | opponent | ko | 0 | drake 0, hound 79 |
| 20261109 | 1 | opponent | ko | 37 | hound 42, drake 0 |
| 20261110 | 1 | opponent | ko | 0 | hound 89, drake 0 |
| 20261111 | 1 | measured | ko | 7 | hound 0, drake 20 |

Totals: **wins 2/6 (33.3%), paid dodges 65 (10.83/fight)**. The R2-cited
`0/6` is no longer the verdict; the official report prints
`Kite 33.3% — the R1 0/6 result is no longer the verdict`.

Dodge probe — electric_hound measured, earth_tortoise press:

| seed | order | winner | reason | paid dodges (measured) | finalHp |
|------|-------|--------|--------|-------------------------|---------|
| 20261109 | 0 | measured | time | 9 | hound 43, tort 34 |
| 20261110 | 0 | measured | time | 11 | hound 73, tort 31 |
| 20261111 | 0 | opponent | ko | 0 | hound 0, tort 186 |
| 20261109 | 1 | measured | time | 23 | tort 41, hound 63 |
| 20261110 | 1 | opponent | time | 12 | tort 144, hound 7 |
| 20261111 | 1 | opponent | time | 36 | tort 85, hound 78 |

Totals: **wins 3/6 (50%), paid dodges 91 (15.17/fight)** — matches the
report's dodge-probe row (2.00 / 1.67 / **15.17** / 10.00).

## FR-2 / AC-2 — mechanism: gap, timing, fence (doctrine traces)

`battle-trace.ts` gained `--doctrine` / `--rival-doctrine` so a traced
fight can be a doctrine-probe fight (tactic mapped forward, replay still
cross-checked against `resolveContinuous`). Method note: traces fight on
the telemetry REFERENCE line while the probe fights on the typical line,
so outcomes are cited separately; the spatial mechanism is
stat-independent (band geometry, aggression cadence, fence).

- **Gap (firing window):** drake-on-kite vs hound-on-press (seeds
  09/10/11) holds gap median 1094/1321/1107 mm with only
  6.4/9.3/8.7% of steps inside 1600–2050 and ~88% below the 1600 floor.
  The official doctrine row agrees: Kite median gap 1162 mm — the widest
  of the four doctrines, yet ~440 mm short of its own floor.
- **Timing (output deficit):** same three traces: kite-side commits
  7/6/8 vs press 12/12/14; blows 4/5/7 vs 12/12/12; damage
  45.2/47.5/70.1% vs 100%+; attack rate ~0.19/s vs ~0.38/s. Kite's
  aggression 40–50% produces half the output of press 85–95%.
- **Dodge volume (ruled OUT as the saver):** the dodge probe pays 91
  dodges and goes 3/6; seed 20261111 order 1 loses with **36 paid
  dodges** (finalHp 85–78, time), and the doctrine table loses seed
  20261109 order 1 with **37 paid dodges**. The same tortoise-vs-kiter on
  the trace slips 8/8 incoming shots, lands 2/10 commits, and still loses
  on points 157–82. Dodging avoids damage without converting.
- **Stamina (ruled OUT as the killer):** drake-on-kite stamina min
  68/18/48 of pool 100 across the three traces; the press foes hit 0.
  The grinder starves, not the kiter.
- **Fence (ruled OUT as primary):** ≤1 pinned event per fighter per
  trace; `arena-bounds` invariant holds everywhere.
- **Contrast:** drake-on-counter vs the same press foe (seed 20261110)
  fights at median gap 868, commits 10 vs 9, lands 10 blows for 101% and
  KOs. In-close output wins the matchup Kite loses from outside it.

## Verdict (named for Phase 2 to measure)

**Lost in the approach.** Kite never establishes its 1600–2050 band
(~88% of steps below the floor), so its low-aggression output (half the
press rate) is out-traded at gaps where the foe fights at full rate,
while its paid dodges buy avoidance without conversion. The lever Phase 2
must test is the range band / strafe bias (hold the band or commit
inside it) — not dodge pricing, stamina, or the fence.

## Paths

- `packages/sim/scripts/battle-trace.ts` — `--doctrine`,
  `--rival-doctrine` (harness-only; resolver untouched)
- `packages/sim/src/battle/continuous/battle-trace.test.ts` — defaults +
  doctrine-flag parsing tests
- `packages/sim/src/battle/continuous/controller-kite.test.ts` —
  `ProbeFight`, `probeFights`, `dodgeProbeFights`, FR-1 per-fight test
- `.conductor/evidence/kite-probe.scratch.test.ts` — retired scratch
  (no tests; measurement superseded by this file)

## Deviations

None outside `Touches`. No production, pacing, doctrine, or bounds
changes. The `metadata.json` biome error is pre-existing track-setup
formatting and was deliberately not touched.

## Notes

- `bunx` is denied under this executor's shell permissions, so biome was
  validated through `bun run verify`, not a targeted `biome check`.
- The brief's cited R2 baseline (0/6, ~24/fight) has drifted with honest
  variance fixes: current pinned baseline is 2/6 doctrine-table (10.83
  paid/fight) and 3/6 dodge-probe (15.17 paid/fight).
- Commit `dodgeProbeFights` naming mirrors the report's "dodge probe"
  (R1, F2) fixture: hound vs tortoise, opponent press.
