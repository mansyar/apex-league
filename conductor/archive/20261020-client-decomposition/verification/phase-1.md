# Phase 1 — Composition root

- **Track:** `20261020-client-decomposition`
- **Phase:** 1
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-client-decomposition`
- **Base commit:** `99d3852`
- **Checkpoint:** `d5b0117` - the phase commits were squashed into this
  checkpoint, so it is the tree this report describes

## P1.T1 — Seam map (recorded before the first move)

`apps/client/src/main.ts` at base is 25,204 B / 691 lines. Every top-level block,
its line range at base, where it lands, and the module bindings its body closes
over (all of which become explicit parameters).

| # | Block | Lines (base) | Destination | Depends on |
| --- | --- | --- | --- | --- |
| 1 | sim imports | 1–29 | split: `scene-sync`, `screens`, `audio`, `main` | — |
| 2 | client imports + CSS imports | 30–69 | `main` (each module imports what it uses) | — |
| 3 | `#app` lookup | 71–72 | `main` | — |
| 4 | boot: `createScene` in try/catch + failure plate | 74–100 | `main` (boot) | `applyRuntime` (late), `audioPlayer` (late), `store` (late) |
| 5 | boot-plate removal | 101 | `main` | — |
| 6 | `buildArena` / `createStaging` / `createSwap` | 102–104 | `main` | `scene` |
| 7 | `storage`, `loadBoot`, `saved`, `corruptBoot` | 106–116 | `main` | — |
| 8 | recovery modal | 117–140 | `main` | `storage`, `readRawSave`, `clearSave` |
| 9 | `restoredSession` | 141–146 | `main` | `saved` |
| 10 | `createGameStore` | 147–154 | `main` | `hud` (late), `restoredSession` |
| 11 | `sceneVisuals` | 156–163 | `app/scene-sync.ts` | `store`, `scene` |
| 12 | `syncScene` | 165–181 | `app/scene-sync.ts` | `store`, `scene`, `visualSeedOf`, `sceneVisuals` |
| 13 | `applyCameraStyle` + its boot call | 183–188 | `app/scene-sync.ts`; the call stays in `main` | `store`, `scene` |
| 14 | `toggleArenaCamera` | 190–200 | `app/scene-sync.ts` | `store`, `applyCameraStyle` |
| 15 | `enterArena` | 202–213 | `app/arena.ts` | `scene`, `swap`, `staging`, `beds` (late), `app` |
| 16 | `exitArena` | 214–221 | `app/arena.ts` | same |
| 17 | `AudioPlayer`, `MusicBeds`, ranch bed, unlock gesture, `playStepCue` | 223–244 | `app/audio.ts` | `store` |
| 18 | `createSpar` + handler object | 246–272 | `app/screens.ts` | `store`, `arena.enterArena`/`exitArena`, `audio.playStepCue`, `staging` |
| 19 | big-hit vignette element + `flashVignette` | 274–293 | `app/arena.ts` (`wirePresentation`) | `store`, `resolveMotionPref` |
| 20 | `staging.setBigHitHandler` | 295–298 | `app/arena.ts` (`wirePresentation`) | `scene.shake`, `flashVignette` |
| 21 | `directorIntent` + `staging.setDirectorHandler` | 299–313 | `app/arena.ts` (`wirePresentation`) | `scene.applyDirectorIntent`, `nextShot` |
| 22 | `applyMotionPref` + its boot call | 315–329 | `app/arena.ts`; the call stays in `main` | `store`, `staging`, `scene`, `swap`, `resolveMotionPref` |
| 23 | `createCup` + handler object | 331–368 | `app/screens.ts` | `store`, `arena`, `audio`, `staging`, `sceneVisuals`, `restoredSession` |
| 24 | `createGraduation` + handler object | 370–445 | `app/screens.ts` | `store`, `scene`, `syncScene`, `visualSeedOf`, `hud` (late), `graduation` (late) |
| 25 | `buildImportModal` | 447–453 | `main` | `storage`, `saveGame`, `hud` (late) |
| 26 | `createHud` + handler object | 455–591 | `app/screens.ts` | `store`, `scene`, `sceneSync`, `audio`, `arena`, `graduation`, `importModal`, `storage` |
| 27 | `app.append(importModal.root)` | 593–595 | `main` | — |
| 28 | eight `store.subscribe` registrations | 597–613 | `main` (composition) | `hud`, `spar`, `cup`, `audio`, `graduation` |
| 29 | boot mix (`setVolumes` / `beds.setVolume`) | 615–621 | `main` | `audio` |
| 30 | starter choice | 623–636 | `main` | `store`, `syncScene` |
| 31 | initial `syncScene` + three `update` calls | 638–641 | `main` | `sceneSync`, `hud`, `spar`, `cup` |
| 32 | runtime reducer, cause copy, visibility handling | 643–691 | `app/runtime.ts` | `app`, `scene`, `staging`, `spar`, `cup` |

