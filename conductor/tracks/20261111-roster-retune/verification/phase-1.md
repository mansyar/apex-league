# Phase 1 evidence — Cool the Hot Rows

Branch: `feat/20261111-roster-retune`
Base: `7a08d427` (variance-branch stack base, per brief) · Head: `900857cd`

## Goal check

- plant_ox: **51.8%** (58/112, distinct 103, se 4.9%) — in-band, gate ok.
- cindermoor: **51.8%** (58/112, distinct 110, se 4.8%) — in-band, gate ok.
- No other row regressed to red. Remaining gate FAILs are exactly the two
  Phase 2 rows, both improved vs baseline: earth_tortoise 29.5% → **33.9%**,
  galeheron 33.9% → **37.5%**.
- Pacing all green; telemetry 13/13; build exit 0; bosses + species tests green.

## Bounds moved (all whole-band, widths unchanged, integer)

- plant_ox (starters.ts): hp [160,193]→[160,193], atk [9,12]→**[8,11]**,
  def [12,16]→**[11,15]**, spd [6,9]→[6,9]. Mid 176/10/14/7 → **176/9/13/7**.
  HP untouched: bosses hesse/thessa carry absolute HP 193, so any ceiling cut
  breaks `bosses.test.ts` "pins absolute stats inside the species' legal roll
  bounds" (caught empirically, restored).
- cindermoor (rewards.ts): def [9,12]→**[8,11]** only (mid 166/12/10/7 →
  **166/12/9/7**). atk ceiling untouchable (must stay > drake atk ceiling 15).
- mossboar (discovery.ts, compensating trim — deviation, see below):
  atk [9,12]→**[8,11]** (mid 171/10/14/6 → **171/9/14/6**). Armor/bulk/pace
  identity untouched; no species.test.ts pin constrains moss atk.
- Kit reorder ruled out for both rows: reports measure `kit.slice(0,4)`, so a
  reorder only swaps bench rows and cannot move the measured line.

## Starting numbers (frontier.md baseline)

- plant_ox 67.9% (76/112, distinct 102, se 5.0%), miss +8.2 on se ~5.0.
- cindermoor 59.8% (67/112, distinct 110, se 4.8%), miss +5.5.

## Candidate score table (measureSpecies via `bun run balance`)

| # | move | ox | cinder | moss | verdict |
|---|------|----|--------|------|---------|
| C1 | ox hp[154,187] atk[8,11] def[9,13]; cinder def[7,10] | 31.3% (35/112) | 41.1% (46/112) | **64.3% FAIL** (was 58.0 ok) | REJECT: both overshoot below band, moss flips red |
| C2 | ox hp[157,190] atk[8,11] def[11,15]; cinder def[8,11] | 47.3% (53/112) | 51.8% (58/112) | **61.6% FAIL** | REJECT: targets in-band but moss still red |
| C3 | + moss atk[7,10] | — | — | **39.3% FAIL** | REJECT: −2 atk overshoots (−22.3 pts; atk ≈ −11 pts per −1) |
| C4 | + moss atk[8,11] (from C3) | 49.1% (55/112) | 51.8% | 52.7% (59/112) | ACCEPT on band, but bosses.test.ts red (hesse/thessa HP 193 > ox ceiling 190) |
| C5 | + ox hp restored [160,193] | **51.8%** (58/112, d103, se 4.9) | **51.8%** (58/112, d110, se 4.8) | 52.7% (59/112) | **ACCEPT**: bosses green, all else holds |

Every scored move exceeded its own se (~4.7–5.0) by multiples — no oscillation
(cinder lands 51.8 mid-band; ox 51.8 mid-band). Def ≈ −9 pts per −1, atk ≈
−3..−11 pts per −1 (species-dependent), hp ≈ −0.3..−1 pt per −1: def is the
dominant lever, which is why C1 (−3 def) collapsed ox −36.6 pts.

