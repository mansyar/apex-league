# Phase 2 Verification — Ranch ceremony profile and tempo adoption

- **Track:** `20261126-stage-scaled-animation-ranch-profiles`
- **Phase:** 2 — Ranch ceremony profile and tempo adoption
- **Date:** 2026-11-26
- **Branch:** `feat/20261126-stage-scaled-animation-ranch-profiles`
- **Base commit:** `4b99ebf13e7b468d6b8ac9b2f5a6c7ed34cf7f75`
- **Head commit:** `9eb5c76adeabb380b303056a66fae1592d88ecca`
- **Result:** **verified** (exact phase command green: 56 pass / 0 fail)

## Scope

All seven ranch ceremonies (feed, rest, treat, play, pet, evolution,
morning-after) now multiply the shared `choreo.ts` `BodyProfile` composed
with the life-stage factor, via one stateless adapter in
`apps/client/src/ranch/profile.ts`. The Phase 1 composer
`composeStageProfile` is reused verbatim — no profile values or stage
ladder were duplicated under `ranch/`.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red (P2.T1.1) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts` | 1 | `Found 25 errors in 4 files`: `TS2307 Cannot find module './profile'` (all four suites) plus expected arity errors on the six pose writers before the optional factors parameter existed. Captured before any implementation — the red that drove P2.T1. |
| Phase gate (P2.T2) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts` | 0 | `bun test v1.4.4 (38afee6c8) 4x PARALLEL`, `56 pass`, `0 fail`, `1984 expect() calls`, `Ran 56 tests across 4 files` — type check (`--check`) included. |
| Module cap (NFR-4) | `bun test apps/client/src/module-size.test.ts` | 0 | `5 pass`, `0 fail` — every client module still ≤ 12 KB after the new adapter and writer parameters. |

The full integrated gate (`bun run verify && bun run build`) is owned by the
primary agent and was not run here.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | Ranch reads the shared table; unknown → `DEFAULT_PROFILE`; no duplicate profile in `ranch/` | `profile.test.ts` table-tests every registered archetype × all stages against an oracle built from `profileFor` + `composeStageProfile` + `stageScale`; asserts `profileFor("mystery_beast") === DEFAULT_PROFILE`. `profile.ts` imports `profileFor`, `composeStageProfile` and `stageScale`; it restates no authored value. | pass |
| AC-3 | All seven ceremonies scale amplitude/tempo; triggers, order, callbacks and authored curves intact | `motion.test.ts` covers feed (walk gait + nibble dip), rest (curl/stretch), treat (slump), play (celebrate hop), pet (wiggle clock + hop), evolution (scale journey, x path and callback byte-for-byte across archetypes); `morning-after.test.ts` covers the seventh ceremony's pose deltas/glow plus the unchanged day-tint law; `frame.test.ts` covers the frame-level derivation. `api.ts` starters and machine dt/order/outcomes untouched. | pass |
| AC-4 | Reduced motion damps toward neutral, no new cue or state, full baseline preserved | `profile.test.ts` asserts `calm = 1 + (full - 1) * 0.4` for both factors across every archetype/stage, always finite and positive; `frame.test.ts` confirms a calm frame is closer to neutral than a full-motion one. No cue id, latch or persisted field was added. | pass |
| AC-5 | Unknown archetype, missing stage, mid-ceremony swap, pause/hidden tab, dense field — no NaN/leak/overshoot/cross-creature drift | `profile.test.ts` covers unknown ids (`__proto__` non-finite guard → neutral), missing stage ≡ juvenile, bounded `[0.2, 2]` factors, and fresh objects per call; `frame.test.ts` covers two interleaved creatures, unknown id, mid-evolution swap retarget, and 200 frames of `dt=0`/`dt=4` with finite poses and a clean ceremony exit. | pass |
| NFR-1 / NFR-5 | No sim/state/save/voxel/hash/audio-cue or gameplay timing change; presentation only | Changes are confined to `ranch/` pose writers, the frame composition root, one rig-identity latch in `mount.ts`, and tests. Machine `advance(dt)` calls, starter order, callbacks, scale journeys, positions and yaw are unchanged. | pass |
| NFR-4 | Module cap green | `bun test apps/client/src/module-size.test.ts` — 5 pass. | pass |

## Adapter contract

```
RanchMotionFactors = { amplitude, tempo }   // finite, positive, frozen
ranchMotionFactors(archetypeId, stage?, reducedMotion = false)
```

- `base = profileFor(id)`; `composed = composeStageProfile(id, stage)`;
  `stageFactor = stage === undefined ? 1 : stageScale(stage)`.