### Boot and subscription order that must survive (invariant 1)

Construction / side-effecting calls, in source order:

1. `createScene(app, hooks)` (inside try/catch)
2. boot-plate removal
3. `buildArena(scene.sceneRoot)`
4. `createStaging(arena.group)`
5. `createSwap(scene, arena)`
6. `loadBoot(storage)`
7. `buildRecoveryModal(...)`, `app.append(recovery.root)`, conditional `recovery.open()`
8. `createGameStore(...)` (its `onPersistError` closes over `hud`, created later)
9. `applyCameraStyle()`
10. `new AudioPlayer(playCue)`, `new MusicBeds()`, `beds.setScene("ranch")`, `pointerdown`/`keydown` unlock listeners
11. `createSpar(app, handlers)`
12. vignette element appended to `document.body`
13. `staging.setBigHitHandler(...)`, `staging.setDirectorHandler(...)`
14. `applyMotionPref()`
15. `createCup(app, handlers, { restoredSession })`
16. `createGraduation(app, handlers)`
17. `buildImportModal(...)`
18. `createHud(app, handlers)`
19. `app.append(importModal.root)`
20. `store.subscribe` × 8 — `hud.update`, `spar.update`, `cup.update`,
    `audioPlayer.setMuted`, `audioPlayer.setVolumes`, `beds.setMuted`,
    `beds.setVolume`, `graduation.update` (in that order)
21. `audioPlayer.setVolumes(...)`, `beds.setVolume(...)` (boot mix)
22. `createStarterChoice(...)` when there is no creature
23. `syncScene()`, `hud.update(...)`, `spar.update(...)`, `cup.update(...)`
24. `initialRuntimeState()`, `visibilitychange` listener, conditional immediate
    `onVisibility()`

Late-bound references that exist at base and are kept late-bound (they are
never called before the binding is initialised): `applyRuntime` (declared last,
used by the scene's `onGraphics` hook), `audioPlayer` and `store` (used by the
scene's `onPet` hook), `hud` (used by the store's `onPersistError`, by the
import modal and by the graduation handlers), `beds` (used by
`enterArena`/`exitArena`, declared after them), `graduation` (used inside its
own handlers).

## Result

### Modules created (P1.T2–P1.T6)

| Task | Module | Export surface |
| --- | --- | --- |
| P1.T2 | `app/scene-sync.ts` | `SceneSync` (`sceneVisuals`, `syncScene`, `applyCameraStyle`, `toggleArenaCamera`), `createSceneSync(scene, store)` |
| P1.T3 | `app/audio.ts` | `AudioWiring` (`player`, `beds`, `playStepCue`), `createAudioWiring(store)` |
| P1.T4 | `app/arena.ts` | `ArenaDeps`, `Arena` (`enterArena`, `exitArena`, `wirePresentation`, `applyMotionPref`), `createArena(deps)` |
| P1.T5 | `app/screens.ts` | `CupScreenDeps`, `GraduationScreenDeps`, `createSparScreen`, `createCupScreen`, `createGraduationScreen` |
| P1.T5 | `app/hud-screen.ts` | `HudScreenDeps`, `createHudScreen(deps)` |
| P1.T5 | `app/screen-deps.ts` | `ScreenDeps` (shared type only, no runtime code) |
| P1.T6 | `app/runtime.ts` | `BOOT_FAILURE_CAUSE`, `RuntimeDeps`, `Runtime`, `createRuntime(deps)` |

`main.ts` after the split is boot plus composition: `#app` lookup, `createScene`
in try/catch with the failure plate, `buildArena`/`createStaging`/`createSwap`,
storage + `loadBoot` + recovery modal, `restoredSession`, `createGameStore`, the
four factories, the import modal, `app.append(importModal.root)`, the eight
`store.subscribe` registrations, the boot mix, the starter overlay, the three
initial `update` calls and `createRuntime(...)`.

### Sizes (bytes, non-test)

