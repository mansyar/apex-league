# Phase 7 — Feedback Rework: Envelope, Spear, Tower

## Goal

User feedback round on the 8 fire GIFs (client presentation only —
sim/save/deps untouched):

1. **Flame Charge + Cinder Dive:** the fire envelope on the body while
   crossing must be much more apparent (before: wreath at launch, clean
   body in flight).
2. **Pyre Lance:** the beam geometry must read as a lance/spear (shaft +
   head + guard), not a plain needle.
3. **Pyre Wall:** the fire must come OUT OF THE GROUND circling the enemy
   — a circular fire tower/wall around the defender.

## Changes

- **P7.T1 — Transit flame trail.** `MoveFx.transit` gains an optional
  `trail?: BurstStyle` (`apps/client/src/move-fx/moves.ts`). The transit
  block in `apps/client/src/steps/fire.ts` sheds one trail puff per
  twelfth of the crossing (`Math.floor(u * 12)` bucketed off the action
  clock — same tick, same spawns; no clock/RNG in the trigger) at the
  attacker's live group position. Reduced motion needs no handling:
  `spawnBurst` already no-ops under the reduced pref. Rows: charge gets
  `trail: { puffs: 3, size: 1.1, life: 320, gravity: -2.2, sway: 0.6 }`
  with `charge.to` 1.1 → 2.0 (wreath engulfs through the crossing); dive
  gains `charge: { from: 0.4, to: 2.4 }` plus `trail: { puffs: 4,
  size: 1.4, life: 380, gravity: -2.2, sway: 0.8 }`.
- **P7.T2 — Spear geometry.** `"spear"` added to the `ShotLook.geometry`
  union (`apps/client/src/move-fx/looks.ts`); new builder in
  `apps/client/src/fx/shot-geometry.ts` (Group pointing downrange +z:
  thin shaft ~0.16×PR radius × ~6×PR long centered behind, cone head
  ~0.5×PR × ~1.8×PR apex toward +z at the front, flattened octahedron
  guard ~0.75×PR thin in z at the junction; additive materials like the
  jet). `MOVE_SHOT_LOOK.pyre_lance` now names `"spear"` (arc/wobble/
  spin/pulse stay 0); `flare_dart` keeps its needle.
- **P7.T3 — Ground-erupting tower.** New opt-in `grounded?: boolean` on
  `BurstStyle`; `createBurstLayer`'s `spawn()` skips the `SHOT_TARGET_Y`
  lift when true so flash + fragments start at the target group origin
  (feet/floor). `pyre_wall` arrival retune: `grounded: true`, puffs
  20 → 30, life 560 → 1050, gravity -2.2 → -4.5, `flashGrow` 3 → 3.6
  (size 3.75, sway 0.5, ring, shove 0 held). Tower height comes from
  sustained buoyancy over the long life (ring initial vy is only
  ~0.15–0.4 in `burstVelocity`). Scorch decal untouched.
- **P7.T4 — Pins + this report.** 9 new red-first pins in
  `apps/client/src/move-fx/moves/fallback.test.ts` (trail count,
  same-tick determinism, no-trail probe, spear look + structure +
  determinism/distinctness, wall retune, grounded spawn heights) plus 3
  consequential updates (look-override lance pin needle → spear; dive
  end-sample now catches the final trail puff; wall life pin 560 →
  1050 with the timing-held comment reworded to windup-only).

## Commits (primary)

- `7e5f97d0` docs — re-land Phase 5 close-out section (missed by
  `91f48906`, which committed only plan/metadata/GIFs).
- `c23c382e` feat — P7.T1–T3 implementation (+2 extraction modules).
- `375c82f5` test — P7.T4 pins + this report.
- `e8bd7bea` docs — verify Phase 7 implementation and pins.

## Files changed

- `apps/client/src/move-fx/moves.ts` (BurstStyle.grounded, transit.trail)
- `apps/client/src/steps/fire.ts` (trailRef + bucketed trail spawn)
- `apps/client/src/move-fx/moves/fire.ts` (charge/dive envelopes, wall
  tower retune)
- `apps/client/src/move-fx/looks.ts` ("spear" union + lance override)
- `apps/client/src/fx/shot-geometry.ts` (spear builder)
- `apps/client/src/fx/bursts.ts` (grounded lift skip)
- `apps/client/src/move-fx/moves/fallback.test.ts` (9 new pins, 2
  updated pins, 4 new imports)
- `apps/client/src/move-fx/look-override.test.ts` (lance pin + comment)
- `conductor/tracks/20261028-fire-move-identity/verification/phase-7.md`
  (this file)

## Deviations

None — all edits are within the plan's Touches list.

## Primary: size-cap extraction + gate (VERIFIED)

The gate caught two NFR-1 module-cap breaches from the new code
(`fx/shot-geometry.ts` 12 842 B, `steps/fire.ts` 12 598 B vs the
12 288 B cap). The primary extracted both additions along their
existing seams — no behavior change, public APIs untouched:

