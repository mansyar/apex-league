# Review: Author Basic Strike identity and KO/down impact weighting

- **Track:** `20261125-basic-strike-identity-impact`
- **Type:** `feature`
- **Branch:** `feat/20261125-basic-strike-identity-impact`
- **Range:** `b6eb4cb1e29389f757098c305396dba253fbd5c1..1b3cf5d0a76aee31b9a5dd8aee612d675117c3e9`
- **Date:** `2026-11-25T21:58:00+11:00`
- **Verdict:** `BLOCK`

## Summary

The authored Strike row and its no-regression boundary are solid, and the
desktop/phone captures show the intended beats. One High finding blocks: in
production's calm/reduced-motion path the step runner is called with
`instant=true`, and that branch uses the ordinary `down` reaction, so a terminal
KO is not weighted at all for reduced-motion players. The phase-2 "reduced
motion" test drove the paced branch instead, so the gap was invisible. A Low
finding records that the authored KO reel/reelPitch fields are table-only.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel --timeout 120000` | pass — 4495 pass / 1 skip / 0 fail | `verification/integrated.md` |
| lint / format | `biome check` | pass — 1048 files, no fixes | `verification/integrated.md` |
| typecheck | `bun run check` | pass — 4 workspaces | `verification/integrated.md` |
| coverage | none configured | not applicable | `conductor/workflow.md` |
| determinism | `bun run gate:determinism` | pass — all GLBs + 5 props | `verification/integrated.md` |
| build | `bun run build` | pass — pre-existing chunk warning only | `verification/integrated.md` |
| visual | `playwright-cli` desktop + iPhone 15 | pass — console 2 messages, 0 errors | `verification/phase-3.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T2 | `move-fx/moves/basic.test.ts`, `move-fx.test.ts` | covered |
| FR-2 | P1.T1, P1.T2 | `move-fx.test.ts` identity pins | covered |
| FR-3 | P2.T1, P2.T2 | `choreo.test.ts`, `steps/down.test.ts` | partial — F1 on the instant path |
| FR-4 | P2.T2.3 | `steps/down.test.ts` reduced-motion case | partial — F1, wrong branch |
| FR-5 | P3.T1 | `phase-3.md` desktop/phone captures | covered |
| NFR-1 | FR-1/FR-2 boundary | `move-fx.test.ts`, determinism gate | covered |
| NFR-2 | small modules | `module-size.test.ts` in full gate | covered |
| NFR-3 | no manifest diff | final `git diff --name-only` | covered |
| NFR-4 | full stack | `bun run verify && bun run build` exit 0 | covered |
| NFR-5 | P2.T1.2 | `steps/down.test.ts` double KO / stream / pause-seek | covered |
| NFR-6 | no save schema diff | final diff, determinism gate | covered |
| AC-1 | P1.T1 | `basic.test.ts` | covered |
| AC-2 | P1.T1 | `move-fx.test.ts` | covered |
| AC-3 | P2.T1 | `choreo.test.ts`, `steps/down.test.ts` | covered — F2 reel is table-only |
| AC-4 | P2.T2.3 | `steps/down.test.ts` reduced motion | partial — F1 |
| AC-5 | P3.T1 | `phase-3.md`, `integrated.md` | covered |
| AC-6 | P2.T1.2 | `steps/down.test.ts` | covered |
| AC-7 | P3.T2 | `integrated.md` | covered |

## Findings

### Critical

- <none>

### High

- **F1 — Reduced-motion instant path never resolves the KO reaction**
  - **File:** `apps/client/src/steps/down.ts:27`
  - **What:** `spec` is always `reactionFor("down", ...)`. The `instant` branch
    (lines 28–34) applies `spec.impulse` and never resolves `reactionFor("ko", ...)`.
    `playbackDriver.start()` calls `dumpInstant` for calm/reduced motion, which
    passes `instant=true` to every step, so the production path loses the
    authored KO weight. `down.test.ts:215` instead calls
    `downStep(stepOf(true), false, ...)`, a combination production never uses.
  - **Why:** FR-4 / AC-4 require the heavier beat to resolve dampened, not
    vanish; double KO under reduced motion loses the same weighting.
  - **Fix:** Resolve the reaction once from the step flag before branching:
    `const spec = reactionFor(step.ko === true ? "ko" : "down", side.actor.profile)`.
    Add an `instant=true` reduced-motion test asserting the KO impulse damped
    by ×0.4 and an ordinary instant down still using the down impulse.
  - **Requirement:** FR-3, FR-4, AC-4
  - **Test gap:** `steps/down.test.ts` instant-path reduced-motion case.

### Medium

- <none>

### Low

- **F2 — Authored KO reel fields are dead data**
  - **File:** `apps/client/src/steps/down.ts:41`
  - **What:** the `ko` row (`choreo.ts:449–456`) authors `reel: 0.85` and
    `reelPitch: 0.3`; choreo tests pin their hurt-multiple, but the KO branch
    reads only `koSpec.impulse` and calls `koFall(t)`, which has a fixed pitch.
  - **Why:** AC-3 promises a difference in impulse/reel/landing; the reel part
    exists only in the table and could mislead later maintenance.
  - **Fix:** Make the authored reelPitch observable in the KO branch — scale
    the staged fall pitch by `koSpec.reelPitch` without touching the shared
    FR8 `koFall` signature used by the dense stream — and pin it in a test.
  - **Requirement:** AC-3
  - **Test gap:** `steps/down.test.ts` KO lean assertion.

### Plan compliance state nits (not code findings)

- `plan.md` Phase 3 still reads `Status: in_progress` while its Result is
  `verified`; set it to `verified`.
- `conductor/tracks.md` changed the pre-existing Voxelize line's em-dash
  separators to hyphens; restore that line and make the new entry match the
  registry's em-dash convention.

## Overrides

- <none>

## Plan compliance

All three phases are recorded with checkpoints and evidence, every task is
checked off, and the code diff stays within the declared Touches except the
reported, accepted test-only `movelab/catalog.test.ts` widening. The workflow
§Release correction was applied in doc sync. The two state nits above are
non-behavioral.

## Out of scope

None introduced by this diff beyond the accepted Move Lab test widening.

## Debt

- <none — strict review, findings go to the fix phase>

## Doc sync

`pending` — no doc changes from the reviewer; post-review sync will update the
`review.md` Doc sync line after the fix phase.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 1 | 0 |