| File | Base | Head | Cap (12,288) |
| --- | --- | --- | --- |
| `apps/client/src/main.ts` | 25,204 | 8,690 | ✅ |
| `apps/client/src/app/arena.ts` | — | 4,923 | ✅ |
| `apps/client/src/app/audio.ts` | — | 2,074 | ✅ |
| `apps/client/src/app/hud-screen.ts` | — | 7,134 | ✅ |
| `apps/client/src/app/runtime.ts` | — | 2,660 | ✅ |
| `apps/client/src/app/scene-sync.ts` | — | 2,705 | ✅ |
| `apps/client/src/app/screen-deps.ts` | — | 628 | ✅ |
| `apps/client/src/app/screens.ts` | — | 7,612 | ✅ |
| **Total touched/new** | 25,204 | 36,426 | — |

Measured with `git ls-files --debug` (per-file `size:`), the only size probe the
sandbox allows.

### Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Typecheck | `bun run check` | 0 | voxel 62 files, sim 79 files, client 244 files; no type errors |
| Verification | `bun run verify` | 0 | check clean; 1787 pass / 1 skip / 0 fail across 143 files; biome checked 406 files with 7 pre-existing `noNonNullAssertion` **warnings** and 0 errors; determinism gate OK (all archetype stages byte-identical, 5 prop digests match) |
| Build | `bun run build` | 0 | vite 8.3.4, 197 modules transformed, `dist/index.html` 2.13 kB, CSS 56.48 kB, JS 821.04 kB, built in 335 ms (pre-existing >500 kB chunk warning) |
| Biome (direct) | `bunx biome check` | n/a | **not run** — the sandbox rejects the binary (`permission.rejected`); the same biome check runs inside `bun run verify` and passed |

### Acceptance

| Contract | Status | Evidence |
| --- | --- | --- |
| AC-1 (no non-test module over 12,288 B) | ✅ for every file this phase touched/created | size table above; largest is `main.ts` at 8,690 B. The tree-wide guarantee still depends on Phases 2–4 (`hud.ts`, `scene.ts`, `spar.ts`, … are untouched here). |
| AC-2/AC-3/AC-8 (guard + negative control) | ⏳ Phase 5 | `size-probe.test.ts` intentionally left in place |
| AC-4 (`bun run verify` + `bun run build`) | ✅ | both exit 0 |
| AC-5 (browser smoke) | `not run by agent` | brief forbids dev server/browser; no runtime path changed, so the smoke belongs to the primary's review pass |
| AC-6 (export surfaces unchanged) | ✅ | `main.ts` is the Vite entry and exported nothing at base (side effects only); no other pre-existing module was modified (commit touches only `main.ts` and the new `app/*`) |
| AC-7 (no new cycles) | ✅ | only `main.ts` imports `app/*`. Inside `app/`: `main → {screens, hud-screen, runtime, scene-sync, arena, audio}`; `screens`/`hud-screen → screen-deps`; `screen-deps → {arena, audio, scene-sync}` (types) — no back edge into `screen-deps` or into any `app/*` from outside `main.ts` |

### Behaviour-identity review

- **Construction order**: 1 `createScene` (try/catch) → 2 boot-plate removal →
  3 `buildArena` → 4 `createStaging` → 5 `createSwap` → 6 `loadBoot` → 7 recovery
  modal → 8 `createGameStore` → 9 `applyCameraStyle()` → 10 audio construction +
  `setScene("ranch")` + unlock listeners → 11 `createSpar` → 12 vignette →
  13 staging handlers → 14 `applyMotionPref()` → 15 `createCup` → 16
  `createGraduation` → 17 `buildImportModal` → 18 `createHud` → 19
  `append(importModal.root)` → 20–24 unchanged. Verified line by line against
  the base file.
- **Subscriber order**: the eight `store.subscribe` calls are the same eight,
  same order, same bodies.
- **DOM and copy**: no node created, moved, re-parented or re-texted. The only
  string that changed location is the boot failure sentence, which moved from
  an inline literal in `main.ts` into `BOOT_FAILURE_CAUSE` with identical text.
- **Late binding preserved**: `getBeds()`, `getHud()` and the HUD's
  `askImport(data)` are accessor/callback parameters, so the closures still
  resolve `audio`/`hud`/`importModal` after boot, exactly like the old
  forward references. Because `onGraphics` only fires from the render loop and
  `onPersistError` only fires on a commit, no getter can run before the
  handle exists.

### Deviations

1. **`app/hud-screen.ts` and `app/screen-deps.ts` are new modules not named in
   the brief.** A single `app/screens.ts` holding all four factories came out at
   14,595 B, over the 12,288 B cap. Per the brief's cycle rule, the HUD factory
   moved to its own module and the shared `ScreenDeps` type to a third so
   `screens.ts` and `hud-screen.ts` never import each other.
