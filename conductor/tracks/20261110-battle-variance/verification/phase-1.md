# Phase 1 — Honour the Ladder: verification evidence

Track: 20261110-battle-variance · Phase P1 (FR-1, FR-2 / AC-1, AC-2)
Branch: `feat/20261110-battle-variance`
Base: `d7e5af3c` (pre-track parent) · Phase code head: `48b48bcf`
Status: **blocked** — phase goal (honest rolls + re-pinned goldens) is complete and
green; 4 remaining failures are balance-report pins/gates whose files are
explicitly out of Touches (do-not-touch bounds/pins), so they are reported, not edited.

## Commands (exact, separate, per brief)

- `bun run verify` → exit **1**: 3972 pass, 1 skip, **4 fail**
  (all 4 in `battle/continuous/balance-report.test.ts`: tortoise distinct pin,
  design-band miss list, KNOWN_MISSES list, end-to-end gate — pins/gates outside
  this phase's Touches; everything else in the repo passes).
- `bun run build` → exit **0** (client built, 410 modules; only a chunk-size warning).
- Reads (no writes): `bun run balance` → exit 1 (2 FAIL lines below);
  `bun run telemetry` → exit 0 (all ok).

## Old vs new accuracy path (`continuous/roll.ts`)

- Old: `aimed = 100 - floor((100 - accuracy) / MISS_SCALE)`, MISS_SCALE=5, then
  `rng.int(100) < aimed`; accuracy 100 short-circuits but every sub-100 row drew.
  Authored 70 landed ~94%, 85→~97%, 90→~98%, 95→~99%.
- New: `if (accuracy >= 100) return true; return rng.int(100) < accuracy`.
  MISS_SCALE deleted. The number on the card is the probability; 100 consumes no RNG.
  Integer arithmetic, one seeded RNG per fight, cursor in the state hash — untouched.

## Re-authored ladder (power: old-effective → new, with pacing-headroom rationale)

| Row | Power | Old eff. | New | Rationale |
|-----|------|----------|-----|-----------|
| basic | 9 | 100 | 100 | Untouched, guaranteed. |
| light | 10 | 100 | 100 | Untouched, guaranteed. |
| flame | 14 | 98 | **99** | One tick above neutral. Sibling tally falls to 41.7–43.8% at 97/98, holds at 99: the reliable side must convert the pivotal draw. |
| mid | 16 | 97 | **88** | Below neutral, so mid-row noise absorbs the branch gamble's misses; keeps 16×88=1408 < 17×95 so the expected-damage ranking rule is unchanged (winners re-pinned, rule untouched). |
| bolt | 17 | 95 | **95** | At neutral = cap optimum. Probes at 95/97 lengthen caps (33.8–35.0%) and kill Circle/Kite dodge diversity; 90/100 are worse (35.0%). 95 restores dodge (Circle 2.00, Kite 16.00). |
| chip | 12 | 99 | **100** | Guaranteed. Pacing payback for the cap share. |
| heavy | 19 | 100 | 100 | Untouched finisher, guaranteed. |
| branch gamble | 15/80 | 80 | 80 | Untouched; 15×80% = 12×100% = 1200 expected damage preserved. |
| branch reliable | 12/100 | 100 | 100 | Untouched, guaranteed. |

Probes rejected along the way (recorded, not kept): full-neutral ladder fails
sibling at 41.7%; bolt 97/100 and chip 97/100 worsen caps and wipe non-Kite
dodges; flame 100 fails sibling high at 61.5%.

## Band proof after best roll (FR-2 / AC-2)

`moves-band.test.ts` BAND_MIN/MAX untouched. Spread is downward-only
(`spreadDamage` subtracts only), so the best roll equals the base hit.
Band run inside `bun run balance`: **49/49 moves inside 4–12%**; heaviest max is
the power-19 row at **10.05%** of the 189 pool (19/189), headroom 1.95 pts.
No rolled hit exceeds 12%. Bosses all in band (46.7/36.7/33.3/40.0/50.0/46.7%).

## Balance read (`bun run balance`, at phase head)

- cap share **284/840 = 33.8% vs bound ≤33.3% → FAIL** (reported, not widened).
- decisive **93.8%** (556 ko + 232 cap wins ≥5.00 pts), ok.
- median **33.44s** (25–40s), p05 **16.12s** (≥8s), max 40.00s, ok.
- damage **49/49**, ok. Cap-win quality 81.7%, ok.
- Distinct (Phase-4 baseline, per-species /112):
  44, 40, 43, 44, 47, 41, 52, 46, 48, 52, 49, 48, 36, 40, 44 →
  **median 44/112** (FR-5 needs ≥56; gap to close in later phases).
  Tortoise reads 46 vs the pinned 35 → pin failure reported, file untouched.
- Design-band misses (11 rows): plant_ox 60.7%, water_axolotl 60.7%,
  electric_hound 41.1%, reefclaw 42.9%, earth_tortoise 39.3%, **cindermoor 64.3%**,
  voltfox 41.1%, galeheron 41.1%, embercub 41.1%, mossboar 62.5%, mistkit 57.1%.
- KNOWN_MISSES gains exactly: cindermoor row + capShare line.
- Doctrine finding: Kite 0/6 (trap-or-tool question for the owner, unchanged).
- Dodge probe passes: Circle 2.00, Kite 16.00 per fight.

## Telemetry read (`bun run telemetry`, at phase head)

All 13 gates ok. Cap **7/14 = 50.0% at bound — zero headroom, reported not moved**.
Idle 28.1%, engagement median 1104mm, exchange 0.57/s combined, contact 6.2%,
positions min 77 cells, duration 24.72–40.00s.

## Every forced re-pin, row by row (P1.T1)

- `battle/continuous/roll.ts`: MISS_SCALE removed; honest `rng.int(100) < accuracy`.
- `battle/moves.ts`: six kit rows re-authored per element (10/100, 14/99, 16/88,
  17/95, 12/100, 19/100); header comment rewritten with the table + rationale.
- `battle/moves.test.ts`: all 6 tier triples per element (object + TIERS-map forms)
  re-pinned to the new ladder; tier note rewritten.
- `battle/continuous/variance.test.ts`: AC-1 statistical test
  (20 draws × 1000 seeds, ±0.02) over [70, 80, 88, 95, 99]; 100-draws-nothing,
  miss-labelling, determinism tests intact; stale 75-acc comments fixed.
- `battle/policy.test.ts`: 6 choice goldens re-pinned under the unchanged
  expected-damage rule — cinder_shot→blaze_bolt ×5 (16×88=1408 < 17×95=1615),
  spore_burst→bramble_dart ×1 — plus a Phase-1 header note.
- `cup-contracts.test.ts`: seed-101 QF1 Reedle Mirefin→Tidecaller Nibbles;
  seed-101 champion Bonfire Brook→Tidecaller Nibbles; seed-101 completion SF/F
  rows to Tidecaller Nibbles (SF over Bonfire Brook, final over Mossbottom Brute).
- `cup.golden.test.ts`: seed-17 QF winner Mossbottom Brute→Emberhold Flicker
  (+takes-line) and the player's SF opponent likewise; seed-101 champion
  Bonfire Brook→Tidecaller Nibbles, its QF winner Reedle Mirefin→Tidecaller
  Nibbles (+takes-line), and both completion rows to Tidecaller Nibbles.
- `battle/clock.contract.test.ts`: 17 kit3/kit4 digests recaptured
  (fire_drake², plant_ox kit2/3/4, water_axolotl kit2…cross-element kit3/kit4 set).
- `battle/continuous/controller-doctrine.test.ts`: circleFlanks 8→9 + Phase-1 note.
- `bosses.balance.test.ts`: fresh-player lockout `test.failing`→`test` + note
  (ladder genuinely moved it green).
- `battle/species-balance.test.ts`: fresh-locked lockout `test.failing`→`test` + note.
- Left as failing (not this phase's ladder): tactics balanced-mirrors,
  pacing majority-KO, and the 4 balance-report pins/gates above.

## AC-1 / AC-2

| AC | Requirement | Result |
|----|-------------|--------|
| AC-1 | Authored 70 lands near 70% over a large sample | PASS — 70/80/88/95/99 each within ±0.02 over 20k draws |
| AC-1 | 100 never draws | PASS — returns true before any RNG draw |
| AC-1 | Ladder strictly authored probability | PASS — no scaling factor remains |
| AC-2 | No rolled hit exceeds 12% | PASS — band test 49/49, heaviest max 10.05% |

## Rework 1 — close the half-point cap gap with the ladder, then pin what moved

Locked ladder change (single tick): **chip 12/100 → 12/99** (all six kits;
`moves.test.ts` tiers/brackets + header notes; `variance.test.ts` AC-1 loop
already spot-checks 99). Final ladder: 100 / 99 / 88 / 95 / **99** / 100.

Single-tick frontier (measured `capShare` each time, `bun run balance`):

| Move (from settled 284/33.8%) | capShare | Verdict |
|---|---|---|
| bolt 95 → 94 | 284/840 = 33.8% (bitwise-identical sample) | No-op: the finisher policy rarely fires that row, so ~no roll draws 94 |
| chip 100 → 99 | **282/840 = 33.6%** | Best move: −2 fights, all constraints hold; locked |
| chip 99 → 98 | 282/840 = 33.6% (bitwise-identical to 99) | Saturated: no roll draws exactly 98; reverted, not kept |

Why it holds here: accuracy rolls per row number in the low hundreds across the
840-fight sample, so a one-point tick flips only a couple of fights — the lever
is real but too fine to close a 3-fight gap alone. Multi-row tuning belongs to
Phase 4; this phase stops at the best single-tick state per the brief.

Not tried, with reason: flame 99→98 or 100 (sibling fails 41.7–43.8% / 61.5%);
mid 88→87/89 (sibling fails both sides); bolt 95→96 (wrong direction — 97/100
lengthen caps to 34–35%); light/basic/heavy/reliable/branch rows (sibling rows
or equality-locked 15×80% = 12×100%; touching them breaks bounds, not pins).

Three pins re-pinned to received values (P1.T1.2 authority; no bound/floor/slack
touched), all in `battle/continuous/balance-report.test.ts`:
- tortoise distinct 35 → **48**, reefclaw 22 → **50** (honest rolls → more
  distinct fights; `measureSpecies` agreement loop still cross-checks).
- Design-band miss list → 11 ids: plant_ox, water_axolotl, electric_hound,
  reefclaw, earth_tortoise, cindermoor, voltfox, galeheron, embercub, mossboar,
  mistkit (fire_drake, fernstag, wind_falcon, shalemole moved inside; voltfox,
  galeheron, mistkit moved outside).
- KNOWN_MISSES → 2 received strings: `species:cindermoor: observed 64.3%
  (72/112, 48 distinct, se 7.2%), bound |rate - 50%| <= 14.1% …` and
  `capShare: observed 33.6% (282/840), bound <= 33.3%` (emptiness assertion
  removed — the list is no longer empty; gate test comment updated to name the
  two red lines as Phase-4 work).

Commands at the locked tree (base `4e5b39fb`, separate, exact):
- `bun run verify` → exit **1**: **3975 pass, 1 skip, 1 fail** — the only
  failure is the end-to-end gate (`run()=1` on the two KNOWN_MISSES lines).
  All 3 re-pins and all Phase-1 work green.
- `bun run build` → exit **0** (410 modules; chunk-size warning only).
- `bun run balance` → exit 1, exactly the 2 FAIL lines above. Otherwise green:
  decisive **94.3%** (558 ko + 234), median **33.37s**, p05 **15.98s**,
  max 40.00s, damage **49/49**, bosses all ok, dodge probe Circle 2.00 /
  Kite 16.00, Kite 0/6 finding unchanged, reference spread 22.3%..78.6%.
- `bun run telemetry` → exit **0**, 13/13 ok, cap **7/14 = 50.0%** (at bound,
  not over), idle 28.4%, duration 24.72–40.00s.

AC-1/AC-2 hold at the locked ladder: 70/80/88/95/99 within ±0.02 over 20k
draws; 100 never draws; 49/49 band, heaviest max 10.05%. FR-5 distinct median is
**46/112** (sorted 39,40,40,41,41,43,43,46,46,46,47,48,48,50,53) vs the ≥56
target — Phase 4's gap, recorded not widened.