## Final `bun run balance` species table (exit 1 — gate red only on Phase 2 rows)

- fire_drake 50.0 ok · **plant_ox 51.8 ok** · water_axolotl 58.9 ok ·
  electric_hound 49.1 ok · fernstag 52.2 ok · wind_falcon 54.5 ok ·
  reefclaw 48.2 ok · **earth_tortoise 33.9 FAIL (Phase 2)** ·
  **cindermoor 51.8 ok** · voltfox 55.8 ok · **galeheron 37.5 FAIL (Phase 2)** ·
  shalemole 47.3 ok · embercub 56.3 ok · mossboar 52.7 ok · mistkit 50.0 ok.
- Design-band misses (printed, not gated): water_axolotl 58.9, earth_tortoise
  33.9, voltfox 55.8, galeheron 37.5, embercub 56.3.
- Pacing: capShare 22.7% ok · decisive 94.9% ok · capWinQuality 78.5% ok ·
  median 30.06s ok · p05 16.04s ok · max 40.00s ok · damageBand 49/49 ok ·
  all 6 bosses ok (hesse 5/30, thessa 13/30).

## Telemetry (`bun run telemetry`, exit 0): 13/13, cap line 7/14 (50.0%) ≤ 50.0%

## `bun run verify` (exit 1): 3980 pass, 1 skip (smoke, no target URL —
environmental), 7 fail

Expected / in-inventory (Phase 3 owns the re-baseline; do NOT fix here):
- balance-report.test.ts ×3: design-band-misses list, KNOWN_MISSES values,
  gate-green. New observed values for Phase 3:
  - `species:earth_tortoise: observed 33.9% (38/112, 100 distinct, se 5.0%), bound |rate - 50%| <= 9.8% (design target 45.0%..55.0%)`
  - `species:galeheron: observed 37.5% (42/112, 112 distinct, se 4.7%), bound |rate - 50%| <= 9.3% (design target 45.0%..55.0%)`
  - (plant_ox and cindermoor lines drop out — both gate-ok.)
  - design-band-misses list is now [water_axolotl, earth_tortoise, voltfox,
    galeheron, embercub].

Out-of-inventory golden churn (deterministic fallout of the in-scope stat
moves; files outside Touches — needs a primary re-pin decision, NOT fixed here):
- `packages/sim/src/battle/exhibition.test.ts:127` makeExhibition seeded-rival
  golden (plant_ox rolled atk/def/hp shifted).
- `packages/sim/src/cup.test.ts:196` makeBracket draw-stream golden (plant_ox
  rolled stats in bracket slots: atk −1, def −1 across slots).
- `packages/sim/src/cup-contracts.test.ts:440` day-14 lifecycle golden: QF2
  winner flips Reedle Mirefin → Tidecaller Nibbles (ox nerf changes the bout).
- `packages/sim/src/battle/clock.contract.test.ts:270` event-stream coverage
  digest (impactStagger/staggers now false on the re-rolled ox stream).
- Green again after C5: `bosses.test.ts` (incl. the absolute-stats pin),
  `species.test.ts` (104 pass combined, re-run explicitly).
- NOTE: `bun run check` passed (tests ran); `biome check` and the determinism
  gate did NOT execute — the verify chain stops at the failing test stage.

## AC-1 / AC-3

- AC-1: plant_ox 51.8% ✓ and cindermoor 51.8% ✓, both inside 45–55% with margin
  to the se slack (±9.3–9.7%); no other row gate-red besides the two Phase 2 rows.
- AC-3: deferred — the 3 balance-report pins stay red for Phase 3 as instructed.

## Commands and exit codes

- `bun run balance` → exit 1 (only tortoise + galeheron gate-FAIL).
- `bun run verify` → exit 1 (3980 pass / 1 skip / 7 fail, inventoried above).
- `bun run build` → exit 0.
- `bun run telemetry` → exit 0 (13/13).
