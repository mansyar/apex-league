# Implementation Plan — Client Scene Architecture Pass II

Track: `client_scene_pass2_20261013` · Spec: [spec.md](./spec.md)
Type: Refactor (behavior-preserving client work). TDD applies to newly
extracted **logic-bearing** modules only; rendering/wiring changes are
manually verified per `conductor/workflow.md`.

Ordering rationale: small, low-risk cleanups first (they establish the
seam patterns and shrink the diff noise), then the two god-file splits
(scene before staging — scene's extraction pattern is already proven by
`scene-logic.ts`), then the shared battle-session shell that both callers
consume, then the mock/CSS polish.

---

## Phase 1 — Foundations & Small Cleanups

- [x] Task: Consolidate reduced-motion resolution <!-- f1aa595 -->
  - [ ] Add `resolveMotionPref(pref)` to `apps/client/src/motion.ts`
        (pref ?? hardened OS fallback, single implementation)
  - [ ] Write failing unit tests for `resolveMotionPref` (explicit pref,
        null pref with matchMedia variants) — Red → Green
  - [ ] Replace the duplicated "pref ?? OS-fallback" sites: `scene.ts`,
        `staging.ts` (`setMotionPref`), `swap.ts`, `cup.ts`,
        `playbackDriver.ts`, `main.ts` (flashVignette gate)
- [ ] Task: Dependency & cast hygiene
  - [ ] Move `RANCH_SKY` out of `scene.ts` into a shared palette/sky module;
        update `arena.ts` to import from the new home
  - [ ] Replace raw `as THREE.MeshLambertMaterial` casts in `scene.ts` and
        `staging.ts` with `lambertMaterialOf` from `scene-utils.ts`
  - [ ] Fix the TDZ trap in `cup.ts` (give-up modal close button referenced
        before declaration)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` green; existing scene/staging/spar/cup behavior
        unchanged
  - [ ] Manual verification: ranch loads, orbit input works, reduced-motion
        toggle still respected; browser screenshots + console clean

## Phase 2 — scene.ts Decomposition

- [ ] Task: Extract scene setup module
  - [ ] Create `apps/client/src/scene-setup.ts`: renderer, scene, composer,
        bloom (try/catch fallback), inline GLSL sky-dome shaders
  - [ ] `scene.ts` consumes it; no behavior change
- [ ] Task: Extract orbit camera module
  - [ ] Create `apps/client/src/orbit-camera.ts`: camera state, pointer/
        wheel listeners, camera-shake offset API
  - [ ] Wire through the (now smaller) `SceneHandle`
- [ ] Task: Extract ranch motion unit
  - [ ] Create a `ranch-motion` module owning rig state (former
        `scene.ts` closure lets) and driving the existing pure machines
        from `scene-logic.ts`: mood idle/breath, evolution advance/swap,
        walk/wander, wind props, camera track/director easing
  - [ ] `scene.ts` `tick()` shrinks to per-system updater calls
  - [ ] Write unit tests for any newly-pure math extracted along the way
        (seeded, no I/O) — Red → Green
- [ ] Task: Shrink SceneHandle
  - [ ] Reduce `SceneHandle` to the surface `main.ts` actually uses;
        update `main.ts` wiring
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` green; `scene.ts` ≤ ~400 ln
  - [ ] Manual verification: full ranch pass — feed ceremony, wander trips,
        evolution preview (dev), wind sway, camera shake on hits, orbit
        controls; screenshots + console clean

## Phase 3 — staging.ts Decomposition

- [ ] Task: Extract FighterDriver
  - [ ] Create `FighterDriver` class owning `drive()` closure state:
        squash spring, topple, bounds, glide/lerp walk, gait/breath/sway
        compose
  - [ ] Write unit tests for pure pose math extracted from the driver
        (seeded, no renderer) — Red → Green
