# Phase 2 — Growth view-model

- **Track:** `20261020-evolution-discovery-ui` — Evolution Threshold Discovery UI
- **Phase:** 2 of 3 — Growth view-model
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-evolution-discovery-ui`
- **Base commit:** `86b5151` (phase base)
- **Head commit:** `b5519eb` — `feat(growth): add evolution gate view-model for the detail panel` (the verified commit; this report lands as the following docs commit)
- **Result:** verified

## Summary

`apps/client/src/growth.ts` is a pure, DOM-free view-model. `growthView(state)`
returns the gate the creature is growing into (`juvenile`, `champion`, `final`),
the row set for that gate, per-row `met`/`detail`/`target`, a section title, one
coach line and an accessible `summary`. Met predicates read the same
`@apex/sim` constants `evaluateEvolution` reads (`EVOLUTION_DAY`,
`CHAMPION_EVOLUTION_DAY`, `EVOLUTION_MOOD`, `CHAMPION_BOND`, `CHAMPION_CUPS`,
`creature.sickCooldown`), so a row cannot disagree with the verdict that blocks
the gate. Discovery is read per gate from `state.evolutionKnowledge`, so neither
flag can leak the other gate's numbers.

`apps/client/src/growth.test.ts` pins the contract with 32 tests:

- exact row ids, order and labels per gate (`age`, `recovery`, `mood`;
  champion adds `bond`, `cups`);
- undiscovered sections contain no digit at all in `detail`, `title`, `note`
  or `summary`, and every `target` is `null`;
- discovered sections show `current / target` against the constants, with the
  clean-night countdown (`2 clean nights to go`, `1 clean night to go`,
  `clear`);
- per-gate discovery isolation in both directions;
- champion reads as the final stage with no rows and no thresholds;
- every met predicate at its boundary (one below, exactly at) for both gates;
- `sickCooldown > 0` with everything else met leaves `recovery` alone unmet;
- every `EvolutionReason` a gate can produce (`too_young`, `recently_sick`,
  `low_mood`, `low_bond`, `no_cup_win`, `ready` on both gates) is checked
  against `evaluateEvolution` itself and maps to the expected unmet row set;
- `growthView` returns `null` for a state with no creature;
- status is carried by `summary` text plus boolean `met`, never by styling;
- every row detail and note stays within two sentences.

Two reconciliation notes where the phase brief was internally ambiguous:

1. **Undiscovered summary uses number words.** The brief asks the summary to
   state the met count (`Growth, 2 of 3 met`) but also forbids any digit in the
   undiscovered view, `summary` included. The undiscovered summary therefore
   reads `Growth, two of three met`; discovered gates use the numeric form from
   the brief, and the final stage reads `Growth, final stage`.
2. **`discovered` on the final gate** mirrors `evolutionKnowledge.champion`
   (the gate the creature just cleared). No thresholds are exposed either way,
   because `rows` is empty.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| unit | `bun test --timeout 120000` | 0 | 1748 pass, 1 skip, 0 fail — 1749 tests across 138 files |
| unit (focused) | `bun test --timeout 120000 apps/client/src/growth.test.ts` | 0 | 32 pass, 0 fail, 135 expect() calls |
| static | `bun run check` | 0 | no type errors (voxel 62, sim 79, client 230 files) |
| static + unit + determinism | `bun run verify` | 0 | check green, 1749 tests green, `biome check` 0 errors / 7 pre-existing warnings, determinism gate byte-identical |
| lint | `bunx biome check` | — | **not run**: the sandbox rejected every `bunx` / `biome` / `node_modules/.bin/biome` invocation (`permission.rejected`). `biome check` ran inside `bun run verify` above with the same root `biome.json` and is green for the new files. |
| build | `bun run build` | — | not run: `verify_phase` covers check + test + biome + determinism; no bundler-relevant change (`growth.ts` has no imports outside `@apex/sim`), and the phase contract names `bun test` only. |

Biome on the first `bun run verify` reported one formatting error in
`growth.test.ts`; the formatter's exact suggested output was applied by hand
(the biome binary is not invocable in this sandbox) and the second
`bun run verify` is clean. The 7 remaining warnings are pre-existing
`lint/style/noNonNullAssertion` hits in `cup/view-models.test.ts`,
`scene-logic/play.test.ts` and `scene-logic/treat.test.ts` — untouched by this
phase.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-1 | Detail modal data for the current stage gate: baby → juvenile gate with age / recovery / mood | `growth.test.ts` "a baby is explained through the juvenile gate, in order"; `growth.ts` `gateFor` + `gateConditions` | met |
| FR-2 | Pre-discovery rows are qualitative: no numeric threshold or target | "the juvenile gate carries no digits and no targets", "the champion gate stays qualitative too" (regex `[0-9]` over `detail`/`title`/`note`/`summary`, `target === null`) | met |
| FR-3 | Post-discovery rows show target and current value | "the juvenile gate shows day and mood against their constants", "the champion gate shows bond and cups against their constants", "recovery reveals a clean-night countdown, then clear" | met |
| FR-6 | Champion sees the final-stage note, no conditions | "no condition rows, a final note, no thresholds" (both knowledge states) | met |
| NFR-1 | Met/unmet readable without colour; section exposes an accessible name | "the summary states the count without colour", "met is a plain boolean on every row"; `summary` = `Growth, N of M met` / `Growth, final stage` | met |
| NFR-2 | Client module ≤ 12 KB; `module-size.test.ts` stays green | `apps/client/src/growth.ts` = 6,846 B; `module-size.test.ts` passes in every run above (its scan covers `scene-logic/` and `ranch/`) | met |
| NFR-5 | Product voice: warm coach, ≤ 2 sentences, no legalese, no grimdark | "every row and note stays within two sentences"; copy uses "graduate"-free wording, no death, no jargon | met |

## Evidence paths

- `apps/client/src/growth.ts` (6,846 B, 235 lines)
- `apps/client/src/growth.test.ts` (14,747 B, 32 tests, 507 lines)
- This report: `conductor/tracks/20261020-evolution-discovery-ui/verification/phase-2.md`

## Deviations

None in code: only the two files named in `Touches` were created; nothing else
was modified.

Command-level deviation: `bunx biome check` could not be executed in this
sandbox (permission denied for `bunx`, `biome` on PATH, and the biome binary
paths); the equivalent configured invocation `biome check` ran inside
`bun run verify` and passed.

## Notes for the primary

1. **Module-size guard scope.** `apps/client/src/module-size.test.ts` scans only
   `scene-logic/` and `ranch/`, so it never inspects `growth.ts` despite the
   brief's wording. The production module is 6,846 B, far under the cap. The
   test file is 14,747 B, which is over 12 KB but in line with existing client
   root tests (`bracket-model.test.ts` is 19,485 B). If NFR-2 is meant to apply
   to every client root module, the guard's `MODULE_DIRS` needs widening in a
   follow-up — that file is outside this phase's `Touches`.
2. **Phase 3 field usage.** `rows[].met` is the only status signal; `detail`
   already carries the loader's sentence, so the panel renders
   `label` + `detail` + glyph and does not need to re-derive copy. `target` is
   `null` exactly when `discovered` is false — Phase 3 can use it to decide
   whether to render the target column at all.
3. **Copy source.** Gate/row copy lives entirely in `growth.ts` so
   `creature-detail.ts` stays layout-only, matching the `hud/copy.ts` precedent.
   The undiscovered juvenile note deliberately echoes the existing
   `growthHint` phrasing ("one morning soon it will surprise you") so the coach
   voice is continuous.

## Primary verification

Run by the orchestrator on the committed tree, independent of the subagent report.

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| unit (configured) | `bun test --timeout 120000` | 0 | 1748 pass, 1 skip, 0 fail (138 files; 32 new growth tests) |
| typecheck | `bun run check` | 0 | sim 79 / voxel 62 / client 230, no type errors |
| lint + format | `bunx biome check` | 0 | 0 errors, 7 pre-existing noNonNullAssertion warnings |

Notes:
- The subagent could not run `bunx biome check` (sandbox denied `bunx`); it verified the equivalent through `bun run verify`. The orchestrator re-ran it directly: clean.
- `growth.ts` is 6,846 B. The brief's claim that `module-size.test.ts` guards it is wrong — that guard only scans `scene-logic/` and `ranch/`. Recorded here so the assumption is not repeated.
- Undiscovered summaries spell the met count in words ("two of three") to honour the digit-free rule; discovered summaries use digits. Accepted: the spec forbids digits before discovery, which outranks the brief's literal example.
- Source review by the orchestrator confirms every predicate reads the `@apex/sim` constants rather than re-declared literals.
