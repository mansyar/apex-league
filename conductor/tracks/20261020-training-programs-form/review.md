# Review: Raising Depth: Training Programs & Form

- **Track:** `20261020-training-programs-form`
- **Type:** `feature`
- **Branch:** `feat/20261020-training-programs-form`
- **Range:** `e7448d0..b40c06a`
- **Date:** `2026-10-20T22:40:00+11:00`
- **Verdict:** `BLOCK`

## Summary

The sim half of the track is in good shape: form tiers, the ATK-only lever, the
settlement order (sick, hungry, exhausted, then gain), the no-RNG guarantee, save
v18 and the single `battleStats` seam all match the spec, and the rival side stays
on `effectiveStats` so FR-10 holds. The block is one client defect: the dock's
per-row "tonight" projection previews the payout without applying the
`trainingDays + 1` that `assignTraining` performs, so the number the player reads
before spending AP disagrees with what settlement pays on one day in three. Two
medium findings follow from the same off-by-one and from focus handling on the
narrow picker; three low findings cover a false comment, a stale dev seed and a
missing test for the form chip.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `bun run check` | pass | 62 / 86 / 297 files, no type errors |
| unit | `bun test --check --parallel --timeout 120000` | pass | 1917 pass / 1 skip / 0 fail, 149 files |
| lint | `biome check` | pass | 0 errors, 7 pre-existing `noNonNullAssertion` warnings |
| determinism | `bun run gate:determinism` | pass | nine GLBs byte-identical, 5 props digests match |
| build | `bun run build` | pass | 241 modules, 834.89 kB / 228.27 kB gzip |
| visual | `playwright`/browser pass at desktop and 393x659 | pass | `verification/phase-4.md`, `phase-5.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P2.T1 | `packages/sim/src/training.test.ts` | covered |
| FR-2 | P2.T2 | `packages/sim/src/care.test.ts` | covered |
| FR-3 | P2.T2 | `packages/sim/src/care.test.ts` | covered |
| FR-4 | P2.T3 | `packages/sim/src/settlement.test.ts` | covered |
| FR-5 | P2.T3 | `packages/sim/src/settlement.test.ts` | covered |
| FR-6 | P2.T3 | `packages/sim/src/settlement.test.ts` | covered |
| FR-7 | P2.T3 | `packages/sim/src/settlement.test.ts` | covered |
| FR-8 | P1.T2 | `packages/sim/src/form.test.ts` | covered |
| FR-9 | P1.T2, P3.T1 | `form.test.ts`, `battle/form-seam.test.ts`, `cup/form-seam.test.ts` | covered |
| FR-10 | P3.T2 | `packages/sim/src/cup/form-seam.test.ts` | covered |
| FR-11 | P2.T4 | `packages/sim/src/save/save.test.ts`, `docs/save-schema.md` | covered |
| FR-12 | P4.T1 | `hud/programs.test.ts`, `hud/dock.test.ts` | partial (F1) |
| FR-13 | P4.T2 | `detail/training-tab.test.ts` | partial (F2) |
| FR-14 | P5.T1 | primary browser pass only | partial (F6) |
| FR-15 | P5.T2 | `apps/client/src/handbook.test.ts` | covered |
| FR-16 | P3.T3, P3.T4 | `packages/sim/src/battle/form.balance.test.ts` | covered |
| NFR-1 | P2.T3 | `settlement.test.ts` RNG-call proof, determinism gate | covered |
| NFR-2 | P1.T1, P3.T1 | `battle/form-seam.test.ts`, `cup/form-seam.test.ts` | covered |
| NFR-3 | P2.T4 | `packages/sim/src/save/save.test.ts` | covered |
| NFR-4 | P4.T1, P5.T2 | `apps/client/src/module-size.test.ts` | covered |
| NFR-5 | P4.T1, P5.T1 | `hud/programs.test.ts` | partial (F3, F6) |
| NFR-6 | P1.T2 | `packages/sim/src/form.test.ts` | covered |
| NFR-7 | P1.T1, P2.T1, P2.T3, P2.T4 | the test files above | covered |
| AC-1 | P1.T1 | `form.test.ts`, `battle/form-seam.test.ts` | covered |
| AC-2 | P1.T2 | `form.test.ts` | covered |
| AC-3 | P2.T2 | `care.test.ts` | covered |
| AC-4 | P2.T3 | `settlement.test.ts` | covered |
| AC-5 | P2.T3 | `settlement.test.ts` | covered |
| AC-6 | P2.T2 | `care.test.ts` | covered |
| AC-7 | P2.T4 | `save/save.test.ts` | covered |
| AC-8 | P5.T3 | `verification/integrated.md` | covered |
| AC-9 | P3.T3, P3.T4 | `battle/form.balance.test.ts` | covered |
| AC-10 | P4.T1, P5.T1 | phase 4 and 5 evidence | partial (F3, F6) |

## Findings

### Critical

- <none>

### High

- **F1 - The picker's "tonight" projection is one trained night behind the payout**
  - **File:** `apps/client/src/hud/programs.ts:66`
  - **What:** `previewTraining({ ...creature, trainingProgram: id })` previews
    with the pre-assignment `trainingDays`, but `assignTraining`
    (`packages/sim/src/care.ts:188`) increments it and `trainingPlan` pays the
    trickle when `trainingDays % 3 === 0` (`settlement.ts:135`). With a counter
    at 2 (mod 3) the row promises primary only and the night pays primary plus
    trickle; with a counter at 0 (mod 3) the row promises the trickle and the
    night pays primary only. The assigned row and the dock head read the real
    counter and are correct, so the picker disagrees with them.
  - **Why:** This is the only gain readout shown before 1 AP is spent, and it is
    wrong on one day in three - exactly the nights the breakthrough rule governs.
    It breaks the FR-7 property the picker is built on.
  - **Fix:** Preview against the counter the assignment will leave behind:
    `trainingDays: creature.trainingProgram === null ? creature.trainingDays + 1 : creature.trainingDays`.
    Prefer a sim helper `previewProgram(creature, program)` that performs the same
    bump, so the increment lives in one place and the picker and tab share it.
  - **Requirement:** FR-12
  - **Test gap:** `hud/programs.test.ts` currently pins the wrong value for
    `trainingDays: 3`; it must expect primary-only, and a `trainingDays: 2` case
    must expect the trickle. Add a round-trip that compares `programRow(...).tonight`
    with what `settleCreature` pays after `assignTraining` for counters 0-5.

### Medium

- **F2 - The Training tab says "3 nights" on the night the breakthrough pays**
  - **File:** `apps/client/src/hud/copy-care.ts:118`, `apps/client/src/detail/training-tab.ts:63`
  - **What:** `breakthroughLine(trainingDays)` maps `% 3 === 0` to "3 nights"
    without consulting `trainingProgram`, so an assigned partner whose counter is
    already at 0 (mod 3) - tonight pays the trickle - reads "Breakthrough in 3
    nights" while the program row on the same screen shows the trickle gain.
  - **Why:** FR-13 asks for the next breakthrough night; the tab names the wrong
    one on every third trained day.
  - **Fix:** `breakthroughLine(trainingDays, assigned)` returns "Breakthrough
    tonight" when assigned and `% 3 === 0`, otherwise keeps the current
    arithmetic. Pass `creature.trainingProgram !== null` from the tab.
  - **Requirement:** FR-13
  - **Test gap:** `detail/training-tab.test.ts` only covers the unassigned
    counter; add assigned + 3, assigned + 4 and assigned + 5.

- **F3 - Opening the narrow picker drops keyboard focus to the body**
  - **File:** `apps/client/src/hud/shell.ts:148`
  - **What:** Opening the sheet flips `view.pickerOpen` and re-renders but never
    moves focus. At <= 767.98px `ranch.css:1255` hides `.dock-train > .kit-button`,
    which is the element that has focus, so focus falls back to `<body>` and the
    rows are only reachable by tabbing from the top of the document.
  - **Why:** NFR-5 and AC-10 require keyboard operation; the phase 4 evidence and
    the CSS comment claim the hidden control is never focused, which is untrue
    for the open action.
  - **Fix:** On open, focus the rove row (export the roving helper `dock.ts`
    already uses) after the render; keep the Escape path restoring focus to the
    train button. Correct the comment and the phase 4 evidence wording.
  - **Requirement:** NFR-5
  - **Test gap:** Add a shell/dock test: activate the train button, assert
    `document.activeElement` is the rove row, Escape, assert it is the button.

### Low

- **F4 - The picking comment describes the wrong DOM shape**
  - **File:** `apps/client/src/ranch.css:1249`
  - **What:** The comment says the picker is a child of `.dock-train`, so hiding
    the wrapper would hide the sheet; `dock.ts:243` appends the picker to the dock
    root as a sibling.
  - **Why:** The rendering is right but the rationale is false and will mislead
    the next edit of that block.
  - **Fix:** Reword the comment and the phase 4 evidence to the real structure.
  - **Requirement:** none
  - **Test gap:** none

- **F5 - The phase 3 dev seed writes an unloadable save**
  - **File:** `artifacts/phase3-seed.ts:20`
  - **What:** The script still sets `trainingFocus = null` and never sets
    `trainingProgram`, so the JSON it writes fails `isValidCreature` after v18.
  - **Why:** Anyone using the seed to reproduce the balance probe gets a save the
    game refuses to load.
  - **Fix:** Set `trainingProgram: null`, drop the stale field, and update the
    header comment to v18.
  - **Requirement:** FR-11
  - **Test gap:** none (dev script, outside `bun run check`)

- **F6 - The form chip and the coach/spar form lines have no tests**
  - **File:** `apps/client/src/hud/plates-creature.ts:199`
  - **What:** `formChipTitle`, `paintFormChip`, the coach room form row and the
    spar card line are covered only by the primary's browser pass, while the
    phase 5 evidence reads as if tests existed.
  - **Why:** The chip's title is the NFR-5 carrier of the ATK delta; nothing pins
    it, or the two sentences, to `FORM_COPY`.
  - **Fix:** Add a pure test for `formChipTitle` across all four tiers, a
    `paintFormChip` text/title/aria test, and text-containment tests for the
    coach room and spar card including `FORM_SICK_NOTE` only for a sick sluggish
    partner. Correct the phase 5 wording.
  - **Requirement:** FR-14
  - **Test gap:** as described.

## Overrides

- none

## Plan compliance

All five phases carry a Result, Checkpoint and Evidence, the total is 17 tasks
all checked, and every phase's diff stayed inside its Touches (phase 5 recorded
`hud/update.ts`, `handbook/*`, `ranch.css` and `cup.css` when they were added).
The deviations table records the fixture literal bump in
`apps/client/src/save-transfer.test.ts`, the seven save-test version assertions,
the forced `exhausted` copy strings, the `hud-screen` program mapping and the
ATK-only narrowing. No task was silently dropped.

## Out of scope

- The pre-existing boss calibration gap recorded in phase 3: a real four-move,
  24-night build clears every boss at 79-100% while the FR12 probe uses the
  two-move birth kit. It needs its own track.
- `handbook.ts`'s sticky footer overlaying the scrolled list at 393x659 is
  pre-existing behaviour, unchanged by this track.

## Debt

- none open. Every finding above is fixed in Phase R1 (strict review).

## Doc sync

`pending` - post-review sync after the fixes.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 2 | 3 | 0 |
