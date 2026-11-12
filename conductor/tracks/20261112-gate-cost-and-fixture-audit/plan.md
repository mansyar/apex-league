# Gate Cost and Fixture Audit — Implementation Plan

> **Branch:** `chore/20261112-gate-cost-and-fixture-audit`
> **Base:** main @ 7467753d
>
> Phase states: `pending` | `in_progress` | `verified` | `failed` | `blocked`.
> Only the primary agent writes this file.

## Phase 1: The gate that always reports

- **Goal:** every PR targeting `main` creates the required check, and a conductor-only diff skips the heavy steps while the job still reports success.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, AC-1, AC-2, AC-3
- **Touches:** `.github/workflows/ci.yml`
- **Verification:** `bun run verify`
- **Status:** verified
- **Result:** verified — the workflow always triggers, the scope step gates every heavy step, and the decision logic is proven for five diff shapes; AC-4's live run is post-merge by construction
- **Checkpoint:** cb0a26f0
- **Evidence:** conductor/tracks/20261112-gate-cost-and-fixture-audit/verification/phase-1.md

- [x] **P1.T1: Trigger on every PR and drop the duplicate push run** — covers: FR-1, FR-5
  - [x] **P1.T1.1: Remove `paths-ignore` from `pull_request` and remove the `push` trigger, adding `workflow_dispatch`** — covers: FR-1, FR-5
  - [x] **P1.T1.2: Confirm no other workflow relied on the `push` run** — `deploy.yml` triggers independently on `push`; `nightly.yml` is a cron; nothing gates on `ci.yml`'s push job
- [x] **P1.T2: Skip the heavy steps for a conductor-only diff** — covers: FR-2, FR-3, FR-4
  - [x] **P1.T2.1: Add a scope step that diffs the branch against its base and writes `code=true|false`** — covers: FR-2
  - [x] **P1.T2.2: Gate setup-bun, the cache, install, `verify` and `telemetry` on that output, defaulting to "run" on any ambiguity** — covers: FR-3
  - [x] **P1.T2.3: Leave the job's display name untouched, character for character** — covers: FR-4
- [x] **P1.T3: Record the before/after of the workflow in the evidence** — covers: AC-1, AC-2, AC-3

> **Primary note:** the live proof (AC-4) needs `git push` and `gh`, which phase agents are forbidden — and it can only be run **after this track merges**. A `pull_request` workflow executes from the PR's merge commit, so a PR that changes `ci.yml` is a code PR by construction and exercises the full path only. The primary proves the decision logic locally while the track is open, then runs the throwaway conductor-only PR against the merged `main` and appends both to `verification/phase-1.md` and the archived evidence.

## Phase 2: Parameterise the harness without moving it

