# Review: Adopt stage-scaled animation and ranch body profiles

- **Track:** `20261126-stage-scaled-animation-ranch-profiles`
- **Type:** feature
- **Branch:** `feat/20261126-stage-scaled-animation-ranch-profiles`
- **Range:** `d8ad0c912b125cdc87f5cfac7806d22f7eebeebb..4732592b7d0715bcadda57678778f2eab26dc1c4`
- **Date:** `2026-11-26T03:10:19.6058318+11:00`
- **Verdict:** `PASS`

## Summary

The stage-composed arena profile and ranch amplitude/tempo factors are
single-sourced, bounded and correctly wired through all seven ceremonies. Every
FR/NFR/AC is covered and no code finding was identified at any severity. The
review used the mandated per-phase-then-cross-phase strategy for a large diff
(13 code files, 1104 insertions, 43 deletions). The arena captures remain
wide/dark with small bodies; that limitation is already recorded in the
evidence, and the exact amplitude contracts are pinned by table tests, so it
does not invalidate AC-6.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test (phase 1) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/stage-motion.test.ts apps/client/src/roster.test.ts` | pass | `verification/phase-1.md` (11 pass / 0 fail, 2410 expect()) |
| test (phase 2) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ranch/profile.test.ts apps/client/src/ranch/motion.test.ts apps/client/src/ranch/frame.test.ts apps/client/src/ranch/morning-after.test.ts` | pass | `verification/phase-2.md` (56 pass / 0 fail, 1984 expect()) |
| test (full) | `bun test --check --parallel --timeout 120000` | pass | 4531 pass / 1 skip / 0 fail, 675694 expect() calls |
| coverage | not configured | n/a | workflow `coverage: none` |
| lint / format | `bun run verify` (includes `biome check`) | pass | `Checked 1053 files. No fixes applied.` |
| typecheck | `bun run check` via `bun run verify` | pass | clean across 4 workspaces |
| determinism | `bun run gate:determinism` via `bun run verify` | pass | all archetype GLBs + 5 props seed 42 digests |
| build | `bun run build` | pass | Vite build `index-DADRLmAJ.js`, pre-existing chunk warning only |
| visual | `playwright-cli` desktop 1440×900 + iPhone 15 393×852 | pass | 4 required captures + extras, 3 console sessions 2 messages / 0 errors / 0 warnings |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T2 | `stage-motion.test.ts`, `roster.test.ts` | covered |
| FR-2 | P2.T1, P2.T2 | `ranch/profile.test.ts` | covered |
| FR-3 | P2.T1, P2.T2 | `ranch/motion.test.ts`, `frame.test.ts`, `morning-after.test.ts` | covered |
| FR-4 | P2.T1, P2.T2 | `ranch/profile.test.ts`, `frame.test.ts` | covered |
| FR-5 | P2.T1, P2.T2 | `ranch/motion.test.ts`, `frame.test.ts`, `morning-after.test.ts` | covered |
| FR-6 | P3 | desktop/iPhone captures, clean console sessions | covered |
| NFR-1 | P1.T2, P2.T2 | diff scope + determinism gate | covered |
| NFR-2 | P3 | `module-size.test.ts` green, changed modules under 12 KB | covered |
| NFR-3 | P3 | no manifest/lockfile/generated diff | covered |
| NFR-4 | P3 | `bun run verify && bun run build` exit 0 | covered |
| NFR-5 | P1.T2, P2.T2 | full suite + no sim payload diff | covered |
| AC-1 | P1.T1, P1.T2 | archetype × 3-stage table, `bodyScaleFor` unchanged | covered |
| AC-2 | P2.T1, P2.T2 | shared table + `DEFAULT_PROFILE` fallback | covered |
| AC-3 | P2.T1, P2.T2 | seven ceremonies, authored curves intact | covered |
| AC-4 | P2.T1, P2.T2 | calm damping, no new cue/state | covered |
| AC-5 | P2.T1, P2.T2 | five edge cases, no NaN/leak/overshoot/state drift | covered |
| AC-6 | P3 | ranch + arena captures on both viewports, clean console | covered |
| AC-7 | P3 | full gate, module caps, no dependency/save/voxel/audio diff | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All three phases are verified with Results, Checkpoints and Evidence (P1
`c652a56c`, P2 `1d9129f7`, P3 `033c410c`), and every task is checked off. Phase
1 Touches match the four changed files exactly. Phase 2 changed two files beyond
its listed Touches: `mount.ts` (the one-line `s.archetypeId` latch in `rebuild`,
necessary because that is the single rig path for both set-creature and the
evolution swap) and `frame.ts` (the per-frame factor derivation/dispatch root
required by P2.T2). Both are recorded in `verification/phase-2.md`; the absence
of `frame.ts` from that file's Deviations table is a bookkeeping gap, not a
silent or opportunistic deviation. `api.ts` and `mood.ts` were listed in Touches
but intentionally unchanged so ceremony order/callbacks and condition-driven
mood profiles remain untouched. No generated, lockfile or dependency files
changed.

## Out of scope

- <none>

## Debt

- <none>

## Doc sync

`pending` at review time — a dated `conductor/tech-stack.md` note already records
the shared profile, arena amplitude composer, ranch amplitude/tempo adapter, calm
damping and unchanged freeze lines; the post-review sync marks it `updated`.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 0 | 0 |
