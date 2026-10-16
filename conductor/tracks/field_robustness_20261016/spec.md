# Spec — Touch & Field Robustness

**Track ID:** `field_robustness_20261016`
**Type:** bug+feature (client hardening)
**Status:** Draft
**Date:** 2026-10-16
**Branch:** `track/field_robustness_20261016`

## Overview

The client has a mobile-first *layout* foundation
(`responsive_foundation_20261013`) but the **interaction** layer and the
**failure paths** never came along with it. On a touch device the player cannot
drag-orbit without also scrolling the page, cannot pinch to zoom at all, and a
tap during a battle still arms camera dragging; on a desktop that lacks WebGL
the game is a blank page with no explanation and no way back if the context is
lost; keyboard players cannot see focus on cup/spar plates; and a backgrounded
tab keeps its render loop and effect timers running.

This track closes those gaps. It touches no simulation code, no save schema,
and no content. The testable seam is the one the repo already uses
(`steps/pure.ts`, `scene-logic.ts`): pull the orbit/gesture math and the
runtime (visibility + graphics-availability) state machine into pure modules
with unit tests, then wire them into the existing three.js/DOM surfaces.

## Background (evidence)

| Finding | Evidence |
|---|---|
| Drag-to-orbit also scrolls the page; no pinch-zoom | **zero** `touch-action` declarations across every client stylesheet; `orbit-camera.ts:141-176` binds `pointerdown`/`wheel` with no `preventDefault` and no multi-pointer path (`:164-172` is wheel-only zoom, clamped `2.5..14` at `:166`) |
| A tap during a battle arms the drag | `onPointerMove` guards on `cameraMode !== "ranch"` (`:150`) but `onPointerDown` (`:144-148`) never checks it, so `dragging` latches in arena mode |
| No hidden-tab pause | `scene.ts:325` binds `resize` only; the tick loop (`:275-310`, `:308` schedules the next frame) runs regardless of `document.hidden` |
| No graphics-failure surface | `scene-setup.ts:54` constructs `THREE.WebGLRenderer` unguarded; `index.html:24` is an empty `<div id="app">`; `main.ts:43` throws with no user-facing fallback; no `webglcontextlost`/`restored` listener exists (only an unrelated composer `try/catch` at `scene.ts:299-306`) |
| Phone tap targets under 44 px | `cup.css:939-943` sets `.cup-slot { min-height: 30px }` inside the phone media query |
| Inconsistent keyboard focus | `:focus-visible` exists only in `ui/kit.css:309,379-381` and `ranch.css:150,193,226,296,451,536`; `cup.css`, `spar.css`, `starter.css` and `battle-hud.css` fall back to the UA outline, which is invisible on the clipped broadcast plates |

Supporting facts: `advanceDay` is player-triggered only
(`packages/sim/src/ticker.ts:18`), so a hidden tab has **no game clock to catch
up** — pausing is purely presentation/perf and cannot change game outcomes.
Effect time is already centrally owned (`staging-fx.ts` `EffectLoop` +
`HitStop`), and playback pacing runs on a timer chain
(`playbackDriver.ts`), so "pause" has exactly three subscribers to route.

## Design decisions (confirmed 2026-10-16)

1. **Hidden tab = hard pause.** Stop the render loop and the staging/effect and
   playback timers while `document.hidden`; resume cleanly on return, with the
   frame clock re-anchored so the first frame back cannot advance a
   clamped-step animation. No low-rate throttle, no game clock to reconcile.
2. **The arena camera is not user-draggable.** During arena playback the camera
   director owns framing (cinematic/broadcast intents); orbit input is ignored
   for the whole time `cameraMode === "arena"`, and a mode change cancels any
   drag in flight. This is the "respect the watch" reading of the current
   half-enforced rule (`orbit-camera.ts:150`).
3. **Pinch changes radius only**, clamped to the same sweep the wheel already
   respects (`2.5..14`). No pinch-pan, no double-tap reset.
4. **The 44 px tap-target floor applies at the phone tier only** (base
   breakpoint, `≤479px`), leaving desktop density exactly as designed.
5. **One failure surface, one recovery.** WebGL unavailable at boot and a
   *lost* context route to the same broadcast-kit plate: a plain-language cause
   plus a Reload button. A `restored` event attempts a resume; if the resumed
   frame throws, the plate returns. No 2D no-WebGL fallback mode (see Out of
   Scope).
6. **`hud.ts` stays out of scope.** This track is touch/resilience/a11y plus
   the pure-logic extraction; the 1294-line HUD decomposition gets its own
   refactor track so the two do not tangle in review.

## Functional Requirements

### F1 — Touch input contract on the render surface

- The renderer canvas claims touch gestures: `touch-action: none` on
  `#app canvas` in `base.css` (which already owns `#app canvas { display:
  block }` at `:30-32`).
