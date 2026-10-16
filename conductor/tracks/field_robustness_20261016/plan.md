# Plan — Touch & Field Robustness

**Track ID:** `field_robustness_20261016`
**Spec:** [./spec.md](./spec.md) · **Status:** draft 2026-10-16 · **Branch:** `track/field_robustness_20261016`

Workflow: TDD for logic-bearing tasks (tests first, red → green → refactor),
manual/browser verification for presentation and wiring tasks, phase
checkpoints per `conductor/workflow.md`. `bun run verify` is the definition of
done. Nothing in this plan touches `@apex/sim`, `@apex/voxel`, the save schema,
or the determinism gate.

## Phase 1 — Pure logic seams

*(all logic-bearing — strict TDD; the only new modules this track adds)*

- [x] Task: Pure orbit & gesture module `orbit-logic.ts` (F2) *(write failing tests first)* — 7ddbd55
  - Tests (`apps/client/src/orbit-logic.test.ts`): `DRAG_SENSITIVITY`-scaled
    `dragOrbit` moves azimuth without clamp and clamps elevation at both
    `ELEVATION_BOUNDS` edges (inclusive boundaries, and a large single delta);
    `zoomOrbit` scales by the `sign(deltaY) * 0.1` rule and clamps radius at
    `MIN_RADIUS`/`MAX_RADIUS` in both directions; `pinchOrbit` scales by the
    spread ratio and clamps the same way, and a ratio of 1 is a no-op;
    `orbitPosition` matches golden values computed from the current
    `applyOrbit` formula (`orbit-camera.ts:100-109`) for a known
    target/orbit — including that it returns a fresh object rather than
    mutating its input; `pointerMode` transitions
    `idle → drag → pinch → drag → idle` plus "a third pointer does not change
    the mode"; `acceptsOrbit("ranch") === true` and `acceptsOrbit("arena") ===
    false`; every exported function leaves its input untouched (mutation
    purity).
  - Implement `apps/client/src/orbit-logic.ts`: `ORBIT_BOUNDS`,
    `ELEVATION_BOUNDS`, `DRAG_SENSITIVITY`, `dragOrbit`, `zoomOrbit`,
    `pinchOrbit`, `orbitPosition`, `pointerMode`, `acceptsOrbit` — constants
    lifted verbatim from `orbit-camera.ts:151-170` so behaviour cannot drift.
- [x] Task: Pure runtime state machine `lifecycle.ts` (F6) *(write failing tests first)* — 7fe0c16
  - Tests (`apps/client/src/lifecycle.test.ts`): fresh state is
    `{ renderLoop: "running", surface: "game" }`; `visibility/hidden` ⇒
    `paused`; `visibility/visible` ⇒ `running`; `graphics/unavailable` and
    `graphics/lost` ⇒ `surface: "plate"` regardless of visibility;
    `graphics/restored` clears the plate **only** while visible (a restore
    that lands while hidden leaves the plate until visibility returns, then
    clears); `graphics/frame_error` ⇒ plate; every event applied twice yields
    the same state (idempotence); an unknown/`frame_error`-after-`lost`
    sequence still resolves to the plate.
  - Implement `apps/client/src/lifecycle.ts`: the event union
    (`visibility` | `graphics`), `initialRuntimeState()`, and
    `runtimeState(prev, event)` with `surface === "plate"` taking precedence
    over `renderLoop`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: 7fe0c16]
  - Automated: `bun run check` clean; the two new suites green; full `bun test`
    runtime materially unchanged
  - Manual: `bun run verify` green end to end (Biome clean on the new files,
    determinism gate byte-identical — it must be untouched by a client-only
    phase)

### Phase notes (2026-10-16)

Verification report appended to the git note on `7fe0c16`. `bun run verify`
exits 0: types clean; 1099 pass / 0 fail (1100 tests, 90 files, 14.6 s under
`--parallel`; the serial baseline on this branch was 70.5 s); Biome 0 errors
with 11 warnings + 2 infos that all predate this track (`battleUI.ts`,
`spar.ts`, `steps/judge.ts`, `steps/reel.ts` — flagged, not fixed: out of
scope); the determinism gate regenerated all 9 GLBs and 5 props
byte-identical, which is the evidence that a client-only phase stayed out of
the asset pipeline.

Agent browser check (Vite on `:5173`): the app boots with a 1500x1050 canvas
and 15 overlay children, HUD copy intact, console empty. Both new modules have
zero callers by design, so no pixel change was expected or observed. Pixel
screenshots were unavailable from the desktop browser tool (it requires a
visible window); Playwright Chromium has been installed for Phases 2-4, where
the UI actually changes and screenshots become the evidence.

Two divergences from the plan text, both already recorded on the task notes:
- `orbitPosition(target, orbit, out)` takes a required out-parameter rather
  than returning a fresh object, to honour this spec's no-per-frame-allocation
  NFR (the plan bullet had said "returns a fresh object"); the suite asserts
  golden values and that neither input mutates.
- `lifecycle.ts` tracks a third input, `pendingRestore`, beside
  `hidden`/`graphics`, so the approved "a restore while hidden holds the plate"
  rule (F6) can be expressed at all. `renderLoop`/`surface` remain derived —
  they are all a consumer reads.

Contract discovered while going red→green (kept, now pinned by tests): the
wheel zooms by **sign only** — one notch is always one step whatever the delta
magnitude — while pinch scales **continuously** by the spread ratio. The two
are deliberately different and the bounds are shared.

## Phase 2 — Touch interaction on the canvas (F1, F3, F4)

*(wiring + presentation — browser/Playwright verification; the math is already
tested in Phase 1)*

- [x] Task: Canvas touch contract (F1) — b872a4b
  - `touch-action: none` on `#app canvas` in `base.css` beside the existing
    `display: block` rule (`:30-32`)
  - `orbit-camera.ts` pointer handlers call `preventDefault()` only when the
    gesture is claimed; unclaimed gestures (arena mode, secondary devices)
    stay native so page scrolling is never swallowed
  - A `setMode` change while armed clears `dragging` (and any pointer
    bookkeeping) so a ranch return never resumes a stale gesture
  - Manual verification: on a touch-emulated phone a one-finger drag orbits
    and `window.scrollY` stays 0; scrolling still works everywhere outside the
    canvas
