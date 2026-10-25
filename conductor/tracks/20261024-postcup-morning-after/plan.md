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
- **Status:** verified

- [x] **P1.T1: Classifier `deriveMorningAfter`** - covers: FR-1
  - [x] **P1.T1.1: Failing tests first — all four classes, forfeit precedence, drawn-final crowns, non-cup day → null**
  - [x] **P1.T1.2: Implementation over the finalized session + pre/post state, seeded inputs only**
- [x] **P1.T2: Persistence-first milestone detector** - covers: FR-4
  - [x] **P1.T2.1: Failing tests — first title (cupsWon 0→1), first Legend title, first boss scalp, new claimedTiers tier; non-firsts stay silent**
  - [x] **P1.T2.2: Implementation keyed only to persisted v25 signals**
- [x] **P1.T3: Copy table `copy.ts`** - covers: FR-10
  - [x] **P1.T3.1: Golden test of the full table (classes × amplifiers, {name}/{boss} interpolation)**
  - [x] **P1.T3.2: Draft copy transplanted from the approved spec**

**Result:** verified
**Checkpoint:** 98a52a7
**Evidence:** conductor/tracks/20261024-postcup-morning-after/verification/phase-1.md

## Phase 2: Ceremony Machine & Poses

- **Goal:** the ritual machine plays the one-shot, dismissible, class-adaptive
  arrival ceremony with per-archetype poses and the day-long idle tint, with a
  reduced-motion jump-cut variant.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-7, AC-2
- **Touches:** `apps/client/src/scene-logic/**`, `apps/client/src/ranch/**`, `apps/client/src/store.ts` (arrival glue), module-size guard inclusion
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P2.T1: Ritual machine (`morning-after` machine in scene-logic)** - covers: FR-2
  - [x] **P2.T1.1: Failing tests — one-shot trigger on first ranch arrival after finalize, dismiss-on-intent, no same-day replay, class caps enforced by the schedule**
  - [x] **P2.T1.2: Schedule builder with class-adaptive beats and deterministic (seeded) timing**
- [x] **P2.T2: Per-archetype poses + idle tint** - covers: FR-3
  - [x] **P2.T2.1: Class pose choreography over the existing pose vocabulary for all six archetypes**
  - [x] **P2.T2.2: Day-long idle weight tint set on arrival, cleared at night settle**
- [x] **P2.T3: Reduced-motion jump-cut** - covers: FR-7
  - [x] **P2.T3.1: Machine emits jump-cut schedule (≤ 2 s, no travel/leap/spin) under the motion preference**

**Result:** verified
**Checkpoint:** de54a3d
**Evidence:** conductor/tracks/20261024-postcup-morning-after/verification/phase-2.md

## Phase 3: Pet Variant, Debrief & Audio

- **Goal:** the subtle petting variant, the exactly-one coach debrief line in
  the existing ticker, and the per-class cue remap are live and tested.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, FR-8, NFR-6, AC-4
- **Touches:** `apps/client/src/hud/**` (ticker channel), `apps/client/src/audio/**` (careCues table), `apps/client/src/ranch/**` (pet handler), `apps/client/src/morning-after/**` (copy refs), `apps/client/src/scene-logic/**` (pet-machine class input), `apps/client/src/app/**` (P2 carry-over: arrival call-site + day-push glue), `apps/client/src/store.ts` (tiny wiring deltas)
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P3.T1: First-pet class variant** - covers: FR-5
  - [x] **P3.T1.1: Failing tests — class-conditioned line on the ritual day's first pet only; cooldowns/conditions untouched**
  - [x] **P3.T1.2: Pet handler variant wiring**
- [x] **P3.T2: Coach debrief ticker** - covers: FR-6
  - [x] **P3.T2.1: Failing tests — exactly one line shown that day in the existing ticker channel; amplifier copy overrides class copy**
  - [x] **P3.T2.2: View-model + render glue**
  - [x] **P3.T2.3: P2 carry-over wiring — `takeMorningAfterArrival()` call site (first-arrival detection) + adapter day-push / night-settle path**
