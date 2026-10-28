# Fire Move Identity — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Every fire move gets its own visual signature. The Elemental Identity Pass gave
fire a shared ember grammar, but GIF review showed all 8 fire rows read as the
same orange fireball (and Spark as nearly nothing). This track adds per-row
geometry and behavior — fork, lobbed chunk, needle, charged heavy, scaled wall,
and body-first dash reads — so each move is identifiable in motion at a glance.

## Problem / Motivation

Post-merge GIF watch-through of all 8 fire moves: spark, cinder_shot,
flare_dart, and blaze_bolt share one ember mesh + embers trail + buoyant
straight flight, differing only in size/puff numbers; Spark (size 0.7, life 420)
is a 1–2 frame flicker; Pyre Wall is a body-sized ring gone in ~2s; Flame
Charge looks like a projectile rather than a charge (the dash is invisible, so
only the fireball reads); and Charge / Dive / Lance do not read as distinct
from each other. Root cause: `SHOT_LOOK.fire` is per-element, so no row *can*
look different. If unsolved, the battle-look sign-off fails — type identity
without move identity.

## Goals & Success Metrics

- **Goal:** Each of the 8 fire rows identifiable in motion at a glance, muted, at 1× speed.
- **Metric:** User GIF sign-off on all 8 per-move clips (AC-1–AC-7). Zero
  `verify`/`build` regressions, all move-fx modules within size caps.

## Scope

### In Scope

- Per-row shot-look override mechanism (geometry + trail selectable per row, defaulting to the element look)
- New fire shot-geometry pieces: arc-fork, cinder chunk, dart needle, flame jet, charge-gather effect
- Signature reworks:
  - Spark: bright zigzag forked arc, near-instant, snap flash, no travel fireball
  - Cinder Shot: high lobbed chunk that falls onto the target, ember-drip trail, scorch mark
  - Flare Dart: flat needle, laser-straight, minimal trail, sharp pierce impact (no bloom)
  - Blaze Bolt: visible charge gather/draw-in, big slow bolt, thick smoke trail, largest bloom + lingering burn
  - Pyre Wall: ~2.5× ring around the defender within existing timing, denser jets, scorch ring
  - Flame Charge: pure body hit with ZERO shots — exaggerated horizontal tackle through the defender, flame wreath, ground fire trail, directional cone arrival
  - Cinder Dive: vertical crater — rise-plunge arc, radial ground eruption
  - Pyre Lance: pass-through beam — fastest streak, impact flash plus exit burst behind defender
- Body-is-the-projectile rule: dash attacker motion dominates; pilot shots minimized or removed
- 8 per-move Move Lab GIFs as evidence

### Out of Scope

- Other 5 elements' rows (later track)
- Audio/SFX (later user pass; visual-only)
- Sim, balance, save schema (untouched)
- Beat/clock restructuring (timing may stretch per signature, no systemic changes)

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Per-row look override: any move row can select its own shot geometry + trail; rows without override keep the element default | must |
| FR-2 | Spark reads as a bright zigzag forked arc with snap flash — visible at tiny size, near-instant, no travel fireball | must |
| FR-3 | Cinder Shot reads as a heavy lobbed cinder chunk: high arc, falls onto the target, ember-drip trail, scorch mark | must |
| FR-4 | Flare Dart reads as a flat needle: laser-straight, minimal trail, sharp pierce impact (no explosion bloom) | must |
| FR-5 | Blaze Bolt reads as a charged heavy: visible gather/draw-in at the mouth, big slow bolt, thick smoke trail, largest bloom + lingering burn | must |
| FR-6 | Pyre Wall reads as a wall: ~2.5× ring around the defender within existing timing, denser jets, clear encirclement | must |
| FR-7 | Flame Charge is a pure body hit with zero shots; Cinder Dive and Pyre Lance each read as distinct from Charge and each other in motion, with attacker motion dominating and pilot shots minimized or removed | must |
| FR-8 | One Move Lab GIF per fire row (8 total) captured as track evidence | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Client move-fx modules stay within the 12 KB cap each |
| NFR-2 | Sim package untouched (no battle logic, balance, or timing-system changes beyond row-local durations) |
| NFR-3 | No save-schema bump; no new dependencies; hues stay single-sourced |
| NFR-4 | Visual-only: no audio code paths touched |
| NFR-5 | No frame-rate regression on desktop + phone widths |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Spark GIF: zigzag fork + snap flash identifiable, no fireball travel | FR-2 |
| AC-2 | Cinder GIF: lobbed arc, fall onto target, drip trail, scorch visible | FR-3 |
| AC-3 | Flare GIF: flat needle, minimal trail, pierce (non-bloom) impact | FR-4 |
| AC-4 | Blaze GIF: charge gather visible before release, smoke trail, biggest bloom + burn | FR-5 |
| AC-5 | Wall GIF: ring clearly encircles defender at ~2.5× scale within current timing | FR-6 |
| AC-6 | Charge / Dive / Lance GIFs: Charge has zero shots with body crossing the arena; all three mutually distinguishable in motion | FR-7 |
| AC-7 | User GIF sign-off on all 8 clips; `bun run verify && bun run build` green | FR-8, NFR-1–NFR-5 |

## Edge Cases

- Instant/fast-forward mode: signatures must not break or leave orphaned particles
- Point-blank range: compressed staging must still show the signature's key beat
- KO mid-flight / miss: effects resolve cleanly, no stranded geometry
- Shot-less dash (Charge): staging must still stage launch/impact beats with zero shots
- Phone 390px width: all 8 signatures legible
- Grayscale: signatures differ by shape/motion, not hue alone (carried bar from prior track)

## Dependencies

- **Tracks:** none (20261028-elemental-identity merged as #63)
- **External:** none

## Open Questions & Assumptions

- **Assumption:** Move timing may stretch where a signature needs room (user-approved); no clock/beat restructuring.
- **Assumption:** Row-local duration/beat fields are free to change; sim resolver untouched.
- **Assumption:** SFX deferred to the user's later audio pass.

## References

- Prior track: `conductor/archive/20261028-elemental-identity/` (ember grammar, verb builders, Move Lab)
- Before-state GIFs: `.conductor/media/fire-<move>.gif` (8 clips, gitignored local reference)
