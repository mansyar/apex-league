# Phase 1 Report — Species Data & Balance Probe

- **Track:** 20261021-electric-species-line — Electric Species Line
- **Phase:** 1 of 5
- **Date:** 2026-10-21
- **Branch:** `feat/20261021-electric-species-line`
- **Base commit:** `2e235ba` (phase start)
- **Head commits:** `9917482`, `05570e5`, `061100e`
- **Result:** ✅ **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| T1 red | `bun test --timeout 120000 packages/sim/src/species.test.ts packages/sim/src/branches.test.ts` | 1 | 3 fail / 1 error — species unregistered, branches missing (intended red) |
| T1 green | same | 0 | 26 pass; only the T2 signature-lookup reds remained (interlocked by contract) |
| T2 red | `bun test --timeout 120000 packages/sim/src/battle/moves.test.ts` | 1 | 9 fail — CATALOG 24≠32, no electric element/rows, suffix + storm_surge missing (intended red) |
| T2 green | `bun test --timeout 120000 packages/sim/src/battle/moves.test.ts packages/sim/src/species.test.ts packages/sim/src/branches.test.ts` | 0 | 59 pass, 406 expects |
| probe calibration | `APEX_HOUND_REPORT=1 bun test --timeout 120000 packages/sim/src/species-electric.balance.test.ts` | 1 (during calibration) | full 4-player × 6-boss matrix printed; bands then pinned from measurement |
| verify | `bun run check` | 0 | typecheck clean: voxel 62, sim 96, client 302 files |
| verify | `bun test --timeout 120000` | 0 | **2150 pass, 1 skip, 0 fail** across 158 files — all existing goldens unchanged |
| extra | `bun run verify` (check + test --check + biome + determinism gate) | 1 | every code finding resolved; sole remaining error is pre-existing CRLF formatting of `conductor/tracks/20261021-electric-species-line/metadata.json` — primary-owned Conductor state, outside Phase 1 Touches |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-3 | electric_hound fully defined: SPD/ATK-tilted fast-striker bounds, 3-stage line via two champion branches | `species.test.ts` — bounds test (spd[0] ≥ every starter's spd max, atk ceiling > every starter, def/hp ceilings < every starter); branch tests (`storm_courser`/`tempest_warden`, budgets 11/22) | ✅ |
| FR-4 | 8 electric specials on the existing MoveDef vocabulary only | `moves.test.ts` — CATALOG 24→32, universal tier table holds for electric, signature pair storm_surge/ion_wall (12/75/2 + 9/100/2, equal power×acc); no new effect types (MoveDef knobs unchanged) | ✅ |
| AC-3 | New-species balance probe mirrors the boss-band methodology; authored boss bands untouched | `species-electric.balance.test.ts` (8 pass) — same seed grid/tactic/boss-side helpers; `bosses.balance.test.ts` unmodified and green | ✅ |
| AC-4 | Learn schedule + equip-4 green for the new pool | `moves.test.ts` "electric kit (electric_species_line)" describe — birth 2, day-3/evolution unlock 3rd row (+ signature at juvenile per existing rule), day-6 full pool, defaultLoadout fields 4 kit moves, validateLoadout 2–4 rules incl. signature/sibling rules | ✅ |
| NFR-3 | Sim pure, seeded, DOM-free; no affinity-drift draw introduced | Probe uses fixed CREATURE_SEEDS/BATTLE_SEEDS only; houndAt is a deterministic createCreature replica; no RNG/drift/DOM changes anywhere | ✅ |
| NFR-4 | All existing tests pass unchanged; boss bands 40–70% preserved | Full suite 0 fail; `bosses.balance.test.ts` untouched (DISADVANTAGED_CAP_WINS pins intact); breeding/legacy/cup goldens untouched | ✅ |

## Probe data (electric_hound win rate per boss, 6×6 seed grid)

| Player | Boss | trained+0 | trained+2 | trained+4 | trained+6 |
| --- | --- | --- | --- | --- | --- |
| electric_hound | Sear Marshal Koda | 0.0% (0/36) | 2.8% (1/36) | 80.6% (29/36) | 86.1% (31/36) |
| electric_hound | Verdant Dame Hesse | 0.0% (0/36) | 30.6% (11/36) | 97.2% (35/36) | 100.0% (36/36) |
| electric_hound | Tide Regent Marlow | 69.4% (25/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| electric_hound | Squall Herald Delmar | 75.0% (27/36) | 100.0% (36/36) | 100.0% (36/36) | 100.0% (36/36) |
| electric_hound | Cinder Abbot Fenn | 0.0% (0/36) | 19.4% (7/36) | 41.7% (15/36) | 83.3% (30/36) |
| electric_hound | Grove Sovereign Thessa | 0.0% (0/36) | 33.3% (12/36) | 97.2% (35/36) | 100.0% (36/36) |
| electric_hound | Final self-rival | 19.4% (7/36) | 30.6% (11/36) | 69.4% (25/36) | 83.3% (30/36) |

Self-defined bands (pinned exactly in the probe file): fresh hound never beats even-element bosses; every boss ≥ 35% at the training cap with exact pinned tallies (31/36, 36/36, 36/36, 36/36, 30/36, 36/36); each cap cell inside the min–max envelope of the three starters' own cap cells on that boss; cap vector distinct from every starter's (the niche: earliest and widest late-training climb, hard-walled at low training by low bulk/DEF); final self-rival pinned 7/11/25/30 of 36 within [0.15, 0.9].

## Design decisions

- **Registry seam:** electric_hound lives in a new `LOCKED_SPECIES` array (`available: false`); `STARTER_SPECIES` stays exactly the playable trio, so all out-of-phase consumers (rival generation, exhibition, starter-count pins) see zero drift — FR-7 acquisition stays a Phase 2 concern. `getSpecies` now consults `ALL_SPECIES` (starters + locked), which automatically satisfies save storage validation and loadout resolution for future electric creatures.
- **Bounds:** hp[70,84] atk[10,14] def[5,8] spd[12,16] — measurably the fastest and frailest species (distinctness asserted against every starter).
- **Branches:** `storm_courser` (offense, accentHue 62) / `tempest_warden` (defense, accentHue 38), following the per-element base±12 hue convention; boosts stay within the 11/22 budget.
- **Moves:** kit `static_jolt/volt_dash/arc_shot/storm_bolt/ion_dart/gigavolt` mirror the universal tier curve exactly; appended after the existing 24 so every pre-existing kit prefix and signature suffix is unchanged.

## Deviations

- None within Touches. `branches.test.ts` and `battle/moves.test.ts` were edited only through the by-contract golden tables the brief explicitly allows.
- Outside Touches, `bun run verify` reports a pre-existing formatter error on `conductor/tracks/20261021-electric-species-line/metadata.json` (CRLF line endings, written before this phase). Primary-owned Conductor state — not fixed here; flag for the primary's state commit. The brief's verification commands are unaffected.

## Evidence paths

- `packages/sim/src/species.test.ts`, `packages/sim/src/branches.test.ts`
- `packages/sim/src/battle/moves.test.ts`
- `packages/sim/src/species-electric.balance.test.ts` (regenerate matrix: `APEX_HOUND_REPORT=1 bun test packages/sim/src/species-electric.balance.test.ts`)

## Notes

- TDD red→green per task; T1 commit `9917482` deliberately leaves the two signature-move lookups red (they are T2's red state — the CONTRACT and catalog tables are interlocked), resolved by `05570e5`.
- Task commits per plan: T1 `9917482`, T2 `05570e5`, T3 `061100e`.
- Phase 2 note: acquisition flow should flip `available` (or grant via the Silver reward path against `LOCKED_SPECIES`) — `createCreature`'s `Species not yet available` gate is the only remaining blocker for electric_hound creatures.
