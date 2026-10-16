# Spec: Battle Animation Overhaul — Arena to AAA

**Track ID:** `battle_animation_overhaul_20261012` · **Type:** Feature
**Created:** 2026-10-12 · **Branch:** `battle_animation_overhaul_20261012`

## Overview

Transform the arena battle playback from functional replay to AAA-grade
spectator battle — **AAA defined as: AAA timing, framing, and feedback
density on our stylized voxel rig, not skeletal realism** — across three
dimensions: turn-based attack choreography, fighting-game physicality, and
broadcast presentation.

The architecture contract is preserved: the sim resolves first; the client
replays a **deterministic, seed-derived script** ("the renderer animates,
but no outcome can change"). The animation system is built as **shared
primitives** (arena first, ranch reuses later). The confirmed arena
pivot-anchor bug folds in as the first task (regression of
`conductor/learnings.md` §1–2).

## Functional Requirements

1. **Arena pivot-anchor fix** — `staging.ts` `buildSpot()` adopts the
   learnings §1 holder contract (identity-scale holder, Box3-measured
   visual center, `-center` child offset, holder-driven motion). Turns
   **and KO topples** pivot on the creature's visual center.
2. **Battle-feel sim changes** (before choreography authoring):
   - **Stagger** on heavy/super-effective blows (brief action lock,
     tunable).
   - **Range-shifting knockback** — knockback becomes sim state on the
     far/near axis; closing costs tempo.
   - **Finishing-move preference** — policy prefers the most cinematic
     lethal special.
   Golden RNG-stream tests updated deliberately; a rebalance pass verifies
   the meta stays healthy. *Guardrail: every decision change is deliberate,
   tested, and rebalanced — never incidental.*
3. **Enriched playback contract** (`packages/sim/battle/playback.ts`,
   additive): windup/anticipation, contact frame, recovery, reaction kind
   (glance/stagger/knockback/down), dodge direction, KO state, knockback
   range events. Resolver outcomes untouched by the contract itself;
   `@apex/sim` stays pure data.
4. **Animation primitive layer** (shared, pure/testable): pose
   composition, per-part phased timelines with easing, spring/gait/breath
   reuse, seed-derived variation — extracted from `staging.ts` so the
   ranch can adopt it later.
5. **Choreography library (tiered bespoke):** tier 3–4 specials fully
   bespoke; tier 1–2 one upgraded shared archetype per element;
   per-archetype body language (drake lunge, ox slam, axolotl weave) for
   locomotion, attacks, dodges, hurt reactions, stagger recovery,
   knockback weight.
6. **Cinematic camera director** alongside the fixed broadcast camera:
   cuts, dollies, projectile tracking, hit punch-ins, KO orbit.
   Player-selectable via settings toggle **and** switchable live
   mid-battle; auto-disabled under reduced motion.
7. **VFX pass:** bloom post pass, per-element GPU particles
   (embers/splash/leaf/spark families), hit decals, screen-edge vignette
   on big hits.
8. **KO signature moment:** time-dilated final blow, camera punch/orbit,
   stagger-and-collapse with dust puff, verdict stamp landing as a timed
   beat.

## Non-Functional Requirements

- **Determinism:** animation seed-derived from the battle seed; replay
  plays bit-identical choreography; ghost/async-PvP-ready. Battle-feel sim
  changes are seeded and stream-tested.
- **Reduced motion:** instant-dump path preserved unchanged; full-motion
  effects gate on the existing motion preference.
- **Performance:** no per-frame allocations in render loops (existing
  checklist rule); desktop 60 fps target; post pass degrades gracefully on
  weak GPUs.
- **Sim purity:** no rendering concerns leak into `@apex/sim`; battle-feel
  changes stay within resolver/policy/playback.
- **Workflow compliance:** TDD for logic-bearing pieces (script mapping,
  pacing, camera-director decision logic); rendering verified manually per
  phase checkpoint.

## Acceptance Criteria

1. Arena turning and toppling pivot on the creature's visual center
   (verified live against learnings §1–2).
2. Stagger, knockback range-shift, and finishing-move preference are
   observable in battles; golden tests updated deliberately; a
   rebalance-health note is recorded.
3. Tier 3–4 specials are distinctly choreographed; tier 1–2 specials read
   as element-flavored variants of a shared archetype; body language
   differs per archetype.
4. Battles replay bit-identically from the same seed (replay test green).
5. Both camera modes are available (settings + live switch); reduced
   motion falls back to instant dump.
6. The KO finish delivers the full signature beat; the verdict stamp lands
   after it.
7. Manual feel-check approved by the user at each phase checkpoint.

## Out of Scope

- Audio (SFX/music) — separate future track.
- Ranch/evolution animation application (primitives are shared; the
  application is not).
- Skeletal/keyframe clip pipeline.
- Guard/brace reactions and the full Tier B balance menu (only the three
  curated battle-feel changes above).
- Continuous spatial sim (positions/momentum beyond the far/near axis).
- New species/elements; server/cloud saves.

## Delivery Shape

One track, phased:

- **P0** pivot fix + battle-feel sim *(core)*
- **P1** primitive layer + enriched contract *(core)*
- **P2** choreography library *(core)*
- **P3** camera director + VFX *(stretch — re-scopeable)*
- **P4** KO signature + polish *(stretch — re-scopeable)*

P0–P2 are the non-negotiable core; P3–P4 may be re-scoped if fatigue sets
in without compromising the track's core value.