- `orbit-camera.ts` pointer handlers call `preventDefault()` when the gesture
  is claimed (a ranch-mode primary pointer), so a drag cannot scroll the page.
  Gestures that are *not* claimed (arena mode, non-primary device) must not be
  swallowed — page scrolling stays intact for every other element.
- A mode change while a drag is armed cancels the drag (`dragging = false`),
  so returning to the ranch never resumes a stale gesture.

### F2 — Pure orbit & gesture module (`orbit-logic.ts`) — TDD

Extract the arithmetic and the gesture state machine out of
`orbit-camera.ts` into `apps/client/src/orbit-logic.ts`, mirroring the
`scene-logic.ts` / `steps/pure.ts` precedent:

- `ORBIT_BOUNDS` (`MIN_RADIUS 2.5`, `MAX_RADIUS 14`), `ELEVATION_BOUNDS`
  (`0.05..1.45`), `DRAG_SENSITIVITY` (`0.005`) — the constants currently inline
  at `orbit-camera.ts:151-170`.
- `dragOrbit(orbit, dx, dy)` → new orbit, azimuth unbounded, elevation clamped.
- `zoomOrbit(orbit, deltaY)` → radius scaled by the existing
  `sign(deltaY) * 0.1` rule and clamped.
- `pinchOrbit(orbit, spreadRatio)` → radius scaled by the ratio between the
  previous and current two-pointer distance, clamped to `ORBIT_BOUNDS`.
- `orbitPosition(target, orbit)` → the `{x, y, z}` the current `applyOrbit`
  computes inline (`orbit-camera.ts:100-109`), so the camera write is a pure
  function of state.
- A pointer-seam reducer: `pointerMode(pointers)` → `"idle" | "drag" | "pinch"`
  with the transitions the DOM layer follows (second pointer down escalates
  drag → pinch; pinch → drag when it lifts back to one; last pointer up →
  idle).
- `acceptsOrbit(mode)` → the single predicate the handlers consult (decision 2).

`orbit-camera.ts` becomes the adapter: it owns listeners, three.js objects and
the arena/director logic; all math comes from `orbit-logic.ts`.

### F3 — Pinch zoom on touch

- A second concurrent pointer on the canvas enters `pinch`; the radius follows
  `pinchOrbit` with the clamped bounds from F2.
- Pinch never fires while `cameraMode === "arena"` (decision 2) and never
  changes azimuth/elevation.
- On returning to a single pointer the gesture degrades to `drag` without a
  jump (the reducer seeds `lastX`/`lastY` from the surviving pointer).

### F4 — Arena input lock

- `onPointerDown`/`onPointerMove`/`onWheel` all consult `acceptsOrbit(mode)`
  (F2), so a battle tap neither arms nor moves the camera, and the wheel does
  not zoom the broadcast shot.
- The existing guards stay: the wheel already refuses outside ranch mode
  (`orbit-camera.ts:165`), and `setMode` keeps owning the framing handover
  (`:112-135`).

### F5 — Hidden-tab pause & resume

