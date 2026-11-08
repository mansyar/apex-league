# Phase 8 — Contact Geometry

- **Track:** 20261108-continuous-arena-battle (Continuous Arena Battle)
- **Phase:** 8 — Contact Geometry
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Phase base:** `590d43faa73d37f471bb5bb923e5fdcdb24efc52`
- **Head at verification:** `156c767f887cf29267d13b6f219a77f4ccc665e8`
  (engine `ce46eb59`, beats `403170a7`, version `942a5247`, re-pins `156c767f`)
- **Result:** **verified** — P8.T1 to P8.T5 are done and all eight audit findings
  in the brief are closed. `bun run verify` and `bun run build` each exit 0 when
  run as two separate commands.

## What landed

### Body volumes (P8.T1, FR-17)

- `FighterState` carries `radiusMm` (half width — two radii are the closest two
  centres may stand) and `heightMm` (standing height, floor at 0), both integers,
  both mixed into `stateHash`. `FighterInit` accepts both, validated as positive
  integers, defaulting to `BODY_RADIUS_MM` (220) and `DEFAULT_BODY_HEIGHT_MM`
  (900).
- `species.ts` gains `BODY_PROFILES`, `bodyProfileFor(archetypeId)` and
  `DEFAULT_BODY_PROFILE`. The voxel pipeline could not be reused: all fifteen
  archetype grids are `56`, `VOXEL_SIZE` is uniform, and `stage.ts` only shifts
  girth by ±4 %, so there is no absolute creature size anywhere in the repo to
  inherit. One authored table, keyed by the `archetypeId` species already carry,
  is the single size source — no second, disagreeing table.
- `continuous/resolve.ts` seeds each side from its branch form first
  (`getBranch(side.branch).speciesId`), then the species archetype, then the
  default. A cup rival, a boss and the owned creature therefore each get their
  own body.
- Every one of the 49 frame rows now authors an absolute `band` (`fromMm` /
  `toMm`): `LOW 0-600`, `MID 150-1100`, `HIGH 700-1500`, basic `100-1000`.
  A band overlaps a body when `band.fromMm < heightMm && band.toMm > 0`.
  `validateFrameData` rejects a band below the floor, an empty or inverted band,
  and anything reaching above 2,000 mm. `frames.ts` stays a pure data table.

### Swept melee (P8.T2, FR-18)

- Reach is edge-to-edge: `reachesBody(attacker, target, reachMm)` compares the
  centre gap against `reachMm + attacker.radiusMm + target.radiusMm`. Basic
  reach 420 mm therefore no longer requires 440 mm of interpenetration
  (audit 5).
- The sector test (`FRONT_ARC_COS`, the existing 180° integer-cosine constant)
  and the height band gate every step of the active window against the live
  position, so a victim who steps out of the arc or leaves the band takes
  nothing while the same swing lands on a victim who stands still (AC-18).
  Front/flank/rear still decides *how hard* (`hitPosition`), the arc decides
  *whether*.
- One blow per swing: `AttackState.landed` is set on the first hit and the rest
  of the active window is inert (audit 7). A swing that ends its active window
  without landing is reported as a whiff (`whiffsOf` → `basic` event with
  `hit: false`).
- Facing no longer follows movement intent. `faceOpponent` turns the previous
  facing toward the opponent by at most `TURN_UNITS_PER_STEP` (50 units, one
  exported tunable) and snaps when the residual is inside one step. A
  stationary fighter locks on; a fighter circling faster than the turn rate can
  still be caught in the flank or rear, so the positional bonuses stay
  reachable (audit 1). Movement stays independent of facing.

### Swept projectiles (P8.T3, FR-19)

- Each step tests the segment from the shot's previous position to its current
  one against the victim's body volume, projected with integer arithmetic
  (squared distances, cross products, floored division). A fast shot can no
  longer tunnel between samples: a 100 mm body at 350 mm is hit by a segment
  spanning 240→480 mm even though both endpoints are outside it (AC-19).
