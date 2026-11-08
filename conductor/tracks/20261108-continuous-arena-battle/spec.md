# Continuous Arena Battle — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Replace the discrete action-gauge clock with a fixed-step, continuous-time,
continuous-space battle simulation. Fighters occupy real coordinates on the
arena floor, move freely, and commit to attacks with startup, active, and
recovery windows. The player still watches an auto-battle; the difference is
that the fight is now a sequence of overlapping, interruptible exchanges in
space rather than a queue of action slots. The existing gauge clock is frozen as
a replay-only legacy path.

## Problem / Motivation

The arena is rendered in 3D and interpolated every frame, but the simulation
behind it is a slot machine:

- `Range = "far" | "near"` (`clock/types.ts`) means the arena has two usable
  anchors. `staging.ts` confirms fighters "hold their stage position between
  steps."
- A fighter acts when `gauge >= 12` (`clock/engine.ts`), spends the whole 12,
  and cooldowns are counted in *actions*, not time (`moves.ts`).
- Projectiles always travel exactly one tick regardless of distance
  (`engine.ts`), and dodge exists only inside that one-tick gap (`hits.ts`).
- Damage is `max(1, floor(power × atk × typeNum / (def × typeDen)))` with no
  positional or timing term (`damage.ts`).
- Nothing decays, so there is no rhythm; two bodies can never collide in time
  except as an in-flight shot.

Result: the exam moment of a creature-raising game reads as a turn log with
animation on top, and the arena's floor space is decoration.

## Goals & Success Metrics

- **Goal:** fights read as continuous exchanges across the arena floor.
- **Metric:** telemetry harness thresholds — distinct fighter positions per
  fight above a floor, engagement distance varying over the fight rather than
  collapsing to one value, at least one trade or interruption in a majority of
  fights, idle time below a ceiling.
- **Goal:** a fight lasts 25–40 seconds wall-clock at normal playback.
- **Metric:** measured duration across a seeded sample of matchups falls inside
  the band.
- **Goal:** determinism is preserved exactly.
- **Metric:** repeated resolution of the same sides and seed yields an identical
  state hash on every platform.

## Scope

### In Scope

- Fixed-step continuous engine with integer time and integer positions.
- Free movement, strafing, arena bounds and edge pressure.
- Authored frame data for every move in the catalog.
- Commitment, interruption, trades, counter-hits.
- Projectile travel from distance and speed; dodge from lateral motion.
- Poise meter and stamina.
- Real-time controller replacing the per-window policy.
- Dense playback stream and minimal staging integration.
- Telemetry harness with CI thresholds.
- Legacy freeze of the gauge clock and a simulator version bump.

### Out of Scope

- Verticality, jumping, airborne moves (the representation is prepared, the
  feature is not built).
