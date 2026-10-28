# Phase 3 verification — Water (4 new + 4 upgrades)

- **Status:** verified (primary evidence review 2026-10-28; 32 Move-Lab
  frames, clean console).
- **Track:** 20261028-elemental-identity, Phase 3 (Water). Covers FR-2, FR-5.
- **Date:** 2026-10-28.
- **Branch:** `feat/20261028-elemental-identity`; base `cde0f480`.
- **Commits:**
  - `ed2cadd9` feat(client): phase 3 bespoke water rows for all 8 moves
    (P3.T1 + P3.T2)
  - `ec85f0ca` test(client): phase 3 water AC-1 and verb-family pins (P3.T3)
  - `dec8e175` test(client): satisfy biome literal-keys and format in
    move-fx pins (P3.T3 fix retry 1)
- **Head:** `dec8e175c7017723176cf69e79a1d071fb326a29`.

## Result

`bun run verify` exit 0 (3442 pass / 1 skip / 0 fail, determinism gate
OK), `bun run build` exit 0 (pre-existing chunk-size warning only).
One fix retry used (biome `useLiteralKeys` + format in the new pins);
no second failure.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static+unit+determinism | `bun run verify` | 0 | check clean (all workspaces); 3442 pass / 0 fail; biome clean (826 files); determinism gate OK |
| build | `bun run build` | 0 | client bundle built; only the pre-existing >500 kB chunk warning |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | All 8 water moveIds resolve to bespoke rows | `fallback.test.ts` "all 8 water specials resolve to bespoke rows (AC-1 water)" — pass | done |
| AC-3 | Verb spot-checks read true (barrier / dash / volley / cone / charge) | `fallback.test.ts` "water verb reads (AC-3 water)" — pass | done (code side) |
| AC-3 | Move Lab visual evidence (8 water screenshots, desktop + phone) | 32 frames in `verification/phase-3/`: `<move>-{d,p}-{travel,impact}.png`, axolotl vs drake, far, 1×, seeds 11/23; travel = projectile+500 ms, impact = impact+100 ms; `p` = real 390×844 viewport — all 8 read water at a glance (shells, droplets, foam, mist) | verified |

## What changed

- `apps/client/src/move-fx/moves/water.ts` — 8 bespoke rows in sim-catalog
  order (`bubble`, `tide_shot`, `foam_volley`, `splash_bolt`, `mist_spray`,
  `maelstrom`, `riptide_rush`, `tide_aegis`), mirroring the Phase 2 fire
  structure: `volleyFanBody`/`coneBody`/`dashBody`/`barrierBody` verb
  builders plus explicit water-grammar arrivals/muzzles (gravity 10,
  foam `ring: true`, low-crouch windups). `tide_aegis` is a foe-targeted
  barrier eruption with no shove, exactly like `pyre_wall` (barrier rule).
  Dropped the legacy `compressed` overrides, as Phase 2 did for fire.
- `apps/client/src/move-fx/moves/fallback.test.ts` — removed `bubble` /
  `tide_aegis` from the unauthored-spot list; added AC-1 water pin and
  AC-3 water verb pins; converted bracket `MOVE_FX["…"]` reads to dot
  access per biome `useLiteralKeys` (fire pins included).
- `apps/client/src/move-fx.test.ts` — Phase-2-style guard trim:
  `tide_aegis` leaves the default-body guard list (bespoke barrier row now).

## Deviations

None — all edits inside the brief's touch map. `packages/sim/**`
untouched; no new dependencies, hues, saves, or audio.

## Notes for primary

- P3.T3 lab screenshots are yours: trigger the 8 water moves in the Move
  Lab (`?movelab=1`) per the phase-2 evidence pattern (travel + impact,
  desktop + phone, clean console) and append to this file on acceptance.
- Watch item: biome `useLiteralKeys` now flags the pre-existing Phase 2
  fire bracket reads too — converted here; plant/earth/wind phases should
  use dot access in new pins from the start.
