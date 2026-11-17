# Global Pacing — Phase 1 verification: measure the clock-bound fights

- **Track:** `20261117-global-pacing` — Global Pacing
- **Phase:** 1 — Measure the clock-bound fights
- **Date:** 2026-11-17
- **Branch:** `chore/20261117-global-pacing`
- **Base / measurement head:** `df67d9070c70776349eccbec745bee8f0ad030b9` (the phase base; no source file changed in this phase, so the head at measurement is the same commit — this evidence commit is the only delta)
- **Result:** `verified`

This is an evidence-only phase. No file under `packages/`, `apps/`, `scripts/` or
`.github/` was edited. Every number below was read from the three named commands
plus the permitted `bun run trace --owned … --rival … --seed … --check` variant.

## 1. Commands table

| Command | Exit | Summary |
| --- | --- | --- |
| `bun run telemetry` | 0 | 42 distinct pairings; `cap share: 20/42 (47.6%)`; 14/14 `ok` bounds; exchange 0.32/s home + 0.32/s away; idle 25.7%; dead zone 27 commits (2.9%); duration 14.48–40.00 s |
| `bun run balance` | 0 | 840 fights; `cap share: 224/840 (26.7%)`; 15/15 species `ok`; 49/49 moves inside the 4–12% band; decisive 803/840 (95.6%; 615 ko + 188 cap at ≥5.00 pts); cap-win quality 188/224 (83.9%); median 31.21 s; reference line 377/840 (44.9%) |
| `bun run trace --seed 20261111 --check` | 0 | pre-change replay baseline: final hash `0xb6cce858`, 5/5 invariants `ok`, `ko — Embercub wins`, 8 owned / 9 rival blows, 82 (47.4%) / 196 (103.7%) damage, gap 499/961/3984 mm |

Supporting per-fight measurement (all exit 0, all 5/5 invariants `ok`). The
`--every` switch is print-only and does not change the replay:

| Command family | Invocations | Exit | Summary |
| --- | --- | --- | --- |
| `bun run trace --owned <home> --rival <away> --seed <n> --every 100000 --check` | 20 (one per time-out, seeds in §4) | 0 each | header (reach/aggression/dodge profile) + step 0 + final step + summary per fight |
| `bun run trace --owned electric_hound --rival reefclaw --seed 20261141 --check` | 1 | 0 | full change-only event log for the mechanistic citations in §5 |
| `bun run trace --owned plant_ox --rival embercub --seed 20261109 --every 200 --check` | 1 | 0 | sparse event log cross-check |

## 2. Acceptance

| ID | Criterion | Verdict | Evidence |
| --- | --- | --- | --- |
| FR-1 | Before any behaviour change, record a diagnosis naming which side fails to convert and why, with per-fight commits/hits/idle share/gap/damage throughput for stalling pairings | met | §4 per-fight table (20 rows, both sides) + §5 synthesis |
| AC-1 | `verification/phase-1.md` names the stall mechanism with per-fight commit/hit/idle/throughput figures before any behaviour change | met | this file; no source file in the diff |

## 3. P1.T1 — shipped readings reproduced

**Telemetry (fixture population).** `cap share: 20/42 (47.6%)`; 14/14 bounds green
(`engagementMin` 380 mm ≤ 900, `engagementMedian` 1079 mm ≤ 1500,
`engagementMax` 3992 mm ≤ 4500, `exchangeHome/Away` 0.32/s ≤ 2.50,
`idleShare` 25.7% ≤ 50, `distinctPositions` 46 ≥ 20, `contactShare` 6.7% ≤ 70,
`retreatHome` 18948 and `retreatAway` 19333 orders ≥ 42,
`deadZoneShare` 2.9% ≤ 50, `capShare` 47.6% ≤ 60, `durationMin` 14.48 s ≥ 8,
`durationMax` 40.00 s ≤ 40). Stability re-pooling at n=14/30/42 shows
`capShare` 42.9% / 46.7% / 47.6% — the reading is composition-stable.