- [x] **P3.T3: careCues per-class remap** - covers: FR-8
  - [x] **P3.T3.1: Failing tests — cue table maps per-class intensity variants; no new asset files**
  - [x] **P3.T3.2: Table entries + player passthrough**

**Result:** verified
**Checkpoint:** 15e426bb
**Evidence:** conductor/tracks/20261024-postcup-morning-after/verification/phase-3.md

## Phase 4: Edge Hardening, Visual Pass & Docs

- **Goal:** the FR-9 edge rules proven in tests, the visual checklist recorded
  at both widths, and the tech-stack note written.
- **Depends on:** Phase 3
- **Covers:** FR-9, AC-5, AC-6, NFR-1, NFR-2, NFR-3, NFR-4, NFR-7
- **Touches:** `apps/client/src/scene-logic/**`, `apps/client/src/ranch/**` (edge glue), `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build` + visual-layer procedure (playwright-cli, desktop + iPhone 15, clean console)
- **Status:** verified

- [x] **P4.T1: Edge rules** - covers: FR-9, AC-6
  - [x] **P4.T1.1: Failing tests — evolution-reveal collision yields (debrief may still show), first-ever forfeited cup → withdrawn with zero amplifiers, reload skips gracefully, night settle clears state**
- [x] **P4.T2: Visual checklist** - covers: AC-5
  - [x] **P4.T2.1: Champion + subdued mornings screenshot at 1440×900 and 393 px, console clean, evidence in `verification/phase-4.md`**
- [x] **P4.T3: Docs sync** - covers: NFR-1, NFR-2
  - [x] **P4.T3.1: `conductor/tech-stack.md` dated note (new module boundary; save stays v25)**

**Result:** verified
**Checkpoint:** 698c8b03
**Evidence:** conductor/tracks/20261024-postcup-morning-after/verification/phase-4.md

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1–F5.
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3, F4, F5
- **Touches:** `apps/client/src/ranch/api.ts`, `apps/client/src/ranch/frame.ts`, `apps/client/src/ranch/state.ts`, `apps/client/src/ranch/morning-after.test.ts`, `apps/client/src/scene-logic/morning-after-ledger.ts`, `apps/client/src/scene-logic.test.ts`, `apps/client/src/app/hud-screen.ts` (+ test), and their co-located tests
- **Verification:** `bun test --check --parallel=4 --timeout 120000` then `bun run verify && bun run build`
- **Status:** verified

- [x] **R1.T1: Resolve F1** - covers: F1
  - [x] **R1.T1.1: Failing test — sick creature's ritual-day first pet returns `stir` and closes the window**
  - [x] **R1.T1.2: Gate the variant table behind the sick check in `startPet`**
- [x] **R1.T2: Resolve F2** — covers: F2
  - [x] **R1.T2.1: Failing test — day advance mid-ceremony → tint inactive and petPending false after settle**
  - [x] **R1.T2.2: Frame tracks last-seen day; day change settles machine, suppresses stale tint latch, clears petPending**
- [x] **R1.T3: Resolve F3** — covers: F3
  - [x] **R1.T3.1: Unexport `morningAfterDue` from the scene-logic barrel; keep predicate internal to the ledger/take path**
- [x] **R1.T4: Resolve F4** — covers: F4
  - [x] **R1.T4.1: Hud-screen test — fake Hud double asserts exactly one `announceMorningAfter` on the ritual day, none after settle**
- [x] **R1.T5: Resolve F5** — covers: F5
  - [x] **R1.T5.1: Guard the begin wrapper on machine-idle + state-level test that a second begin leaves class/petPending unchanged**

**Result:** verified
**Checkpoint:** 4656bc7a
**Evidence:** conductor/tracks/20261024-postcup-morning-after/verification/phase-R1.md