- **Goal:** the telemetry harness can be asked for the other three cells, while its default path reproduces today's readings exactly.
- **Depends on:** none (independent of Phase 1)
- **Covers:** FR-6, FR-7, AC-6, AC-7
- **Touches:** `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/scripts/battle-balance-report.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `packages/sim/src/battle/continuous/balance-report.test.ts`
- **Verification:** `bun run telemetry`, then `bun run balance`, then `bun run verify`
- **Status:** verified
- **Result:** verified — both parameters landed with frozen defaults; the reference pass's own cap share (377/840, 44.9%) came free and already isolates the stat axis
- **Checkpoint:** 9bc1dd72
- **Evidence:** conductor/tracks/20261112-gate-cost-and-fixture-audit/verification/phase-2.md

- [x] **P2.T1: Give `measureFight` optional stat-basis and doctrine parameters** — covers: FR-6
  - [x] **P2.T1.1: Default to the shipped behaviour and prove it — 20/42 (47.6%) and all 14 bounds unchanged** — covers: FR-6, AC-6
  - [x] **P2.T1.2: Build midpoint sides the same way the balance report does, so the two harnesses agree on what "midpoint" means** — covers: FR-6
- [x] **P2.T2: Print a reference-line cap share in the balance report** — covers: FR-7
  - [x] **P2.T2.1: Add the line to the existing reference-line block only — no bound, no gate, no new failure mode** — covers: FR-7, AC-7

## Phase 3: The four cells and the verdict

- **Goal:** the two candidate causes are separated by measurement, and the answer is written down.
- **Depends on:** Phase 2
- **Covers:** FR-8, FR-9, FR-10, AC-8, AC-9, AC-10
- **Touches:** `packages/sim/scripts/fixture-audit.ts` (new), `packages/sim/src/battle/continuous/fixture-audit.test.ts` (new), `package.json` (script entry only)
- **Verification:** `bun run verify`, then `bun run build`
- **Status:** verified
- **Result:** verified — four cells measured on the same 42 pairings; the stat basis dominates (28.6 points against 7.1 for doctrine), 11.9 points of the gap is interaction, and the residual was measured to be the pairing set rather than seed noise
- **Checkpoint:** d6de0094
- **Evidence:** conductor/tracks/20261112-gate-cost-and-fixture-audit/verification/phase-3.md

- [x] **P3.T1: Write the four-cell audit script** — covers: FR-8
  - [x] **P3.T1.1: Run the same 42 pairings and seeds through all four (stat basis × doctrine) cells** — covers: FR-8
  - [x] **P3.T1.2: Print a table with cap count, cap share and duration per cell** — covers: FR-8
- [x] **P3.T2: Pin the cells so they cannot drift silently** — covers: FR-9
  - [x] **P3.T2.1: Assert cell 1 equals the telemetry gate's cap count exactly** — covers: FR-9, AC-8
  - [x] **P3.T2.2: Pin the other three readings with a comment naming what moved them** — covers: FR-9, AC-8
- [x] **P3.T3: Write the verdict** - covers: FR-10
  - [x] **P3.T3.1: Name which variable dominates, or state they are not separable and name the residual** - covers: FR-10, AC-9
  - [x] **P3.T3.2: Prove nothing about the game moved - trace hash `0xb6cce858`, `SIM_VERSION` 3, no bound or species value in the diff** - covers: AC-10

## Phase R1: Review Fixes

- **Goal:** resolve the ten findings from review round 1 — six Medium, four Low — without moving a bound, a game value or the gate's own readings.
- **Depends on:** Phase 3
- **Covers:** F1–F10
- **Touches:** `.github/workflows/ci.yml`, `scripts/deploy/workflow.test.ts`, `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/src/battle/continuous/fixture-audit.test.ts`, `packages/sim/src/module-size.test.ts`, `conductor/tracks/20261112-gate-cost-and-fixture-audit/verification/{phase-2,phase-3,integrated}.md`, `conductor/product.md`, `conductor/learnings.md`
- **Verification:** `bun test scripts/deploy/workflow.test.ts`, then `bun test packages/sim/src/battle/continuous/fixture-audit.test.ts`, then `bun run telemetry`, then `bun run verify`
- **Status:** verified

- [x] **R1.T1: Renumber the integrated AC table to the spec's IDs** — covers: F1
- [x] **R1.T2: Fix the 14.8-point attribution in `product.md` and `learnings.md`** — covers: F2
- [x] **R1.T3: Correct the 2.2× ratio to 1.8× against the matrix, 4.0× against cell D** — covers: F3
- [x] **R1.T4: Align which population is the game's across the two evidence files** — covers: F4
- [x] **R1.T5: Close the scope step's fail-open branch** — covers: F5
- [x] **R1.T6: Assert the two midpoint helpers agree, or drop the claim** — covers: F6
- [x] **R1.T7: Add the workflow regression assertions** — covers: F7
- [x] **R1.T8: Stop pre-claiming the code-PR criterion** — covers: F8
- [x] **R1.T9: Make the residual probe reproducible from the repo** — covers: F9
- [x] **R1.T10: Fix the dev-script count in the module-size comment** — covers: F10

**Result:** verified — all ten findings fixed; no bound, species value or gate reading moved
**Checkpoint:** <recorded below>
**Evidence:** conductor/tracks/20261112-gate-cost-and-fixture-audit/review.md
