# Phase 1 — Authored Frame Data

- **Track:** 20261108-continuous-arena-battle — Continuous Arena Battle
- **Phase:** 1 — Authored Frame Data (FR-5, AC-5)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `2c860c9cb9edefd6b1c55356e5fced72e3253f4c`
- **Head commit (code under verification):** `93b19b9238060e37d4b64240faad05379a6e2bc7`
- **Result:** **blocked** — the code state is complete, but the phase executor's
  shell was denied the verification command. The primary must run it and record
  the real result.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + determinism + build | `bun run verify && bun run build` | denied | `Permission denied: shell` — the phase executor is not permitted to run it. |
| static + unit + determinism | `bun run verify` | denied | Same denial when the `&&` chain was split into its first half; not retried further. |
| client build | `bun run build` | not reached | Blocked behind `verify`. |

**Blocker for the primary.** Run `bun run verify && bun run build` at
`D:\Projects\battle-pets` on `feat/20261108-continuous-arena-battle`. Expected:
exit 0 — workspace typechecks (`bun check`), the typed parallel suite including
`packages/sim/src/battle/frames.test.ts` and the 12 KB sim module cap, `biome
check`, the voxel determinism gate, then the client build.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | Every catalog move has complete, non-default frame data, verified by a completeness test. | `packages/sim/src/battle/frames.ts` — `FRAME_DATA` holds 49 rows keyed by move id (the basic strike plus all 48 specials). `frames.test.ts`: "has exactly one row per catalog id and no strays", "authors non-default timing on every row", "passes validation for every catalog move". | pending — test authored, command denied |
| FR-5 | Every move carries startup, active, recovery, reach, projectile speed, poise damage, and stamina cost. | `FrameData` in `frames.ts` carries exactly those seven fields; `validateFrameData` rejects the rows the engine cannot run. | pending — command denied |

## What changed

- `packages/sim/src/battle/frames.ts` (new, ~6 KB — under the 12,288 B cap)
  - `FrameData`: `startupMs`, `activeMs`, `recoveryMs` (ms), `reachMm` (mm),
    `speedMmPerMs` (mm/ms = m/s), `poiseDamage`, `staminaCost`. Units are in the
    type and in each field's doc comment.
  - `BODY_RADIUS_MM = 220` — the single body-radius constant validation reads.
  - `FRAME_DATA`: one frozen row per move id, ordered like `moves.ts`.
  - `getFrameData(id)` — `Object.hasOwn`-guarded lookup, so prototype keys
    (`constructor`) never resolve to a row.
  - `validateFrameData(move, row)` — rejects non-positive recovery, an empty
    active window, zero projectile speed on a non-melee move (and a projectile
    speed on a melee move), a reach below the body radius, and negative poise
    damage or stamina cost. Throws a friendly error naming the move, matching
    `validateLoadout`'s style.
- `packages/sim/src/battle/frames.test.ts` (new) — completeness, authored
  ordering, and validation suites (15 tests).
- `packages/sim/src/battle/moves.ts` — **untouched**. The catalog already
  carries the stable ids the table keys off.

## Deviations

- None. `packages/sim/src/battle/index.ts` is outside `Touches` and was left
  untouched, so `frames.ts` is not yet re-exported from the battle barrel;
  later phases can import `./frames` directly or the primary can add the export.

## Notes

- **Authored, not derived.** No value is computed from `power` or `cooldown`.
  The table is authored by cooldown/power band so heavier rows read slower:
  cooldown 0 → 80 ms startup / 140 ms recovery; cooldown 1 → 90–190 / 150–230;
  cooldown 2 → 200–320 / 250–400; cooldown 3 → 340–400 / 440–500. Stamina rises
  2 → 4–5 → 6–8 → 10 and poise 2 → 3–4 → 5–7 → 9 across the same bands.
  Element identity shows in projectile speed (earth 4–9 mm/ms is the slowest,
  wind 12–20 mm/ms the fastest) and in active-window length for the wall rows.
- **Reach.** The melee basic carries 420 mm; every special carries 3,800–6,500
  mm, all clear of `BODY_RADIUS_MM` (220 mm). `y` stays 0, so reach is planar.
- **Balance is out of scope** for this track (as the brief states): the numbers
  are plausible and internally ordered, not tuned.
- **If the verification fails, look here first:** Biome formatting of the 49
  one-line `frame(...)` rows and the `expect(() => ...)` breaks in
  `frames.test.ts`; `Object.hasOwn` requires the ES2022 lib, which
  `tsconfig.base.json` already sets.
