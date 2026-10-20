# Raising Depth: Training Programs & Form — Implementation Plan

> **Branch:** `feat/20261020-training-programs-form`
> **Base:** `main` @ `e7448d089fb15bb0d3422a54c9a432b9bdb49033`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Form Model

- **Goal:** A pure, tested form model exists in `@apex/sim` and is neutral for a
  freshly created creature, without changing any existing behavior.
- **Depends on:** none
- **Covers:** FR-8, FR-9, NFR-2, NFR-7, AC-1, AC-2
- **Touches:** `packages/sim/src/form.ts`, `packages/sim/src/form.test.ts`,
  `packages/sim/src/index.ts`
- **Verification:** `bun test packages/sim/src/form.test.ts && bun run check`
- **Status:** verified

- [x] **P1.T1: Write the form tests** — covers: FR-8, AC-1, AC-2
  - [x] **P1.T1.1:** Assert `steady` and a zero delta for a fresh
    `createCreature` of each starter species, and that `battleStats` deep-equals
    `effectiveStats` there (the golden-stability invariant).
  - [x] **P1.T1.2:** Assert the three tier boundaries and the score formula at
    mood/bond combinations around 65, 40 and 20, including a high-bond,
    low-mood creature landing `steady`.
  - [x] **P1.T1.3:** Assert a sick creature (< `SICK_HEALTH`) is pinned to
    `sluggish` even at mood 100/bond 100, and that no delta pushes a stat below 1.
- [x] **P1.T2: Implement `form.ts` and export it** — covers: FR-8, FR-9
  - [x] **P1.T2.1:** Add `FormTier`, `FORM_DELTAS`, `formScore`, `formTier`,
    `formModifier`, `battleStats`, `FORM_COPY` (tier label + one-line
    consequence) as pure functions over `Creature`.
  - [x] **P1.T2.2:** Re-export the public surface from `packages/sim/src/index.ts`
    and keep the module under the 12 KB cap.
  - [x] **P1.T2.3:** Document in the module header that form reads conditions
    only (no RNG, no HP effect) and why the neutral band contains the starting
    conditions.

**Result:** verified
**Checkpoint:** 411f20c
**Evidence:** conductor/tracks/20261020-training-programs-form/verification/phase-1.md

## Phase 2: Training Programs and Save v18

- **Goal:** Programs replace the single-stat focus end to end in the sim, the
  night pays out per the spec, and save v18 migrates v17 focus values.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-11, NFR-1, NFR-3,
  NFR-7, AC-3, AC-4, AC-5, AC-6, AC-7
- **Touches:** `packages/sim/src/training.ts`, `packages/sim/src/training.test.ts`,
  `packages/sim/src/care.ts`, `packages/sim/src/care.test.ts`,
  `packages/sim/src/creature.ts`, `packages/sim/src/creature.test.ts`,
  `packages/sim/src/settlement.ts`, `packages/sim/src/settlement.test.ts`,
  `packages/sim/src/save/`, `packages/sim/src/index.ts`, `docs/save-schema.md`,
  `apps/client/src/hud/dock.ts`, `apps/client/src/hud/dock.test.ts`,
  `apps/client/src/hud/update.ts`, `apps/client/src/hud/copy-care.ts`,
  `apps/client/src/hud/copy.test.ts`, `apps/client/src/app/hud-screen.ts`
- **Verification:** `bun test --timeout 120000 packages/sim/src && bun run check && bun run gate:determinism`
- **Status:** verified

**Result:** verified
**Checkpoint:** 26e8d1c
**Evidence:** conductor/tracks/20261020-training-programs-form/verification/phase-2.md

- [x] **P2.T1: Program catalog** — covers: FR-1
  - [x] **P2.T1.1:** Add `TrainingProgram`, `TrainingProgramDef`,
    `TRAINING_PROGRAMS` with label, blurb, primary, trickle, and a
    `programFor(stat)` helper that reproduces the v17→v18 mapping.
  - [x] **P2.T1.2:** Test that all four ids exist, primaries are distinct, and
    every trickle differs from its primary.
- [x] **P2.T2: Assignment contract** — covers: FR-2, FR-3, AC-3, AC-6
  - [x] **P2.T2.1:** Change `assignTraining(state, program)` to spend AP on the
    first assignment only, advance `trainingDays` only when AP was spent, and
    reject `at-cap` on the program's primary (not the trickle).
  - [x] **P2.T2.2:** Keep clearing the assignment free; keep the same-day
    re-point tests passing with program ids.
  - [x] **P2.T2.3:** Add tests for capped-primary rejection and
    capped-trickle acceptance.
