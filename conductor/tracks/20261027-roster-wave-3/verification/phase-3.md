# Phase 3 verification — Client presentation, lifecycle & handbook

- Track: 20261027-roster-wave-3 — Roster Wave 3 (Breeding Discovery)
- Phase: 3 — Client presentation, lifecycle & handbook
- Date: 2026-10-27
- Branch: feat/20261027-roster-wave-3
- Base: 2361de87bee44e1ab3e95eb008cb738902eef02
- Head: 7b227002
- Result: verified

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| unit+static | `bun test --check --parallel=4 --timeout 120000` | 0 | 3146 pass / 1 skip / 0 fail, 345965 expect() calls, 291 files, 87.55s. The `smoke: RESULT fail` line in the output is the smoke scenario's own in-test log, not a test failure (fail count 0). |
| module caps | (in-suite) `module-size.test.ts` | 0 | Green inside the same run: every new module (all five `branch-catalog/*` tables, the barrel, `handbook/discovery.ts`) is far under the 12,288 B cap. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-5 (client) | The new species are fully rendered and playable client-side: plates, stable, creature detail, growth, battle staging with element-true crests (50°/165°/28°) | `species-roster.test.ts` NEW_LINES +3 rows (crest hue pins, stable egg/rename pins, evolve-callout pins); `move-fx.test.ts` kit→element-true-shot list +3 lines; `battle-timing.test.ts` ARCHETYPES +3 (fox/heron/mole reaction distances stay global); `morning-after-poses.ts` +3 tempers with extremum invariants intact | ✅ |
| AC-7 | Lifecycle parity: hatch → train → two branch forms per line, same mechanism as existing species | 6 new `BranchDef`s (arc_courser/galvanic_warden, reed_diver/marsh_warden, slate_ram/shale_keeper) on the same 11/22 boost budgets; `branches.test.ts` CONTRACT +6 rows (incl. the kit-row signature-exclusion invariant: signatures gigavolt/storm_bolt/hurricane_spiral/sky_bolt/tectonic_slam/boulder_toss are outside their own kits); reveal/callout pins in `species-roster.test.ts` | ✅ |
| AC-8 | The handbook openly lists the three recipes | `handbook/discovery.ts` (new): `recipeFor` probes the production `discoverySpeciesForElements` lookup, `buildDiscovery` renders one recipe row per discovery line on the Raising page; `handbook.test.ts` pins all three rows verbatim ("Breed Electric with Wind." / "Breed Water with Wind." / "Breed Earth with Fire.") | ✅ |
| NFR-6 | Voice copy single-sourced, ≤2 sentences per string | Generic Raising sentence/stat-name guard covers the new rows; recipe copy is one derived sentence per row; branch lines are single-sentence coach voice | ✅ |

## Evidence paths

- `conductor/tracks/20261027-roster-wave-3/verification/phase-3.md` (this file)
- Task commit (squashed by the primary from `49675deb` + `7b227002`): see Primary verification below

## Deviations

- `packages/sim/src/branch-catalog.ts` + new `packages/sim/src/branch-catalog/` (outside `apps/client/src/**` Touches): the 18-branch monolith was already ~10 KB, so six more rows would breach the 12 KB sim module cap. Split along the existing group seam (types/starters/rewards/wave2/discoveries/catalog) with the barrel re-exporting the unchanged public surface (`BRANCHES`, `BranchDef`) plus group arrays; `branches.ts` untouched. Required by the phase goal; no product decision involved.
- `packages/sim/src/branch-catalog/discoveries.ts` (new) + `packages/sim/src/branches.test.ts` (CONTRACT 18→24): six new `BranchDef`s reusing sibling boost budgets with fresh accent hues (55/45/170/160/33/23, all unique). New signatures are the elements' free specials (electric {storm_bolt, gigavolt}, wind {sky_bolt, hurricane_spiral}, earth {boulder_toss, tectonic_slam}) — outside their own kits per the `branches.test.ts` invariant, and no fire/plant/water boss wields them, so the `bosses.test.ts` exemption table is untouched.

## Notes

- Phase-1 handoff invariant holds: the discovery kits embed hound/falcon/tortoise branch signatures as kit rows, and all six new champion signatures were chosen from outside their own kits (verified by the kit-exclusion test, green).
- Production surfaces needed no new seams: plates/stable/detail/growth/staging/battle copy all read the sim catalog generically (Wave-2 precedent). Only enumeration points were extended (morning-after roster/tempers, battle-timing list, move-fx line list, roster pins).
- New morning-after tempers respect every extremum pin: fox tail 0.45 < draconic 0.5, prance 0.42 < axolotl 0.5; mole slump 0.55 < tortoise 0.7; heron slump 0.3 > falcon 0.25.
- Handoff to Phase 4: rivals/bosses. The six discovery branches are live in `BRANCHES`, so `branchesForSpecies`/`rivalBranch` pick them up through the existing seams; `branch-balance.test.ts` and `rival-kit.test.ts` pin starter-only SPECIES lists and are unaffected.

## Primary verification (2026-10-27)

- Result: **verified**. `bun run check` → exit 0. `bun test --check
  --parallel=4 --timeout 120000` → exit 0: 3146 pass, 1 skip, 0 fail
  (3147 tests / 291 files) — matches the executor's report exactly.
  `bun run build` → exit 0.
- Squash: the two task commits (`49675deb` sim + `7b227002` client) matched
  the report with no foreign commits, so squashed into one task commit per
  the loop rules; the evidence file ships in its own `docs(verify)` commit
  as required.
- Touches review: the `packages/sim/src/branch-catalog/` split + six new
  `BranchDef`s sit outside the phase's `apps/client/src/**` Touches but are
  accepted as the recorded deviation — lifecycle parity (two branch forms
  per line, FR-7) cannot be built without branch rows, and the split follows
  the existing group seams with the barrel preserving the public surface.
  The kit-row signature-exclusion invariant holds (verified in-suite).
