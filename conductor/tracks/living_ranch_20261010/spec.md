# Track: Living Ranch — wind, feeding ceremony, wandering

## 1. Summary

The ranch is dressed (golden hour, props, food pile) but frozen: scenery never moves, the
creature never leaves its spot, and feeding is only a pop-in. This track adds three layers
of presentational life to the ranch scene, in increasing risk order:

1. **Wind sway** — tufts, bushes, and trees gently sway on shader-time phase offsets.
2. **Feeding ceremony** — a short, cancellable walk-turn-nibble sequence after Feed.
3. **Sparse wandering** — the creature takes occasional trips to seeded prop targets.

All three are **presentational only**: zero `@apex/sim` changes, zero save-format changes,
no new motion blocks, no HUD copy changes beyond nothing. Geometry (voxel output, prop
digests, creature GLBs) is untouched — motion is runtime transform only.

## 2. Type

**Feature** (Phase 1 presentation; enhances ranch life per `product.md` Phase 1 slice).

## 3. Branch

`track/living_ranch_20261010` (base: origin/main @ `9fb6dac`)

## 4. Functional Requirements

### FR1 — Wind sway on scenery

- Every scattered vegetation prop (tuft, bush, broadleaf tree) sways **continuously**:
  small rotation around its base, amplitude by prop class
  (tuft most, bush medium, tree least), every prop phase-offset by a **seeded hash of
  its world position** (not a shared uniform).
- A slow **gust envelope** (low-frequency noise, period of tens of seconds) modulates
  total amplitude — calm moments and stronger gusts alternate; never storm force.
- Sway is a **runtime transform** on existing meshes: no geometry, palette, or digest
  changes; the determinism gate sees zero difference.
- `prefers-reduced-motion` → sway amplitude **0** for all props (same gate as bounce).
- Landmark trees sway on the same rule as scattered vegetation; rocks and the food pile
  never move.

### FR2 — Feeding ceremony

- When a **Feed action succeeds**, the scene plays a short ceremony (~4–6 s total):
  1. creature **turns toward** the food pile (shortest-arc yaw over ~0.5 s),
  2. creature **walks** to a facing spot near the pile (~1–2 s, seeded side offset),
  3. **nibbles**: 2–3 gentle head-dip cycles toward the pile (~2–3 s),
  4. creature **walks home** to its anchor and the mood idle resumes.
- The ceremony is a **visual overlay on success only** — the sim state change is already
  committed when the ceremony starts (pile visible immediately; if the creature is still
  walking when the pile appears, that is correct: it is walking *to* it).
- **Any subsequent HUD input** (care, train, advance) **instant-cancels** the ceremony:
  the creature lerps/snap-homes and the normal update path takes over. The ceremony must
  never queue, delay, or block a sim action.
- Successive Feeds while the pile is already visible still trigger the ceremony
  (the pile visibly remains; the creature still comes to eat).
- Reduced-motion: turn+snap-to-pile is replaced by an **in-place head-dip** at anchor
  (no travel); still cancellable. Wander may be off but the nibble gesture is kept
  because it is the direct feedback for the button pressed.
- Feeding is the only ceremony. Treat/Rest/Play get no travel animations in this track.

### FR3 — Sparse wandering

- While **home-idle** and not in ceremony or user interaction, the creature takes at most
  **one trip per ~20–40 s window** (gap jittered by the free-running walk rng):
  walk to a **seeded target** near a visible prop (tuft or bush preferred; never a spot
  that would overlap the food pile or leave the moss disc), pause with a
  **look-around** pause (~1–2 s, slight head turns), walk home.
- Walk locomotion = a gentle **leg shuffle** (sin-driven leg pivots at walking cadence)
  layered over the existing breath bob; speed constant-ish, no animation curves library.
- Targets and cadence come from a **free-running Rng seeded from the creature's
  visualSeed plus a step counter** — never from wall-clock, never saved, never passed to
  the sim.
- Wandering is **suspended while**: a ceremony is active/starting, the starter overlay is
  up, `prefers-reduced-motion` is on (wander disabled entirely), or the creature's mood
  profile would fight it (droopy/sick creatures do **not** wander this track — scope
  note: mood-flavored cadence is explicitly out of scope, but droopy/sick never wander is
  in scope because watching a sick creature stroll reads wrong).
- Camera orbit target softly **lerps toward the creature's position**, clamped; user
  wheel/drag controls remain primary. When the creature is home, the target converges to
  the home anchor.

### FR4 — Shared wander/ceremony state machine

- A single creature-scene state machine owns position/intent:
  `home-idle → (walk-out → visit-pause → walk-home)*` with `feeding` as a forced
  overlay; user input always wins (cancel + home).
- Exposed to `main.ts` via the existing scene handle pattern: `scene.startFeedCeremony()`
  (called by the onCare feed branch after a successful feed), and scene-internal
  scheduling for wander. No new sim imports in scene code.

## 5. Non-Functional Requirements

- **TDD-first**: pure pieces (wind phase/amplitude mapping per prop class, wander
  scheduler tick boundaries, ceremony phase transitions, reduced-motion flattening) are
  implemented as a **scene-logic module** with unit tests; visual-only glue stays thin.
- Determinism of **outfit** unchanged: prop digests and creature GLBs byte-identical
  through `bun run gate:determinism`.
- No new dependencies; Three.js + DOM overlay only; no audio.
- `prefers-reduced-motion`: matches today's bounce rule, extended to sway = 0 and wander
  = off.
- Simulated FPS: all new work is cheap transform math (no per-frame allocation, no
  raycasts).
- Full gate green: `bun run check`, `bun test`, `biome check`, `bun run verify`.

## 6. Out of Scope

- Creature wander **mood-flavored cadence** (happy extra trips, droopy lingering).
- Any audio (ambient soundscape is its own future track).
- Footprints, grass-flattening, dust motes, god-rays.
- Critters (butterflies/birds/fireflies).
- Time-of-day sweep, cup-day tint.
- Any `@apex/sim` module change (conditions/anatomy untouched).
- Multi-creature ranches (still always exactly one partner).

## 7. Acceptance Criteria

1. Vegetation props sway continuously with class-magnitude amplitude and gust envelope;
   rocks/food pile never move.
2. `prefers-reduced-motion` yields zero scene sway and no wandering (creature idles at
   anchor).
3. Feed → pile appears immediately, creature walks to pile and nibbles (~4–6 s total),
   walk-home, mood idle resumes.
4. Any HUD input during ceremony cancels instantly; no input is ever delayed; sim state
   correct regardless of ceremony state.
5. Creature occasionally wanders to props and pauses with look-around ~20–40 s apart,
   with leg shuffle; sick/droopy creatures never wander.
6. Orbital camera target softly tracks the creature and returns to anchor when home.
7. `bun run gate:determinism` reports byte-identical creature GLBs and matching prop
   digests; full `bun run verify` green across all packages.