- `apps/client/src/steps/fire-transit.ts` (new, ~2.7 KB): the whole
  transit application (`applyTransit` + `TransitTrailState`) moved out
  of `steps/fire.ts` (now ~10.8 KB). Type-only imports, so zero
  runtime-cycle risk.
- `apps/client/src/fx/shot-spear.ts` (new, ~1.8 KB): the spear builder
  (`buildSpearCore`) moved out of `shot-geometry.ts` (now ~11.5 KB);
  `PROJECTILE_RADIUS` already lives in shared `fx-data.ts`, so no
  cycle. `buildShotCore` still serves `"spear"` by delegation — spear
  pins hold through the public entry.
- Only `fallback.test.ts` imports the step pipeline, and only the
  unchanged `fireSpecial` entry — no pin updates needed for the move.

### Gate (primary-run, after extraction)

- `bun run verify` → **exit 0** (typecheck clean; 3503 pass / 1 skip /
  0 fail; Biome clean; determinism gate OK — all species × stages
  byte-identical + 5 props).
- `bun run build` → **exit 0** (pre-existing chunk-size warning only).

### Commits

- `feat(client)` — P7.T1–T3 implementation (8 source files incl. the 2
  new extraction modules; one commit, not one per task, because the
  trail/grounded hunks interleave in the shared `moves.ts` / `fire.ts`
  / `fallback.test.ts` files).
- `test(client)` — P7.T4 pins + this report.

GIF re-capture done by the primary (see evidence section below) —
AC-5/AC-6 verified from the GIFs, not from pins alone.

## Red → green

Pins written red-first against the pre-change tree (new fields absent,
lance still needle, wall still lifted with life 560), green after
P7.T1–P7.T3. New pins: 9 tests (envelope contract, 13-puff full-run
count ×2 rows, same-tick replay ×2 rows, no-trail probe, spear look,
spear structure, spear determinism/distinctness, wall retune, grounded
heights). Updated: 3 existing pins. Not executed here (no shell) —
primary runs `bun run verify && bun run build`.

## GIF recipe (primary)

Re-capture 4 GIFs in Move Lab, **draconic vs bovine, 1× speed**:

- `fire-flame_charge.gif` — charge at **FAR** (full-gap crossing shows
  the engulfing wreath + shed trail end to end).
- `fire-cinder_dive.gif` — dive at **close** (arc + envelope + crater).
- `fire-pyre_lance.gif` — lance at **close** (spear beam + exit wound).
- `fire-pyre_wall.gif` — wall at **close** (ground-erupting tower around
  the defender).

Then re-run the grayscale readability pass on the 4 before sign-off.

## Primary evidence — 4 GIFs + grayscale (VERIFIED)

Move Lab, draconic vs bovine, 1× (seeds 11/23): charge at FAR, the
other three at close. All four triggers reached `impact staged`.

- `fire-flame_charge.gif` (1.2 MB) — 10-frame strip: frames 1–5 static,
  frame 6 drake lunging across the floor **engulfed in a bright
  orange/yellow wreath with trail puffs behind**, frames 7–8 arrival,
  9–10 aftermath. Verdict: crossing body reads engulfed end to end —
  feedback item 1 (charge) FIXED.
- `fire-cinder_dive.gif` (0.75 MB) — 10-frame strip: wind-up glow
  (frame 2), expanding envelope (3), airborne ascent with riding
  envelope + wake (4–5), steep plunge (6), crater bloom (7), settle
  (8–10). Verdict: airborne wreathed plunge, envelope locked on —
  feedback item 1 (dive) FIXED.
- `fire-pyre_lance.gif` (0.73 MB) — the 300 ms flight falls between
  1 fps strip samples (strip read "fail" is a sampling artifact, not a
  code bug). Full-res second-8 frame: **elongated spear — slender
  shaft + pointed conical head + collar/guard**, ⅓–½ body length, with
  muzzle embers at the attacker. Impact frame: bright burst **behind /
  right of the defender** (exit wound). Verdict: reads as a
  lance/spear, not a generic bolt — feedback item 2 FIXED. Lesson:
  sub-second flights need full-res frame reads, not 1 fps strips.
- `fire-pyre_wall.gif` (0.89 MB) — 12-frame 1 fps strip: seconds 1–9
  wind-up/positioning, second 10 **translucent pinkish-orange
  dome/pillar erupting straight out of the ground, fully encircling
  the defender, 1.5–2× body height, embers inside**, seconds 11–12
  clear. Verdict: ground-erupting circular fire tower — feedback
  item 3 FIXED.

Grayscale re-read (color stripped, 2×2): charge = engulfed lunging
body with trailing wake; dive = diving body in aerial envelope;
lance = detached projectile point; wall = vertical pillar around the
defender. **PASS — four distinct silhouettes, no hue dependence.**

### Result

**VERIFIED.** All three user feedback items fixed and proven live;
grayscale holds. Implementation head: `c23c382e` (+ extraction
modules); pins head: `375c82f5`; evidence: 4 GIFs in this folder.
