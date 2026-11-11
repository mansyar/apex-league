# Phase 2 evidence — Dodge, Knockback, Contact

Track `20261111-presentation-mapping`, Phase 2 (FR-3 / FR-4 / FR-7).
Base `d063bb56`, head `fb14c646`, result verified.

## Summary

Stream-driven dodge roll, knockback recoil with planted feet and a
fence-pin burst report, and contact squash with a render-only clinch
offset. All motion derives from stream positions plus the sim's own
`hitstunMs`/`pinned` flags — no new inference source, no sim change, no
clock, no randomness. Replay hash unchanged (`0xc579e9ae`).

## Commands

- `bun run verify` — exit code 0. Types clean, 4048 tests pass (1 skip),
  Biome clean (922 files), determinism gate OK, replay hash `0xc579e9ae`
  identical across the seeded replays.
- `bun run build` — exit code 0. Vite builds 413 modules; the >500 kB
  chunk-size warning is pre-existing.

## What changed

- `apps/client/src/choreo-poses.ts` (P2.T1/T2/T3 mapping)
  - `StreamPose` gains `roll`, `recoil`, `press`. Priority:
    ko > crumple > pinned-recoil > hitstun (recoil over flinch when the
    step slides) > roll > press > crouch > none.
  - New travel/motion thresholds, each documented against the sim source:
    `ROLL_TRAVEL_MM = 50` (walk tops out ~37, dodge floors at 60),
    `ROLL_FULL_MM = 120`, `RECOIL_TRAVEL_MM = 12` (heaviest basic slide
    opens at 16), `RECOIL_FULL_MM = 90`, `RECOIL_FLOOR = 0.35`,
    `CONTACT_MARGIN_MM = 40` (exported for the playback offset).
  - `PoseMotion` in/out (`travelMm`, `gapMm`, `contactMm`); `pressIntensity`
    fades 1 at touch to 0.5 at the contact boundary.
  - `poseAdjust` arms: roll tucks forward with no recoil, recoil shoves
    harder than flinch with planted feet, press leans in with no recoil.
- `apps/client/src/pose-track.ts` (new co-located module, P2.T1/T2/T3)
  - Split out of `choreo-poses.ts` when that module breached the 12,288 B
    cap (15,709 B); both modules now pass the size gate.
  - `createPoseTracker` step memory: travel from previous positions,
    recoil latch that upgrades a flinch to `recoil` at the floor for the
    whole served window, same-step caching, KO/reset clearing; now also
    takes the foe frame plus this pair's contact distance for the press.
  - `contactOffset`: pure deterministic clinch nudge, half-overlap split
    per side along the contact axis, capped at 60 mm, zero when clear.
- `apps/client/src/fighter-driver.ts` (P2.T1/T2/T3 render)
  - Roll and recoil zero the gait term while active — feet plant instead
    of skating through the burst. `poseAdjust` is hoisted above the gait
    composition; no other driver behavior changes.
- `apps/client/src/dense-playback.ts` (P2.T2/T3 wiring)
  - Both frames are read before either tracker updates so the press sees
    the foe's current step. Clinch-gated `contactOffset` nudges are added
    to the stage targets through `simX`/`simZ` (render only, never stored).
  - Rising-edge pin burst (`PIN_BURST`: grounded dust, no flash, ring) on
    fresh `pinned` steps — the fence report made visible. Tracker state
    cleared in `reset()`.
- `apps/client/src/staging.ts` (P2.T3 wiring)
  - `cast()` records this cast's sim body radii via `bodyProfileOf`;
    `applyFrame` passes them as the contact distance. Comment-only trims
    (~590 B) keep the file under the module cap; no behavior change.
- `apps/client/src/choreo-poses.test.ts`,
  `apps/client/src/fighter-driver.test.ts` (P2.T1/T2/T3 coverage)
  - 28 new tests: roll mapping (dodge travel, walk rejection, beats
    crouch), recoil mapping (slide trips, still hit flinches, floor
    intensity), press mapping (touch/edge/beyond, loses to roll and hit,
    beats crouch), tracker latches (roll release, recoil hold through the
    tail, pin holds, symmetric clinch, KO/reset clearing), `contactOffset`
    (clear/touch/cap/coincident/symmetry), adjust signatures (roll tucks
    deeper than crouch, recoil out-shoves flinch mirrored by `away`,
    press leans in with no recoil, scaling + reduced-motion collapse), and
    driver rendering (roll tuck, recoil shove, gait planting, press squash).

