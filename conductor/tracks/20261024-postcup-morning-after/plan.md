# Post-Cup Morning-After Ritual — Implementation Plan

> **Branch:** `feat/20261024-postcup-morning-after`
> **Base:** `main` @ `2dcebc7f855d37ec50d77132287041943217a4bb`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and
> the primary records them.

Acceptance for **every** phase additionally runs the configured
`verify_phase` command (`bun run verify && bun run build`); view-model and
machine logic is unit-tested (TDD), while pure rendering, scene dressing, and
DOM layout are verified through the visual layer. The visual layer follows the
`playwright-cli` procedure at 1440×900 and iPhone 15 (393 px) widths with a
clean console.

## Phase 1: Derivation & Copy (pure logic, TDD)

- **Goal:** a tested pure `apps/client/src/morning-after/` module derives the
  outcome class, persisted-first amplifiers, and single-sourced copy from a
  finalized session + before/after state.
- **Depends on:** none
- **Covers:** FR-1, FR-4, FR-10, NFR-5, AC-1, AC-3
- **Touches:** `apps/client/src/morning-after/**` (new module tree + co-located tests)
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P1.T1: Classifier `deriveMorningAfter`** - covers: FR-1
  - [ ] **P1.T1.1: Failing tests first — all four classes, forfeit precedence, drawn-final crowns, non-cup day → null**
  - [ ] **P1.T1.2: Implementation over the finalized session + pre/post state, seeded inputs only**
- [ ] **P1.T2: Persistence-first milestone detector** - covers: FR-4
  - [ ] **P1.T2.1: Failing tests — first title (cupsWon 0→1), first Legend title, first boss scalp, new claimedTiers tier; non-firsts stay silent**
  - [ ] **P1.T2.2: Implementation keyed only to persisted v25 signals**
- [ ] **P1.T3: Copy table `copy.ts`** - covers: FR-10
  - [ ] **P1.T3.1: Golden test of the full table (classes × amplifiers, {name}/{boss} interpolation)**
  - [ ] **P1.T3.2: Draft copy transplanted from the approved spec**

## Phase 2: Ceremony Machine & Poses

- **Goal:** the ritual machine plays the one-shot, dismissible, class-adaptive
  arrival ceremony with per-archetype poses and the day-long idle tint, with a
  reduced-motion jump-cut variant.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-7, AC-2
- **Touches:** `apps/client/src/scene-logic/**`, `apps/client/src/ranch/**`, `apps/client/src/store.ts` (arrival glue), module-size guard inclusion
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P2.T1: Ritual machine (`morning-after` machine in scene-logic)** - covers: FR-2
  - [ ] **P2.T1.1: Failing tests — one-shot trigger on first ranch arrival after finalize, dismiss-on-intent, no same-day replay, class caps enforced by the schedule**
  - [ ] **P2.T1.2: Schedule builder with class-adaptive beats and deterministic (seeded) timing**
- [ ] **P2.T2: Per-archetype poses + idle tint** - covers: FR-3
  - [ ] **P2.T2.1: Class pose choreography over the existing pose vocabulary for all six archetypes**
  - [ ] **P2.T2.2: Day-long idle weight tint set on arrival, cleared at night settle**
- [ ] **P2.T3: Reduced-motion jump-cut** - covers: FR-7
  - [ ] **P2.T3.1: Machine emits jump-cut schedule (≤ 2 s, no travel/leap/spin) under the motion preference**

## Phase 3: Pet Variant, Debrief & Audio

- **Goal:** the subtle petting variant, the exactly-one coach debrief line in
  the existing ticker, and the per-class cue remap are live and tested.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, FR-8, NFR-6, AC-4
- **Touches:** `apps/client/src/hud/**` (ticker channel), `apps/client/src/audio/**` (careCues table), `apps/client/src/ranch/**` (pet handler), `apps/client/src/morning-after/**` (copy refs)
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P3.T1: First-pet class variant** - covers: FR-5
  - [ ] **P3.T1.1: Failing tests — class-conditioned line on the ritual day's first pet only; cooldowns/conditions untouched**
  - [ ] **P3.T1.2: Pet handler variant wiring**
- [ ] **P3.T2: Coach debrief ticker** - covers: FR-6
  - [ ] **P3.T2.1: Failing tests — exactly one line shown that day in the existing ticker channel; amplifier copy overrides class copy**
  - [ ] **P3.T2.2: View-model + render glue**
- [ ] **P3.T3: careCues per-class remap** - covers: FR-8
  - [ ] **P3.T3.1: Failing tests — cue table maps per-class intensity variants; no new asset files**
  - [ ] **P3.T3.2: Table entries + player passthrough**

## Phase 4: Edge Hardening, Visual Pass & Docs

- **Goal:** the FR-9 edge rules proven in tests, the visual checklist recorded
  at both widths, and the tech-stack note written.
- **Depends on:** Phase 3
- **Covers:** FR-9, AC-5, AC-6, NFR-1, NFR-2, NFR-3, NFR-4, NFR-7
- **Touches:** `apps/client/src/scene-logic/**`, `apps/client/src/ranch/**` (edge glue), `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build` + visual-layer procedure (playwright-cli, desktop + iPhone 15, clean console)
- **Status:** pending

- [ ] **P4.T1: Edge rules** - covers: FR-9, AC-6
  - [ ] **P4.T1.1: Failing tests — evolution-reveal collision yields (debrief may still show), first-ever forfeited cup → withdrawn with zero amplifiers, reload skips gracefully, night settle clears state**
- [ ] **P4.T2: Visual checklist** - covers: AC-5
  - [ ] **P4.T2.1: Champion + subdued mornings screenshot at 1440×900 and 393 px, console clean, evidence in `verification/phase-4.md`**
- [ ] **P4.T3: Docs sync** - covers: NFR-1, NFR-2
  - [ ] **P4.T3.1: `conductor/tech-stack.md` dated note (new module boundary; save stays v25)**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 4
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending
-->