- [x] **P2.T3: Night payout** — covers: FR-4, FR-5, FR-6, FR-7, AC-4, AC-5
  - [x] **P2.T3.1:** Pay the primary outside the RNG path, gate on
    `!sick && !starving && energy >= EXHAUSTED_ENERGY` read before night
    recovery, and charge 10 energy only on paying nights.
  - [x] **P2.T3.2:** Add the trickle on `trainingDays % 3 === 0`, clamp both
    components at `TRAINING_CAP`, and apply the `ring` mood/bond bonus.
  - [x] **P2.T3.3:** Add the `exhausted` result, keep `sick`/`hungry` precedence,
    and rewrite `previewTraining` to return the projected result plus deltas.
  - [x] **P2.T3.4:** Prove via a settlement test that the payout consumes no RNG
    draw (same seed, same downstream conditions).
- [x] **P2.T4: Save v18** — covers: FR-11, NFR-3, AC-7
  - [x] **P2.T4.1:** Bump `SAVE_VERSION` to 18, rename the persisted field to
    `trainingProgram`, and add the v17→v18 migration using the documented
    recipe (validate previous shape, default safely, forward the session).
  - [x] **P2.T4.2:** Extend validation to reject an unknown program id and accept
    `null`.
  - [x] **P2.T4.3:** Update `docs/save-schema.md` (shape, mapping table,
    migration step) in this phase.
  - [x] **P2.T4.4:** Cover the full v0→v18 chain, the v17 fixture mapping for
    each stat, corrupt-id rejection, and a round-trip.
- [x] **P2.T5: Keep the client compiling against the program type** — covers: FR-1
  - [x] **P2.T5.1:** Mechanically adapt the dock train control, its update path,
    the hud wiring and the care copy from `StatKey` focus to `TrainingProgram`
    so the whole workspace typechecks. No new UX, no new copy beyond the program
    label — Phase 4 owns the real picker, projection lines and Training tab.
  - [x] **P2.T5.2:** Update the dock/copy tests to the program shape and keep the
    all-primaries-capped disabled state green.

## Phase 3: Battle Wiring and Balance Evidence

- **Goal:** Form reaches the arena through one seam while brackets, rivals and
  goldens stay unchanged, and the fairness probe is re-run with program builds.
- **Depends on:** Phase 2
- **Covers:** FR-9, FR-10, FR-16, NFR-1, NFR-2, AC-9
- **Touches:** `packages/sim/src/battle/`, `packages/sim/src/cup/bracket.ts`,
  `packages/sim/src/cup/session.ts`, `packages/sim/src/form.ts`,
  `packages/sim/src/form.test.ts`, `apps/client/src/cup/arena.ts`
- **Verification:** `bun test --timeout 120000 packages/sim/src && bun run verify`
- **Status:** verified