2. **`ArenaDeps.getBeds()`** — `enterArena`/`exitArena` set the music scene on
   beds that are constructed later in the boot order, so the handle is passed as
   an accessor instead of being hoisted. Same late binding as the inline code.
3. **`GraduationScreenDeps.getHud()`** — the graduation handlers call
   `hud.announceGraduation`, but the HUD is built two steps later; accessor
   preserves the old closure over the later `const hud`.
4. **`HudScreenDeps.askImport(data)`** — `onImportFile` needs the
   replace-save modal, which is created before the HUD in `main`; passing the
   `ask` callback keeps the HUD factory free of `ImportModalRefs`.
5. **`BOOT_FAILURE_CAUSE` exported from `app/runtime.ts`** — the boot catch in
   `main` and the runtime plate share one constant instead of a duplicated
   literal (text unchanged).

### Notes

- **Relocation only; no behaviour edits.** Nothing was cleaned up on the way
  past, per the spec assumption. Oddities left exactly as they were:
  - `store.subscribe` returns an unsubscribe that nobody stores (single-page
    app, store lives forever).
  - `onVolume` auditions live and persists on release — two `set*Volume` calls
    per drag step, unchanged.
  - The boot catch removes `#boot-plate` and then `main` removes it again
    unconditionally (harmless, kept verbatim).
  - Not touched but worth flagging for later: the recovery modal is appended
    before the store exists, so a corrupt-boot player sees the dialog while a
    fresh state is already in memory.
- No `main.test.ts` exists, so no test file was touched.
- `bun run build` transforms 197 modules (196 at base + 7 new, one shared
  type-only module elided).
- Total bytes went up (25,204 → 36,426): import blocks per module, the deps
  interfaces and their JSDoc, one extra indent level inside each factory, and
  the factory return objects. Every moved body is verbatim.

## Primary verification

Run by the orchestrator on `feat/20261020-client-decomposition`, HEAD `d5b0117` (the phase checkpoint).

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| full gate | `bun run verify` | 0 | typecheck, biome (inside verify), suite and determinism gate all green |
| build | `bun run build` | 0 | @apex/client built; only the pre-existing chunk-size advisory |
| sizes | measured on disk | — | `main.ts` 8,690 B; `scene-sync` 2,705; `audio` 2,074; `arena` 4,923; `screens` 7,612; `hud-screen` 7,134; `screen-deps` 628; `runtime` 2,660 — all under 12,288 |
| cycles | `app/*` import audit | — | only `screen-deps` ← `screens`/`hud-screen`, and `screen-deps` → type-only imports of `arena`/`audio`/`scene-sync`; no back edges |
| exports | `git show 99d3852:apps/client/src/main.ts` vs HEAD | — | `main.ts` exported nothing before or after; no other module's surface changed in this phase |

### Browser smoke (AC-5)

Dev server on `localhost:5173`, fresh save:

- Boot: no boot plate left behind, canvas present, HUD renders (SPAR, AP, BRONZE III, SETTINGS, HANDBOOK, ACTIONS).
- Starter choice: picked Ember Drake; save created with `day 1`, `ap 3`.
- Care: FEED spent one AP and set hunger 100; ADVANCE DAY moved to day 2 with AP restored to 3.
- Detail modal: opens from the creature plate, three tabs with Stats selected, Growth page digit-free ("still a few days off" / "all clear" / "in good spirits"), close returns to the ranch.
- Spar: overlay renders the loadout and tactics; picking Balanced starts the fight with both fighters, HP bars, range readout and the feed log; damage ticks down to a knockout and the verdict reads "Bramble Ox is down! VICTORY — EMBER DRAKE"; BACK TO THE RANCH returns to the ranch with the creature intact.
- Settings: all rows render (motion, sound, music, sfx, download, import, new game, done).
- Handbook: four tabs render with the type chart.
- Console: no messages recorded during the pass.

Not exercised in the browser: the cup run and the graduation flow. Both are constructed
at boot, and their failure modes are covered by the suite; a cup and a graduation were
smoked in `20261020-detail-modal-tabs` on the same wiring.

### Note on a dev-server artifact

The pre-choice DOM held two sets of starter cards (three hidden, three visible). That is
Vite HMR re-running `main.ts` in the same page after the branch switch, not a code
change: a hard reload with the save cleared still boots one HUD, and the smoke above ran
on that page. Worth remembering for future smoke passes — reload before concluding
duplication.
