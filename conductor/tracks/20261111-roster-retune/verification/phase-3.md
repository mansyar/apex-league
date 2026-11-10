# Phase 3 evidence — Green Gate and Guardrails

## SHAs

- Base (Phase-3 start): `123ee1ce`
- Head (test re-pins): `ac088f9c`
- Evidence commit follows; no production file touched (`git diff --stat` at head shows only the 5 Touches test files).

## Verification commands (run separately, never chained)

| Command | Exit code | Result |
|---|---|---|
| `bun run verify` | 1 | Tests: 3987 pass / 1 skip / 0 fail across 369 files. Red comes ONLY from `biome check`: 6 pre-existing errors in 4 files outside Phase-3 Touches (see Finding). Stable across 2 runs. |
| `bun run build` | 0 | Client builds clean (chunk-size warning only, pre-existing). |
| `bun run balance` | 0 | All 15 species `ok`, all pacing/boss/damage rows `ok`, zero `FAIL` lines. |
| `bun run telemetry` | 0 | All 13 rows `ok`; cap 7/14 = 50.0% exactly at bound (zero headroom, holds). |

Note: `verify` = `check && bun test && biome check && gate:determinism`. It exits at the biome step, so the voxel `gate:determinism` step never runs here; determinism for this track is proven by the re-pinned exact-match digest assertions (byte-identical replay at full strength).

## The 7 re-pins (file, test, old value → new value, stat move)

1. `packages/sim/src/battle/continuous/balance-report.test.ts` — distinct pin: `earth_tortoise` distinct 100 → 106 (reefclaw holds 109). Move: Phase-2 whole-band lift (atk [10,14]→[11,15], def [9,12]→[10,13]) puts more of its 112 games distinct. DISTINCT_FLOOR stays 12.
2. Same file — design-band list: 8 ids → exactly the 4 measured rows `[plant_ox, water_axolotl, voltfox, embercub]`. Moves: Phase-1 ox/cinder cool + Phase-2 tortoise/galeheron lift carried 4 rows into the band (electric_hound, earth_tortoise, cindermoor, galeheron, mossboar all now 45–55%).
3. Same file — KNOWN_MISSES: 4 observed-value lines → `[]`. Moves: same as (2); the gate asserts exit 0, pinning the green reality, not forcing it.
4. `packages/sim/src/battle/exhibition.test.ts` — seeded rival (seed 42, plant_ox): `{hp 171, atk 11, def 14, spd 7}` → `{hp 171, atk 10, def 13, spd 7}`. Move: Phase-1 plant_ox cool (atk [9,12]→[8,11], def [12,16]→[11,15]). Rival identity/tactic unchanged.
5. `packages/sim/src/cup.test.ts` — makeBracket golden (seed 21, day 7): five plant_ox rival slots each atk/def −1 (Pondskipper Grub atk11/def13→atk10/def12, Bramble Knoll Ox atk12/def12→atk11/def11, Thistledown Ash atk12/def13→atk11/def12, Reedle Mirefin atk12/def12→atk11/def11, Cindersnout atk12/def13→atk11/def13). Moves: same ox cool (+ Phase-1 cindermoor cool for slot 5). Draw/names/hp/spd unchanged.
6. `packages/sim/src/cup-contracts.test.ts` — cup seed 101 day-14 verdicts QF2: `Reedle Mirefin` → `Tidecaller Nibbles` (other three hold; bracket draw and day-7 verdicts unchanged). Move: battle-outcome flip from the cooled ox/tortoise/galeheron rows entering day-weighted rematches (day enters per-pairing seeds). Plausible: same draw, different day → different fight outcomes.
7. `packages/sim/src/battle/clock.contract.test.ts` — event-stream digest: 15 plant_ox streams re-pinned (kit2 mirror `e15295dd` holds; kit3/kit4 mirrors + all 12 cross-element cases move); coverage `impactStagger`/`staggers` true → false. Move: same ox cool. Plausibility checked, not just pinned: a per-case census showed max matrix impact 25 vs the ~26 SE heavy line — the ox cool (−1 atk) dropped the matrix's only borderline super-effective hits just below the 15%-of-pool heavy bar, zeroing stagger reactions (downs still 512, draws 80). Determinism assertions untouched: `expect(actual).toEqual({...GOLDEN})` still exact-matches every stream, so byte-identical replay is proven at full strength.

