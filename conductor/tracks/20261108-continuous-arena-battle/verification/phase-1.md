# Phase 1 — Authored Frame Data

- **Track:** 20261108-continuous-arena-battle — Continuous Arena Battle
- **Phase:** 1 — Authored Frame Data (FR-5, AC-5)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `2c860c9cb9edefd6b1c55356e5fced72e3253f4c`
- **Head commit (code under verification):** `bd96aabb42e8998043f60809df97d8b904c78eb6`
- **Result:** **verified** — `bun run verify` and `bun run build` both exit 0.

## Commands

Run as two separate invocations (the agent rules forbid joining them with `&&`).

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bun run verify` | 0 | 4 workspace typechecks clean (voxel 160, sim 171, server 44, client 468 files); 3517 tests across 333 files — 3516 pass, 1 skip, 0 fail, 437,088 assertions; `biome check` 835 files clean; voxel determinism gate byte-identical for all 48 creature GLBs plus the 5 props. |
| build | `bun run build` | 0 | Vite built 370 modules; `dist` assets emitted (996 kB main chunk — the pre-existing >500 kB warning, not an error). |

### Rework 1

The primary's first run failed on `frames.test.ts(79,35)`: `FRAME_DATA.spark` is
`FrameData | undefined` under `noUncheckedIndexedAccess`, and bun:test types
`toBe(expected)` from the received value. Fixed by comparing the table entry
against a known-present lookup (`const spark = frameOf("spark")`), without
weakening `frames.ts`. A formatter-only break in the negative poise/stamina
assertions was fixed in the same commit.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | Every catalog move has complete, non-default frame data, verified by a completeness test. | `packages/sim/src/battle/frames.ts` — `FRAME_DATA` holds 49 rows keyed by move id (the basic strike plus all 48 specials). `frames.test.ts`: "has exactly one row per catalog id and no strays", "authors non-default timing on every row", "passes validation for every catalog move", "keeps every reach at or above the body radius", "gives every ranged move a speed and the melee basic none". | met |
| FR-5 | Every move carries startup, active, recovery, reach, projectile speed, poise damage, and stamina cost. | `FrameData` carries exactly those seven fields, units in the type and in each field's doc comment; `validateFrameData` rejects the rows the engine cannot run; every row passes it in the suite. | met |

## What changed

- `packages/sim/src/battle/frames.ts` (new, ~6 KB — under the 12,288 B cap)
  - `FrameData`: `startupMs`, `activeMs`, `recoveryMs` (ms), `reachMm` (mm),
    `speedMmPerMs` (mm/ms = m/s), `poiseDamage`, `staminaCost`.
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
  ordering, and validation suites (16 tests).
- `packages/sim/src/battle/moves.ts` — **untouched**. The catalog already
  carries the stable ids the table keys off.

## Evidence paths

- `packages/sim/src/battle/frames.ts`
- `packages/sim/src/battle/frames.test.ts`
- `conductor/tracks/20261108-continuous-arena-battle/verification/phase-1.md`

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

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static | `bun run verify` | 0 | 4 workspace typechecks clean; 3517 tests, 3516 pass / 1 skip / 0 fail; biome 835 files clean; voxel determinism gate byte-identical (48 GLBs + 5 props) |
| build | `bun run build` | 0 | Vite built 370 modules; only the pre-existing >500 kB chunk warning |

Verified by the primary agent, not taken from the subagent report.

Note: the phase range also contains `9095f61d chore(conductor): allow split
verify command for phase subagents` — a tooling fix by the primary so the phase
agent can run `bun run verify` and `bun run build` as separate commands. It is
outside the plan's `Touches` and carries no product behavior. Because the range
holds a commit the phase agent did not report, the phase was **not** squashed.
