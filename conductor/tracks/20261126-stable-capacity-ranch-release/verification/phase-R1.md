# Phase R1 evidence — Review fix F1 (v25 → v26 migration row)

- **Track:** `20261126-stable-capacity-ranch-release`
- **Phase:** R1 (review fixes)
- **Date:** 2026-11-26
- **Branch:** `chore/20261126-stable-capacity-ranch-release`
- **Phase base:** `26d30cb47f75bdcf0e3189c5dbac7e6325dec688`
- **Head at verification:** `aa476ed6` (R1.T1 doc commit; clean tree — the gates below ran against this tree before this evidence file was committed)
- **Result:** `verified` for the assigned phase scope. F1 is fixed: the `GameState at v26` header is now backed by a complete migration chain ending at `v25 → v26`, and both configured gates exit 0. No code, save version, migration, dependency, generated file, or determinism hash changed.

## F1 fix (R1.T1)

`review.md` F1 (Medium) recorded that `docs/save-schema.md` claimed `GameState at v26` while its migration table ended at `v24 → v25`, leaving the shipped stat-fold migration undocumented. The row was added immediately after the existing `v24 → v25` row (now line 157), in the same one-line table style, and sourced from `packages/sim/src/save/migrations/v25.ts` (`migrateFromV25`, lines 5–161). No historical `v25` reference, ratification note, or other row was rewritten.

### Exact row added

```md
| v25 → v26 | Bakes the two multipliers that sat between the sheet and the fight into the stored numbers (stat fold, FR-2/FR-3): the HP stat absorbs the old 210% arena scale via `round(hp * 21 / 10)`, and the trained HP bonus folds the same way clamped to the scaled cap of 13 (`min(13, round(hp * 21 / 10))`), so a fully trained creature keeps the same effective pool (2 × 13 = 26 against the old 2 × 6 × 2.1 = 25.2). The fold applies to the active creature, every Hall of Fame record, every stabled creature, cup bracket slots, `finalRival`, `nextOpponent`, and every frozen verdict side. ATK/DEF/SPD, conditions, kits, settings, ladder, lineage counters, boss ledger and every other non-HP field forward untouched. Each frozen cup-session side also gains `doctrine` from the legacy `tactic` (`specials → kite`, `balanced → press`), while `tactic` stays readable for the frozen legacy path. Nothing else changes; `version` becomes `26`. |
```

Source cross-check against `migrateFromV25`: `foldHp = round(raw * 21 / 10)` (line 21), `foldTrainedHp = min(13, foldHp(raw))` (line 23), `foldCreature` folds `stats` and `trained.hp` (lines 34–48), `foldSide` maps legacy `tactic` to `doctrine` while keeping `tactic` (lines 50–68), `foldSession` folds bracket `slots`/`finalRival`, `nextOpponent`, all three verdict lists and `rivalResolutions` verdicts (lines 89–120), and the returned payload sets `version: 26` with every other field forwarded (lines 137–160).

## Doc-truth check — terminal row matches current header (R1.T2.1)

