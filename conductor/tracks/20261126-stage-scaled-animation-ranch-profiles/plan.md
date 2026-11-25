# Adopt stage-scaled animation and ranch body profiles — Implementation Plan

> **Branch:** `feat/20261126-stage-scaled-animation-ranch-profiles`
> **Base:** `main` @ `d8ad0c912b125cdc87f5cfac7806d22f7eebeebb`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Arena stage motion profile

- **Goal:** Arena combatants use `profileFor(archetype) × stageScale(stage)` for
  motion amplitudes; missing stage resolves to neutral `1`; physical scale and
  sim coordinates are unchanged.
- **Depends on:** none
- **Covers:** FR-1, AC-1, NFR-1, NFR-5
- **Touches:** `apps/client/src/stage-motion.ts`,
  `apps/client/src/stage-motion.test.ts`, `apps/client/src/roster.ts`,
  `apps/client/src/roster.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts`
- **Status:** verified

- [x] **P1.T1: Pin the arena stage-profile contract** — covers: FR-1, AC-1
  - [x] **P1.T1.1:** Table-test every archetype × baby/juvenile/champion;
    assert profile fields scale by `stageScale(stage)` and missing stage
    yields the neutral profile.
  - [x] **P1.T1.2:** Pin `bodyScaleFor` values and sim-coordinate inputs as
    unchanged; observe the expected red before authoring the composer.
- [x] **P1.T2: Author and wire the shared stage composer** — covers: FR-1, AC-1
  - [x] **P1.T2.1:** Add a pure composer that combines `profileFor(archetype)`
    with the existing `stageScale` ladder and returns a `BodyProfile`.
  - [x] **P1.T2.2:** Use it in `buildSpot` so downstream gait/lean/hurt/recoil/
    strike consumers read the composed profile; update pins to green.

**Result:** verified
**Checkpoint:** c652a56c
**Evidence:** conductor/tracks/20261126-stage-scaled-animation-ranch-profiles/verification/phase-1.md

## Phase 2: Ranch ceremony profile and tempo adoption

- **Goal:** All seven ranch ceremonies compose the shared profile and stage
  factor into amplitude and tempo, multiplying authored curves without replacing
  triggers, order, callbacks or set-piece laws; calm damps toward neutral.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, AC-2, AC-3, AC-4, AC-5, NFR-1, NFR-5
- **Touches:** `apps/client/src/ranch/profile.ts`,
  `apps/client/src/ranch/profile.test.ts`, `apps/client/src/ranch/api.ts`,
  `apps/client/src/ranch/idle.ts`, `apps/client/src/ranch/mood.ts`,
  `apps/client/src/ranch/poses.ts`, `apps/client/src/ranch/motion.test.ts`,
  `apps/client/src/ranch/frame.test.ts`,
  `apps/client/src/ranch/morning-after.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts`
- **Status:** in_progress

- [ ] **P2.T1: Pin ranch profile, tempo, calm and edge boundaries** — covers:
  FR-2, FR-3, FR-4, FR-5, AC-2, AC-3, AC-4, AC-5
  - [ ] **P2.T1.1:** Pin all seven ceremonies' amplitude/tempo multipliers,
    shared-table fallback for unknown archetypes, and neutral stage handling;
    observe the expected red.
  - [ ] **P2.T1.2:** Pin calm damping with no new cue/state, unchanged ceremony
    triggers/order/callbacks and authored set-piece curves, plus unknown
    archetype, mid-ceremony swap/evolution, pause/hidden tab and dense-field
    safety.
- [ ] **P2.T2: Author the ranch adapter and wire every ceremony** — covers:
  FR-2, FR-3, FR-4, FR-5, AC-2, AC-3, AC-4, AC-5
  - [ ] **P2.T2.1:** Add a ranch profile adapter that imports the shared
    composer, applies calm damping and exposes amplitude/tempo factors.
  - [ ] **P2.T2.2:** Compose the factors into feed, rest, treat, play, pet,
    evolution and morning-after without replacing authored curves or outcomes;
    update pins to green.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-stage-scaled-animation-ranch-profiles/verification/phase-2.md
-->

## Phase 3: Visual evidence and integrated gate

- **Goal:** Desktop and phone captures show baby-vs-champion ranch and
  stage-contrasted arena beats with clean console; the full configured stack is
  green.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-6, AC-6, AC-7, NFR-2, NFR-3, NFR-4
- **Touches:** `verification/phase-3.md`, `verification/integrated.md`,
  gitignored `.conductor/evidence/20261126-stage-scaled-animation-ranch-profiles/`
- **Verification:** `bun run verify && bun run build` plus `playwright-cli`
  desktop 1440×900 and iPhone 15 393×852 captures with clean console.
- **Status:** pending

- [ ] **P3.T1: Capture and inspect visual evidence** — covers: FR-6, AC-6
  - [ ] **P3.T1.1:** Drive real ranch baby/champion partners and a stage-
    contrasted arena spar; capture desktop and phone screenshots and run
    `playwright-cli console` for each session.
- [ ] **P3.T2: Record evidence and re-run the integrated gate** — covers:
  AC-7, NFR-2, NFR-3, NFR-4
  - [ ] **P3.T2.1:** Re-run `bun run verify && bun run build`, confirm module
    caps and the absence of dependency/save/voxel/audio diffs.
  - [ ] **P3.T2.2:** Write `verification/phase-3.md` and
    `verification/integrated.md` with commands, results, screenshots and AC
    mapping.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261126-stage-scaled-animation-ranch-profiles/verification/phase-3.md
-->
