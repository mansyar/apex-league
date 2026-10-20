# Phase 3 — Scene, camera and effects

- **Track:** `20261020-client-decomposition`
- **Phase:** 3
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-client-decomposition`
- **Base commit:** `9be81fb`
- **Checkpoint:** `97a9bba` - the phase commits were squashed into this
  checkpoint, so it is the tree this report describes

## Result

`scene.ts` 20,212 B → 6,365 B; `staging-fx.ts` 14,914 B → 4,843 B;
`orbit-camera.ts` 14,706 B → 1,062 B. The three originals keep their full
public surface, so `main.ts`, `app/*`, `swap.ts`, `staging.ts`,
`steps/context.ts`, `scene-setup.ts` and `staging-fx.test.ts` compile without a
single edit. No test file was touched and no behaviour was changed: every moved
body is verbatim, with only import lines and parameter lists adjusted, and the
rendering, camera-feel and effect-timing constants did not move value.

## Seam map (original block → destination module)

### `scene.ts` (504 lines at base)

| Base block (source order) | Destination |
| --- | --- |
| `SceneHandle` (16–118) | `scene/types.ts` (verbatim, docblocks included) |
| `SceneHooks` + its docs (120–130) | `scene/types.ts` |
| setup/renderer destructure, `composer` mutable binding (136–140) | `scene.ts`, with the binding as a `{ current }` box passed to the frame |
| `cameraRig`, `motionReduced`/`reducedMotion` (146–156) | `scene.ts` (unchanged) |
| scenery/food-pile state, `pilePos`, `disposeGroup` (158–173) | `scene/dressing.ts` (`PILE_POS`, module state) + `scene.ts` (`disposeGroup`, shared with the motion deps) |
| `createRanchMotion` wiring (178–184) | `scene.ts` (`pileX`/`pileZ` now read `PILE_POS`) |
| ambient pet gesture: raycaster, `petPress`, `petHit`, the three handlers, listeners (186–261) | `scene/pet.ts` — `createPetGesture(host)` |
| `handle` literal (263–416) | `scene.ts`, every method either verbatim or a one-line delegation |
| `setRanchBlend` light/rig/dome/ground writes (287–299) | `scene.ts`; scenery + food-pile visibility → `dressing.setBlend(blend)` |
| `setProps` body: seeded ring, landmarks, `registerSway`, `commitProps` (339–387) | `scene/dressing.ts` — `setProps` |
| `setFedToday` body: lazy food pile, blend gate (388–397) | `scene/dressing.ts` — `setFedToday` |
| frame clock, `tick`, composer/context-loss branch, RAF start (418–474) | `scene/frame.ts` — `createSceneFrame(host)` |
| `onResize` + resize listener (476–489) | `scene/frame.ts` |
| `webglcontextlost`/`webglcontextrestored` listeners (491–501) | `scene/frame.ts` |
| `setPaused` / teardown half of `dispose` | `scene/frame.ts` (`setPaused`, `dispose`) |

### `staging-fx.ts` (468 lines at base)

| Base block (source order) | Destination |
| --- | --- |
| module docblock, the two re-export blocks (1–42) | `staging-fx.ts` (docblock updated to name the new layers) |
| `Projectile` (44–53) | `fx/projectiles.ts` (private, verbatim) |
| `BurstParticle` (55–64), `Burst` (66–85) | `fx/bursts.ts` (private, verbatim) |
| `BattleEffects` (87–131) | `staging-fx.ts` (verbatim) |
| hit-stop + loop + flash + decal construction (145–149) | `staging-fx.ts` (unchanged) |
| `killShotMesh` (160–164) | `staging-fx.ts` as `killMesh`, passed into the three layers |
| `retireShot`, `projectileStep`, `spawnProjectile` (166–223, 278–319) | `fx/projectiles.ts` — `createProjectileLayer` |
| `disposeBurst`, `burstStep`, `spawnBurst` (225–276, 321–388) | `fx/bursts.ts` — `createBurstLayer` |
| charge orb: `chargeMesh`, `setCharge`, `clearCharge` (390–424) | `fx/charge.ts` — `createChargeOrb` |
| `disposeAll` (426–438) | `staging-fx.ts`, in the base order: `loop.stop`, shots, bursts, decals, charge, flash, `hitStop.reset` |
| returned surface (440–467) | `staging-fx.ts` (methods delegate to the layers) |

### `orbit-camera.ts` (381 lines at base)

| Base block (source order) | Destination |
| --- | --- |
| `BASE_FOV` (12–14) | `camera/presets.ts` |
| module docblock (16–28) | `orbit-camera.ts` (facade) |
| `CameraMode` (28), `ArenaStyle` (30–31) | `camera/types.ts` |
| `CameraIntent` re-export (33–36) | `orbit-camera.ts` |
| `ARENA_FRAMING` (38–49) | `camera/presets.ts` |
| `OrbitCameraRig` (51–80) | `camera/types.ts` (verbatim) |
| rig state, `applyOrbit`, the opening `applyOrbit()` (82–116) | `camera/rig.ts` |
| `setMode` (118–143) | `camera/rig.ts` (shake anchor drop → `shake.clear()`, gesture drop → `input.clearGesture()`) |
| pointer/wheel block: map, `spanOf`, `clearGesture`, five handlers, listeners (145–234) | `camera/input.ts` — `createOrbitInput(host)` |
| shake state, `shake`, `resetShake`, `shakeActive` (236–254) | `camera/shake.ts` — `createCameraShake` |
| `setArenaStyle`, `applyDirectorIntent`, `track` (256–278) | `camera/rig.ts` |
| `updateArena`: shake decay block (286–298) | `camera/shake.ts` — `update(t, dt, mode)` |
| `updateArena`: cinematic director ease (299–352) | `camera/rig.ts` |
| returned rig (355–380) | `camera/rig.ts`; `dispose` delegates to `input.dispose()` |

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Typecheck + verification | `bun run verify` | 0 | `bun run --filter '*' check`: voxel 62, sim 79, client 268 files, no type errors; `bun test --check --parallel`: 1787 pass / 1 skip / 0 fail across 143 files (84,595 `expect()` calls); `biome check`: 430 files, 0 errors, the same 7 pre-existing `noNonNullAssertion` **warnings** in test files (none in a file this phase touched); `gate:determinism`: nine creature GLBs regenerated byte-identical + 5 prop digests match |
| Build | `bun run build` | 0 | vite 8.3.4, 218 modules transformed, `dist/index.html` 2.13 kB, CSS 56.48 kB, JS 823.37 kB, built in 440 ms (pre-existing >500 kB chunk advisory) |
| Fast loop | `bun run --filter @apex/client check` | n/a | **not run** — the sandbox rejects the bun binary outside the configured verification command (`permission.rejected`, as in Phase 2); the same client typecheck ran inside `bun run verify`, which was executed after the scene split, after the effects split and after the camera split |

## Acceptance

| Contract | Status | Evidence |
| --- | --- | --- |
| AC-2 (sizes, ≤ 12,288 B) | ✅ | size table below; largest of the 15 touched/created modules is `camera/rig.ts` at 7,079 B (5,209 B / 42.4 % headroom). The three facades are 6,365 / 4,843 / 1,062 B, so no facade is the biggest module |
| AC-4 (`bun run verify` + `bun run build`) | ✅ | both exit 0 on head `97a9bba` (the phase checkpoint); determinism gate output unchanged (same GLB bytes, same tri counts, same prop digests) |
| AC-5 (battle smoke) | `not run by agent` | brief forbids a dev server and browser driving; the ranch + arena smoke (feed/rest/treat/play, pet tap, orbit drag/pinch, a battle to verdict with projectiles, bursts, decals, charge orb, punch shake, cinematic director) is the primary's step |
| AC-6 (surface unchanged) | ✅ | `scene.ts`: `SceneHandle`, `SceneHooks`, `createScene`. `staging-fx.ts`: `BattleEffects`, `createBattleEffects`, `FlashVictim`, `BIG_HIT_DAMAGE`, `EffectLoop`, `HIT_STOP_MS`, `HitStop`. `orbit-camera.ts`: `BASE_FOV`, `CameraMode`, `ArenaStyle`, `CameraIntent`, `OrbitCameraRig`, `createOrbitCamera`. Every importer (`main.ts`, `app/arena.ts`, `app/screen-deps.ts`, `app/scene-sync.ts`, `app/runtime.ts`, `swap.ts`, `staging.ts`, `steps/context.ts`, `scene-setup.ts`) compiles untouched |
| AC-7 (no new cycles) | ✅ | import audit below: the new modules form a DAG and none imports a facade that imports it |

## Import audit (AC-7)

- `scene/types.ts` → `@apex/sim`, `three`, `../orbit-camera` (types only).
- `scene/dressing.ts` → `@apex/voxel`, `three`, `../prop`, `../ranch/motion`.
- `scene/pet.ts` → `three`, `../scene-logic`.
- `scene/frame.ts` → `three`, `../orbit-camera` (type), `../ranch/motion` (type), `./types` (type).
- `scene.ts` → `./scene/{types,dressing,pet,frame}`, `./orbit-camera`, `./ranch/motion`, `./motion`, `./scene-setup`, `./scene-utils`. Nothing in `scene/` imports `scene.ts`.
- `fx/projectiles.ts` → `../move-fx`, `./fx-data`, `./fx-math`, `./loop` (type), `./shot-geometry`.
- `fx/bursts.ts` → `../move-fx`, `./fx-data`, `./fx-math`, `./loop` (type).
- `fx/charge.ts` → `../move-fx`, `./fx-data`.
- `staging-fx.ts` → `./fx/{bursts,charge,decal,flash,loop,projectiles}`, `./move-fx` (type), `./scene-utils`. No `fx/` module imports `staging-fx`.
- `camera/types.ts` → `../director` (type). `camera/presets.ts` → nothing.
- `camera/input.ts` → `../orbit-logic`, `./types` (type).
- `camera/shake.ts` → `three` (type), `./types` (type).
- `camera/rig.ts` → `three`, `../director` (type), `../scene-logic`, `./input`, `./presets`, `./shake`, `./types`.
- `orbit-camera.ts` → `./camera/{presets,rig,types}`, `./director` (type). No `camera/` module imports `orbit-camera.ts`.

## Byte sizes (non-test, `git ls-tree -l`)

| File | Base | Head | Headroom to 12,288 | Cap |
| --- | --- | --- | --- | --- |
| `apps/client/src/scene.ts` | 20,212 | 6,365 | 5,923 | ✅ |
| `apps/client/src/scene/types.ts` | — | 5,676 | 6,612 | ✅ |
| `apps/client/src/scene/dressing.ts` | — | 4,066 | 8,222 | ✅ |
| `apps/client/src/scene/pet.ts` | — | 4,073 | 8,215 | ✅ |
| `apps/client/src/scene/frame.ts` | — | 5,390 | 6,898 | ✅ |
| `apps/client/src/staging-fx.ts` | 14,914 | 4,843 | 7,445 | ✅ |
| `apps/client/src/fx/projectiles.ts` | — | 5,870 | 6,418 | ✅ |
| `apps/client/src/fx/bursts.ts` | — | 5,882 | 6,406 | ✅ |
| `apps/client/src/fx/charge.ts` | — | 1,983 | 10,305 | ✅ |
| `apps/client/src/orbit-camera.ts` | 14,706 | 1,062 | 11,226 | ✅ |
| `apps/client/src/camera/types.ts` | — | 1,735 | 10,553 | ✅ |
| `apps/client/src/camera/presets.ts` | — | 620 | 11,668 | ✅ |
| `apps/client/src/camera/input.ts` | — | 4,957 | 7,331 | ✅ |
| `apps/client/src/camera/shake.ts` | — | 2,634 | 9,654 | ✅ |
| `apps/client/src/camera/rig.ts` | — | 7,079 | 5,209 | ✅ |
| **Total (touched + new)** | **49,832** | **62,235** | — | — |

Untouched `fx/` modules the split composes: `loop.ts` 5,136, `shot-geometry.ts`
2,925, `decal.ts` 2,989, `fx-math.ts` 2,782, `flash.ts` 2,655, `fx-data.ts`
2,097 — all already under the cap. Test files (`fx/*.test.ts`,
`staging-fx.test.ts`) are exempt and unedited.

## Commits

> The task SHAs in the table below were squashed into checkpoint `97a9bba`; they are kept as a record of the work and do not resolve on the branch.

| Commit | Task | Scope |
| --- | --- | --- |
| `e1cf2e7` | P3.T1 | `refactor(client): split the scene into types, dressing, pet and frame modules` |
| `d559d01` | P3.T2 | `refactor(client): split the battle effects into projectile, burst and charge layers` |
| `74ff6f1` | P3.T3 | `refactor(client): split the orbit camera into presets, input, shake and rig` |

Each commit compiles and passes `bun run verify` on its own: the scene split
leaves the two other files untouched, and the effects/camera splits do not
interact.

## Behaviour-identity review

- **Scene graph**: `scene-setup.ts` was not touched — same renderer, sky dome,
  fog, camera, bloom composer, light rig, shadow map and ground, in the same
  construction order. Dressing still adds one `ranch-scenery` group and the
  lazily-built `foodPile` to the same `scene`, with the same seeds (`makeRng`
  draw order preserved: 16 tufts, 5 bushes, then the five fixed landmarks, each
  linearised as `rng.int(2 ** 30)` → `rng.next()` in the original sequence).
- **Blend**: the four light intensities, the dome and ground `visible` writes are
  unchanged in `scene.setRanchBlend`; `dressing.setBlend` applies the same
  `> 0.001` / `> 0.5` thresholds to the same two objects, and `setFedToday` still
  gates on the last blend value.
- **Frame clock**: `clockStart`, `lastT`, `lastFrameT`, `resumedFrame`, the
  `Math.min(0.1, …)` clamp, the `prev > 0 && prev < 0.5 ? prev : 1/60` arena
  delta, the arena-only composer branch and its context-loss fallback, the
  `frame_error` early return and the resize math (including the
  `devicePixelRatio` refresh) are verbatim. `reducedMotion` is read through a
  getter against the same variable the handle mutates, so a mid-session pref flip
  still reaches the arena update on the very next frame.
- **Teardown order**: `motion.dispose` → `frame.dispose` (cancel RAF, `paused =
  true`, composer dispose, resize listener removed) → pet listeners
  (`pointerup`, `pointercancel`, `pointerdown`) → `cameraRig.dispose` →
  `disposeObject3D(scene)` → `renderer.dispose` → `domElement.remove`. Identical
  to base.
- **Effects**: each layer keeps its own pool, its own hoisted scratch vectors and
  the exact per-frame statement order (`elapsed`, `travel`, arc/wobble/spin/
  pulse/stretch, then the trail lag). `killMesh` has the base body
  (`disposeObject3D` then `arenaGroup.remove`). `spawnBurst` still draws
  `Math.random()` in the same order (four per particle, then the sway phase) and
  still no-ops under reduced motion; `setCharge` still creates once and then only
  re-anchors and scales. `disposeAll` keeps the base sequence, including
  `flashLayer.clear()` before `hitStop.reset()`.
- **Camera**: `applyOrbit()` still runs once before any listener is attached;
  `Math.random()` for `shakePhase` is still drawn exactly once per rig creation;
  `setMode` still drops the shake anchor and the armed gesture before re-framing;
  `updateArena` still runs the shake decay first and then the director, still
  gated on `arena` + `cinematic` + `!reducedMotion` + `!shake.active()`; the
  director cut/ease, the 400 ms intent window and the `1 - Math.exp(-2 * dt)`
  smoothing are unchanged; `resize` writes `camera.fov` and the arena radius the
  same way. `resetShake()` still clears amplitude only, while `setMode` clears the
  anchor too — preserved as `reset()` vs `clear()`.

## Deviations

1. **The scene split does not create renderer/lighting/world modules** (brief
   prescribed "a renderer module, a world module, a lighting module, and a mount
   module"). The renderer, sky, fog, camera, bloom composer, lighting rig and
   ground already live in `scene-setup.ts` from the earlier UI-layer refactor, so
   those seams were already extracted. The brief's escape hatch was used: the
   remaining seams are `scene/types.ts` (the exported contract),
   `scene/dressing.ts` (the seeded prop scatter + food pile, i.e. the world
   dressing), `scene/pet.ts` (the ambient tap gesture) and `scene/frame.ts` (frame
   clock, loop, pause, resize, graphics events).
2. **No `scene/mount.ts`.** The "creature mount and its resize/dispose wiring" is
   now `ranch/motion` (`createRanchMotion`), which is already its own module and
   already takes `disposeGroup`/`onCreatureMoved` as deps; `setCreature`,
   `updateConditions`, the four ceremonies and `setRanchCreatureVisible` are
   one-line delegations. A mount module would add an indirection that forwards
   every call unchanged, so the seam was not created.
3. **`fx/charge.ts` is a fifth effect family** beyond the brief's four. The
   tier-4 charge orb has its own lifetime (one persistent mesh, created and freed
   by `setCharge`/`clearCharge`) and rides neither the projectile nor the burst
   loop, so folding it into either would have mixed two lifetimes in one module.
4. **`killMesh` is passed down from the composition root** rather than each layer
   importing a shared helper: one definition, no new module, and the same body as
   base `killShotMesh`.
5. **`camera/shake.ts` is a fourth camera module** beyond input/presets/rig. The
   punch shake owns mutable state read by three entry points (`shake`,
   `resetShake`, and the anchor drop in `setMode`) plus the decay half of
   `updateArena`; leaving it in the rig would keep the arena update mixing shake
   decay with director easing, which is exactly the seam the plan asks to cut.
6. **`scene/frame.ts` takes the composer as a `{ current }` box**, because the
   tick may drop it on a context-loss render failure and `dispose()`/`onResize`
   must see the same binding. This mirrors the existing `onBigHit: { current }`
   host field in `staging-fx.ts`; no new abstraction, no per-frame allocation.

## Notes

- `camera/rig.ts` is the tightest module at 7,079 B (5,209 B spare). It is the
  whole state machine (mode, style, director, soft track, resize); a further cut
  would have to separate the director from the mode handover, which share
  `target`, `orbit` and `arenaRadius`, so the move was stopped where the brief's
  seams end.
- Oddities preserved, not cleaned up: `createBattleEffects`'s `onBigHit` host
  field is declared but never read (the punch sink is wired through `HitStop`
  elsewhere); the frame's `webglcontextlost`/`webglcontextrestored` listeners are
  anonymous at base and remain anonymous, so `dispose()` still does not remove
  them; `orbit-camera.ts` still re-exports `CameraIntent` from `./director` even
  though the rig imports the type directly.
- `scene.ts` no longer imports `@apex/sim` (`CreatureConditions`/`LifeStage` moved
  with the handle type into `scene/types.ts`), and `three` is now a type-only
  import there — the only import-shape changes in the move.
- Module count from the build: 218 modules transformed at head.
- Browser smoke: **not run by agent** (brief forbids it) — AC-5 is open for the
  primary's review pass.

## Primary verification

Run by the orchestrator on `feat/20261020-client-decomposition`, HEAD `97a9bba` (the phase checkpoint).

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| full gate | `bun run verify` | 0 | typecheck, biome, suite and determinism gate green (gate digests byte-identical to base) |
| build | `bun run build` | 0 | @apex/client build, only the chunk-size advisory |
| sizes | measured on disk | — | `camera/rig.ts` 7,079 B (tightest); `scene.ts` 6,365; `fx/bursts` 5,882; `fx/projectiles` 5,870; `scene/types` 5,676; `scene/frame` 5,390; `camera/input` 4,957; `staging-fx.ts` 4,843; `scene/pet` 4,073; `scene/dressing` 4,066; all touched and created modules under 12,288 |
| facade weight | inspection | — | `scene.ts`, `staging-fx.ts` and `orbit-camera.ts` (1,062 B) are re-exports and composition only |

### Battle smoke (AC-5)

The interactive pane holds playback while the tab is hidden (`document.hidden` is true
there), so the battle-to-verdict pass ran headless through the repo's Playwright:

- Fresh save, starter picked, spar opened, Balanced chosen: `Ember Drake 83 VS AT RANGE ▲▲▲ Tide Axolotl 80` with the feed log and fast-forward control.
- Playback advanced through exchanges to a knockout: `Ember Drake 0 ... Tide Axolotl 61 ... VICTORY — TIDE AXOLOTL A knockout finish.` with BACK TO THE RANCH offered.
- Canvas rendered at viewport size (1280×800), and the run recorded **zero** console errors and zero page errors, so the projectile, burst, flash and hit-stop paths executed without fault.

Not judged by automation: the visual quality of the effects and the camera framing. The
constants are moved verbatim and the determinism gate is unchanged, so this is the same
presentation code under a different import graph.
