# Spec: Battle Arena Playback (`arena_playback_20261010`)

## Overview
Give the deterministic battle its stage. When a Spar starts, the app swaps
from the ranch to a top-down 3D arena where both creatures' GLBs replay the
pre-resolved `BattleEvent` stream as a spectator fight: type-colored projectile
specials, hit reactions, live HP bars, an announcer lower-third, camera
framing, and a celebratory finish — then returns to the ranch. This directly
serves the "Respect the watch" UX principle: auto-battles must be entertaining
to watch.

## Basis
- The battle core (`@apex/sim/battle`) already emits an ordered, seeded,
  DOM-free event log ("built for a later arena track to play back").
- The client Spar flow (`apps/client`) already resolves a battle and steps
  through the log at 900ms / 140ms (fast-forward).
- Voxel creatures and props are generated with `@apex/voxel` and rendered with
  Three.js in the existing ranch scene.

## Functional Requirements
1. **Arena scene (in-app swap)** — starting a Spar fades the ranch scene out
   and the arena scene in; on battle end (or exit), the ranch is restored with
   no state loss. Arena is reachable only through Spar in this track (no
   standalone page).
2. **Event-staged replay** — the arena playback engine maps each `BattleEvent`
   (move-up, projectile launch, hit, miss/dodge, KO, endings) to visible
   actions in order, without re-simulating; the rendered outcome must always
   match the resolver's result.
3. **Creature presentation** — both combatants rendered from the generator as
   in the ranch, positioned on opposing sides; movement, launch, and hit
   reactions keyed to events.
4. **Type-colored VFX** — projectile color follows the fixed type-hue contract
   (Fire 18°, Plant 110°, Water 205°); hits flash the victim, launches leave
   short trails. Type is never the only cue (icon/badge accompanies big
   moments).
5. **Live HUD** — dual HP bars with names, current rangefinder state
   (close/hold), and the announcer line for the active event as a broadcast
   lower-third. The full text log moves to a compact, collapsible secondary
   list; the arena is the primary view.
6. **Pacing** — normal speed plus explicit fast-forward toggle (no
   skip-by-default); playback ends with a result banner (winner, ending
   reason) before returning to the ranch.
7. **Juice & reduced motion** — camera shake on big hits, impact flashes,
   crowd silhouettes on the stands, KO/finisher celebration moments. A
   reduced-motion toggle in the HUD (persisted in the save) disables camera
   shake and flash effects while keeping all gameplay legible.
8. **Save v5** — reduced-motion preference added to the save schema with a
   v4→v5 migration (default: full motion).

## Non-Functional Requirements
- Deterministic resolver untouched; playback is presentation-only and cannot
  alter outcomes.
- No per-frame heap allocations that would tick the GC in the render loop
  (per existing client practice).
- Testable logic (event→animation script mapping, save migration) is pure TS
  and bun:test-covered; rendering verified manually per workflow.

## Acceptance Criteria
- Spar runs entirely in the arena: swap in → staged replay matches the
  resolved winner → result banner → back to ranch.
- HP bars, announcer lower-third, rangefinder display track events accurately.
- Fast-forward visibly speeds the replay without skipping content.
- Reduced-motion ON eliminates shake/flash; preference survives reload.
- `bun run verify` green; playback mapping and migration tests pass; manual
  verification notes recorded.

## Out of Scope
- Cup system, brackets, ladder, ranks (separate tracks).
- Mid-battle player decisions (battles stay pre-resolved spectator events).
- Audio (Phase 4). Evolution/retirement. Mid-battle tactic changes.