No `test.failing` conversions anywhere. No bound, floor, or tolerance widened (DISTINCT_FLOOR 12, cap 1/3, decisive 2/3, quality 2/3, median 25–40 s, p05 8 s, band 4–12% — all as shipped).

## Emptied KNOWN_MISSES and design-band list as shipped

- `KNOWN_MISSES = []` (gate test asserts `run(...) === 0` with zero `FAIL` lines).
- Design-band misses as shipped: `plant_ox 44.6%, water_axolotl 56.3%, voltfox 55.8%, embercub 55.4%` — exactly the rows outside 45–55% in the measured run, no more, no fewer.

## P3.T2.2 out-of-band comparison (variance frontier → Phase-3 head)

| Row | Frontier (variance) | Head | Delta | Verdict |
|---|---|---|---|---|
| plant_ox | 67.9% (76/112, se 5.0%) | 44.6% (50/112, se 4.9%) | −23.3 pts, into band | hold (improved) |
| earth_tortoise | 29.5% (33/112, se 5.0%) | 50.0% (56/112, se 4.9%) | +20.5 pts, into band | hold (improved) |
| cindermoor | 59.8% (67/112, se 4.8%) | 48.2% (54/112, se 4.8%) | −11.6 pts, into band | hold (improved) |
| galeheron | 33.9% (38/112, se 4.8%) | 53.6% (60/112, se 4.8%) | +19.7 pts, into band | hold (improved) |

No row worsened past its se — every frontier-red row moved into the design band. The printed band still names the four head stragglers above; they pass the gate but stay printed. No finding, no re-pin needed beyond the honest list.

## Telemetry read and the zero-headroom cap line

- `capShare: observed 50.0% (7/14), bound <= 50.0%` → ok, exactly at bound, holds with zero headroom.
- All other telemetry rows ok: engagement min 379 / median 1085 / max 3992 mm; exchange 0.30/0.27 per s; idle 25.5%; positions 106 cells; contact 6.8%; retreats 7204/6919; duration 33.52–40.00 s.

## AC-5 / AC-6 / AC-7

| AC | Verdict |
|---|---|
| AC-5 (species/doctrines measured separately; maintained design-band list) | Met in test scope: list names exactly the 4 measured outside-band rows; doctrine table unchanged (Circle rearOrFlank > Press holds). |
| AC-6 (gate green, no widened bound/floor/tolerance) | Met: `bun run balance` exits 0, all 15 species ok, KNOWN_MISSES `[]`, all bounds as shipped. |
| AC-7 (determinism + telemetry green) | Met in test scope: digests exact-match (byte-identical replay at full strength); telemetry 13/13 ok with cap at bound. |

## Finding (blocks `verified` status; not fixable in this phase)

`bun run verify` exits 1 solely on 6 pre-existing `biome check` errors in 4 files outside Phase-3 Touches, untouched by this track (last touched by the variance / battle-balance tracks):

- `packages/sim/src/battle/continuous/controller-kite.test.ts` (organizeImports + format)
- `packages/sim/src/battle/continuous/controller-noise.test.ts` (organizeImports + format)
- `packages/sim/src/battle/continuous/controller-noise.ts` (format — production file)
- `packages/sim/src/battle/continuous/controller.ts` (organizeImports)

Fixing them requires expanding scope (and editing a production file with commands this phase may not run), so they are recorded here instead of fixed. Test scope is fully green: 3987 pass / 1 skip / 0 fail, stable across two full runs.
