# Phase 1 — Form Model: Verification

- **Track:** `20261020-training-programs-form` — Raising Depth: Training Programs & Form
- **Phase:** 1 — Form Model
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-training-programs-form`
- **Base commit:** `a6f19802df8e53aca142b1e6b13d07474e6c0859`
- **Head commit:** `6c1d6a0` — implementation head; this report is the commit directly on top of it
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (red) | `bun test --timeout 120000 packages/sim/src/form.test.ts` (at `555c08b`) | 1 | 1 fail / 1 error: `SyntaxError: Export named 'battleStats' not found in module '.../index.ts'`. TDD red proof before the implementation existed. |
| static (red) | `bun run check` (at `555c08b`) | 1 | 8 TS2305 "no exported member" errors plus the cascading `tierConditions` return error, all in `form.test.ts`. Expected red. |
| unit | `bun test --timeout 120000 packages/sim/src/form.test.ts` | 0 | 26 pass, 0 fail, 91 `expect()` calls. |
| static | `bun run check` | 0 | `@apex/voxel` 62 files, `@apex/sim` 81 files, `@apex/client` 287 files — no type errors. |
| phase verification | `bun test packages/sim/src/form.test.ts && bun run check` | — | Not runnable verbatim: the sandbox rejects the bare `bun test <path>` invocation (`Permission denied: shell`) and only permits the workflow's configured `bun test --timeout 120000 ...` form. Ran the identical pair as `bun test --timeout 120000 packages/sim/src/form.test.ts && bun run check` → **exit 0**, 26 pass, check clean (see the two rows above). See Deviations. |
| integrated gate | `bun run verify` | 0 | check + 1814 pass / 1 skip / 0 fail across 143 files + `biome check` (7 pre-existing `noNonNullAssertion` warnings in untouched client test files, 0 errors) + determinism gate byte-identical for all nine creature GLBs and the 5-prop digest. |

## Acceptance Criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `battleStats` equals `effectiveStats` for a freshly created creature, and `formTier` is `steady`. | `packages/sim/src/form.test.ts` — "is steady for a fresh creature of every starter species" (`fire_drake`, `plant_ox`, `water_axolotl`: conditions asserted as `mood 60 / bond 10 / health 100`, score 40, tier `steady`) and "a fresh creature's battle stats deep-equal effectiveStats (AC-1)" (`formModifier` all zeros, `battleStats` deep-equals `effectiveStats`). | verified |
| AC-2 | Mood 100 / bond 100 yields +1 ATK/+1 SPD; mood 20 / bond 0 yields −2/−2; any sick creature yields the sluggish delta regardless of mood. | `packages/sim/src/form.test.ts` — "mood 100 / bond 100 is sharp and mood 20 / bond 0 is sluggish (AC-2)", "sharp pays +1 ATK and +1 SPD, never HP", "sluggish pays -2 ATK and -2 SPD", and "health below SICK_HEALTH is sluggish even at mood 100 / bond 100" (score 100, tier `sluggish`, delta `{hp:0, atk:-2, def:0, spd:-2}`; `health === SICK_HEALTH` still scores normally). | verified |

## Requirement Coverage (phase scope)

| ID | Evidence |
| --- | --- |
| FR-8 | `formScore` = `0.6 * mood + 0.4 * bond` (raw float, asserted against the same expression); boundaries 65 / 40 / 20 inclusive at the better tier, including exact-boundary cases (65 → sharp, 40 → steady, 20 → flat); sickness pinning at `health < SICK_HEALTH`. |
| FR-9 | `FORM_DELTAS` table asserted tier by tier (HP always 0), `formModifier` returns a complete `CreatureStats`, `battleStats` = `effectiveStats` + delta with each stat floored at 1 (stats of 0 → all 1; atk 2 / spd 2 − 2 → 1), trained HP still doubled through `effectiveStats`, and purity proven by a before/after deep equality. |
| NFR-2 | Starting conditions (mood 60, bond 10) score exactly 40 → `steady` → all-zero delta, so no owned-side reader changes output; no battle, cup, care or settlement file was touched. |
| NFR-7 | Test-first: `555c08b` commits the failing suite (1 fail + 8 tsc errors), `562b8e8` implements to green. |
| NFR-6 | O(1), pure, no RNG, no new dependency; `form.ts` has no cached state. |

## Evidence Paths

- `packages/sim/src/form.test.ts` — 26 tests covering score, tiers, boundaries, sickness pinning, deltas, floor, purity and `FORM_COPY`.
- `packages/sim/src/form.ts` — module header documents conditions-only input, no RNG, no HP effect, and why the neutral band contains the starting conditions.
- `packages/sim/src/index.ts` — `battleStats`, `FORM_COPY`, `FORM_DELTAS`, `FormTier`, `formModifier`, `formScore`, `formTier` re-exported between the `evolution` and `ladder` blocks.
- Commits: `555c08b` (test), `562b8e8` (feat), `6c1d6a0` (biome import ordering in the test file).

## Deviations

- **No file outside `Touches` was changed.** The diff is exactly `packages/sim/src/form.ts`, `packages/sim/src/form.test.ts`, `packages/sim/src/index.ts`.
- **Verification command transcript.** The literal phase command `bun test packages/sim/src/form.test.ts && bun run check` is refused by this shell sandbox ("Permission denied: shell") in both the bare and chained forms. The workflow's configured unit form (`bun test --timeout 120000 ...`) is permitted, so the same two commands ran as `bun test --timeout 120000 packages/sim/src/form.test.ts && bun run check`, exit 0, and `bun run verify` (which includes `biome check` and the determinism gate) also exited 0. `biome check` was additionally attempted standalone; the sandbox refuses `biome`/`bunx`, so lint evidence comes from inside `bun run verify`.
- `bun run check` initially reported 3 Biome errors from this phase's own files (import/export specifier ordering and one formatter reflow); all three were fixed and `bun run verify` is clean of errors afterwards. The remaining 7 `noNonNullAssertion` warnings are pre-existing in untouched client test files.

## Notes

- `formTier` checks sickness first, then the score bands, with the boundaries documented as inclusive at the better tier (`>= 65`, `>= 40`, `>= 20`).
- `FORM_COPY` lines all name ATK and SPD and quote the actual modifier (`+1 ATK, +1 SPD` / `-1 ATK, -1 SPD` / `-2 ATK, -2 SPD`; steady states "no change to ATK or SPD"), so the later coach-room, spar-card, plate and handbook surfaces can render them without context and never rely on colour alone.
- `formModifier` returns a fresh object so a caller cannot mutate `FORM_DELTAS`; both the table and its entries are frozen.
- HP is deliberately part of the delta shape (always 0) so every stat readout can spread one uniform object; no phase-1 reader consumes it yet.
- Nothing is wired into combat: `makeExhibition`, the cup snapshot, `care.ts`, `settlement.ts` and every client file are untouched, so existing spar/cup goldens are unchanged by construction (Phase 3 owns the seam swap).

## Primary verification

- **Verified by:** conductor-implement (primary agent), 2026-10-20
- **un test --timeout 120000 packages/sim/src/form.test.ts** -> exit 0 (26 pass, 0 fail, 91 expects)
- **un run check** -> exit 0 (voxel 62, sim 81, client 287 files, no type errors)
- **un run verify** -> exit 0 (types, 1814 pass / 1 skip, biome, determinism gate byte-identical)
- **un run build** -> exit 0 (only the pre-existing >500 kB chunk warning)
- **Diff scope:** `packages/sim/src/form.ts`, `form.test.ts`, `index.ts`, this report - all inside Touches. No file outside Touches changed.
- **Result:** accepted. The phase's literal command omits `--timeout 120000`; the bare `bun test <path>` form is refused by this sandbox, so the workflow-configured unit form was run instead (matching the subagent's recorded deviation). Squashed `555c08b..66bf75e` into `411f20c`.

## Amendment (2026-10-20, phase 3)

Superseded by the phase-3 balance probe: form is now **ATK-only**. FORM_DELTAS keeps sharp +1 ATK, flat -1 ATK, sluggish -2 ATK, and SPD never moves; HP remains 0. The tier thresholds, the sick pin, ormScore, and the steady-at-start invariant in this phase are unchanged, so AC-1 still holds. Names and wording that mention "+1 SPD" or "-1 SPD" in this file describe the original lever, not the shipped one; FR-9 and AC-2 in the spec carry the amendment.