Exact grep (native search tool, pattern `v25 → v26|GameState` at v2|current: 2` over `docs/save-schema.md`):

- line 11: `version: number // current: 26 (SAVE_VERSION)`
- line 18: `## \`GameState\` at v26`
- line 157: `| v25 → v26 | ... |` — the new row, and the last row of the migration table

**Invariant pinned:** the terminal migration row's destination (`v26`) equals the current header's version (`v26`) and the `SAVE_VERSION` marker (`26`). No `GameState at v25` header or `current: 25` marker remains. Historical `v25` references (`claimedTiers`/`pendingRewards` v25+, gift-since-v25, the `v24 → v25` row, the "At v25" validation paragraph) and the stable ratification note are unchanged, as required.

## Commands (R1.T2.2)

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static + unit + lint + determinism | `bun run verify` | 0 | `4531 pass / 1 skip / 0 fail`, `675694 expect() calls`, `Ran 4532 tests across 443 files. [136.36s]`. Biome: `Checked 1054 files in 1463ms. No fixes applied.` Determinism gate OK for all 21 archetypes × 3 seed-42 stages and all 5 prop digests (`tuft`, `bush`, `broadleafTree`, `rock`, `foodPile`). Explicit `VERIFY_EXIT=0`. |
| Static (production build) | `bun run build` | 0 | `@apex/client build` — Vite 8.3.4, `✓ 441 modules transformed`, `dist/index.html` 2.13 kB, `dist/assets/index-DADRLmAJ.js` 1,108.81 kB (gzip 306.82 kB), `✓ built in 1.73s`, `Exited with code 0`. Only the pre-existing Vite >500 kB chunk advisory (non-fatal). Explicit `BUILD_EXIT=0`. |

Per the phase brief, `bun run verify` and `bun run build` were run separately here; the primary re-runs the chained `bun run verify && bun run build` form before acceptance. Full verify output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_2151eb773001hnYcATc86DI278.out`.

## Requirement / acceptance coverage

| ID | Evidence | Status |
| --- | --- | --- |
| F1 | Exact `v25 → v26` row above, sourced from `migrateFromV25`; doc-truth invariant above | `fixed` |
| FR-4 | `docs/save-schema.md` still reports `current: 26` and `GameState at v26`; migration chain now complete through `v26`; no code version bump | `verified` |
| AC-2 | v26 header + stable policy rows untouched; terminal migration row added | `verified` |
| AC-6 | Doc-truth grep above: no stale version marker, cap/release/multi-partner claim, and no missing v26 migration row | `verified` |
| AC-5 | `bun run verify` and `bun run build` exit 0 (chained form owned by primary) | `verified` |

## Deviations

- None. All edits stayed inside `docs/save-schema.md` and `conductor/tracks/20261126-stable-capacity-ranch-release/verification/**`.

## Notes

- The visual layer was not run: a migration-table documentation row changes nothing a player can see, so `playwright-cli` evidence is not required by the workflow.
- No dedicated doc-truth script exists in the configured command set; the invariant check was performed by reading and grepping `docs/save-schema.md` directly.
- `verification/integrated.md` gained a short R1 follow-up line in its Doc truth check section and R1 pointers on the AC-2/AC-6 rows. Its AC-7 terminal-proof portion was left untouched.
- This phase adds documentation only. No save-version bump, migration code change, dependency, generated file, or determinism-hash change was made.

## Primary verification

- **Scope:** clean tree; `git diff --name-only 26d30cb47f75bdcf0e3189c5dbac7e6325dec688..HEAD` returned exactly `docs/save-schema.md`, `verification/phase-R1.md`, and `verification/integrated.md`. Range commits are exactly `aa476ed6 docs(save-schema): document shipped v25 to v26 stat-fold migration` and `8cad2d5d docs(verify): record R1 F1 fix and gate results`; no merge or user commits.
- **Doc truth:** read the terminal rows of the migration table. `v24 → v25` is followed by the new `v25 → v26` row (line 157), whose HP fold, trained-HP clamp, field coverage, frozen-side `doctrine` mapping and `version: 26` match `packages/sim/src/save/migrations/v25.ts`. Header `GameState at v26` and `current: 26 (SAVE_VERSION)` are consistent; historical `v25` references remain untouched.
- **Chained gate:** primary re-ran `bun run verify && bun run build` → `gate_exit=0`. Determinism gate OK for all creature GLB stages and all 5 prop digests; client build produced `dist/assets/index-DADRLmAJ.js 1,108.81 kB` with only the pre-existing chunk-size advisory.
- **Conclusion:** F1 is resolved. AC-2, AC-5 and AC-6 are satisfied; AC-7 terminal proof remains owned by the completion step. Ready for delta re-review.