**Balance (matrix population).** 15 species, 840 matrix fights; ko 615 / time 224 /
draw 1; `cap share: 224/840 (26.7%)`; decisive 803/840 (95.6%); cap-win quality
188/224 (83.9%); duration min 8.70 s / median 31.21 s / max 40.00 s;
`damageBand` 49/49 moves inside 4–12% of the 189 pool; all 15 species rows `ok`
(the design-band misses printed in the summary line are not gate misses — the
bound applies a standard-error tolerance). `capShare` ≤ 33.3% green,
`decisiveShare` ≥ 66.7% green, `capWinQuality` ≥ 66.7% green, median in 25–40 s
green. Diagnostic reference line: 377/840 (44.9%) cap, 615/840 (73.2%) ko.
Boss table: koda 36.7%, hesse 20.0%, marlow 36.7%, delmar 23.3%, fenn 56.7%,
thessa 33.3%.

**Replay baseline.** `bun run trace --seed 20261111 --check` (the trace script's
default `plant_ox v embercub` pairing) resolves to `0xb6cce858` with five
invariants `ok`: `y-zero`, `hp-range`, `arena-bounds`, `integers`
(1551 frames × 2 sides, 139 events), `deterministic`. Ending `ko — Embercub
wins`, 31000 ms (1550 steps), blows 8/9, damage 82/196, stamina min 12/0,
poise min 0/0. This is the pre-change hash to compare Phase 2 against.

Both shipped cap shares are therefore reproduced on this exact tree, and the
fixture-versus-matrix gap (47.6% vs 26.7%) is the one already attributed in the
audit to stat basis plus the pairing walk; it is not re-litigated here.

## 4. P1.T2.1 — the 20 clock-bound fights

All rows: `reason === "time"`, `ms === 40000` (a cap decision by `pointsWinner`,
never `reason === "cap"`). Damage and dps are read from each trace's `summary`:
`dps = total damage / 40 s`. `H/A` = home/away = owned/rival in the trace. Commits
are the telemetry harness's `none → startup` frame transitions (the primary's
pre-measurement figures); hits are landed blows. The trace's accepted-commit
events differ by ±1 on three rows (18: 11 vs 10; 20: 15 vs 14; 23: 11 vs 10 home)
because an accepted `commit` event need not produce a fresh `none → startup`
frame — the telemetry definition is used throughout for comparability.

