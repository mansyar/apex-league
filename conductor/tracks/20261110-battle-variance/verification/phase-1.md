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
