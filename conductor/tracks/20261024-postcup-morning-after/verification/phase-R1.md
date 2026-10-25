# Phase R1 — Review Fixes (verification evidence)

Track: `20261024-postcup-morning-after` · Branch: `feat/20261024-postcup-morning-after`
Base: `33fe609d` (plan in progress) · Range reviewed: `2dcebc7..98bf444a` (verdict BLOCK strict)

## Gate

```
bun test --check --parallel=4 --timeout 120000
```

- Baseline (clean tree, before R1): 2629 pass, 1 skip, 0 fail, 207 files — exit 0.
- After R1: **2633 pass, 1 skip, 0 fail, 208 files (2634 tests)** — exit 0.

## Tasks

### R1.T1 — F1 (sick gate wins on the ritual-day first pet) — commit `95c44a28`

- Failing test first (`apps/client/src/ranch/morning-after.test.ts`):
  "a sick creature's ritual-day first pet stays the weak stir (F1)" —
  ritual day, `health = SICK_HEALTH - 1`, ceremony settled into its tint;
  `startPet()` returned `"lean"` (class table), must be `"stir"`; the pet
  window still closes on the accepted pet.
- Fix (`apps/client/src/ranch/api.ts`): the class variant applies only while
  `s.morningAfterPetPending && !sick`; otherwise the mood/sick
  `pickPetReaction` gate decides exactly as on a non-ritual day (FR-5).
- Post-fix: 12/12 in file.

### R1.T2 — F2 (settle morning-after state on mid-ceremony day change) — commit `5716e002`

- Failing test first: "a mid-ceremony day advance ends the ritual before the
  tint latches (F2)" — begin on day 4, advance to day 5 mid-ceremony; before
  the fix the tint latched with day 5 and stayed active.
- Fix:
  - `apps/client/src/ranch/state.ts`: new `morningAfterDay` field (default 0),
    latched to `s.day` in the begin adaptor, next to the class/petPending latches.
  - `apps/client/src/ranch/frame.ts`: at the top of `updateRanch`, when
    `s.morningAfterDay !== s.day` the live machine is dismissed politely and
    `morningAfterPetPending` clears unconditionally (FR-9: nothing from the old
    day survives); the settle-edge tint latch is guarded with
    `s.morningAfterDay === s.day` so a tint can never latch with a day the
    ceremony does not belong to. Same-day paths are unchanged (full suite green).
- Regression assert: the "night settle releases" test was reordered per the
  settled design — `s.day = 4` is set **before** `begin` (production: scene-sync
  pushes the day down before the ceremony begins); it still asserts the tint
  latches on day 4 then retires on day 5.
- Post-fix: full suite green.

### R1.T3 — F3 (unexport `morningAfterDue` from the barrel) — commit `f676ff4b`

- `apps/client/src/scene-logic.ts`: the ledger's `export *` replaced with
  explicit named re-exports (`createMorningAfterLedger`, `MorningAfterLedger`,
  `mintMorningAfter`, `settleMorningAfterNight`, `takeMorningAfter`) — the
  production-side probe `morningAfterDue` is no longer on the barrel surface.
- `apps/client/src/scene-logic/morning-after.test.ts`: the ledger tests' import
  of `morningAfterDue` moved to `./morning-after-ledger` (still exported from
  its own module for its tests).
- `apps/client/src/scene-logic.test.ts`: `"morningAfterDue"` dropped from the
  `EXPECTED_EXPORTS` pin.
- Post-fix: barrel-pin + ledger tests 22/22.

### R1.T4 — F4 (pin the debrief announce wrapper) — commit `2a040d98`

- `apps/client/src/app/hud-screen.ts`: the inline debrief chain extracted to
  module-level `withMorningAfterDebrief(hud, pendingMorningAfter)` — routine
  update → `morningAfterDebriefGate` (latching `debriefSaidDay`) →
  `announceMorningAfter`; `createHudScreen` now ends with
  `return withMorningAfterDebrief(hud, () => store.pendingMorningAfter())`.
  Behavior byte-identical; the wrapper is now a named, testable seam.
- New co-located test `apps/client/src/app/hud-screen.test.ts`: a fake Hud
  double asserts exactly one `announceMorningAfter` across two ritual-day
  updates, and none after the settle (bank consumed → no day says again).

### R1.T5 — F5 (guard morning-after begin against a live ceremony) — commit `7ffdd507`

- Failing test first: "a second begin while the ceremony runs leaves the
  latches alone (F5)" — begin title, pet (window closes), second begin of
  `exit` mid-ceremony: before the fix the class relatched to `"exit"` and the
  pet window reopened.
- Fix (`apps/client/src/ranch/state.ts`): the begin adaptor probes
  `machine.advance(0).active` first (side-effect-free — dt clamps to
  `[0, 0.1]`, no beat advances) and returns unchanged while a ceremony is
  live; the class/day/petPending latches only move when the machine actually
  takes the derivation.

## Result

All five review findings resolved exactly as specified; no opportunistic
refactors. Gate exit 0 with 2633 pass / 1 skip / 0 fail.
Acceptance (`bun run verify && bun run build`) is the primary's run.

## Primary verification

- **Date**: 2026-10-25 — **by**: Conductor primary agent (independent)
- un run test:phase -> exit **0**, 2633 pass / 1 skip / 0 fail, 208 files (30.18 s).
- un run verify -> initially exit **1**: biome formatter flagged
  pps/client/src/ranch/morning-after.test.ts (1 file). Primary applied
  iome check --write to that single file (fix attempt 1), re-checked:
  biome clean over 600 files, un run verify -> exit **0**
  (determinism byte-identical). un run build -> exit **0**.
- Squash guard: 33fe609d..HEAD holds exactly the six reported commits;
  9 code files all within the R1 Touches contract.
- **Result**: phase accepted (with the absorbed format fix).