| # | Pairing (home v away) | Seed | Commits H/A | Hits H/A | Idle | Gap med (mm) | Damage H/A | dps H/A | % foe pool H/A | Winner | Lower-throughput side |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | plant_ox v embercub | 20261109 | 11/13 | 9/8 | 30.0% | 1157 | 85/165 | 2.13/4.13 | 49.1/87.3 | Embercub (A) | kite (plant_ox) |
| 7 | reefclaw v earth_tortoise | 20261114 | 13/7 | 8/5 | 32.3% | 1222 | 115/70 | 2.88/1.75 | 60.8/37.6 | Reefclaw (H) | kite (earth_tortoise) |
| 8 | earth_tortoise v electric_hound | 20261115 | 9/14 | 8/8 | 22.6% | 1008 | 77/156 | 1.93/3.90 | 43.5/82.5 | Storm Hound (A) | kite (earth_tortoise) |
| 12 | shalemole v water_axolotl | 20261119 | 13/13 | 9/12 | 23.8% | 987 | 131/174 | 3.28/4.35 | 73.6/96.1 | Tide Axolotl (A) | kite (shalemole) |
| 13 | embercub v mossboar | 20261120 | 12/9 | 8/9 | 23.6% | 1016 | 145/105 | 3.63/2.63 | 78.0/60.7 | Embercub (H) | kite (mossboar) |
| 14 | mossboar v voltfox | 20261121 | 8/16 | 6/13 | 23.1% | 985 | 124/161 | 3.10/4.03 | 74.7/86.6 | Voltfox (A) | kite (mossboar) |
| 17 | plant_ox v mossboar | 20261124 | 13/8 | 9/7 | 22.9% | 1097 | 105/106 | 2.63/2.65 | 56.5/56.1 | Bramble Ox (H) | press (plant_ox), by 1 |
| 18 | water_axolotl v voltfox | 20261125 | 10/14 | 8/9 | 34.9% | 1093 | 129/141 | 3.23/3.53 | 77.7/79.2 | Voltfox (A) | kite (water_axolotl) |
| 20 | fernstag v plant_ox | 20261127 | 14/12 | 10/11 | 35.3% | 1135 | 122/160 | 3.05/4.00 | 64.6/84.7 | Bramble Ox (A) | kite (fernstag) |
| 21 | wind_falcon v embercub | 20261128 | 17/10 | 12/7 | 33.5% | 977 | 150/115 | 3.75/2.88 | 86.7/71.9 | Zephyr Falcon (H) | kite (embercub) |
| 23 | earth_tortoise v fernstag | 20261130 | 10/12 | 6/10 | 20.0% | 1305 | 102/153 | 2.55/3.83 | 54.0/81.0 | Whistlefern (A) | press (earth_tortoise) |
| 27 | shalemole v electric_hound | 20261134 | 13/14 | 8/7 | 23.6% | 1136 | 82/122 | 2.05/3.05 | 46.3/67.4 | Storm Hound (A) | press (shalemole) |
| 29 | mossboar v galeheron | 20261136 | 13/14 | 8/11 | 24.3% | 1052 | 133/132 | 3.33/3.30 | 78.7/71.0 | Mossboar (H) | kite (galeheron), by 1 |
| 30 | mistkit v reefclaw | 20261137 | 10/14 | 5/5 | 21.5% | 1225 | 84/72 | 2.10/1.80 | 45.2/40.9 | Mistkit (H) | press (reefclaw) |
| 34 | electric_hound v reefclaw | 20261141 | 10/13 | 5/10 | 22.4% | 1299 | 69/159 | 1.73/3.98 | 37.1/89.8 | Coral Claw (A) | kite (electric_hound) |
| 36 | wind_falcon v mossboar | 20261143 | 14/14 | 11/7 | 32.2% | 1301 | 128/156 | 3.20/3.90 | 68.8/97.5 | Mossboar (A) | kite (wind_falcon) |
| 37 | reefclaw v voltfox | 20261144 | 13/11 | 8/9 | 17.5% | 1129 | 130/120 | 3.25/3.00 | 78.3/64.5 | Coral Claw (H) | kite (voltfox) |
| 38 | earth_tortoise v wind_falcon | 20261145 | 11/15 | 6/8 | 27.4% | 949 | 136/75 | 3.40/1.88 | 85.0/39.7 | Basalt Tortoise (H) | press (wind_falcon) |
| 40 | voltfox v embercub | 20261147 | 11/14 | 9/6 | 28.3% | 1104 | 143/98 | 3.58/2.45 | 82.7/59.0 | Voltfox (H) | press (embercub) |
| 42 | shalemole v fernstag | 20261149 | 11/14 | 9/10 | 31.2% | 1092 | 128/151 | 3.20/3.78 | 67.7/83.4 | Whistlefern (A) | kite (shalemole) |

"Kite" is the `specials` side under the split-doctrine parity rule (odd seed →
home specials/kite, away balanced/press; even seed → home press, away kite);
it is the side whose controller holds a band beyond its own reach edge.

## 5. P1.T2.2 — the mechanism

**Which side failed to convert: both of them, everywhere.** No fighter emptied
the other's HP pool in any of the 20 fights. The points winner converted only
37.1–97.5% of the foe pool (mean 79.4%, minimum 45.2% in row 30), and the lower
side 37.1–78.7%. The lower-throughput side is the kite side in 14/20 fights and
the press side in 6/20 (rows 17, 23, 27, 30, 38, 40), so there is no single
stalling tactic — this is a global conversion shortfall, not one side's hold.
The archived D-1 diagnosis carries over **in kind** (throughput, not a hold;
commits are healthy at 0.20–0.42/s per side) but **not in magnitude**: this
sample reads 1.73–4.35 dps per side (mean 3.07) versus D-1's 2.5–7.6 dps,
because it is a different, 42-distinct-pairing population at the same reference
stat basis. At 3.07 dps a mean ~177 HP pool needs ~58 s, and even the best side
here (4.35 dps in row 12) needs ~41 s against the 178 HP pool it faced — both
beyond the 40 s cap. That is why the fights end on points.

