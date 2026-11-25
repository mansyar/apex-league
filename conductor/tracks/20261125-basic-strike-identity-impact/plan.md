# Author Basic Strike identity and KO/down impact weighting — Implementation Plan

> **Branch:** `feat/20261125-basic-strike-identity-impact`
> **Base:** `main` @ `b6eb4cb1e29389f757098c305396dba253fbd5c1`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.
>
> Acceptance also requires `bun run verify && bun run build` at every phase
> acceptance, per `conductor/workflow.md` §Phase Completion. The one-line
> `workflow.md` §Release deploy correction is applied during doc-sync, outside
> phase contracts.

## Phase 1: Authored Strike identity

- **Goal:** `fxFor("basic", undefined)` returns an authored melee-jab `MoveFx`
  row distinct from `DEFAULT_FX`, with every other move id and fallback
  resolving identically to baseline.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2, NFR-1, NFR-2
- **Touches:** `apps/client/src/move-fx/moves/basic.ts`, `apps/client/src/move-fx/moves/basic.test.ts`, `apps/client/src/move-fx/moves.ts`, `apps/client/src/move-fx.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/move-fx/`
- **Status:** pending

- [ ] **P1.T1: Pin the authored identity and regression boundary in tests** — covers: FR-1, FR-2, AC-1, AC-2, NFR-1
  - [ ] **P1.T1.1: Write a failing test that `fxFor("basic", undefined)` is authored, distinct from `DEFAULT_FX`, and carries a melee posture.**
  - [ ] **P1.T1.2: Write a failing regression test that all 48 special ids and unknown ids with known/unknown elements resolve to their baseline row.**
- [ ] **P1.T2: Author and register the Strike row** — covers: FR-1, FR-2, NFR-2
  - [ ] **P1.T2.1: Create `move-fx/moves/basic.ts` with the authored melee-jab windup/recoil/contact/arrival grammar.**
  - [ ] **P1.T2.2: Spread `BASIC_FX` into `MOVE_FX` in `move-fx/moves.ts` without touching any element table.**
  - [ ] **P1.T2.3: Update `move-fx.test.ts` catalogue/identity pins so the authored `basic` row satisfies them.**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261125-basic-strike-identity-impact/verification/phase-1.md
-->

## Phase 2: Terminal-KO weighted impact

- **Goal:** a `down` step with `ko === true` resolves a heavier authored
  reaction than a non-terminal `down`; the non-terminal row is unchanged, calm
  mode stays dampened, and no state leaks across beats.
- **Depends on:** none
- **Covers:** FR-3, FR-4, AC-3, AC-4, AC-6, NFR-5
- **Touches:** `apps/client/src/choreo.ts`, `apps/client/src/choreo.test.ts`, `apps/client/src/steps/down.ts`, `apps/client/src/steps/down.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000 apps/client/src/choreo.test.ts apps/client/src/steps/down.test.ts`
- **Status:** pending

- [ ] **P2.T1: Pin terminal-KO weighting in tests** — covers: FR-3, AC-3, AC-6, NFR-5
  - [ ] **P2.T1.1: Add a failing `choreo.test.ts` case that the terminal reaction is heavier than `down` for every archetype while the ordinary row keeps its current values.**
  - [ ] **P2.T1.2: Add a failing `steps/down.test.ts` case covering the KO branch, double KO, and mid-beat pause/seek with no leaked reaction state.**
- [ ] **P2.T2: Author and wire the weighted KO reaction** — covers: FR-3, FR-4
  - [ ] **P2.T2.1: Add an authored terminal-KO reaction in `choreo.ts` keyed off the existing `ko` flag and `hurtMult` weighting.**
  - [ ] **P2.T2.2: Resolve the weighted spec only in the `ko === true` branch of `steps/down.ts`, leaving the soft-fall branch unchanged.**
  - [ ] **P2.T2.3: Confirm the calm/reduced-motion path stays dampened and introduces no new cue.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261125-basic-strike-identity-impact/verification/phase-2.md
-->

## Phase 3: Visual evidence and integrated gate

- **Goal:** desktop and phone captures show Strike distinct from the generic
  fallback and the terminal KO distinct from an ordinary down, and the full
  configured stack is green.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-5, AC-5, AC-7, NFR-3, NFR-4
- **Touches:** `conductor/tracks/20261125-basic-strike-identity-impact/verification/phase-3.md`, `conductor/tracks/20261125-basic-strike-identity-impact/verification/integrated.md`, screenshots under gitignored `.conductor/evidence/20261125-basic-strike-identity-impact/`
- **Verification:** `bun run verify && bun run build`, plus `playwright-cli` desktop and phone captures with a clean console
- **Status:** pending

- [ ] **P3.T1: Capture both beats in the browser** — covers: FR-5, AC-5
  - [ ] **P3.T1.1: Start `bun run dev`, open `playwright-cli`, and drive the Strike and terminal-KO flows with snapshot refs.**
  - [ ] **P3.T1.2: Capture desktop and iPhone 15 screenshots under `.conductor/evidence/20261125-basic-strike-identity-impact/`.**
  - [ ] **P3.T1.3: Run `playwright-cli console` and confirm no new errors.**
- [ ] **P3.T2: Run integrated verification and write evidence** — covers: AC-7, NFR-3, NFR-4
  - [ ] **P3.T2.1: Run `biome check`, `bun test --timeout 120000`, `bun run check`, `bun run verify`, and `bun run build`.**
  - [ ] **P3.T2.2: Write the evidence report with the commands table, AC mapping, screenshot paths, deviations, and notes.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261125-basic-strike-identity-impact/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