## AC table

- AC-3 (roll along the dodge vector, no turn from the foe): tracker tests
  feed a 70 mm/step no-hitstun travel and assert `roll` with intensity
  70/120; walk-speed travel (36–49 mm) asserts `none`; driver tests assert
  forward tuck `rotation.x > 0.2` with `position.x = 0` and no facing
  change (the facing line is untouched by any pose branch).
- AC-4 (recoil on the sim's impulse, planted feet, visible pin): a sliding
  hit asserts `recoil` at the travel intensity, a still hit asserts
  `flinch`, and the tail asserts `recoil` at the floor after travel decays;
  `pinned` asserts `recoil` at intensity 1; driver tests assert the gait
  term is suppressed for roll/recoil (|Δy| > 0.03 vs the free pose) and the
  pin burst fires on the rising edge of `pinned` in `apply()`.
- AC-7 (squash + offset, no unexplained interpenetration): touching bodies
  assert `press` at intensity 1 with squash 0.18, a clear pair asserts
  `none` with zero nudge, and `contactOffset` asserts the half-each split
  capped at 60 mm with mirrored signs; driver tests assert press squash
  via `scale.y < scale.x` and zero lateral shift.

## Deviations

- `apps/client/src/pose-track.ts` (new file): required — `choreo-poses.ts`
  reached 15,709 B against the 12,288 B cap. The brief sanctions a new
  co-located module when the cap breaches; the tracker plus contact offset
  moved as one seam (step memory + clinch math), the mapping stayed.
- `apps/client/src/staging.ts` (comment trims only): required — my radii
  addition (~200 B) tipped the file to 12,593 B. Trimmed ~590 B of
  comments, no behavior change.

## Notes

- Wedge anchor points (Phase 3): `showTell` in `dense-playback.ts` already
  aims the wedge down the stream facing at the body's feet; per-side radii
  now flow through `apply()` and are available if the wedge should scale
  with body width.
- Shader hook points (Phase 3): `PIN_BURST` (dust, `#9a9184`, ring, no
  flash) is the fence-report accent — reuse its palette for the pin
  shader so the pinned read stays consistent. `react()` still owns the
  hit flash/burst; nothing in this phase changes it.
- Motion-life interactions (Phase 4): roll/recoil/press intensities pass
  through `poseAdjust`'s existing `life` gate, so reduced motion already
  collapses them to zero; the gait plant multiplies the same `life`-scaled
  path, so reduced motion stays planted-and-still, not planted-and-tucked.
  The pin burst is an effect spawn, not life-gated — Phase 4 owns whether
  it flashes under reduced motion.
- Slip (2.5× walk, lateral, free) is indistinguishable in the stream and
  reads as a partial roll — documented, accepted (same reasoning as the
  mid-join flinch approximation in Phase 1).
- Contact distance is per-pair radii (`bodyProfileOf` both archetypes) plus
  a 40 mm margin; the nudge cap (60 mm) keeps the offset a report, never a
  shove.

## Primary verification

- Range `d063bb56..HEAD`: four subagent commits, all reported, squashed to
  `36d0a24d` (no merge, unreported, or user commits in range).
- `bun run verify` exit 0 (independent run; determinism gate byte-identical).
  `bun run build` exit 0 (chunk-size warning pre-existing).
- Sizes: `choreo-poses.ts` 11,594 B, `pose-track.ts` 4,726 B (new),
  `fighter-driver.ts` 12,147 B (141 B headroom — Phase 3/4 must not grow the
  driver without extracting first), `staging.ts` 11,923 B. All under cap.
- Deviations accepted: `pose-track.ts` split is cap-mandated and moves one
  seam; `staging.ts` change is comment-only trims compensating the radii
  addition, no behaviour change.
- AC-3/4/7 all proven by the cited tests; replay hash `0xc579e9ae`
  unchanged — zero sim diff confirmed.
- Accepted approximation (recorded, not a miss): slip reads as partial roll;
  pin burst is not life-gated (Phase 4 owns).
