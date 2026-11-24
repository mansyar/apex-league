# Phase 1 — Baseline and nine-line boss probe

- Track: `20261124-boss-discovery-balance-probes`
- Phase: 1 — Baseline and nine-line boss probe
- Date: 2026-11-24
- Branch: `chore/20261124-boss-discovery-balance-probes`
- Base: `78f1cf8964c745f266b558296923fc73054fd412`
- Head: `6ab76fb8ab89d924306e9031bb69af33d801bceb` (probe commit; phase evidence is committed afterward)
- Result: **verified**

## Result

The dedicated probe covers exactly `voltfox`, `galeheron`, `shalemole`,
`dune_jerboa`, `spark_ray`, `gale_moth`, `thornvolt`, `siltback`, and
`emberwing`. It asserts that these are the discovery lines left after removing
wave-4 `embercub`, `mossboar`, and `mistkit`, and explicitly excludes all
starters and the six reward lines.

The probe freezes creature seeds `11,42,77,101,143,202`, battle seeds
`11,29,47,53,71,89`, training levels `0,2,4,6`, and player tactic `balanced`.
It uses production `battleSideForSlot`, `defaultLoadout`, and `resolveBattle`,
plus a locked-species creature constructor matching `createCreature`'s seeded
hp/atk/def/spd roll and defaults.

No production balance data or existing test was changed. The only post-review
code change spreads the two readonly expected arrays into mutable copies for
Bun's `toEqual` overload.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static | `bunx biome check packages/sim/src/battle/species-discovery-boss.balance.test.ts` | 0 (primary) | Biome passed on the new probe. |
| Report 1 | `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | 0 (primary) | 6 pass, 0 fail; full report captured in `report-run-1.txt`. |
| Report 2 | `APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | 0 (primary) | 6 pass, 0 fail; full report captured in `report-run-2.txt`. |
| Unit | `bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts` | 0 (primary) | 6 pass, 0 fail. |
| Regression | `bun test --timeout 120000 packages/sim/src/bosses.balance.test.ts packages/sim/src/species-electric.balance.test.ts packages/sim/src/battle/species-balance.test.ts packages/sim/src/battle/species-roster.balance.test.ts packages/sim/src/battle/species-wave4-discovery.balance.test.ts packages/sim/src/battle/species-discovery-balance.test.ts` | 0 (primary) | 35 pass, 0 fail. |
| Static | `bun run check` | 0 (executor, after readonly-array fix) | No type errors: voxel 214 files, sim 253, server 185, client 549. |

Both primary report runs exited 0 with 6 pass and 0 fail. Their 56-line report
payload (header, separator, and 54 species/boss rows) is byte-identical. The
complete Bun transcripts contain different runner interleaving and elapsed-time
text, so the normalized report payload is saved separately from the raw
transcripts.

## Baseline matrix

The full 9×6×4 baseline matrix is saved at
`.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/baseline-matrix.txt`.
It contains all 216 cells; every cell is an exact `won/36` tally with the
corresponding one-decimal win percentage. Raw primary report output is saved
in `report-run-1.txt` and `report-run-2.txt` in the same directory.

## Gate results

| Gate | Result | Notes |
| --- | --- | --- |
| Exact roster and exclusions | Pass | The focused suite asserts the nine ids, the discovery-minus-wave-4 equality, and no starter/reward/wave-4 overlap. |
| Frozen methodology | Pass | Both seed arrays, all four training levels, and `balanced` are pinned; production side builders and resolver are used. |
| Fresh chart-edge gate | Pass (primary focused suite) | Only `siltback` and `emberwing` have authored-boss counter-elements. The seven electric/earth/wind lines are explicitly cap-only. |
| Training-cap gate | Pass (primary focused suite) | Every target is asserted at or above 35% against every authored boss at trained+6. |
| Full report and determinism | Pass (primary) | Two report runs produced identical 56-line payloads with exact tallies for all 216 cells. |
| Existing balance regressions | Pass (primary) | 35 existing balance tests passed with no changes to their files or pins. |
| Typecheck | Pass (executor, after fix) | `bun run check` exited 0 across all four packages. |

No Phase 2 tuning trigger was reported by the focused gate suite.

## Acceptance mapping

| ID | Status | Evidence |
| --- | --- | --- |
| AC-1 | Pass | Exact nine-line target, explicit starter/reward/wave-4 exclusions, and six-boss roster assertions. |
| AC-2 | Pass | Frozen seeds, levels, tactic, production battle path, and matching locked-species stat rolls. |
| AC-3 | Pass | Primary focused suite: 6 pass, 0 fail, including fresh and cap gates. |
| AC-4 | Pass | Two opt-in report runs produced byte-identical 56-line payloads covering all 216 cells. |

The probe is bounded to the approved seed grid, computes only fresh/cap cells
in normal mode, and performs the full four-level sweep only when
`APEX_DISCOVERY_BOSS_REPORT=1` (NFR-1, NFR-2, NFR-7, NFR-8).

## Scope proof

- Probe commit `6ab76fb8ab89d924306e9031bb69af33d801bceb` changes only
  `packages/sim/src/battle/species-discovery-boss.balance.test.ts`.
- No species, boss, chart, resolver, RNG, save, dependency, config, or existing
  test file was edited.
- No balance tuning was attempted.
- The final readonly-array fix changes only the two expected values to
  `[...TARGET_SPECIES]` and `[...CAP_ONLY_SPECIES]`.
- Evidence is limited to this file and the approved baseline evidence directory.

## Evidence paths

- Probe: `packages/sim/src/battle/species-discovery-boss.balance.test.ts`
- Phase evidence: `conductor/tracks/20261124-boss-discovery-balance-probes/verification/phase-1.md`
- Normalized matrix: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/baseline-matrix.txt`
- Raw report run 1: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/report-run-1.txt`
- Raw report run 2: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/report-run-2.txt`
- Post-fix typecheck: `.conductor/evidence/20261124-boss-discovery-balance-probes/baseline/typecheck.txt`

## Deviations

None. Primary-provided results are used for the Biome, report, focused-test,
and existing-suite commands; the executor reran `bun run check` after the
readonly-array fix.

## Permission note

The executor's report rerun attempt for
`APEX_DISCOVERY_BOSS_REPORT=1 bun test --timeout 120000 packages/sim/src/battle/species-discovery-boss.balance.test.ts`
returned `Permission denied: shell`. It was not retried or worked around. The
primary's two successful raw report runs already satisfy that verification.

## Notes

The earlier typecheck failure was solely Bun's readonly-array `toEqual`
overload rejection. The two mutable expected copies fix it, and the post-fix
workspace typecheck is clean.

## Primary verification

The primary independently reran `bun run check` (all four packages clean),
the focused probe (6 pass / 0 fail), Biome on the new file (clean), and the
phase diff checks (clean). The two subagent commits are both reported,
conventional, and scoped to the new probe plus this evidence file; they are
squashed into one phase checkpoint before acceptance.