Cause separation, with the exact trace lines used:

1. **Throughput (binding, primary).** Each trace `summary` gives the total:
   e.g. row 34 `damage 69 owned → 37.1% of rival pool; 159 rival → 89.8% of
   owned pool`, `attack rate 0.25/s owned, 0.33/s rival (10/13 accepted
   commits)`; row 2 `damage 85 owned → 49.1% …; 165 rival → 87.3% …`.
   The kite side lands 5–12 blows but each blow is modest at reference stats;
   the cap arrives before either side's cumulative damage crosses the pool.
2. **Reach interval (secondary, doctrine-shaped).** Every header prints the
   band against the reach edge. Row 2: `profile preferred 1678 mm for this pair
   (row 1569, reach edge 920)` for plant_ox vs `preferred 1012 mm … reach edge
   920` for embercub; row 34: `preferred 1714 mm … reach edge 940` vs `preferred
   1034 mm … reach edge 940`; row 38: `preferred 1660 mm … reach edge 910` for
   the tortoise. The kite band's floor sits beyond the reach edge, and median
   gaps are 949–1305 mm. This is the unholdable-band finding (D-2): at `spd 5`
   (0.55 mm/ms) a slow body cannot hold a 1,472–1,600 mm floor against 1.0–1.63
   mm/ms press bodies, so its retreat latch wins decisions instead of commits.
   It shapes *which* side is lower, but the cap is still missed by both.
3. **Threat band / dodged shots.** Headers print `dodge at 2200–3600 mm`; at
   these gaps shots are frequently slipped. Row 34 full log: `rival slips
   storm_bolt` at steps 91, 295, 440, 584 and 1819; `owned dodges` bursts at
   steps 397–408 and 541–552. Row 2 header: embercub `dodge at 2200 mm`.
   Dodges remove landed blows without removing committed attacks, lowering
   damage per commit — a throughput effect, not a refusal.
4. **Stamina.** Row 34 full log: `owned dodge refused (stamina)` at steps
   702–708 (ms 14040–14160), with `stamina min 0/0` in 17 of the 20 summaries.
   Stamina is exhausted and gates *dodges*, but commits keep flowing, so it is
   a secondary drain rather than the cause of the stall.
5. **Cooldown / recovery.** Long recovery windows cap the exchange rhythm:
   row 34 `R1540 foam_volley` (step 299) and `R1240 foam_volley` (final step);
   row 2 `R1300 pyre_lance` (step 400) and `R1140 pyre_lance` (step 200).
   These keep committed attacks near 0.3/s per side. This is move-cycle time,
   not a rule refusal.
6. **Rule refusal — ruled out.** The full 20261141 event trace contains no
   `commit refused:` line (only the stamina-based `dodge refused` above). The
   telemetry dead zone is 27 commits (2.9%) over 42 fights — a minor inner-edge
   miss, not a stall driver.
7. **Opponent kiting.** Retreat verbs are pervasive: telemetry pools 451
   retreats/home fight and 460 away; row 34 full log shows `rival retreats` at
   steps 313, 493, 637, 1273, 1429 and `owned retreats` at steps 157, 361, 505,
   661, 805, 949, 1081, 1297, 1357, 1441, 1525, 1645, 1765, 1981. The kite side
   keeps the gap wide, which lowers mutual commit density and feeds (2) and (3).

Net: the 40 s cap is hit because reference-stat damage per landed blow × landed
blows per second cannot empty a 160–189 HP pool in time, with the kite side's
out-of-reach band, dodged shots and retreat-heavy decisions biasing most fights
toward a lower kite throughput. No bound, pool, damage value or cap was moved to
produce any of these numbers; the audit's stat-basis and pairing-walk attribution
of the 47.6%-vs-26.7% gap remains untouched.

## 6. P1.T2.3 — rung recommendation and the Phase 2 block condition