- The shot's height band comes from the same frame row; a shot above a short
  body misses. A shot that passes the body without touching is reported as
  `dodged` (zero damage), replacing the old arrival-radius test.

### Type identity (P8.T4, FR-4/FR-8)

- `StrikeStats` carries `affinity`, and `typeAgainst` calls
  `incomingTypeFactor(attacker.element, victim.element, victim.affinity ?? null)`
  — the legacy secondary-element collapse is back, so a fire hit on a
  plant/water body is neutral. `resolve.ts` threads `side.affinity` into the
  fight (audit 2).

### Event fidelity and the version gate (P8.T5, FR-13/FR-15)

- `report.ts` now emits `launch` when a shot leaves the hand, a decision-window
  `close`/`hold` beat per side (120 ms cadence, so footwork is visible without
  per-step spam), and `basic` with `hit: false` on a whiff. Replay can stage
  projectiles, approaches and idle beats (audit 3).
- `SIM_VERSION` is 2. v1 ghosts were written by the point-body resolver and
  cannot replay under swept contact, so the reader skips them (audit 4, AC-15).

### Audit findings closed

| # | Finding | Where |
| --- | --- | --- |
| 1 | Facing followed movement intent → strafing awarded flank/rear bonuses | `contact.ts` (`turnToward`, `faceOpponent`), applied in `advance.ts` after movement; `strike.test.ts`, `contact.test.ts` |
| 2 | `affinity` unread, collapse rule gone | `strike.ts` `typeAgainst`, `resolve.ts` `initFor`, `strike.test.ts` |
| 3 | Log lacked `launch`, `close`, `hold` | `report.ts` |
| 4 | `SIM_VERSION` still 1 | `cup/ghost.ts` → 2 |
| 5 | Basic reach 420 < two radii 440 | edge-to-edge `reachesBody` |
| 6 | No body-body collision; clinch lost flank/rear | `separateBodies` (half overlap each, split on x when centres coincide, clamped to the arena, stable when clear) |
| 7 | Up to three blows per active window | `AttackState.landed` |
| 8 | `activeMs < STEP_MS` never fired; launch could miss the transition | `validateFrameData` requires `activeMs >= STEP_MS`; `launchShots` still observes the transition and now always can |

## Commands

