# Review: Deduplicate verdict presentation across spar, cup, and battle HUD

- **Track:** `20261126-verdict-presentation-dedup`
- **Type:** `refactor`
- **Branch:** `refactor/20261126-verdict-presentation-dedup`
- **Range:** `9209fcc926d564d0992d2e873059cdc2c585ca9c..809a8187881cae5106d4c009019dc92ce5feccf9`
- **Date:** `2026-11-26T15:56:06.5441848+11:00`
- **Verdict:** `PASS`

## Summary

Client-only refactor is ready. `apps/client/src/verdict/copy.ts` single-sources
spar, cup battle-stamp and cup results title/sub copy from already-derived
inputs, while `verdict/stamp.ts` single-sources the four-div stamp DOM with
configurable classes, ARIA option and a flat-sibling mode for cup results.
Delegations are line-for-line equivalent to the base copy, the cup's original
`gap: 1cqw` layout is preserved, and the live invite surface, CSS, audio, sim,
save and voxel paths are absent from the diff. All FR/NFR/AC requirements are
covered and no finding was raised at any severity, so strict mode is satisfied
without fixes or overrides.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test (Phase 1) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/copy.test.ts apps/client/src/battleUI.test.ts` | pass | `verification/phase-1.md` — 44 pass / 0 fail, 63 expect() calls |
| test (Phase 2) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/verdict/stamp.test.ts apps/client/src/battle-session.test.ts apps/client/src/battleHud.test.ts apps/client/src/cup/view-models.test.ts apps/client/src/battleUI.test.ts` | pass | `verification/phase-2.md` — 106 pass / 0 fail, 220 expect() calls |
| test (full) | `bun test --check --parallel --timeout 120000` | pass | `verification/integrated.md` — 4581 pass / 1 skip / 0 fail across 445 files |
| coverage | TDD table red + green | pass | `verification/phase-1.md` — TS2307 red before `copy.ts`, green after |
| lint | `bunx biome check` on Phase 2 files; Biome in verify | pass | `verification/phase-2.md`; `verification/integrated.md` — no fixes applied |
| typecheck | `bun run check` | pass | `verification/integrated.md` — clean across voxel, sim, server, client |
| determinism | `bun run gate:determinism` inside `bun run verify` | pass | `verification/integrated.md` — all GLBs and 5 prop digests byte-identical |
| build | `bun run verify && bun run build` | pass | `verification/integrated.md` — 443 modules, pre-existing chunk advisory only |
| visual | `playwright-cli` spar/cup/HUD captures + console | pass | `verification/phase-3.md` — six PNGs, 0 errors / 0 warnings in both sessions |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2, P2.T2 | `verdict/copy.ts`, `copy.test.ts`, `battle-session.test.ts`, `cup/view-models.test.ts` | covered |
| FR-2 | P1.T2, P2.T2 | `verdict/copy.ts`, `verification/phase-2.md` grep proof | covered |
| FR-3 | P2.T1, P2.T2 | `verdict/stamp.ts`, `stamp.test.ts`, `battleHud.test.ts` | covered |
| FR-4 | P1.T2, P2.T1, P3.T1 | `copy.test.ts`, `verification/phase-3.md`, base/diff comparison | covered |
| FR-5 | P1.T1 | `copy.test.ts`, `verification/phase-1.md` | covered |
| FR-6 | P3.T1 | `verification/phase-3.md`, `verification/integrated.md`, six PNGs | covered |
| NFR-1 | P3.T2 | `verification/integrated.md` diff-scope proof | covered |
| NFR-2 | P1.T2, P3.T2 | `module-size.test.ts`, `verification/phase-1.md` | covered |
| NFR-3 | P2.T2, P3.T1 | `stamp.test.ts`, `cup/results.ts`, `verification/phase-3.md` | covered |
| NFR-4 | P3.T2 | `verification/integrated.md` | covered |
| NFR-5 | P2.T2 | `battleHud.test.ts`, `battle-session.ts` | covered |
| AC-1 | P1.T1 | `verification/phase-1.md` | covered |
| AC-2 | P2.T1 | `battle-session.test.ts`, `cup/view-models.test.ts`, `verification/phase-2.md` | covered |
| AC-3 | P2.T1 | `stamp.test.ts`, `battleHud.test.ts` | covered |
| AC-4 | P2.T2 | `git diff 9209fcc..HEAD` | covered |
| AC-5 | P3.T1 | `verification/phase-3.md`, six PNGs | covered |
| AC-6 | P3.T2 | `verification/integrated.md` | covered |
| AC-7 | P1.T1, P2.T1, P2.T2 | `copy.test.ts`, `battleHud.test.ts`, `verification/phase-2.md` | covered |

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

- <none, or finding ID, approving user, date, reason, and scope>

## Plan compliance

All three phases are marked `verified` with checkpoints `d285abbd`, `4908fb3a`
and `30e4dde2`, and every task box is checked. Plan Touches match the final
11-file client diff exactly, with Conductor state and evidence accounted for.
Spec IDs FR-1..FR-6, NFR-1..NFR-5 and AC-1..AC-7 each map to a phase task and a
verification artifact. Recorded deviations — the `parentChildren` seam,
`cup/results.ts` left unchanged, local `FakeElement` DOM harnesses, two
formatter reworks and one import-path rework — are documented in
`verification/phase-2.md` and `verification/integrated.md` and break no
requirement. RM-10 stays linked pending this track's completion commit.

## Out of scope

The live invite verdict surface (`live/state.ts`) is intentionally absent from
the diff. No CSS restyle, animation retiming, audio cue-id change, wording
normalization, sim/cup outcome change, save/schema change, voxel hash change,
dependency change or generated-file change belongs to this track, and none was
found.

## Debt

- <none>

## Doc sync

`updated` — a dated `## Client` note in `conductor/tech-stack.md` records the
shared copy and stamp modules and their invariants; `verification/integrated.md`
records the doc-sync scope. No product, guideline or workflow change was needed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 0 | 0 |