- One listener for `visibilitychange`/`document.hidden` drives a pure
  `runtimeState(prev, event)` reducer (see F6's module) whose two outcomes are
  `running` and `paused`.
- `paused`: `scene.ts` cancels the pending RAF and stops the tick; the staging
  effect loop (`staging-fx.ts` `EffectLoop`, including `HitStop`) suspends
  without losing its queue; the playback driver's timer chain
  (`playbackDriver.ts`) suspends mid-step rather than firing a burst of
  overdue steps on return.
- `running`: each subscriber resumes from a re-anchored time base. `scene.ts`
  sets `lastT` to the resumed `t` so `dt` is 0 for the first frame back
  (`scene.ts:275-280`), and `HitStop`/effect timers offset by the paused
  duration so nothing jumps.
- Pause/resume is idempotent (repeated `hidden` events, `visible` while
  already running) and must not disturb a `dispose()`d scene.

### F6 — Runtime state machine (`lifecycle.ts`) — TDD

A pure module owning the two orthogonal field states, so both F5 and F7 are
unit-testable without a DOM:

- Event union: `visibility` (`hidden` | `visible`), `graphics`
  (`unavailable` | `lost` | `restored` | `frame_error`).
- Reducer → `{ renderLoop: "running" | "paused", surface: "game" | "plate" }`.
- `surface === "plate"` wins over `renderLoop` (a lost context shows the plate
  even when the document is visible), and `restored` clears it back to `game`
  only while visible.

### F7 — Graphics-failure surface (boot + runtime)

- `index.html`: `#app` carries a lightweight boot placeholder (kit-styled, no
  JS required) and a `<noscript>` line, so the page is never an unexplained
  blank while the module graph loads.
- `main.ts`: boot is wrapped so a thrown scene/WebGL construction renders the
  plate instead of propagating (today `main.ts:43` throws into a blank page).
- `scene-setup.ts`: renderer construction is guarded; a boot-time
  `WebGL unavailable` routes to the plate.
- `scene.ts`: `webglcontextlost` (preventDefault) pauses the loop and shows the
  plate; `webglcontextrestored` attempts a resume, and a throw from the resumed
  frame routes back to the plate (decision 5).
- The plate is built from the shared broadcast kit (no new dependency), states
  the cause in one plain-language sentence, offers a `Reload` action, and is
  keyboard-reachable (focus lands on the button, Escape-free — it has no
  dismiss affordance because there is nothing behind it).

### F8 — Phone tap targets

- At the phone tier only, interactive plates reach a ≥44 px hit area. The
  known offender is `.cup-slot` (`cup.css:939-943`); the task audits the
  remaining interactive elements in `cup.css`, `spar.css`, `starter.css`,
  `battle-hud.css` and `ranch.css` at that breakpoint and fixes any other
  shortcut with the same rule (height, or vertical padding where height is
  layout-driven).

### F9 — Consistent keyboard focus

- One shared `:focus-visible` treatment for interactive plates, written against
  the existing kit focus token so it cannot drift, applied to the surfaces that
  lack it today (`cup.css`, `spar.css`, `starter.css`, `battle-hud.css`).
- The existing `ranch.css` / `ui/kit.css` rules stay as they are; this is
  additive, not a restyle.

## Non-Functional Requirements

- **No new dependency.** Three.js, DOM and CSS only.
- **No save-schema change**, no `@apex/sim` or `@apex/voxel` change, and the
  determinism gate must stay byte-identical.
- **Determinism untouched:** the pure modules are deterministic functions; no
  `Math.random` and no wall-clock reads inside them (time enters as an
  argument).
- **No per-frame allocation added** in the tick path (the module returns plain
  objects the caller can reuse, matching the hoisted-scratch-vector practice).
- **Reduced motion respected:** the plate and any transition it uses honour the
  existing `motion.ts` preference; no new motion is introduced that the
  preference cannot suppress.
- **`bun run verify` stays green** and the suite runtime must not grow
  materially (target: the existing seconds-scale suite).
- **No regression in page scrolling** anywhere outside the 3D canvas.

## Acceptance Criteria

1. `orbit-logic.test.ts` covers: elevation clamp both directions, radius clamp
   both directions on wheel and pinch, spread-ratio scaling, `dragOrbit`
   leaving elevation untouched below/above bounds, `pointerMode` transitions
   (idle → drag → pinch → drag → idle), and `orbitPosition` matching the
   current `applyOrbit` output for a known orbit (golden values).
2. `lifecycle.test.ts` covers: hidden ⇒ `paused`; visible ⇒ `running`; `lost`
   ⇒ plate while both hidden and visible; `restored` ⇒ game only while
   visible; `frame_error` ⇒ plate; every transition idempotent under repeat.
3. **Touch (Playwright, emulated touch):** a one-finger drag on the canvas
   orbits the camera and leaves `window.scrollY` unchanged; a two-finger pinch
   changes the camera radius within `2.5..14` and leaves azimuth/elevation
   unchanged.
4. **Arena lock:** with the arena active, a tap-drag produces no camera pose
   change (pose sampled before/after), and a mid-battle camera-mode switch
   while dragging leaves no armed drag.
5. **Hidden tab:** with the page hidden the RAF counter stops advancing; on
   return the first frame reports `dt = 0` (no clamped-step advance) and an
   in-flight effect resumes without a jump.
6. **Failure plate:** with WebGL unavailable at boot the player sees the plate
   (cause + Reload), not a blank page; a forced `webglcontextlost` shows the
   same plate; Reload returns to a playable ranch.
7. **Tap targets:** at the phone tier every audited interactive plate measures
   ≥44 px on its smallest axis (measured in the browser, not by inspection).
8. **Focus:** tabbing through the cup bracket and the spar panel shows a
   visible focus ring on every interactive element (computed-style assertion).
9. `bun run verify` green (types, tests, Biome, determinism gate) with the
   suite runtime materially unchanged.

## Out of Scope

- **Audio** (its own parked branch, `audio_foundation_20261013`).
- **`hud.ts` decomposition** (its own refactor track — decision 6).
- **Any save-schema or sim change**; nothing in `@apex/sim` or `@apex/voxel`.
- **A 2D / no-WebGL fallback mode.** Detecting absence and explaining it is in
  scope; rendering the game without WebGL is a design surface of its own.
- **Real-device lab verification** (iOS Safari / Android Chrome hardware pass).
  Playwright touch emulation plus the desktop browser tool is this track's
  evidence; a hardware sweep stays a separate item per `product.md`.
- **Desktop-first interaction changes** (keyboard camera controls, remapping).
- **Gap analysis / offline handling, service worker, install prompt.**