Run as two separate commands, in this order.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bun run verify` (typecheck leg) | 0 | 4 workspaces; sim 196 files, client 482, voxel 160, server 44 — no type errors |
| unit | `bun run verify` (test leg) | 0 | 3,711 pass, 1 skip, 0 fail; 443,712 `expect()` calls across 345 files in 49.5 s |
| static | `bun run verify` (Biome leg) | 0 | 860 files checked, no fixes applied |
| determinism | `bun run verify` (`gate:determinism`) | 0 | 45 voxel stage digests + 5 props regenerated byte-identical |
| build | `bun run build` | 0 | Vite 8.3.4, 384 modules, `index-8h6RT6Uk.js` 1,018.36 kB (gzip 277.65 kB), `index-DIMV0to2.css` 69.36 kB; chunk-size warning only |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-17 | Bodies have radius and height from species and form; every move authors a height band | `species.ts` (`BODY_PROFILES`, `bodyProfileFor`), `resolve.ts` (`bodyFor`), `frames.ts` (49 authored bands), `frames.test.ts` — *authors a non-empty height band on every row*, `strike.test.ts` — *the factory seeds a default body and keeps an authored one* | met |
| FR-17 | Band validation | `frames.test.ts` — *rejects an empty or inverted height band* (equal, inverted, `-1`, `2001`); *rejects an active window shorter than one step* (0 and 19 throw, 20 passes) | met |
| AC-17 | A tall body is hit by a high band and missed by a low one; a short body is missed by a band above it | `contact.test.ts` — *a tall body is hit by a high band*, *a standing body always overlaps a floor-level band*, *a band starting above the head never connects*, *a short body is missed by a band above its height*; `strike.test.ts` — band-gated melee | met |
| FR-18 | Melee tests every step of the active window against the live position, edge-to-edge, arc-gated | `strike.ts` `resolveStrikes`, `contact.ts` `reachesBody`, `strike.test.ts` — *two default bodies touch when their centres are two radii plus reach apart*, *a smaller body shortens the gap the blow has to cross*, *a body's own radius counts, not the factory default*, *a strike out of reach does not land*, *a strike aimed away does not land* | met |
| AC-18 | Stepping out of the arc during the active window takes no damage; the same swing lands when the victim stands still | `strike.test.ts` — *the same swing lands when the victim stands still (AC-18)* and *a victim who steps out of reach turns the swing into a whiff (AC-18)* (plus *a landed swing reports no whiff*) | met |
| FR-18 | One blow per swing, whiffs observable | `strike.test.ts` — *one swing lands one blow across its whole active window*; `report.ts` emits `hit: false`; `strike.test.ts` — *a landed swing reports no whiff* | met |
| AC-19 | A swept segment inside the body radius hits, outside misses, and a fast shot cannot pass through between steps | `projectile.test.ts` — *a fast shot cannot tunnel through a small body between steps* (`segmentHitsBody` true, resolved outcome hit), *a shot is spent once it has passed the body*; `contact.test.ts` — *a sweep through the body hits even when both samples are outside*, *a sweep that passes wide misses*, *a sweep under a band that starts above the body misses* | met |
| FR-19 | Height-aware swept shots | `projectile.ts` uses the row band through `segmentHitsBody`; `contact.test.ts` band tests | met |
| FR-4 | Facing tracks the opponent, not movement intent | `contact.test.ts` — *a stationary fighter ends up facing its opponent*, *a fast circler can still be hit in the flank*, *a strafe no longer turns the body away from the foe*, *a facing turns toward a point by one step at a time*, *a target inside one step is snapped to exactly*, *the turn rate is one exported tunable* | met |
| FR-4/FR-8 | Dual-element resistance/weakness counts | `strike.test.ts` — *a secondary that resists the incoming type collapses the pair to neutral*, *a secondary that does not resist leaves the weakness intact*; `resolve.ts` threads `affinity` | met |
| FR-13 | Dense stream: launch, approach, hold beats | `report.ts` (`launch`, `close`/`hold`, whiff `basic`) | met |
| FR-15/AC-15 | `SIM_VERSION` bumped; pre-track ghosts skipped | `cup/ghost.ts` = 2; `cup/ghost.test.ts` rejects `SIM_VERSION + 1` and passes at the current value | met |
| NFR-1 | Integer-only, deterministic, RNG untouched | `contact.ts` uses integer projection and `integerSqrt`; `strike.test.ts` — *the body volume is part of the state hash* and *the facing the lock-on turn produces is in the state hash*; no new RNG draw | met |
| NFR-3 | Every module under 12,288 B | `module-size.test.ts` guard passed in the test leg; `contact.ts` is a new split module, `controller.ts` untouched (12,158 B) | met |

## Test changes

New: `continuous/contact.test.ts` (body bands, edge-to-edge reach, swept
segments, separation, bounded turn). Extended: `strike.test.ts` (edge-to-edge
reach, AC-18 whiffs, one-blow window, body volume in the hash, type identity),
`projectile.test.ts` (tunnelling, passed-body, body fields), `frames.test.ts`
(bands, active-window floor).

Helper churn only: `movement.test.ts`, `stamina.test.ts`, `poise.test.ts` and
`projectile.test.ts` gained `radiusMm` / `heightMm` on bare `FighterState`
literals and `landed` on bare `AttackState` literals. `poise.test.ts`'s two
fight-level tests moved from a 4-poise pool to a 2-poise pool because one blow
per swing now empties it on the first landing step (`hold(fight, 4)`).

### Outcome re-pins (production path, Phase 9 owns the final numbers)

| File | What moved |
| --- | --- |
| `packages/sim/src/cup.golden.test.ts` | seed 7 was the eliminated golden (final loss, champion Gilded Horn). Under swept contact the player wins the final, so the row is now a second crown (champion Ember Drake, placement 1, QF2 → Cindersnout, QF3 → Tidecaller Nibbles, SF2 → Cindersnout). Phase 9 must re-pin a true eliminated seed once pacing settles |
| `packages/sim/src/cup-contracts.test.ts` | seed 19 rival winners → Driftbelle, Thistledown Ash, Tidecaller Nibbles, Thistledown Ash; day-14 seed 101 rival winners → Tidecaller Nibbles, Ash-ledger, Mossbottom Brute, Ash-ledger |

No `*.balance.test.ts` was touched, `battle/resolver.ts` is absent from the
diff, and no pacing, aggression or frame timing value was tuned.

## Deviations

| File | Reason |
| --- | --- |
| `packages/sim/src/battle/continuous/types.ts` | `radiusMm` / `heightMm` on `FighterState`, `landed` on `AttackState` — the state seam the brief names |
| `packages/sim/src/battle/continuous/step.ts` | `FighterInit` body fields, seeding, validation, and the hash additions |
| `packages/sim/src/battle/continuous/advance.ts` | Separation and lock-on facing in the step pipeline; `whiffs` / `launched` on `StepOutcome` |
| `packages/sim/src/battle/continuous/resolve.ts` | Body seeding from branch → species → default, `affinity` threading |
| `packages/sim/src/species.ts` | The authored `BODY_PROFILES` table (no voxel size exists to reuse) |
| `packages/sim/src/battle/continuous/report.ts` | P8.T5.1 beats; not in `Touches` but the only module that maps steps to events |
| `packages/sim/src/cup/ghost.ts` | P8.T5.2 `SIM_VERSION` bump; not in `Touches` but it owns the constant |
| `packages/sim/src/cup.golden.test.ts`, `packages/sim/src/cup-contracts.test.ts` | Outcome re-pins the geometry change forces; outside `Touches`, no balance suite touched |
| `packages/sim/src/battle/continuous/{movement,stamina,poise}.test.ts` | Co-located test helpers for the new required state fields (one-line defaults) |

## Notes

- **Design defaults chosen here.** Body table: draconic 260/1250, bovine
  300/1200, axolotl 200/650, storm_hound 240/900, falcon 190/750, tortoise
  300/700, frond 280/1100, crab 280/600, smolder 240/900, fox 210/800, heron
  180/1000, mole 220/650, cub 200/700, boar 270/950, otter 210/750; default
  220/900. Bands as above; turn rate 50 units per step; melee arc unchanged at
  `FRONT_ARC_COS` (180° total); one blow per swing.
- `movement.ts` still computes a facing, but `stepFight` overwrites it from the
  pre-step facing, so movement intent never reaches the body orientation.
- `controller.ts` did not grow and `policy.ts`, `chart.ts`, `clock/`, `moves.ts`
  catalog values and every `*.balance.test.ts` are untouched.
- Cup outcome churn is expected and recorded; Phase 9 re-pins pacing and the
  cup goldens that move with it.

## Evidence paths

- `packages/sim/src/battle/continuous/contact.ts` — body volume, band overlap,
  edge-to-edge reach, swept segment, separation, bounded turn
- `packages/sim/src/battle/continuous/contact.test.ts` — 23 tests
- `packages/sim/src/battle/frames.ts` — 49 authored height bands, active-window
  floor, band validation
- `packages/sim/src/battle/continuous/strike.ts` — swept sector, one blow per
  swing, whiffs, affinity collapse
- `packages/sim/src/battle/continuous/projectile.ts` — segment-vs-body, passed
  body, dodge
- `packages/sim/src/battle/continuous/report.ts` — launch / close / hold beats
- `packages/sim/src/species.ts` — `BODY_PROFILES`
- `packages/sim/src/cup/ghost.ts` — `SIM_VERSION = 2`
