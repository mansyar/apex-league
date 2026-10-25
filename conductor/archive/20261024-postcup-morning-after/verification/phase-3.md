# Phase 3 — Ritual surfaces: first-pet variant, coach debrief, care-cue remap

- **Track:** 20261024-postcup-morning-after
- **Phase:** 3 (P3.T1–P3.T3)
- **Date:** 2026-10-25
- **Branch:** `feat/20261024-postcup-morning-after`
- **Base:** `0de3310` (the plan's P3.T2.3 carry-over update, on top of the Phase 2 checkpoint `de54a3d`)
- **Head:** `b5837af`

## Result

**verified** — full suite green, `bun run verify && bun run build` green.

## Commits

| Commit | Task | Summary |
| --- | --- | --- |
| `55a7411` | P3.T1 | feat(client): first-pet morning-after class variant |
| `8568cba` | P3.T2 | feat(hud): morning-after coach debrief with arrival wiring |
| `a822ef9` | P3.T3 | feat(audio): per-class morning-after care-cue remap |
| `b5837af` | (gate fix) | style(client): biome formatting for phase-3 wiring |

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit (T1 red) | `bun test apps/client/src/scene-logic/pet.test.ts apps/client/src/ranch/morning-after.test.ts apps/client/src/scene-logic.test.ts` | 1 | Red recorded: 5 fail, 1 export error (mood variants returned, barrel pin missing) |
| Unit (T1 green) | same | 0 | 24 pass, 0 fail |
| Unit (T2 green) | `bun test apps/client/src/app/scene-sync.test.ts apps/client/src/hud/copy-morning-after.test.ts apps/client/src/store.test.ts apps/client/src/ranch/morning-after.test.ts` | 0 | 41 pass, 0 fail |
| Unit (T3 red) | `bun test apps/client/src/audio/careCues.test.ts` | 1 | Red recorded: 3 fail (plain "care-pet" returned for class events) |
| Unit (T3 green) | same | 0 | 9 pass, 0 fail |
| Phase gate | `bun test --check --parallel=4 --timeout 120000` | 0 | 2625 pass, 1 skip, 0 fail across 207 files |
| Typecheck (mid-flight) | `bun run check` | 0 | caught one test overload issue before the gate |
| Acceptance | `bun run verify && bun run build` | 0 | typecheck + typed parallel tests + biome + voxel determinism gate + vite build (first run: 4 formatting errors, fixed, re-run green) |

Fix attempts: 1 (T3 test overload → conjunction assertion); 1 (biome formatting → `biome check --write` on the 4 named files).

## AC-4 mapping (view-model tests)

| AC-4 requirement | Test | Status |
| --- | --- | --- |
| Pet variant per class | `scene-logic/pet.test.ts` — `MORNING_AFTER_PET_VARIANT` maps title→hop, gatekeep→lean, exit→wiggle, withdrawn→stir | pass |
| Pet handler wiring | `ranch/morning-after.test.ts` — first pet of the ritual day takes the class variant at the `RanchMotion.startPet` seam (5 tests: first-only + cooldown intact, dismissal pet counts as first, non-ritual unchanged (mood + sick paths), night settle releases) | pass |
| Debrief render per class | `hud/copy-morning-after.test.ts` — each class renders its own table line with `{name}`; gatekeep names the boss | pass |
| Amplifier precedence at the render seam | same — first_title / first_scalp amplifier lines override the class line; single-sourcing proven against `pickDebriefCopy` | pass |
| Copy table golden | `morning-after/copy.test.ts` (Phase 1 golden, still green) + `hud/copy-morning-after.ts` is a pure passthrough of `pickDebriefCopy` | pass |

## FR coverage

- **FR-5** — `MORNING_AFTER_PET_VARIANT` (pure, scene-logic/pet.ts); the window is a `morningAfterPetPending` latch on RanchState: set at the ceremony's `begin`, cleared on the first accepted pet (`startPet`) or at the night settle (frame.ts, only when the tint actually retires). Cooldowns (`PET_COOLDOWN`), the mood/sick gates and the pet machine are untouched. The pet that dismisses a running ceremony counts as that first pet (machine keeps timing; pose withheld; dismissal latched from `startPet`). Inert on non-ritual days.
- **FR-6** — exactly one debrief per day: `morningAfterDebriefGate(saidDay, day, derivation, name)` (pure, `hud/copy-morning-after.ts`) latches on the sim day; the glue in `app/hud-screen.ts` runs on every `hud.update` and says the line through `Hud.announceMorningAfter` → the existing `statusTicker` (same channel, same hold-until-next-update lifecycle, nothing persisted). Source is `pickDebriefCopy` only; a banked (evolution-yield) derivation still debriefs because `pendingMorningAfter()` stays non-null all ritual day.
- **FR-8** — `MORNING_AFTER_PET_CUE` remap table (audio/careCues.ts): title→care-play, gatekeep→care-treat, exit→care-rest, withdrawn→care-feed — all pre-bundled assets, no new files; mute/reduced-motion gates unchanged and tested; the pet event carries the class only on the ritual day (`main.ts` stamps `store.pendingMorningAfter()?.class`).
- **P2 carry-over** — (a) `store.takeMorningAfterArrival()` is now called at the cup overlay's close (`app/screens.ts` `onSession(null)`), the first ranch arrival after finalize; a reload finds nothing banked and is a silent no-op; an evolution-yield day consumes silently with the derivation banked for the debrief. (b) The sim day is pushed into the ranch frame at `app/scene-sync.ts` `sceneVisuals()` (`scene.setRanchDay(store.get().day)`), so the frame's night-settle retire (`s.day`) and the settle-latch day actually receive the sim day in the live flow (tested in `app/scene-sync.test.ts`).

## Deviations (files touched outside the phase's `Touches` list)

| File | Reason |
| --- | --- |
| `apps/client/src/hud.ts` | The debrief's ticker say needed a one-shot `Hud.announceMorningAfter(line)` method on the Hud composition root (`hud/**` was in scope, but `Hud` itself lives in the root file — smallest possible change: one interface method + one say). |
| `apps/client/src/scene.ts`, `apps/client/src/scene/types.ts` | The app cannot reach the ranch motion API without a `SceneHandle` pass-through: added `startMorningAfterCeremony(derivation)` and `setRanchDay(day)` (the Phase 2 machine + frame were already app-facing only through this contract). |
| `apps/client/src/main.ts` | FR-8's live path: the scene's `onPet` audio hook is owned by the boot composition root, so the class stamp on the pet chirp lives there. |

## Notes

- The debrief renders at the finalize commit (first `hud.update` after finalize), which is exactly when the player returns from the overlay — the ticker holds the line until the next routine update, matching the existing lifecycle.
- The store ledger itself was not changed in this phase (Phase 2 already covered mint/consume/yield semantics; `store.test.ts` still green, 41 tests in the touched-file batch include it).
- No sim/save changes (v25 intact — save tests and the save export module untouched); no new dependency; no new randomness; module caps respected (largest new module `hud/copy-morning-after.ts` ≈ 1 KB).
- Phase 4 (edge rules FR-9/AC-6, Playwright visual checklist, tech-stack.md note) remains open per the plan.

## Primary verification

- **Date**: 2026-10-25 — **by**: Conductor primary agent (independent)
- `bun run test:phase` → exit **0**, 2625 pass / 1 skip / 0 fail, 207
  files (27.96 s).
- `bun run verify` → exit **0** (typecheck, uncapped tests, Biome clean,
  determinism gate byte-identical: 18 GLBs + 5 props).
- `bun run build` → exit **0** (pre-existing >500 kB chunk warning only).
- Squash guard: `0de3310..HEAD` holds exactly the six reported commits
  (three task commits + style fix + evidence + base-correction
  bookkeeping) — no foreign commits; deviations into composition roots
  (`hud.ts`, `scene.ts`, `scene/types.ts`, `main.ts`) recorded and
  accepted as smallest-possible wiring.
- Carry-over acceptance: `takeMorningAfterArrival()` call site +
  `setRanchDay` day-push are wired and tested in `app/scene-sync.test.ts`
  / `app/screens.ts` — the P2 primary-verification carry-over is closed.
- **Result**: phase accepted.
