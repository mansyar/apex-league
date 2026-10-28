# Phase 2 Verification — Fast Pair: Spark Fork + Flare Needle

- Track: 20261028-fire-move-identity — Fire Move Identity
- Phase: 2 — Fast Pair: Spark Fork + Flare Needle
- Date: 2026-10-28
- Branch: feat/20261028-fire-move-identity
- Base: 5e317577
- Head: 55da7667 (implementation 2d4b4ae2, c5973591 + evidence)
- Result: verified (code + gate by subagent; GIFs captured and visually confirmed by primary)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| typecheck | `bun run verify` (check step) | 0 | No type errors: client 466 files, sim 169, voxel 160, server 44 |
| test (targeted) | `bun test …/fallback.test.ts …/look-override.test.ts …/projectiles.test.ts …/move-fx.test.ts …/fire.test.ts` | 0 | 75 pass, 0 fail (TDD pins first failed 4/4 red, then green) |
| test (full) | `bun run verify` (test step) | 0 | 3474 pass, 1 skip, 0 fail across 332 files |
| lint | `bun run verify` (biome step) | 0 | 830 files, no fixes applied |
| determinism | `bun run verify` (gate step) | 0 | All archetype regeneration digests match |
| build | `bun run build` | 0 | Client builds (368 modules; pre-existing chunk-size warning only) |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-2 | Spark reads as zigzag crackle, not a travel ball | `MOVE_SHOT_LOOK.spark = { geometry: "fork", wobble: 0.3 }`; row wind 0.12, shot life 200, no muzzle; arrival size 0.6 / flashGrow 4 / life 260 / sway 1.6; 4 new TDD pins green | Done (GIF pending) |
| FR-4 | Flare Dart reads as flat pierce, not an explosion | `MOVE_SHOT_LOOK.flare_dart = { geometry: "needle", arc: 0, wobble: 0, spin: 0, pulse: 0 }`; arrival gravity 0 / sway 0 / size 0.7 / flashGrow 1.2 / life 260; 4 new TDD pins green | Done (GIF pending) |
| AC-1 | Spark GIF: fork + erratic motion visible at small size | `verification/phase-2/fire-spark.gif` (close, 900ms/step, seeds 11/23, impact staged); frame probe: thin pinkish-orange zigzag line mid-arena + mouth particles | Verified by primary (final user sign-off at Phase 6) |
| AC-3 | Flare GIF: flat needle, minimal trail, pierce non-bloom impact | `verification/phase-2/fire-flare_dart.gif` (same anchors); frame probe: cone-shaped dart at head of particle trail, distinct from spark fork | Verified by primary (final user sign-off at Phase 6) |

## Evidence paths

Implementation:

- `apps/client/src/move-fx/moves/fire.ts` (spark + flare_dart rows)
- `apps/client/src/move-fx/looks.ts` (MOVE_SHOT_LOOK opt-ins)
- `apps/client/src/fx/projectiles.ts` (spawn resolves `lookFor(element, moveId)`)
- `apps/client/src/staging-fx.ts` (BattleEffects.spawnProjectile opts gains moveId)
- `apps/client/src/steps/fire.ts` (launch passes `step.moveId`)
- `apps/client/src/move-fx/moves/fallback.test.ts` (4 new FR-2/FR-4 pins)
- `apps/client/src/move-fx/look-override.test.ts` (stale empty-table pin updated)

GIFs (captured by primary 2026-10-28):

- `verification/phase-2/fire-spark.gif` (~1.9 MB, 12 fps) — fork zigzag confirmed
- `verification/phase-2/fire-flare_dart.gif` (~2.0 MB, 12 fps) — needle dart confirmed

## GIF capture recipe (for the primary's capture pass)

1. `bun run dev`, open the Move Lab (`?movelab`).
2. Attacker: Ember Drake (draconic, panel default); Defender: Bramble Ox (bovine, panel default).
3. Move: `spark` then `flare_dart` (fire group, marked ● bespoke).
4. Range: `close`; Speed: `1×` (900 ms/step); Seeded particles: on (lab seeds 11/23).
5. Trigger each move, record the flight + impact, and note the `movelab-status` text anchors alongside the seed in the Phase 6 catalog sweep.

## Deviations

Files outside `Touches` changed (smallest necessary; brief-authorized):

- `apps/client/src/move-fx/looks.ts` — the `MOVE_SHOT_LOOK` opt-in table lives here; the phase goal ("rows opt in now") is unimplementable without these two entries.
- `apps/client/src/fx/projectiles.ts` — `spawn` opts gains `moveId?: string`; look resolved via `lookFor(element, opts?.moveId)`. Without this, fork/needle geometry can never render (spawn previously called `lookFor(element)` — always the element default).
- `apps/client/src/staging-fx.ts` — `BattleEffects.spawnProjectile` opts type gains `moveId?: string` (passthrough to `projectiles.spawn`).
- `apps/client/src/steps/fire.ts` — launch passes `moveId: step.moveId`. Only caller of `spawnProjectile`; arrival path needed no wiring (`arriveSpecial` already resolves per-row `fxFor`).
- `apps/client/src/move-fx/look-override.test.ts` — Phase 1 pin asserted the table stays empty ("no row opts in this phase"); updated the identity loop to skip the two Phase 2 opt-ins and the unknown-element fallthrough to use `cinder_shot` (spark is no longer override-free).

No sim changes, no save-schema bump, no new deps, hues still single-sourced, modules still under the 12 KB cap, visual-only.

## Notes

- Spark arrival keeps buoyant gravity (-2.2, the fire read) with sway 1.6 for erratic scatter; the mouth bloom (`muzzle: {}`) was removed because a default 6-puff bloom would outlive the 200 ms fork and reintroduce the travel-ball read.
- Flare muzzle left untouched (mouth pop only); "minimal trail" comes from the small 0.9 size over the inherited ember trail family — the trail union has no `none` family and inventing one is out of scope.
- Needle explicitly zeroes arc/wobble/spin/pulse so the cone stays locked downrange; fork inherits fire's halo/trail/arc/pulse.
