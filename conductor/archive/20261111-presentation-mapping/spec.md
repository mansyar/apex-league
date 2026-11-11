# Presentation Mapping — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track maps the continuous battle simulation to readable animation. Every sim event the dense stream already carries (startup, active, hit, dodge, poise break, knockback, KO) gets a visible body pose plus small vertex-shader accents, so a fight that is already correct finally *reads* correctly. Client-only: `packages/sim` is not touched.

## Problem / Motivation

The animation set predates the sim. Hitstun and poise break have no pose, the dodge is a fast slide rather than a roll, knockback skates with no recoil or planted feet, the startup telegraph is a fixed-size wedge (five body-widths long for a basic, about right for a lance), and bodies interpenetrate at contact range. A first-time player sees sliding tokens, not a fight — and any future feel tuning would be judged through broken animation.

## Goals & Success Metrics

- **Goal:** every stream event drives a distinct, readable pose at desktop and phone widths.
- **Metric:** playwright visual pass on seeded fights at both widths; replay state hashes byte-identical to main (sim untouched); reduced-motion path stays readable; reference fights hold their frame-time profile (no new jank).

## Scope

### In Scope

- New poses: hitstun flinch, poise-break crumple, dodge roll/tuck, knockback recoil with planted feet, startup telegraph crouch.
- Reach-derived telegraph wedge (size from `reachMm` + body radius).
- Contact squash + slight render offset so overlap reads as impact.
- Bounded shader accents: squash & stretch, hit wobble/flash, KO dissolve, telegraph rings.
- Reduced motion: poses collapse to simplified flashes (existing instant-dump language).
- Visual pass at desktop and 393px phone widths.

### Out of Scope

- Any change under `packages/sim` (no stream fields, no frame data, no numbers) — except additive spare-bit exports (no new fields, no frame-data/number changes), recorded as D1.
- New mechanics, stats, bands, pacing, or balance changes.
- Voxel mesh rebuilds or pipeline changes (true mesh-to-sim-size agreement stays a later art pass).
- Keyframed clips, skeletons, new animation assets.
- Verticality, blocking, ring-out, player input, new species/moves, HUD redesign.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A struck fighter plays a hitstun flinch for the sim's hitstun window | must |
| FR-2 | A poise-broken fighter plays a distinct crumple until the break ends | must |
| FR-3 | A paid dodge plays a roll/tuck in the dodge direction, not a slide | must |
| FR-4 | Knockback plays a recoil with planted feet (no skating) and reports fence pins | must |
| FR-5 | An attacker crouches/loads during startup, hidden once the active phase opens | must |
| FR-6 | The startup telegraph wedge derives length and arc from `reachMm` + body radius | must |
| FR-7 | Body contact plays a squash and render offset so overlap reads as impact | should |
| FR-8 | Shader accents stay within the bounded set (squash-stretch, hit wobble/flash, KO dissolve, telegraph rings) | must |
| FR-9 | Reduced motion replaces all of the above with simplified flashes | must |
| FR-10 | Every stream event kind drives a pose; no event renders as a snap or no-op | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Zero diff under `packages/sim`; proven by byte-identical replay hashes on seeded fights |
| NFR-2 | New/changed client modules respect the 12 KB cap enforced by the module-size guard |
| NFR-3 | Reference fights (one seeded spar, one cup day) hold their frame-time profile at both widths |
| NFR-4 | Full suite stays within the 150 s budget |
| NFR-5 | The reduced-motion contract (readable without motion) is preserved |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Seeded fight: every landed hit shows a flinch; sampled frames asserted in the visual pass | FR-1 |
| AC-2 | Seeded fight: a poise break shows the crumple until the break window ends | FR-2 |
| AC-3 | Paid dodge shows roll/tuck along the dodge vector; no positional slide without rotation | FR-3 |
| AC-4 | Knockback shows recoil + planted feet; fence pin visibly reported | FR-4 |
| AC-5 | Startup shows the crouch; the active phase shows no telegraph | FR-5 |
| AC-6 | Wedge length matches `reachMm` per move (basic short, lance long) at both widths | FR-6 |
| AC-7 | Contact frames show squash/offset; no unexplained interpenetration in the pass | FR-7 |
| AC-8 | Only the bounded shader set is present; concurrent effect instances are capped | FR-8 |
| AC-9 | Reduced-motion run shows flashes only, fight outcome identical | FR-9 |
| AC-10 | Stream-to-pose mapping test: every event kind maps to a pose, none to a snap | FR-10 |
| AC-11 | Replay hashes on seeded fights equal main exactly | NFR-1 |

## Edge Cases

- KO lands mid-hitstun: the KO reel wins, no pose fighting.
- Double KO: both reels play, draw banner unchanged.
- Dodge into the fence: roll plays, pin reported, no clipping through the boundary.
- Mirror match: poses stay readable when both bodies share a silhouette.
- Stream carries no new fields: any pose needing missing data approximates or is cut, never blocks.
- Reduced motion + all-knockout matrix: outcome identical, flashes only.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** "No new jank" means the reference fights' frame-time profile stays within measurement noise of main; the exact harness is the visual pass itself.
- **Assumption:** Shader budget is one vertex-deformation pass plus a capped concurrent effect count; the plan pins the numbers.
- **Assumption:** Reference fights are one seeded spar and one cup day, named in the plan.

## References

- `conductor/product.md` (Roadmap: Battle follow-ups, item 1)
- `conductor/workflow.md`, `conductor/product-guidelines.md`
- `conductor/archive/20261108-continuous-arena-battle/` (stream contract, FR-13 lineage)
- Client: choreo/fighter-driver/dense-playback/staging-director, `BODY_PROFILES`, frame data
