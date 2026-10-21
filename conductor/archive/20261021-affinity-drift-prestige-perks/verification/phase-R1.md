# Phase R1 — Review Fixes (verification evidence)

- **Track:** `20261021-affinity-drift-prestige-perks`
- **Phase:** R1 (review fixes, round 1)
- **Date:** 2026-10-21
- **Branch:** `feat/20261021-affinity-drift-prestige-perks`
- **Base → head:** `12850e1` (phase marked in progress) → `10e9d94`
- **Result:** `verified` — all four round-1 Low findings (F1–F4) fixed, 5 new client tests, full gate green.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| test (TDD red) | `bun test --timeout 120000` | 1 | Before implementation: 2031 pass / 1 fail / 1 error — `copy.test.ts` failed on the not-yet-existing `graduationTickerLine` / `hatchDayStatusLine` exports (F3/F4 tests written first). |
| test | `bun test --timeout 120000` | 0 | 2124 pass / 1 skip / 0 fail, 2125 tests, 156 files (baseline 2119 + 5 new). |
| typecheck | `bun run check` | 0 | `@apex/voxel` (62 files), `@apex/sim` (94 files), `@apex/client` (302 files) — no type errors. |
| full gate | `bun run verify` | 0 | check ✓ · `bun test --check --parallel` 2124 pass / 0 fail ✓ · `biome check` 479 files clean ✓ · `gate:determinism` 9 GLBs + 5 props byte-identical ✓. Re-run on the final committed tree (`10e9d94`) with the same result. |
| module size | `module-size.test.ts` (within test run) | 0 | Green — no client module over the 12,288 B cap. |

## Per-finding resolution

| Finding | File(s) / line(s) | What changed | Test |
| --- | --- | --- | --- |
| F1 — mirrored `0.55` literal | `packages/sim/src/index.ts:194,208` (barrel: `hatchDayOf`, `REFINED_INHERITANCE_FRACTION` added to the `./legacy` group); `apps/client/src/graduation/copy.ts:16,52`; `apps/client/src/handbook/raising.ts:15,99` | `REFINED_INHERITANCE_FRACTION` re-exported from `@apex/sim`; both client spots import it and interpolate it into the copy; the mirrored-literal comments removed. Rendered copy unchanged (`0.55`). | none named by review; copy verified unchanged via existing pinned copy tests |
| F2 — duplicated hatch-day derivation | `apps/client/src/hud/copy-growth.ts:12,160-170` (`driftCallout`) | `hatchDayOf` (already exported & unit-tested in `packages/sim/src/legacy.ts:209`) re-exported from the barrel; `driftCallout` now calls `hatchDayOf(lineage)` instead of re-deriving "last hall record's `retiredOnDay`, else 1" inline; doc comment updated to say the day comes from the sim. | existing `driftCallout` suite (4 tests) passes unchanged — derivation equivalence pinned |
| F3 — drifted hatch replaced the graduation send-off | `apps/client/src/hud/copy-growth.ts:135-151` (new `graduationTickerLine`); `apps/client/src/hud/copy.ts:49` (re-export); `apps/client/src/hud.ts:5,95-97,125-129,147` | Composed, not replaced: `graduationTickerLine(retiree, successor, generation, driftedLine)` returns `sendOff + " " + driftedLine` when drifted, the send-off alone otherwise (≤ 2 sentences per copy rule). `announceGraduation` now says the composed line through the ticker's single `say()` — both beats land on the same hatch tick; non-drifted hatches are byte-identical to before. | `hud/copy.test.ts:856-877` — drifted graduation → line contains the full `graduationCallout` send-off AND the "hatched with a Water streak" drift beat; non-drifted → exactly `graduationCallout(...)`, no drift line |
| F4 — element-dependent drift fallback | `apps/client/src/hud/copy-care.ts:306-323` (new `hatchDayStatusLine`); `apps/client/src/hud/copy.ts:24` (re-export); `apps/client/src/hud/update.ts:13,297-301` | Took the "explicit precedence" option: the hatch-day pass now calls `hatchDayStatusLine(creature, state, lastProgram, climb)` = `driftCallout(...) || statusLine(...)`, so the drift statement leads the routine precedence regardless of primary element (a water creature's `flavorCallout` can no longer bury it; ladder climb consumption is untouched). The old `statusLine(...) || drift` fallback is gone. | `hud/copy.test.ts:879-910` — hatch-day pass returns the drift line for both `water_axolotl` and `fire_drake` (element-independent); non-drifted water hatch keeps its flavor line; any other day equals `statusLine(...)` exactly |

TDD: the F3/F4 tests were added first and observed failing (red run above), then the implementations landed.

## Module-size status (touched client files, cap 12,288 B)

| File | Bytes |
| --- | --- |
| `apps/client/src/hud/update.ts` | 12,274 (closest to cap; was pushed 42 B over mid-phase by the first cut — fixed by passing `state` so the call site stays on one line) |
| `apps/client/src/hud/copy-care.ts` | 11,235 |
| `apps/client/src/hud.ts` | 5,772 |
| `apps/client/src/hud/copy-growth.ts` | 6,988 |
| `apps/client/src/hud/copy.ts` | 1,361 |
| `apps/client/src/graduation/copy.ts` | 3,416 |
| `apps/client/src/handbook/raising.ts` | 3,670 |

(Sizes from `git ls-tree -r -l HEAD`; test files are exempt from the cap.)

## Deviations

- `apps/client/src/hud/copy-care.ts` — outside Touches. `hatchDayStatusLine` (F4) is ticker precedence, which is this module's documented concern ("the routine ticker precedence"); it must import `statusLine` from `copy-care`, so this is the only non-circular home. Smallest change: one pure function + one import line.
- `apps/client/src/hud/copy.ts` — outside Touches. The file is the HUD's single re-export surface ("every existing importer already uses" it, the mock page included); the two new copy functions are re-exported there (2 added lines) so `update.ts`/`hud.ts`/tests keep one import path.

Both are minimal, additive, and required to satisfy the brief's own fix prescriptions (testable pure precedence + shared copy surface); no adjacent code was refactored.

## Notes

- Sim behavior unchanged: `packages/sim/src/legacy.ts` untouched (both names were already exported there); only the barrel gained re-exports. All goldens and boss bands pass unchanged; determinism gate byte-identical.
- Commits: `f8adf01` (sim barrel), `d5949c7` (F1), `2a55817` (F2), `f9c64e1` (F3), `10e9d94` (F4). Per-finding commits were kept tree-consistent by staging only the hunks belonging to each finding.
- Precedence note for F4: drift now outranks the whole routine chain on the hatch day (the brief's "check the drift condition first"). A ladder climb cannot coincide with a hatch day (each commit paints, so `climbLine` is always consumed before a graduation commit), so no climb can be swallowed.
- Retry budget: 1 of 2 retries used (module-size cap failure on the first cut of `update.ts`).
