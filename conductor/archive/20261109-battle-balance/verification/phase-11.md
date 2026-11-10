# Phase 11 — Roster Re-tune

- **Track:** `20261109-battle-balance`
- **Phase:** 11
- **Date:** 2026-11-10
- **Branch:** `feat/20261109-battle-balance`
- **Base:** `085df611`
- **Result:** **not met.** `bun run balance` still exits 1. No source change was
  shipped; the working tree is clean at the Phase 10 checkpoint.

## What the gate says today (Phase 10 checkpoint, unchanged)

| species | rate | distinct | gate |
| --- | --- | --- | --- |
| fire_drake | 35.7% (40/112) | 21 | FAIL |
| plant_ox | 32.1% (36/112) | 20 | FAIL |
| water_axolotl | 46.4% (52/112) | 19 | ok |
| electric_hound | 8.9% (10/112) | 19 | FAIL |
| fernstag | 53.6% (60/112) | 20 | ok |
| wind_falcon | 21.4% (24/112) | 14 | FAIL |
| reefclaw | 57.1% (64/112) | 18 | ok |
| earth_tortoise | 44.6% (50/112) | 4 | ok |
| cindermoor | 57.1% (64/112) | 17 | ok |
| voltfox | 92.9% (104/112) | 14 | FAIL |
| galeheron | 83.9% (94/112) | 10 | FAIL |
| shalemole | 85.7% (96/112) | 8 | FAIL |
| embercub | 53.6% (60/112) | 13 | ok |
| mossboar | 51.8% (58/112) | 16 | ok |
| mistkit | 25.0% (28/112) | 12 | FAIL |

Cap 32.1% (270/840) ok, KO 67.9% ok, median 28.85 s ok, 13/13 telemetry bounds ok.
Eight roster rows keep the gate red — the Phase 11 task.

## What was tried, and why it did not ship

Kit shape is a real lever, but it is not a convergent one by hand.

1. **Kit order alone moves everything.** Fifteen species play a full round robin,
   so a kit reorder on one species shifts every other row by 10-40 points. A
   probe (`phase-11-kit.test.ts`, gitignored) showed single reorders swinging
   fire_drake 35.7% → 78.6% and earth_tortoise 44.6% → 17.9% in the same pass.
   Two coordinate-descent searches (kit-only, then kit+stat) reached 12-14/15
   only at identity-destroying assignments, and the kit-only one did not converge
   at all.

2. **The report's stat lever is coarse.** `speciesSide` clamps the reference line
   (`10/10/10`) into each species' `statBounds`, so a per-species atk/def delta
   is only expressible by moving a bounds floor or ceiling across 10 — which also
   changes what that species rolls in the game. A probe roster that scored 15/15
   with 10 rows in 45-55%, cap 28.9% and KO 71.1% did so using ±1-4 atk/def
   deltas; shipping only the expressible half (kit order + four bounds
   crossings) measured 5/15 gate-ok, cap 33.6%, `durationMin` 6.70 s. The probe's
   fit was an artefact of a lever the real measurement does not have, so it was
   discarded rather than committed.

3. **Recovery is a cliff, not a dial, at this point.** A uniform −4% recovery
   scale (49 rows in `frames.ts`) moved plant_ox 44.6% → 64.3%, dropped KO to
   538/840 and *raised* cap share to 36.0%. Reverted in full; `frames.ts` is
   byte-identical to the Phase 10 checkpoint (`git diff --stat` empty).

4. **Lowering the tanky defences did help pacing.** reefclaw def floor 12→10,
   shalemole and mossboar 11→9 cut cap share to 29.9% and lifted KO to 70.1% in
   the probe, but the same pass left five rows outside the gate, and reverting
   them was required because they cannot be separated from the kit coupling.

## The decision I own: accuracy

`MISS_SCALE 5` stays. Recorded as debt with the numbers measured in Phase 10:
authored accuracy honoured literally drives the 14-matchup cap share to 64.3%
(against a 50% ceiling); a floor of 90 gives 57.1%; the shipped scale of 5 gives
42.9%. So the authored 70-100 ladder is near-decorative (70 → 94, 100 → 100) and
re-authoring it is future work that must come with pacing levers able to absorb
15-20 points of cap share. Widening accuracy without those levers was rejected.

## Commands

| command | exit | note |
| --- | --- | --- |
| `bun run balance` | 1 | eight `FAIL species:` rows, all resolvability and boss targets `ok` |
| `bun run verify` | not re-run | no source change was shipped; the tree is at the Phase 10 checkpoint whose verify was 0 |
| `bun run build` | not re-run | as above |
| `bun run telemetry` | not re-run | as above |

## Deviations

- None shipped. All exploratory edits (species kits, four `statBounds` rows, the
  −4% recovery scale) were reverted; `git status --short` is empty.

## Notes for the next phase

- The gate is now sound (Phase 10) but the roster still needs a real re-tune. The
  honest next step is to make the *measurement* able to see a stat change —
  either measure at each species' rolled midpoint rather than the reference
  clamp, or make the reference line species-relative — because today a species
  cannot be tuned by stat at all, only by which four moves it leads with, and
  that lever is a 20-40 point cliff.
- `earth_tortoise` shows only 4 distinct fights of 112: its diversity is the
  thinnest in the roster and its rate is a coin flip on a single blow count.
