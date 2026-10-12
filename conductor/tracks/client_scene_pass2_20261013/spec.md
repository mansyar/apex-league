# Specification — Client Scene Architecture Pass II

Track ID: `client_scene_pass2_20261013`
Type: **Refactor** (behavior-preserving client work)

## Overview

The previous presentation refactor (`battle_presentation_20261012`) split
`staging.ts` and deduped the spar-vs-cup *widgets* (`battleUI.ts`,
`battleHud.ts`), but the architecture audit (2026-10-13) shows the two largest
client files remain monoliths and the spar/cup *wiring layer* is still
duplicated:

- **`scene.ts` (1031 ln, untested)** — one closure owning renderer/bloom/sky
  setup, orbit input, ranch rig state, and a ~270-line `tick()` that mixes six
  independent per-frame systems (mood, evolution, walk/wander, camera track,
  wind, camera shake/director easing).
- **`staging.ts` (1045 ln, untested)** — the arena choreography engine: a
  giant `runStep` switch that grows linearly with moves, a `drive()` closure,
  and roster cast/clear logic.
- **spar.ts / cup.ts** — `battleUI.ts` succeeded for widgets, but chip-button
  construction, casting (`castingFor`), driver wiring (onStep/onFinish →
  stamp hold → exit), winner wording, and prep stat rows are duplicated in
  both (~80–120 lines each).

This track completes the pass: extract the natural seams, give the newly
pure modules fast unit tests, and fix the small correctness debts the audit
surfaced — without changing any player-visible behavior.

## Goals

1. `scene.ts` becomes wiring, not a god object: sky/renderer/composer setup,
   orbit camera, and ranch motion each live in their own module with a thin
   glue layer remaining in `scene.ts`.
2. `staging.ts`'s step interpretation is data-registry-driven per move kind;
   the fighter pose driver and roster lifecycle are separate units.
3. One shared `battle-session.ts` factory owns the spar/cup battle shell
   (driver wiring, HUD update fanout, finish choreography, chip button).
4. Newly extracted **pure** logic is unit-tested (workflow: logic-bearing
   code only; rendering stays manually verified).
5. Small cleanups land: no new player-visible behavior, no balance changes.

## Functional Requirements

### R1 — `scene.ts` decomposition

- **R1.1** Extract renderer/scene/composer/sky setup (incl. the inline GLSL
  sky-dome shaders and the try/catch bloom fallback) into a `scene-setup.ts`
  module. Pure construction, no per-frame state.
- **R1.2** Extract orbit camera + pointer/wheel input (incl. camera-shake
  offsets) into an `orbit-camera.ts` module.
- **R1.3** Extract ranch rig state + per-frame machine driving (mood
  idle/breath, evolution advance/swap, walk/wander, wind props, camera
  track/director easing) into a `ranch-motion` unit that composes the
  existing pure machines in `scene-logic.ts` — the tick loop in `scene.ts`
  shrinks to per-system calls.
- **R1.4** The `SceneHandle` interface shrinks accordingly; `main.ts` usage
  is the contract to preserve. `RANCH_SKY` moves out of `scene.ts` so
  `arena.ts` no longer imports from it (inverted dependency fix).

### R2 — `staging.ts` decomposition

- **R2.1** Convert the `runStep` switch into per-move-kind step modules
  (`steps/*.ts`) selected by a registry table; each step is pure geometry
  given a combatant pose + effects handle.
- **R2.2** Extract the fighter pose driver (`drive()`: squash spring, topple,
  bounds, glide/lerp walk, gait/breath/sway compose) into a `FighterDriver`
  class owning that closure state.
- **R2.3** Extract roster cast/clear (palette capture/restore,
  `ARENA_FOOTPRINT` normalization) into a roster module.
- **R2.4** Replace the two raw `as THREE.MeshLambertMaterial` casts
  (`scene.ts`, `staging.ts`) with the existing `lambertMaterialOf` helper.

### R3 — Shared battle-session shell

- **R3.1** Extract a `battle-session.ts` factory owning: driver wiring
  (onStep → handlers + `battleHud.update`; onFinish → verdict stamp + hold
  timer → exit callback), chip-button construction (via a `ui/kit.ts`
  helper), speed-pill wiring, and winner/reason line building.
- **R3.2** `spar.ts` and `cup.ts` consume the shell; each shrinks by
  ~80–120 lines and their divergent finish behaviors converge into one
  tested seam.
- **R3.3** Fix the latent TDZ trap in `cup.ts` (give-up modal close button
  referenced before declaration).

### R4 — Reduced-motion plumbing

- **R4.1** Add `resolveMotionPref` to `motion.ts`; replace the ≥6
  re-implemented "pref ?? OS-fallback" sites (scene, staging, swap, cup,
  playbackDriver, main.ts) with the single resolver passed down from
  `main.ts`.

### R5 — Mock drift fix

- **R5.1** Rebuild `mock.ts` from the real `hud.ts` DOM factories fed a
  canned state object so the design mock can no longer silently diverge;
  remove the duplicated `.command-dock`/`.is-capped`/`.is-focus` rules from
  `mock.css` where they mirror `ranch.css`.
- **R5.2** Shared battle-HUD classes currently named `spar-*` in
  `battle-hud.css` are renamed `battle-*` (CSS + TS literals only).

### R6 — Cup screens extraction (stretch, only if R1–R5 land clean)

- **R6.1** Extract the bracket/coach/results/give-up screen builders from
  `cup.ts` (~290 ln) into a `cup-screens.ts`, leaving cup.ts as session
  state machine + timers.

## Non-Functional Requirements

- **Behavior-preserving:** no visual, timing, or input changes; digests,
  save format, and sim untouched.
- **Tests:** newly extracted pure modules get deterministic fast unit tests
  (`bun test`, seeded, no I/O). Existing suite stays green and its runtime
  does not grow meaningfully.
- **Gates:** `bun run verify` passes at every phase checkpoint (types,
  tests, biome, determinism gate).
- **Style:** follow `conductor/code_styleguides/typescript.md` and the
  existing module conventions (factory functions returning handles, JSDoc
  contract comments).

## Acceptance Criteria

- [ ] `scene.ts` ≤ ~400 ln with no inline per-frame system logic; setup,
      orbit, and motion live in separate modules.
- [ ] `staging.ts`'s `runStep` is a registry lookup, not a monolithic
      switch; `FighterDriver` and roster are separate units.
- [ ] spar.ts and cup.ts share one battle-session wiring path; no duplicated
      driver-wiring/finish choreography remains.
- [ ] Exactly one reduced-motion resolution implementation (`motion.ts`).
- [ ] `arena.ts` imports no constants from `scene.ts`.
- [ ] `mock.ts` renders through the real HUD factories; duplicated mock CSS
      rules removed.
- [ ] New pure modules have unit tests; full `bun run verify` green.
- [ ] Manual verification: ranch scene (feed/walk/evolution paths), Spar,
      and Cup flows behave identically before/after in a real browser
      (screenshots + console clean).

## Out of Scope

- Any game-balance, sim, or save-schema change (Strike rebalance is its own
  future track).
- New features, new moves, new visual effects, camera or pacing changes.
- `cup.ts` full split beyond R6 stretch; `hud.ts` `update()` region split
  (deferred unless trivially falling out of R5).
- Store/subscription architecture changes (main.ts's imperative
  `syncScene` pattern stays).