- Guard/block as a mechanic.
- Ring-out as a loss condition.
- Real-time player input.
- Full win-rate re-tune of species, bosses, forms, and tactics.
- Cinematic camera work.
- New species, new moves, server API changes.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The engine advances in fixed 20 ms steps; the same sides and seed produce an identical state hash and event log. | must |
| FR-2 | Fighter state carries fixed-point 3-vector positions in millimetres with `y` pinned to 0, plus velocity and facing. | must |
| FR-3 | Fighters move continuously toward their intent at a speed derived from `spd`, with acceleration and deceleration, and can strafe laterally. | must |
| FR-4 | Attacks resolve against actual positions: reach checks use Euclidean distance, and hits landed off the target's facing gain a positional bonus. | must |
| FR-5 | Every catalog move carries authored frame data: startup, active, recovery, reach, projectile speed, poise damage, stamina cost. | must |
| FR-6 | A committed attack cannot be cancelled after startup ends; being struck during startup interrupts it, and striking during recovery is a counter-hit. | must |
| FR-7 | Overlapping active frames resolve as a trade: both fighters land. | must |
| FR-8 | Projectile travel time is distance divided by move speed; dodge is judged against the target's lateral motion, not a one-tick window. | must |
| FR-9 | A poise meter depletes on hits; a break opens a timed punish window, with the existing grace concept expressed in time. | must |
| FR-10 | A stamina pool gates attacks and dodges and regenerates while not committing; movement itself stays free. | must |
| FR-11 | A real-time controller emits advance, retreat, strafe, hold, commit, and dodge intents on a fixed decision cadence with commitment locks. | must |
| FR-12 | Fights end by KO, double KO, or a wall-clock time cap judged by remaining HP%, then poise damage dealt, then the seed. | must |
| FR-13 | The client consumes a dense state stream, maps sim millimetres onto existing world-space staging, and telegraphs startup frames. | must |
| FR-14 | A telemetry harness records engagement distance, exchange rate, idle time, and distinct positions per fight, with thresholds enforced in CI. | should |
| FR-15 | The gauge clock and step playback are frozen as a replay-only legacy path; `SIM_VERSION` is bumped and mismatched ghost bundles are skipped. | must |
| FR-16 | Existing saves and in-flight cup sessions continue to load and resolve without a schema change beyond the simulator version marker. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: integer arithmetic only in the step function, no wall-clock or `Math.random` reads, one seeded RNG stream per fight. |
| NFR-2 | Performance: a full 45-second fight resolves headless in under 50 ms. |
| NFR-3 | Module size: new sim modules stay under the project's 12 KB per-file guard. |
| NFR-4 | Reduced motion: the existing instant text path remains available and readable. |
| NFR-5 | No network or API change beyond the ghost simulator version marker. |
| NFR-6 | The full suite stays within the project's 150 s budget. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Resolving the same sides and seed twice yields byte-identical state hashes and event logs. | FR-1 |
| AC-2 | A fighter's position is a 3-vector in millimetres and every sampled `y` is 0. | FR-2 |
| AC-3 | A fight sample shows fighters at more than one distinct position per engagement, and lateral movement is observed. | FR-3 |
| AC-4 | A strike aimed away from the target misses on distance alone, and a flank hit deals more than a front hit with identical stats. | FR-4 |
| AC-5 | Every move in the catalog has complete, non-default frame data, verified by a completeness test. | FR-5 |
| AC-6 | A hit during startup cancels the attack, and a hit during recovery deals a counter bonus. | FR-6 |
| AC-7 | Two simultaneous active frames both register damage in the same step. | FR-7 |
| AC-8 | A projectile fired from far lands later than the same move fired from near. | FR-8 |
| AC-9 | Poise depletion opens a punish window that expires after its timed duration. | FR-9 |
| AC-10 | An attack with insufficient stamina is refused and recovers once stamina regenerates. | FR-10 |
| AC-11 | The controller's decision cadence is observable and unchanged between identical runs. | FR-11 |
| AC-12 | A fight reaching the cap is judged by HP%, then poise damage, then seed. | FR-12 |
| AC-13 | The client renders a continuous fight with startup telegraphs and no per-step position snapping, at desktop and phone widths. | FR-13 |
| AC-14 | The telemetry harness reports the four metrics and fails when a threshold is violated. | FR-14 |
| AC-15 | A pre-track ghost bundle is skipped on version mismatch instead of misreplaying. | FR-15 |
| AC-16 | A save written before the track loads and its in-flight cup completes. | FR-16 |

## Edge Cases

- Both fighters at the arena edge with no room to retreat.
- Stamina empty while an attack is already committed.
- Double KO inside one step, including a projectile landing after its shooter is
  down.
- A projectile still in flight when the time cap hits.
- A fighter cornered with reach shorter than the contact distance.
- Positions overlapping after knockback; separation must not oscillate.
- A move whose reach is smaller than the body radius.
- Ghost bundle from a future or older simulator version.
- Reduced-motion path on a fight that ends in a draw.
- A move with zero cooldown and zero recovery (must be prevented by frame-data
  validation).

## Dependencies

- **Tracks:** none.
- **External:** none. No new services, credentials, or data.

## Open Questions & Assumptions

- **Assumption:** arena bounds are passed into the sim as parameters derived from
  existing staging constants, not hard-coded in the engine.
- **Assumption:** the `spd → movement speed` mapping is tunable and will be tuned
  in the follow-up balance track, not here.
- **Assumption:** a 20 ms step gives adequate hit detection at the speeds
  involved; if not, the step shrinks and the cap scales with it.
- **Assumption:** bosses and rivals use the same controller with per-archetype
  parameters rather than bespoke AI.
- **Assumption:** authored frame data lives in
  `packages/sim/src/battle/frames.ts`, separate from the move catalog, so the
  catalog stays a pure data table.

## Amendment — Contact Model (2026-11-08)

Approved mid-track after Phases 1-6 landed: the first engine treated a body as a
point with one shared radius, and tested a melee swing once against the snapshot
at the top of the step. That made melee evasion impossible and the dodge verb
decorative — a dodge order displaced roughly 100 mm against a 220 mm clearance.
The amendment replaces the contact model with volumes and sweeps. Movement stays
planar: feet remain on `y = 0` and there is still no jump, crouch, or aerial
move, so FR-2 is unchanged.

**FR-17 — Body volumes.** Every fighter carries a body radius and a body height,
seeded from species and form, and every move carries a height band. A blow whose
band does not overlap the victim's height misses.

**FR-18 — Swept melee.** A melee attack is tested every step of its active
window against the victim's live position, inside a reach-and-arc sector measured
edge to edge. A victim that leaves the arc, the reach, or the band during the
window makes the swing whiff, and reach is measured between body surfaces rather
than centres.

**FR-19 — Swept projectiles.** A shot is tested as the segment between its
previous and current position against the victim's body volume each step, so a
shot can clip a body, pass within a radius, or miss narrowly, and a fast shot
cannot tunnel through a body between steps.