**First rung: `COMMIT_SKIP_DENOM` (`packages/sim/src/battle/continuous/controller-noise.ts:33`,
currently 32).** It is the narrowest lever on the binding variable: it gates an
already-ordered commit by one step, leaving doctrine bands, aim, dodge policy
and move selection untouched (the module's own FR-3/FR-4 constraint). Direction
of travel is to raise or remove the skip so more ordered commits go through.
Magnitude is deliberately small (≈3% of commits), so this is a sensitivity rung
first, not a promised fix; it should be measured on both populations before
escalating.

Then, in order: `CADENCE_SKIP_DENOM` (16, line 30 — cadence holds drift the commit
cycle phase); `PUNISH_SKIP_DENOM` (16, line 41 — rarer, high-value windows);
finally the cycle/press shares in `controller-profile.ts`, which change band
occupancy and sit closest to the doctrine definition. Each rung is measured on
both telemetry (≤14/42) and balance (≤280/840) before the next is tried.

**Phase 2 is blocked — not a licence to move a bound — if any of these hold:**

- reaching telemetry ≤14/42 or balance ≤280/840 requires editing any `BOUNDS`
  value, `CAP_MAX`, the 40 s cap, damage or pool values, a species band, a
  tolerance, `REFERENCE`, the doctrine mix, or the 42-pairing composition;
- after all four rung families are exhausted, telemetry stays >14/42 or balance
  >280/840 — a structural shortfall that would need damage/pool/cap changes,
  which are out of scope;
- a rung breaks the five trace invariants or determinism, or turns any green
  gate red (14/14 telemetry bounds, 15/15 species, 49/49 moves, decisive share,
  cap-win quality, median duration);
- the evidence shows a rung can move only one population, leaving the other cap
  share unchanged.

In those cases stop and report `blocked`; a bound is never the fallback. The two
debt pins (`telemetry.test.ts:213` `expect(cap.count * 3).toBeGreaterThan(cap.total)`
and `pacing.test.ts:176` `test.failing` majority-by-KO) are left untouched for
Phase 2 to promote, as planned.

## 7. Deviations

None. No source file was changed. `--every 100000` / `--every 200` are print-only
switches of the permitted `bun run trace` command and were used solely to keep
the 20 per-fight outputs compact.

## 8. Notes

- The three verification commands were run exactly as written; all exited 0 with
  every gate green.
- Head equals base at measurement: this commit adds only this evidence file.
- The 20 per-fight figures are transcribed directly from the trace command
  outputs; no intermediate harness or generated file was created.
- The audit's four-cell attribution (stat basis 28.6 points at press doctrine /
  18.2 on 840 fights, pairing walk ≈8.8 points) and D-4 (reference-line cap share
  absent from the balance report) are prior work and were not re-measured here.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,167 pass / 1 skip / 0 fail; 4,168 tests across 375 files in 64.32 s; Biome checked 940 files with no fixes; voxel determinism byte-identical. The only `smoke: RESULT fail` line is the known `file:///tmp/x` fixture, not a test failure. |
| `bun run build` | 0 | 418 modules transformed, client built in 403 ms; only the pre-existing >500 kB chunk warning. |

**Diff review.** `git diff --name-only 33256b2e..HEAD` lists exactly
`conductor/tracks/20261117-global-pacing/verification/phase-1.md`; `git diff --stat`
is 1 file, +226/−0. No file under `apps/`, `packages/`, `scripts/` or `.github/`
changed, so AC-1's "before any behaviour change" condition holds. The phase base
was moved from `df67d907` to `33256b2e` solely because the primary committed a
Phase 2 Touches refinement; that commit touches `plan.md` only.

**Acceptance.** FR-1 and AC-1 are met: the evidence names the mechanism with
per-fight commits, hits, idle share, gap and damage throughput for all 20 capped
fights, cites exact trace lines for each cause, and reproduces both shipped cap
shares plus the `0xb6cce858` baseline. The recommendation is `COMMIT_SKIP_DENOM`
first, with four explicit block conditions and no bound as a fallback.