- `rawAmplitude` = mean of the eight relative weights (`gaitAmp`,
  `breathAmp`, `hurtMult`, `staggerMult`, `windupMult`, `recoilMult`,
  `strikeMult`, `leanPitch`); `swayAmp` excluded because it is an absolute
  world-unit offset, not a multiplier.
- `rawTempo = stageFactor * cbrt(base.gaitFreq * base.breathFreq *
  base.swayFreq)`; authored frequencies are never stage-scaled.
- Calm damping `1 + (raw - 1) * 0.4`, then clamp to `[0.2, 2]`; any
  non-finite composition falls back to `1`.
- Derived on every frame from `s.archetypeId`, `s.currentStage`,
  `s.reducedMotion`, and re-derived immediately after a mid-ceremony rig
  swap — no module or state latch.

Tempo reaches only pose clocks: breath phase, gait phase, tail sway, pet
wiggle and the ambient bounce. The morning-after's prance is authored as a
drive-shaped stance (`morningAfterPoseOf`) with no independent time clock;
its tempo therefore rides the always-on breath/tail clocks while the
ceremony machine's `dt`, phase order and day latch remain untouched.

## Evidence paths

- `apps/client/src/ranch/profile.ts` — stateless adapter, the sole bridge.
- `apps/client/src/ranch/profile.test.ts` — table / fallback / calm / guards.
- `apps/client/src/ranch/poses.ts` — optional trailing factors on the six
  writers; authored constants and curve shapes preserved.
- `apps/client/src/ranch/idle.ts` — feed gait, nibble, play hop, bounce.
- `apps/client/src/ranch/frame.ts` — per-frame derivation and dispatch;
  scale journeys, position/yaw and glow law untouched.
- `apps/client/src/ranch/motion.test.ts`, `frame.test.ts`,
  `morning-after.test.ts` — ceremony, derivation and edge pins.
- No screenshot artifacts: Phase 2 is logic-only; visual capture is Phase 3.

## Deviations

| File | Reason |
| --- | --- |
| `apps/client/src/ranch/mount.ts` | Outside the stated `Touches`, but `rebuild()` is the single path used by both initial set-creature and the evolution swap, and it never assigned `s.archetypeId`. Without a one-line `s.archetypeId = archetypeId` beside `s.currentStage = stage`, per-frame factors and the morning-after temper would read the previous rig's identity (an AC-5 stale-profile violation). Smallest necessary change. |
| `apps/client/src/ranch/api.ts` | Listed in `Touches` but intentionally unchanged: all starters already preserve author order, travel positions, callbacks and machine dt; injecting factors there would violate the "multiply the authored curves, never replace the triggers" rule. No change required. |
| `apps/client/src/ranch/mood.ts` | Listed in `Touches` but intentionally unchanged: condition-driven mood profiles are not authored stage curves; the adapter composes on top of them. No change required. |
| `apps/client/src/stage-motion.ts` | Not modified: Phase 1's `composeStageProfile` is reused by import, as required. |

## Notes

- TDD order was preserved: the 25-error red run was captured before
  `profile.ts` or any writer signature existed; the only interim test-side
  fixes were missing imports and a TS indexed-access issue, not weakened
  assertions.
