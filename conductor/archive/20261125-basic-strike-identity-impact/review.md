# Review: Author Basic Strike identity and KO/down impact weighting

- **Track:** `20261125-basic-strike-identity-impact`
- **Type:** `feature`
- **Branch:** `feat/20261125-basic-strike-identity-impact`
- **Range:** `b6eb4cb1e29389f757098c305396dba253fbd5c1..89f8ab45`
- **Date:** `2026-11-25T22:15:00+11:00`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

Round 1 blocked on a High finding: the production calm/reduced-motion path
(`dumpInstant`, `instant=true`) never resolved the authored `ko` reaction, so a
terminal KO was not weighted for those players. Review-fix phase R1 resolved
the reaction once from `step.ko` before branching and also made the authored
KO `reelPitch` observable in the staged lean. Round 2 confirmed both fixes with
instant-path tests and found no new code findings. The one remaining round-1
item was a non-code registry separator nit, fixed in post-review sync. All
acceptance criteria are covered and the full configured gate is green.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel --timeout 120000` | pass — 4499 pass / 1 skip / 0 fail | `verification/integrated.md` |
| lint / format | `biome check` | pass — no errors, no fixes | `verification/integrated.md` |
| typecheck | `bun run check` | pass — 4 workspaces | `verification/integrated.md` |
| coverage | none configured | not applicable | `conductor/workflow.md` |
| determinism | `bun run gate:determinism` | pass — all GLBs + 5 props | `verification/integrated.md` |
| build | `bun run build` | pass — pre-existing chunk warning only | `verification/integrated.md` |
| visual | `playwright-cli` desktop + iPhone 15 | pass — console 2 messages, 0 errors | `verification/phase-3.md` |
| review-fix tests | `bun test --check --parallel=4 --timeout 120000 apps/client/src/steps/down.test.ts apps/client/src/choreo.test.ts` | pass — 36 pass / 0 fail | `verification/phase-R1.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T2 | `move-fx/moves/basic.test.ts`, `move-fx.test.ts` | covered |
| FR-2 | P1.T1, P1.T2 | `move-fx.test.ts` identity pins | covered |
| FR-3 | P2.T1, P2.T2, R1.T1/R1.T2 | `choreo.test.ts`, `steps/down.test.ts` | covered |
| FR-4 | P2.T2.3, R1.T1 | `steps/down.test.ts` paced + instant reduced-motion cases | covered |
| FR-5 | P3.T1 | `phase-3.md` desktop/phone captures | covered |
| NFR-1 | FR-1/FR-2 boundary | `move-fx.test.ts`, determinism gate | covered |
| NFR-2 | small modules | `module-size.test.ts` in full gate | covered |
| NFR-3 | no manifest diff | final `git diff --name-only` | covered |
| NFR-4 | full stack | `bun run verify && bun run build` exit 0 | covered |
| NFR-5 | P2.T1.2, R1.T1 | `steps/down.test.ts` double KO / stream / pause-seek / instant cases | covered |
| NFR-6 | no save schema diff | final diff, determinism gate | covered |
| AC-1 | P1.T1 | `basic.test.ts` | covered |
| AC-2 | P1.T1 | `move-fx.test.ts` | covered |
| AC-3 | P2.T1, R1.T2 | `choreo.test.ts`, `steps/down.test.ts` KO lean pin | covered |
| AC-4 | P2.T2.3, R1.T1 | `steps/down.test.ts` instant reduced-motion pin | covered |
| AC-5 | P3.T1 | `phase-3.md`, `integrated.md` | covered |
| AC-6 | P2.T1.2, R1.T1 | `steps/down.test.ts` | covered |
| AC-7 | P3.T2 | `integrated.md` | covered |

## Findings

### Critical

- <none>

### High

- **F1 — Reduced-motion instant path never resolves the KO reaction**
  - **File:** `apps/client/src/steps/down.ts:27` (round 1)
  - **What:** `spec` was always `reactionFor("down", ...)`. The `instant`
    branch applied `spec.impulse` and never resolved `reactionFor("ko", ...)`.
    `playbackDriver.start()` calls `dumpInstant` for calm/reduced motion, which
    passes `instant=true` to every step, so the production path lost the
    authored KO weight.
  - **Why:** FR-4 / AC-4 require the heavier beat to resolve dampened, not
    vanish; double KO under reduced motion lost the same weighting.
  - **Fix:** Resolve the reaction once from `step.ko` before branching and
    test the instant reduced-motion path.
  - **Requirement:** FR-3, FR-4, AC-4
  - **Test gap:** `steps/down.test.ts` instant-path reduced-motion case.
  - **Resolved:** Phase R1, checkpoint `5e53befd`. `down.ts:29` now resolves
    `reactionFor(step.ko === true ? "ko" : "down", profile)`; `down.test.ts`
    pins the damped KO impulse, the ordinary instant down, and an instant
    double KO. Round 2 confirmed fixed.

### Medium

- <none>

### Low

- **F2 — Authored KO reel fields were dead data**
  - **File:** `apps/client/src/steps/down.ts:41` (round 1)
  - **What:** the `ko` row (`choreo.ts:449–456`) authored `reel: 0.85` and
    `reelPitch: 0.3`, but the KO branch read only `koSpec.impulse` and called
    `koFall(t)`, which has a fixed pitch.
  - **Why:** AC-3 promises a difference in impulse/reel/landing; the reel part
    existed only in the table.
  - **Fix:** Make the authored reelPitch observable in the staged KO lean
    without changing the shared `koFall` signature or the dense-stream path.
  - **Requirement:** AC-3
  - **Test gap:** `steps/down.test.ts` KO lean assertion.
  - **Resolved:** Phase R1, checkpoint `5e53befd`. `down.ts:45` scales the
    staged pitch by `(1 + spec.reelPitch)`; `down.test.ts` pins the heavy and
    light profile cases and confirms the ordinary down is unchanged. Round 2
    confirmed fixed.

### Non-code state nit (round 1)

- **Resolved in post-review sync:** `plan.md` Phase 3 `Status` is `verified`,
  and `conductor/tracks.md` was restored to em-dash separators on the
  pre-existing Voxelize line; the new track line follows the same convention.

## Overrides

- <none>

## Plan compliance

All three implementation phases and review-fix phase R1 are recorded with
checkpoints and evidence, every task is checked off, and the code diff stays
within the declared Touches except the reported, accepted test-only
`movelab/catalog.test.ts` widening. The workflow §Release correction was
applied in doc sync, and the two round-1 state nits were fixed in post-review
sync.

## Out of scope

None introduced by this diff beyond the accepted Move Lab test widening.

## Debt

- <none — strict review; all findings fixed before the PR>

## Doc sync

`updated` — before review, `conductor/workflow.md` §Release was corrected to
record that `deploy.yml` is on `main` and the Pages URL resolves. After review,
the `conductor/tracks.md` separator nit was corrected and this record and the
metadata were synchronized.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 1 | 0 |
| 2 | PASS WITH FINDINGS | 0 | 0 | 0 | 0 | 2 code findings + 1 non-code nit |

## Re-review

Round 2 delta `4f161768..89f8ab45`: F1 and F2 confirmed fixed with new
instant-path and KO-lean tests; no new code findings; the remaining
`tracks.md` separator nit was non-blocking and fixed in post-review sync.