- [ ] Task: Convert runStep to step modules + registry
  - [ ] Create `steps/` modules keyed by move/event kind: approach/idle,
        melee (incl. `phaseAt(PLAYBACK_PHASES)` block), projectile/
        fireSpecial, impact, stagger/knockback, down/KO + dust ring,
        judge hop
  - [ ] Replace the switch with a registry table; step functions stay pure
        geometry given combatant pose + effects handle
  - [ ] Write unit tests for at least the melee phase-timing and KO/dust
        step math where extractable as pure functions — Red → Green
- [ ] Task: Extract roster module
  - [ ] Move cast/clear (palette capture/restore, `ARENA_FOOTPRINT`
        normalization) into a roster module
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` green; arena playback identical (event-for-event)
  - [ ] Manual verification: Spar + cup matches in the arena — melee,
        projectile, dodge, stagger, knockback, KO/dust, double-KO,
        time-out endings; fast-forward and reduced-motion dump paths

## Phase 4 — Shared Battle-Session Shell

- [ ] Task: Extract battle-session factory
  - [ ] Create `apps/client/src/battle-session.ts`: driver wiring (onStep →
        handlers + `battleHud.update`; onFinish → verdict stamp + hold
        timer → exit callback), speed-pill wiring, winner/reason line
        building
  - [ ] Add a `chipButton(label, glyph, badge)` helper to `ui/kit.ts`;
        replace the hand-rolled chip constructions in spar.ts/cup.ts
  - [ ] Write unit tests for the pure helpers (winner/reason lines,
        finish-choreography timing state machine with a fake clock) —
        Red → Green
- [ ] Task: Migrate spar.ts onto the shell
  - [ ] spar.ts consumes `battle-session.ts`; duplicated wiring deleted
- [ ] Task: Migrate cup.ts onto the shell
  - [ ] cup.ts consumes `battle-session.ts`; duplicated wiring deleted;
        divergent finish behaviors (follow-up actions) become shell options
- [ ] Task: Rename shared battle-HUD CSS classes
  - [ ] Rename `spar-*` classes in `battle-hud.css` (+ TS literals) to
        `battle-*`; update `mock.css` references
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` green; no duplicated driver-wiring remains
  - [ ] Manual verification: Spar flow and all three cup matches — same
        HUD updates, verdict stamps, hold timings, exit transitions

## Phase 5 — Mock Drift Fix

- [ ] Task: Rebuild mock from real HUD factories
  - [ ] `mock.ts` renders through the real `hud.ts` DOM factories fed a
        canned state object (incl. the ladder-rank element the mock is
        currently missing)
  - [ ] Remove `mock.css` rules that duplicate `ranch.css` class definitions
        (`.command-dock`, `.is-capped`, `.is-focus` and any other mirrors)
  - [ ] Update `mock.css`/`ranch.css` cross-file reach-ins where trivial
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` green
  - [ ] Manual verification: `/mock.html` matches the live ranch HUD
        structurally (same regions, same class ownership)

## Phase 6 — (Stretch) Cup Screens Extraction

- [ ] Task: Extract cup screen builders
  - [ ] Create `apps/client/src/cup-screens.ts` with the bracket/coach/
        results/give-up screen builders (returning handles, mirroring the
        `staging-fx.ts` pattern); `cup.ts` becomes session state machine +
        timers
  - [ ] Only executed if Phases 1–5 landed clean and time permits;
        otherwise record as deferred work in phase notes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` green
  - [ ] Manual verification: full cup run — bracket reveal, coach room,
        three matches, results screen, give-up modal (focus trap, Escape)

---

## Notes

- Every phase ends with a workflow checkpoint: test-coverage check,
  automated gates, an agent-performed browser verification with
  screenshots/console evidence, explicit user sign-off, and a
  `[checkpoint: <sha>]` recorded here on the last functional commit.
- RNG/determinism invariants: no sim, seed, or save code is touched in this
  track; `gate:determinism` must stay green throughout.
- The cup RNG contracts (draw stream, seed formulas) are untouchable; this
  track does not modify `cup.ts` logic beyond wiring/screens.