**FR-20 — Dodge burst.** A dodge is a short burst faster than a walk, with a
duration, a cooldown, and a stamina price, aimed clear of the incoming line. A
dodge inside a shot's flight or a swing's active window turns that hit into a
miss; a dodge outside one does not.

**FR-21 — Pacing.** Fights land in the 25-40 second band the Goals section names,
and neither side spends a whole fight failing to land a blow.

**AC-17.** A tall body is hit by a high band and missed by a low one, and a small
body is missed by a band above its height.

**AC-18.** A victim that steps out of a swing's arc during its active window
takes no damage, and the same swing lands when the victim stands still.

**AC-19.** A shot whose swept segment passes within the body radius hits, one
that passes outside it misses, and a shot faster than the body is wide still
cannot pass through it between steps.

**AC-20.** A dodge during a shot's flight converts the hit into a miss, a dodge
outside it does not, and an unaffordable dodge is refused.

**AC-21.** A seeded sample of matchups reports fight durations inside 25-40
seconds and a hit rate above zero for both sides.

**AC-24.** The same sample reports the share of fights decided at the time cap,
and that share does not exceed one in two. A fight cannot satisfy AC-21 by
stalling until the cap, because the cap is the top of the band; the bound exists
to stop a stalled fight from counting as good pacing. The target is one in three
or better, which the balance track owns.

**Scope correction.** "Verticality, jumping, and airborne moves" remains out of
scope; body height and height bands are contact geometry, not movement in three
dimensions.

## Amendment — Hit Reactions (2026-11-08)

Approved after Phase 7 landed and the engine was audited end to end. Contact
geometry gives a blow a place to land, but nothing in the simulation transfers
force: a hit is an HP deduction and a poise deduction, and that is all. A fighter
can therefore only reach the fence by choosing to walk there, and "backed into
the corner" cannot happen. This amendment adds the missing dynamics. Movement
stays planar; nothing here introduces verticality.

**FR-22 — Impulse.** A landed blow adds velocity to the victim along the blow
direction, scaled by the move's poise damage and resisted by the victim's mass.
Mass is derived from body volume, so a heavy body slides a short distance and a
light body is thrown further. Knockback decays over a short window and is clamped
by the arena fence, so a body can be pinned against it but never pushed through.

**FR-23 — Hitstun.** A landed blow suspends the victim's movement and blocks new
commits for a short window; a poise break suspends them for longer. The victim
keeps its facing and its stamina. Hitstun is expressed in milliseconds of fight
time, not in action windows.

**Turn rate (extends FR-18).** Facing eases toward the opponent at a bounded rate
rather than snapping to it, so a fighter that circles faster than the turn rate
can still be struck in the flank or rear while a fighter that stands and fights
always faces its opponent.

**AC-22.** A heavy body and a light body struck by the same blow travel different
distances, the heavier travelling less; a body knocked at the fence stops at the
boundary and never crosses it; a body with no room to retreat is observable as
pinned.

**AC-23.** A struck fighter does not move under its own intent for the hitstun
window and cannot commit a new attack during it; the same fighter resumes on the
step after it ends; a broken fighter is suspended for longer than a merely struck
one.

**Out of scope (reaffirmed).** Projectile arcs, gravity, lobs, splash damage, and
shot-versus-shot collisions. Every shot stays a straight line at its authored
speed; an arc field on frame data is a later data extension.

**Verticality is deferred, not dropped.** Per the product owner's decision of
2026-11-08, jumping, crouching, and airborne moves are a follow-up track once this
engine is stable. The representation is already prepared for it: positions are
3-vectors with `y` present and pinned to 0 (FR-2), bodies carry a height (FR-17),
and every move carries a height band. Adding verticality should therefore be
frame data plus animation rather than a rewrite of the step.

## References

- `conductor/product.md`, `conductor/workflow.md`
- `packages/sim/src/battle/clock/{types,engine,hits}.ts`, `moves.ts`, `policy.ts`,
  `damage.ts`, `resolver.ts`, `playback.ts`
- `packages/sim/src/cup/ghost.ts` (`SIM_VERSION`)
- `apps/client/src/staging.ts`, `apps/client/src/fighter-driver.ts`

### Deferred follow-up - per-move minimum reach

Recorded 2026-11-08 at the owner's direction, deliberately **out of this track**.

Every move has a maximum reach (FR-18); none has a minimum, so a 6,500 mm lance
can be fired at point-blank range and a long weapon has no weakness at close
quarters. The follow-up adds a `minReachMm` (or a sweet-spot band) per frame row,
refuses or degrades a move fired inside its dead zone, and gives a short-range
archetype a reason to exist. It changes fight outcomes, so it belongs with the
balance track that re-tunes win rates, not here.