- Two initial green-run failures were corrected in the tests, not the
  implementation: the breath readout was sampled away from its tempo-shifted
  peak (now sampled at each factor's own peak), and the feed-gait bob readout
  was unstable because the idle leg parks ground height after the gait
  writer (leg swing and roll remain the pinned deltas).
- All commits are task-level conventional commits; no amend was used. The
  primary agent should run the full `bun run verify && bun run build` gate.

## Rework 1

- **Trigger:** Primary's full `bun run verify && bun run build` exited 1
  solely on `biome check` — 10 errors and 1 warning across the nine ranch
  files touched in Phase 2. Behavior was already correct (primary re-ran
  the exact phase command: 56 pass / 0 fail).
- **Denied command (recorded blocker):**
  `bunx biome check --write apps/client/src/ranch/profile.ts apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/frame.ts apps/client/src/ranch/idle.ts apps/client/src/ranch/mount.ts apps/client/src/ranch/poses.ts apps/client/src/ranch/morning-after.test.ts`
  → `Permission denied: shell`. Per instruction, no retry or workaround;
  the exact reported edits were applied by hand instead.
- **Applied (formatter/import order only, no behavior change):**
  - `motion.test.ts`: dropped unused `type RanchState`, moved `./poses`
    before `./profile`, wrapped the `motionRig()` return object, collapsed
    the neutral tail assertion, wrapped both `updateIdle` calls.
  - `frame.test.ts`: moved the documented `./poses` import before
    `./profile`, wrapped `peakT` / `factorBoot` signatures, collapsed the
    calm expectation, wrapped the finite-creature assertion.
  - `frame.ts`: moved the multi-line `./poses` import before `./profile`.
  - `idle.ts`: moved `./poses` before `./profile`.
  - `morning-after.test.ts`: moved `./poses` before `./profile`, wrapped
    both `applyMorningAfterPose` calls, the glow assignment and the
    `morningAfter.begin(...)` call.
  - `poses.ts`: wrapped the `bRate` / `bAmp` declarations and expanded the
    guarded tail sway write into a block.
  - `profile.test.ts`: wrapped the `rawFactors` signature and the missing-
    stage amplitude assertion.
- **Verification after rework (exact phase command):**
  `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts`
  → exit 0, `56 pass`, `0 fail`, `1984 expect() calls`, `Ran 56 tests across 4 files`.
- **Commit:** `e7ea4d0a` — `style(client): format ranch profile adoption`.
  Code head after rework: `e7ea4d0a` (code commit `9eb5c76a`, evidence
  commit `c8c5b448` precede it). The primary should re-run the full gate.

## Rework 2

- **Trigger:** Primary's `bunx biome check` on the nine ranch files reported
  exactly two remaining errors: one formatting shape in `frame.test.ts` and
  one import-name order in `motion.test.ts`.
- **Denied command (recorded blocker):**
  `bunx biome check --write apps/client/src/ranch/frame.test.ts apps/client/src/ranch/motion.test.ts`
  → `Permission denied: shell`. No retry or workaround; both exact edits were
  applied by hand.
- **Applied (no behavior change):**
  - `frame.test.ts`: rewrote the finite-creature assertion as
    `expect(Number.isFinite(...)).toBe(\n  true,\n)`.
  - `motion.test.ts`: moved `type TreatDrive` to the end of the
    `../scene-logic` import block.
- **Verification after rework (exact phase command):**
  `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts`
  → exit 0, `56 pass`, `0 fail`, `1984 expect() calls`, `Ran 56 tests across 4 files`.
- **Code commit:** `0d5cc704de62c1aee7ed6234185b53481a2039e3e3` —
  `style(client): fix remaining ranch import and formatting order`.
  Preceded by `e7ea4d0a`, `9eb5c76a`, `c8c5b448`.

## Primary verification

- **Date:** 2026-11-26
- **Scope check:** clean tree before re-verification.
  `git diff --name-only 4b99ebf13e7b468d6b8ac9b2f5a6c7ed34cf7f75..HEAD`
  contains exactly the nine ranch code/test files plus this evidence file.
  The accepted deviations are recorded above: one necessary one-line
  `mount.ts` identity fix, and intentionally unchanged `api.ts`/`mood.ts`.
  No other Conductor state was edited by the subagent.
- **Biome isolation:** `bunx biome check` on the nine files → exit 0,
  `Checked 9 files in 44ms. No fixes applied.` This confirms both reworks
  fully resolved the formatter and import-order failures.
- **Exact phase command (re-run by primary):**
  `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts`
  → exit 0, `56 pass / 0 fail`, `1984 expect() calls` across 4 files [1.05s].
- **Full configured suite (re-run by primary):**
  `bun test --check --parallel --timeout 120000` → `4531 pass / 1 skip /
  0 fail`, `675694 expect() calls`, `Ran 4532 tests across 443 files
  [92.65s]`, exit 0.
- **Full gate (required by workflow, re-run by primary):**
  `(bun run verify && bun run build)` → exit 0. Typecheck and biome check
  clean, determinism gate OK for every archetype baby/juvenile/champion
  regeneration and all 5 props seed 42 digests, client Vite build succeeded
  (`dist/assets/index-DADRLmAJ.js 1,108.81 kB`, `index-D45x_3yC.css`,
  `lab-CKonYV42.js`, `lab-B2IkTbut.css`) with only the pre-existing
  chunk-size warning.
- **Freeze confirmation:** the diff contains no change to sim/state/save,
  voxel files or digests, ceremony machine `dt`/durations/callbacks/outcomes,
  audio cue ids, the evolution `fromScale`/`toScale` journey, or
  `stageScale(s.currentStage)`'s physical holder scale. Factors are derived
  statelessly each frame, including immediately after a rig swap.
- **Conclusion:** Phase 2 is verified and ready for acceptance and squash.
