# Phase 1 verification — Authored Strike identity

- Track: 20261125-basic-strike-identity-impact
- Phase: 1 — Authored Strike identity
- Date: 2026-11-25
- Branch: `feat/20261125-basic-strike-identity-impact`
- Base commit: `2d4d7b97f394a9ee473513b0617cf057e90a93a2`
- Head commit (code): `2798403179ed9efeba77e9e585a5f5b4f619363e`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| TDD red | `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/move-fx/` | 1 | 88 pass / 6 fail. Every new Strike pin failed because `MOVE_FX.basic` was `undefined`; `fxFor("basic", undefined)` still resolved through the fallback to `DEFAULT_FX`. |
| Typecheck fix 1 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/move-fx/` | 1 | `TS2322`: a `MoveFx` row cannot be spread into `Record<string, MoveFx>`. Re-authored `BASIC_FX` as a one-row table keyed by `"basic"`, matching the six element tables. |
| Typecheck fix 2 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/move-fx/` | 1 | `TS2769` ×2 under `noUncheckedIndexedAccess`: the indexed `BASIC_FX.basic` read is `MoveFx \| undefined`. Guarded the read in `basic.test.ts`. |
| Final verification | `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/move-fx/` | 0 | 94 pass / 0 fail, 1235 `expect()` calls across 4 test files. Includes typecheck of 176 files. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | The innate Strike gets its own authored melee-jab presentation, not a copied elemental shot | `moves/basic.ts`: `wind: 0.26` (melee windup boundary, before `CONTACT_T` 0.46), `shots: []` (fist is the hit), compact coil (`coilX: 0.1`, no `hold`) and short recoil (`pitchOut: 0.06`, `sweepX: [0.1, -0.24]`), contact arrival (`puffs: 4`, `life: 220`, `shove: -0.16`) | verified |
| FR-2 | Authorship is additive: no element table, fallback body, or shared default changes | `moves.ts` only adds `import { BASIC_FX }` and `...BASIC_FX` to `MOVE_FX`; all six `...*_FX` spreads and `DEFAULT_FX` are untouched. Regression test pins all 48 special rows by identity plus every element fallback and the unknown-id defaults | verified |
| AC-1 | `fxFor("basic", undefined)` returns an authored row distinct from `DEFAULT_FX` with a melee posture | `basic.test.ts`: row identity via `BASIC_FX.basic`, `not.toBe(DEFAULT_FX)`, `getMove("basic")?.melee === true`, zero shots, early wind, contact burst and shove | verified |
| AC-2 | All 48 special ids and unknown ids with known/unknown elements resolve to their baseline rows | `move-fx.test.ts` "authored Strike is additive…" test: 48 `[id, element]` pairs asserted `toBe(MOVE_FX[id])` with and without element; `ELEMENT_FALLBACK_FX[element]` identity for every element; `DEFAULT_FX` for unknown element / absent lookup | verified |
| NFR-1 | Sim contract, save shape, generated artifacts and service/UI behavior untouched | Commit `27984031` touches only four client `move-fx` files plus one client test assertion; no `packages/sim`, save, or generated file changed | verified |
| NFR-2 | No new dependencies | No manifest or lockfile change in either task commit | verified |

## Evidence paths

- `apps/client/src/move-fx/moves/basic.ts` — authored one-row Strike table
- `apps/client/src/move-fx/moves/basic.test.ts` — authored identity and melee-jab grammar pins
- `apps/client/src/move-fx/moves.ts` — registration of `BASIC_FX` in `MOVE_FX`
- `apps/client/src/move-fx.test.ts` — catalogue/identity pin and 48-special no-regression boundary
- `apps/client/src/movelab/catalog.test.ts` — one-line deviation fix (below)
- Commits: `19d637ff` (failing tests), `27984031` (implementation)

## Deviations

- `apps/client/src/movelab/catalog.test.ts`: widened one assertion in "lists every shipped MOVE_FX row exactly once" to `expect(ids.has(id) || id === "basic").toBe(true)` with an explanatory comment. Required because the phase registers a 49th `MOVE_FX` key and this pre-existing test assumed every authored key came from the 48 kit moves; leaving it would break the broader client suite. No production behavior or lab catalog changed. Typechecked by the phase command, but the test itself is outside the phase verification scope and was not executed here.

## Notes

- TDD sequence: failing tests were committed first (`19d637ff`), with all six new assertions red at the baseline. Two subsequent typecheck fixes were needed before the final green run (row-vs-table spread shape, then an indexed-access guard); both were resolved within the allowed two fix attempts.
- `bun run verify && bun run build`, `module-size.test.ts` and `movelab/catalog.test.ts` are outside the phase subagent's permitted command set, so they were not run. The new `basic.ts` is a single small module and `moves.ts` grew by only four lines, so the 12 KB cap is not at risk.
- `DEFAULT_FX`, `CONTACT_T`, `fxFor`, all six element tables, `fallbackFor` and every pre-existing pin in `move-fx.test.ts` remain unchanged. Only the innate `"basic"` key was added to `MOVE_FX`.

## Primary verification

Run by the primary agent after the subagent reported, before acceptance:

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Phase command | `bun test --check --parallel=4 --timeout 120000 apps/client/src/move-fx.test.ts apps/client/src/move-fx/` | 0 | 94 pass / 0 fail, 1235 `expect()` calls across 4 files; typechecked. |
| Full verification | `bun run verify && bun run build` | 0 | 4488 pass / 1 skip / 0 fail across 440 files; `bun run check` and `biome check` (1047 files) clean; determinism gate green for all 18 GLBs and 5 prop digests; client Vite build succeeded. |
| Scope check | `git diff --name-only 2d4d7b97..HEAD` and `git diff --stat 2d4d7b97..HEAD` | 0 | Six files: four in Touches, the evidence file, and one reported test-only deviation (`apps/client/src/movelab/catalog.test.ts`). Deviation accepted as the smallest necessary change. |

All Phase 1 acceptance criteria (AC-1, AC-2, NFR-1, NFR-2) are confirmed by the
phase tests and the full stack run. No unreported file changed; tree was clean
before verification.