- [x] Task: Pinch zoom + pointer bookkeeping (F3) — a087057
  - Adopt `pointerMode` for the listener bookkeeping (a `Map`/array of active
    pointers), route radius changes through `pinchOrbit`, and seed
    `lastX`/`lastY` from the surviving pointer when a pinch degrades to a drag
    (no camera jump)
  - Manual verification: pinch changes radius within `2.5..14` and leaves
    azimuth/elevation untouched; lifting one finger continues the drag from
    the current pose
- [~] Task: Arena input lock (F4)
  - `onPointerDown` consults `acceptsOrbit(cameraMode)` (`:144-148` — the one
    handler currently missing the guard; `onPointerMove` `:150` and `onWheel`
    `:165` keep theirs) so the whole camera surface reads from one predicate
  - Manual verification: during an arena fight a tap-drag leaves the camera
    pose unchanged (sampled before/after), the wheel does not zoom the
    broadcast shot, and leaving the arena restores full orbit control
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated: `bun run check` + `bun test` green; `bun run verify` green
  - Manual: browser pass on the ranch (orbit, wheel, pinch, page scroll) and on
    a live battle (orbit refused), with console clean; screenshots attached to
    the checkpoint note

## Phase 3 — Resilience & failure surfaces (F5, F7)

*(wiring — browser/Playwright verification; the state machine is already
tested in Phase 1)*

- [ ] Task: Hidden-tab pause & resume (F5)
  - One `visibilitychange` listener driving `runtimeState`, wired to the three
    subscribers: the RAF tick loop (`scene.ts:275-310` — cancel on pause, and
    re-anchor `lastT` on resume so the first frame reports `dt = 0`), the
    staging effect loop incl. `HitStop` (`staging-fx.ts` — suspend without
    losing the queue, offset the effect clock by the paused duration), and the
    playback driver's timer chain (`playbackDriver.ts` — suspend mid-step, no
    burst of overdue steps on return)
  - Pause/resume is idempotent and no-ops on a disposed scene
  - Manual verification (Playwright): with the page hidden the RAF counter
    stops advancing; on return an in-flight effect resumes without a jump; a
    battle paused mid-playback resumes at the same step
- [ ] Task: Boot placeholder, `<noscript>` & guarded scene construction (F7)
  - `index.html`: a kit-styled boot placeholder inside `#app` (no JS required)
    plus a `<noscript>` line, replacing the empty div at `:24`
  - `main.ts`: boot wrapped so a thrown scene/WebGL construction renders the
    failure plate instead of propagating (`:43` currently throws into a blank
    page)
  - `scene-setup.ts`: renderer construction (`:54`) guarded; a boot-time
    `WebGL unavailable` resolves to `graphics/unavailable`
  - Failure plate built from the broadcast kit: one plain-language cause
    sentence + a `Reload` action; the placeholder is removed once the scene
    hands over
  - Manual verification: with WebGL disabled the player sees the plate (not a
    blank page) and Reload recovers; the healthy boot path shows no flash of
    placeholder text beyond the module-graph load