**Decision (2026-10-20):** The first probe showed the ±1/±2 ATK/**SPD** lever breaks the FR12 band because SPD flips turn order on the boundary (sluggish 0.0% / sharp 91.7% vs Koda), while steady reproduces every recorded tally. Product call: **form is ATK-only** — sharp +1 ATK, flat -1, sluggish -2, SPD never moves. Spec FR-9 and AC-2/AC-9 were amended; P3.T4 re-probes under the narrowed lever.

**Decision (2026-10-20):** AC-9's per-tier guardrail is a **15% floor**. The ATK-only lever leaves four soft cells at flat/sluggish (worst Delmar x fire_drake 16.7%, 6 of 36); a weaker sluggish delta was measured and rejected because it leaves Delmar unchanged and makes sluggish identical to flat.

- [x] **P3.T1: Wire the owned side** — covers: FR-9
  - [x] **P3.T1.1:** Use `battleStats(owned)` in `makeExhibition`'s owned side and
    in the cup player-slot snapshot, leaving rival sides on their rolled stats.
  - [x] **P3.T1.2:** Switch `apps/client/src/cup/arena.ts` `maxHp` to the same
    helper so the played fight and the displayed bar cannot disagree.
  - [x] **P3.T1.3:** Add a seam test: a neglected imminent cup entry fights with
    the sluggish delta, a fresh one is byte-identical to the pre-change snapshot.
- [x] **P3.T2: Prove the invariants** — covers: FR-10, NFR-2
  - [x] **P3.T2.1:** Test that changing mood/bond alone never changes the drawn
    bracket seed or any rival slot.
  - [x] **P3.T2.2:** Confirm the existing cup-contract goldens and spar goldens
    pass unchanged; re-baseline only with a written justification in evidence.
- [x] **P3.T3: Probe the balance** — covers: FR-16, AC-9
  - [x] **P3.T3.1:** Extend the balance probe to build each playable species at
    `TRAINING_CAP` under each program mix (and with sluggish/sharp form) and
    report win rates through `resolveBattle`.
  - [x] **P3.T3.2:** Record the results against the FR12 bands and the six boss
    gates in the phase evidence; adjust form or trickle numbers only if a band
    fails, and record the change.
- [x] **P3.T4: Narrow the lever to ATK** — covers: FR-9, AC-2, AC-9
  - [x] **P3.T4.1:** Drop the SPD term from `FORM_DELTAS`/`FORM_COPY` and from
    `battleStats`'s delta table, keeping HP at 0; update `form.test.ts` so the
    SPD-never-moves assertion is explicit (AC-2) and steady still equals
    `effectiveStats` (AC-1).
  - [x] **P3.T4.2:** Re-run the probe on the ATK-only lever and assert: steady in
    band for every boss, no cell below the 15% floor for any tier, and monotonic
    sharp >= steady >= flat >= sluggish per boss.
  - [x] **P3.T4.3:** If any cell still breached the floor at `sluggish`, reduce
    sluggish to -1 ATK, re-probe, and record which magnitude shipped and why.
    Measured and rejected: -1 ATK leaves Delmar at 22.2% and makes sluggish
    battle-identical to flat, so -2 ATK shipped. No boss stats were touched.

**Result:** verified
**Checkpoint:** 47e7cb6
**Evidence:** conductor/tracks/20261020-training-programs-form/verification/phase-3.md


## Phase 4: Dock Picker and Training Tab

- **Goal:** The ranch surfaces programs and form legibly, with keyboard-only
  operation and no module over the size cap.
- **Depends on:** Phase 3
- **Covers:** FR-12, FR-13, NFR-4, NFR-5, AC-10
- **Touches:** `apps/client/src/hud/dock.ts`, `apps/client/src/hud/dock.test.ts`,
  `apps/client/src/hud/update.ts`, `apps/client/src/hud/copy-care.ts`,
  `apps/client/src/hud/copy.test.ts`, `apps/client/src/app/hud-screen.ts`,
  `apps/client/src/creature-detail.ts`, `apps/client/src/creature-detail.test.ts`,
  `apps/client/src/hud/programs.ts`, `apps/client/src/hud/programs.test.ts`,
  `apps/client/src/detail/training-tab.ts`,
  `apps/client/src/detail/training-tab.test.ts`, `apps/client/src/ranch.css`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P4.T1: Program picker** — covers: FR-12, AC-10
  - [x] **P4.T1.1:** Replace the four-stat picker with four program rows showing
    label, blurb, tonight's gain line (or the tired/capped note) and the
    assigned check; keep the button label in sync.
  - [x] **P4.T1.2:** Update `trainButtonState`/`pickerEntry` tests for the
    program model, including all-primaries-capped disabled state and the
    free re-point path.
  - [x] **P4.T1.3:** Verify keyboard focus order and that the collapsed dock head
    still announces the current program.
- [x] **P4.T2: Training tab** — covers: FR-13
  - [x] **P4.T2.1:** Add a Training tab to the detail modal: assigned program,
    trained nights, next breakthrough, form tier with deltas, program table.
  - [x] **P4.T2.2:** Extend the tab tests (tablist contract, panel content) and
    split the detail module if it crosses 12,288 B.
- [x] **P4.T3: Copy** — covers: FR-12, NFR-5, AC-10
  - [x] **P4.T3.1:** Add coach-voice program blurbs, tired/capped notes and form
    lines to `copy-care.ts`; test that no string exceeds two sentences and that
    stat names stay visible.

**Result:** verified
**Checkpoint:** c69f9cf
**Evidence:** conductor/tracks/20261020-training-programs-form/verification/phase-4.md

## Phase 5: Form in the Fight Surfaces, Handbook and Docs Sync

- **Goal:** Form is visible everywhere a fight is decided or previewed, the
  handbook teaches programs and form, and project docs describe the shipped
  system.
- **Depends on:** Phase 4
- **Covers:** FR-14, FR-15, AC-10
- **Touches:** `apps/client/src/cup/coach-room.ts`,
  `apps/client/src/spar/setup.ts`, `apps/client/src/hud/plates-creature.ts`,
  `apps/client/src/handbook.ts`, `apps/client/src/handbook.test.ts`,
  `apps/client/src/cup.css`, `apps/client/src/spar.css`, `README.md`,
  `conductor/product.md`, `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P5.T1: Coach room and spar** — covers: FR-14, AC-10
  - [ ] **P5.T1.1:** Show the form tier and consequence line beside the owned
    stat readout in the coach room and the spar prep card, using the shared
    `FORM_COPY` so wording cannot drift.
  - [ ] **P5.T1.2:** Add the form chip to the creature plate and check it at
    393×659 with the existing narrow-layout test.
- [ ] **P5.T2: Handbook** — covers: FR-15
  - [ ] **P5.T2.1:** Extend the Raising section with programs, the energy gate,
    breakthrough nights and form; split section builders into `handbook/`
    modules if the file crosses 12,288 B.
  - [ ] **P5.T2.2:** Extend handbook tests for the new copy and tab order.
- [ ] **P5.T3: Docs sync and visual evidence** — covers: FR-15, AC-10
  - [ ] **P5.T3.1:** Update the README core-loop line, the product roadmap status,
    and add a dated tech-stack note for the form seam and save v18.
  - [ ] **P5.T3.2:** Capture desktop and iPhone 15 screenshots of the dock
    picker, training tab, coach room and handbook with a clean console, and
    write `verification/phase-5.md`.

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 5
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
