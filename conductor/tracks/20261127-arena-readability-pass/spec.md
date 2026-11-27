# Improve arena camera, lighting, and fighter readability — Specification

> **Stability notice:** Once approved, requirement IDs are permanent. Do not renumber
> them. Removed requirements are marked **Withdrawn** with a reason.

## Overview

Improve the battle presentation so fighters, their silhouettes, and their full battle
labels remain readable in real spar and cup fights. The arena may be visually redesigned,
but the simulation remains the authority for movement, damage, timing, and outcomes.

The change covers both arena camera styles, cinematic composition, arena-only lighting
and dressing, and battle HUD names. Fighter models and stage scale remain frozen.

## Problem / Motivation

The current arena presentation frequently makes fighters look small and dark, especially
on phone viewports. Cinematic framing can be wide and low-contrast, broadcast framing
shows both fighters but leaves them visually undersized, and HUD names can truncate with
an ellipsis. These weaknesses make battles harder to follow and reduce the impact of the
game's core raise → evolve → compete loop.

## Goals & Success Metrics

- Fighters project to at least **8% of viewport height** and **32 CSS pixels** at authored
  rest positions.
- Every legal movement position and arena corner remains fully in frame.
- Broadcast and cinematic views both keep the action readable.
- Full battle names remain visible without ellipsis on desktop, portrait, and landscape.
- The arena reads as a brighter, formal competition space without hiding fighter
  silhouettes.
- Reduced motion retains stable broadcast framing with no shake or flash.
- Real spar and cup captures prove the result on desktop and both phone orientations.

## Scope

### In Scope

- Broadcast and cinematic camera composition and responsive framing.
- Cinematic shot timing, radius multipliers, target points, and easing where needed.
- Arena floor, backdrop, stands, crowd, visual dimensions, and visual spacing.
- Arena-only ambient, hemisphere, key, rim, fog, and contrast values.
- Battle HUD name and label layout, including long and mirrored names.
- Desktop `1440×900`, phone portrait `393×852`, and phone landscape `852×393`.
- Camera resize, style-switch, safe-area, and lifecycle behavior.
- Real spar and cup browser proof, still captures, and a short GIF.

### Out of Scope

- Simulation coordinates, legal arena bounds, movement, damage, timing, cooldowns,
  AI, outcomes, or balance.
- Save data, save schema, state shape, or migration behavior.
- Audio behavior or cue changes.
- Voxel assets, fighter models, fighter stage scale, or determinism manifests.
- Ranch presentation or non-battle UI.
- New dependencies, generated assets, or a committed browser-test harness.
- RM-15 spar setup redesign, RM-16 mobile ranch hierarchy, and unrelated copy work.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Provide a measurable camera-composition contract: at authored rest positions, fighters project to at least 8% viewport height and 32 CSS pixels; all legal movement positions and arena corners remain fully in frame across the required viewports and body-size extremes. | High |
| FR-2 | Retune both broadcast and cinematic composition, including cinematic intent choreography, while preserving camera switching, resize, and reduced-motion behavior. Reduced motion continues to use stable broadcast framing without shake or flash. | High |
| FR-3 | Redesign the visual arena shell, floor, backdrop, stands/crowd, lighting, fog, and visual spacing for brighter formal-competition contrast. Visual dimensions may change, but simulation coordinates and legal movement bounds may not. | High |
| FR-4 | Improve fighter silhouette readability through framing and arena contrast without changing fighter models, proportions, stage scale, or generated voxel assets. | High |
| FR-5 | Show full battle HUD names and labels without ellipsis at desktop, portrait, and landscape sizes, including long and mirrored names. Responsive layout changes must not create page overflow or hide interactive controls. | High |
| FR-6 | Handle phone orientations and safe areas, stage/body-size extremes, camera lifecycle changes, and dense effects without clipping, NaN geometry, overflow, focus loss, or cross-fighter state. | High |
| FR-7 | Capture real spar and cup evidence for both camera styles and all required viewports, including stills and a short GIF with clean browser consoles. | High |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Simulation, state, save, balance, damage, timing, cooldown, AI, and outcome behavior remain unchanged. |
| NFR-2 | Audio behavior and cue ids remain unchanged. |
| NFR-3 | Voxel assets, generated files, and determinism hashes remain byte-identical. |
| NFR-4 | Ranch and non-battle UI presentation remain unchanged, including shared ranch lighting and post-processing. |
| NFR-5 | The full configured verification stack and client module-size gate remain green. No dependency, lockfile, generated-file, or committed browser-harness change is introduced. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Projection/table tests pin the 8% viewport-height and 32 CSS-pixel minimum at authored rest positions for all three viewports, body-size extremes, and mirror layouts. | FR-1, FR-4 |
| AC-2 | All legal movement positions and arena corners remain fully in frame across responsive framing and resize behavior; simulation mapping and legal bounds remain unchanged. | FR-1, FR-6, NFR-1 |
| AC-3 | Broadcast and cinematic styles both read clearly; cinematic choreography may change, while style switching, resize, and reduced-motion stable-broadcast behavior remain intact with no new shake or flash. | FR-2, FR-4, FR-6 |
| AC-4 | Arena-only lighting and dressing visibly improve contrast and fighter readability, and the final diff proves no shared ranch lighting, post-processing, voxel, audio, or simulation change. | FR-3, FR-4, NFR-2, NFR-3, NFR-4 |
| AC-5 | Full HUD names remain visible without ellipsis at `1440×900`, `393×852`, and `852×393`, including long and mirrored names; computed bounds show no horizontal page overflow or occluded interactive control. | FR-5, FR-6 |
| AC-6 | Phone safe areas, stage/body-size extremes, camera lifecycle changes, reduced motion, and dense effects remain finite, bounded, and free of clipping, overflow, focus loss, or cross-fighter leakage. | FR-6, NFR-1, NFR-5 |
| AC-7 | The full configured gate and module-size test pass; real spar and cup captures cover desktop, portrait, and landscape with stills plus a short GIF and clean consoles; diff scope proves all freeze lines. | FR-7, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5 |

## Edge Cases

- Phone portrait/landscape safe areas and orientation changes.
- Long names, mirrored names, and same-species mirror matches.
- Baby and Champion stages across small and large body profiles.
- Broadcast/cinematic switching, resize, pause/resume, and camera lifecycle changes.
- Reduced motion and dense visual effects.

## Dependencies

### Tracks

None.

### External

None.

## Open Questions & Assumptions

- The visual arena may be larger than the legal simulation arena; visual redesign does not
  grant fighters additional legal movement space.
- The 8% / 32 CSS-pixel threshold applies at authored rest positions; all legal movement
  positions must remain fully in frame but are not required to meet the minimum-height
  threshold at every instant.
- Existing camera styles remain the only saved camera styles.
- Browser evidence may use existing CLI tooling and gitignored scratch files; no committed
  Playwright dependency or harness is required.

## References

- `conductor/roadmap.md` — RM-14
- `apps/client/src/camera/presets.ts`
- `apps/client/src/camera/rig.ts`
- `apps/client/src/director.ts`
- `apps/client/src/scene-logic/framing.ts`
- `apps/client/src/arena-scale.ts`
- `apps/client/src/arena.ts`
- `apps/client/src/battleHud.ts`
- `apps/client/src/battle-hud.css`
- `conductor/archive/20261126-stage-scaled-animation-ranch-profiles/verification/phase-3.md`
- `conductor/archive/responsive_foundation_20261013/spec.md`