- [ ] Task: WebGL context loss & restore (F7)
  - `scene.ts`: `webglcontextlost` (with `preventDefault()`) pauses the loop and
    raises `graphics/lost` ⇒ plate; `webglcontextrestored` raises
    `graphics/restored`, attempts a resume, and routes a throw from the resumed
    frame back to `graphics/frame_error` ⇒ plate
  - Manual verification (Playwright): a forced context loss shows the plate
    (including while the tab is hidden, then correctly clearing on return when
    the browser auto-restores); no unhandled console error escapes either path
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated: `bun run check` + `bun test` green; `bun run verify` green
  - Manual: browser pass across the four resilience paths (hidden/visible with
    an effect in flight; unavailable at boot; context lost; context restored),
    screenshots + console evidence attached

## Phase 4 — Accessibility & touch-target polish (F8, F9)

*(presentation — measured in the browser, not asserted by inspection)*

- [ ] Task: Phone-tier tap targets (F8)
  - Raise `.cup-slot` (`cup.css:939-943`, `min-height: 30px`) to a ≥44px hit
    area at the phone tier, then audit every other interactive plate in
    `cup.css`, `spar.css`, `starter.css`, `battle-hud.css` and `ranch.css` at
    that breakpoint and apply the same floor where a control falls short
  - Desktop density is untouched (decision 4 — the phone tier only)
  - Manual verification: at the phone tier every audited plate measures ≥44px
    on its smallest axis in the browser
- [ ] Task: Shared `:focus-visible` treatment (F9)
  - One rule written against the existing kit focus token (so it cannot drift
    from `ui/kit.css:379-381`), applied to the surfaces that lack it:
    `cup.css`, `spar.css`, `starter.css`, `battle-hud.css`. Additive only —
    the existing `ranch.css`/`kit.css` rules are untouched
  - Manual verification: tabbing through the cup bracket and the spar panel
    shows a visible ring on every interactive element (computed-style
    assertion, not eyeballing)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated: `bun run check` + `bun run verify` green; confirm no CSS rule
    exceeded the phone tier (desktop layout unchanged by inspection at the
    desktop breakpoint)
  - Manual: reduced-motion pass over every new surface (plate, focus ring,
    nothing animation-dependent); phone-tier screenshots attached

## Phase 5 — Wrap-up

- [ ] Task: Full verification & end-to-end field pass
  - `bun run verify` green (types, tests, Biome, determinism gate)
  - One continuous scripted pass covering all nine acceptance criteria, with
    the Playwright touch/visibility/context-loss probes checked in under
    `artifacts/`-adjacent tooling and the screenshots as the checkpoint
    evidence
- [ ] Task: Docs sync
  - `product.md` Phase 4 note: the mobile interaction + resilience remainder
    narrowed (touch ergonomics partially landed; the hardware device-lab pass
    still open)
  - `README.md`: the stale two-starter starter line (`:86-88`, the Water
    Axolotl landed 2026-10-10) and anything else this track makes wrong
  - `tech-stack.md`: a dated note only if the new modules or the
    `visibilitychange`/context-loss seam warrant one — the track adds no
    dependency and no architectural seam beyond two client modules, so
    expect no change
- [ ] Task: Final review readiness — all tasks `[x]` with commit SHAs, phase
  notes recorded, ready for `conductor-review`

## Coordination notes

- **No save-schema contact.** Two sibling branches are in flight elsewhere and
  both own save versions: `track/silver_ladder_bosses_20261016` (worktree
  `D:/Projects/battle-pets`, sim phases done, client phases open, claims
  **v11**) and `audio_foundation_20261013` (parked in a `t3` worktree, needs a
  renumber after v10). This track must not add, renumber, or touch a migration
  step — if a task appears to need one, the spec is wrong and work stops.
- **Do not decompose `hud.ts` here** (decision 6). Phase 4 touches surface CSS
  only; any HUD structure change belongs to its own refactor track.
- **Evidence discipline.** Three of the seven fixes are only observable
  through the browser (page scroll, gesture, context loss), which is why every
  phase checkpoint names its Playwright/browser evidence rather than relying
  on the green suite.
