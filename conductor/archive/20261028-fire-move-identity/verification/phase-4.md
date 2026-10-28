# Phase 4 Verification — Pyre Wall Encirclement

- Track: 20261028-fire-move-identity
- Phase: 4 (Pyre Wall Encirclement)
- Date: 2026-10-28
- Branch: feat/20261028-fire-move-identity
- Base: 50e083d8 (main)
- Head: a2098832 (P4.T2; row P4.T1 9a6510d3) + GIF evidence (primary)
- Result: VERIFIED (gates run by primary: verify exit 0 incl. determinism gate, build exit 0; GIF captured and visually confirmed)

## Goal

Scale the foe-targeted pyre_wall barrier into a true encirclement: ring
~2.5× current size around the defender, denser rising jets + scorch decal,
timing held. Covers FR-6, AC-5.

## Changes

- `apps/client/src/move-fx/moves/fallback.test.ts` — new
  `fire wall encirclement (FR-6)` describe: ring size ≥ 2.5× the
  `barrierBody("fire")` baseline with ≥ 16 jets; foe-targeted guard
  contract (0 shots, shove 0) with timing held (wind = barrier wind,
  burst life 560, buoyant gravity); scorch-disc pin
  (`decalRing("fire") === false`).
- `apps/client/src/move-fx/moves/fire.ts` — `pyre_wall` arrival burst:
  `puffs` 12 → 20, `size` 1.5 → 3.75 (exactly 2.5×); `ring`, `life`
  (560), `gravity` (-2.2), `sway` (0.5), `flashGrow` (3), `shove` (0),
  `shots` ([] via `barrierBody`), `wind` (0.62 via `barrierBody`) all
  held. No `verbs.ts` change — other elements' walls untouched.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| targeted `bun test` on `fallback.test.ts` (red, pins first) | NOT RUN | shell denied |
| targeted `bun test` on `fallback.test.ts` (green, after row) | NOT RUN | shell denied |
| `bun run verify` (primary) | exit 0 | check 0 errors; tests pass; biome clean; determinism gate OK |
| `bun run build` (primary) | exit 0 | pre-existing chunk-size warning only |

Expected red→green (by inspection, unverified): before the row change,
`size` 1.5 < 1.3 × 2.5 = 3.25 and `puffs` 12 < 16 fail; after the change
(3.75 ≥ 3.25, 20 ≥ 16 > 10) all pins pass. Timing/guard/decals pins are
regression guards green throughout.

## Acceptance criteria

| AC | Maps to | Status | Evidence |
| --- | --- | --- | --- |
| AC-5 | FR-6 wall ring encircles defender at ~2.5× within current timing | VERIFIED | strip: ground spark → full translucent dome encircling defender with clearance + lingering barrier + base embers; `phase-4/fire-pyre_wall.gif` (close, 900ms/step, seeds 103/104) |

## GIF (captured by primary 2026-10-28)

- `conductor/tracks/20261028-fire-move-identity/verification/phase-4/fire-pyre_wall.gif` (~2.0 MB, 12 fps) — dome encirclement confirmed (close, 900ms/step, seeds 103/104)

1. `bun run dev`, open `?movelab`.
2. Matchup: Ember Drake (draconic) vs Bramble Ox (bovine), fire group,
   bespoke rows only.
3. Camera: close; speed 1× (900 ms/step); seeds 11 and 23.
4. Trigger `pyre_wall`; watch `movelab-status` + seed.
5. Expect: a wide flame ring visibly encircling the defender (~2.5× the
   old body-sized ring), dense jets rising off the full circumference, a
   scorch disc left on the floor, no projectile travel, no victim shove,
   all inside the existing launch/land beats.
6. Export a ~12 fps GIF to
   `conductor/tracks/20261028-fire-move-identity/verification/phase-4/fire-pyre_wall.gif`.

## Deviations

- None. No `verbs.ts` parameterization needed — the scale-up stays local
  to the `pyre_wall` row, so every other element's barrier is byte-identical.
- No sim changes, no save bump, no new deps, no conductor edits.

## Notes (primary handoff — resolved)

- Subagent shell was denied, so the primary ran the gates (`verify` exit 0
  incl. determinism gate, `build` exit 0) and landed the two task commits
  (row `9a6510d3`, pins+report `a2098832`) plus GIF capture.
- TDD red→green was asserted by inspection against pre-change values
  (size 1.5, puffs 12) and the `barrierBody("fire")` baseline
  (size 1.3, puffs 10, wind 0.62); full suite green confirms green.
